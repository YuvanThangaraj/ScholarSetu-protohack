import uuid
import logging
from app.core.database import AsyncSessionLocal
from app.models.document import Document, DocumentProcessingStatus
from app.models.application import Application, ApplicationStatus
from app.services.ocr_engine import ocr_engine
from app.services.risk_analyzer import risk_analyzer
from sqlalchemy import select

logger = logging.getLogger(__name__)


async def process_document_pipeline_task(
    document_id: uuid.UUID,
    file_bytes: bytes,
    doc_type: str,
    filename: str,
    mime_type: str | None = None,
):
    """
    Background Task executed asynchronously after document upload.
    Performs:
    1. OpenCV Preprocessing & PaddleOCR text extraction.
    2. Structured domain regex field parsing.
    3. Persisting OCR data to Document record.
    4. Triggering Cross-Document RapidFuzz consistency and Scheme Risk Engine.
    """
    logger.info(f"Starting Background OCR pipeline for document: {document_id} ({doc_type})")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch document record
            stmt = select(Document).where(Document.id == document_id)
            res = await db.execute(stmt)
            doc = res.scalar_one_or_none()
            if not doc:
                logger.error(f"Document {document_id} not found in background task.")
                return

            doc.processing_status = DocumentProcessingStatus.IN_PROGRESS.value
            await db.commit()

            # 2. Run OCR & Extraction Engine
            ocr_results = await ocr_engine.process_document_buffer(
                doc_type=doc_type,
                file_bytes=file_bytes,
                filename=filename,
                mime_type=mime_type,
            )

            # 3. Update Document Record
            doc.ocr_extracted_data = ocr_results
            doc.processing_status = DocumentProcessingStatus.PROCESSED.value
            await db.commit()
            logger.info(f"Document OCR completed for: {document_id}. Running Risk Engine.")

            # 4. Trigger Cross-Document Matching and Risk Analysis
            await risk_analyzer.analyze_application(db, doc.application_id)
            logger.info(f"Risk analysis complete for application: {doc.application_id}")

        except Exception as e:
            logger.error(f"Error in OCR background task for doc {document_id}: {e}", exc_info=True)
            try:
                stmt = select(Document).where(Document.id == document_id)
                res = await db.execute(stmt)
                doc = res.scalar_one_or_none()
                if doc:
                    doc.processing_status = DocumentProcessingStatus.FAILED.value
                    doc.error_message = str(e)
                    await db.commit()
            except Exception as inner_e:
                logger.error(f"Failed to record document error state: {inner_e}")
