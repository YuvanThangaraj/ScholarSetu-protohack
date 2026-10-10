import io
import re
import shutil
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List
from PIL import Image, ImageEnhance, ImageFilter
from app.core.config import settings


ALLOWED_MIME = {"application/pdf", "image/png", "image/jpeg", "image/tiff", "image/webp"}


class OCREngine:
    def validate_file(self, file_bytes: bytes, mime_type: str | None = None, filename: str = "") -> str:
        if not file_bytes:
            raise ValueError("Uploaded file is empty")
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise ValueError("Uploaded file exceeds the maximum allowed size")
        is_pdf = file_bytes[:5] == b"%PDF-"
        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()
            is_image = True
        except Exception:
            is_image = False
        if mime_type and mime_type not in ALLOWED_MIME:
            raise ValueError("Unsupported MIME type")
        if not (is_pdf or is_image):
            raise ValueError("File content is not a valid PDF or image")
        if mime_type == "application/pdf" and not is_pdf:
            raise ValueError("MIME type does not match file content")
        if mime_type and mime_type.startswith("image/") and not is_image:
            raise ValueError("MIME type does not match file content")
        return "pdf" if is_pdf else "image"

    def _preprocess(self, image: Image.Image) -> Image.Image:
        gray = image.convert("L")
        gray = ImageEnhance.Contrast(gray).enhance(1.6)
        return gray.filter(ImageFilter.SHARPEN)

    def _real_ocr(self, images: List[Image.Image]) -> Tuple[str, float, List[Dict[str, Any]]]:
        if not shutil.which("tesseract"):
            raise RuntimeError("Real OCR mode requires the tesseract executable")
        texts = []
        for image in images:
            proc = subprocess.run(["tesseract", "stdin", "stdout", "--psm", "6"], input=self._image_bytes(image), capture_output=True, check=False)
            if proc.returncode != 0:
                raise RuntimeError(proc.stderr.decode(errors="replace") or "OCR failed")
            texts.append(proc.stdout.decode(errors="replace"))
        raw = "\n".join(texts).strip()
        return raw, (0.0 if not raw else 0.75), []

    @staticmethod
    def _image_bytes(image: Image.Image) -> bytes:
        out = io.BytesIO()
        image.save(out, format="PNG")
        return out.getvalue()

    def _demo_ocr(self, doc_type: str) -> Tuple[str, float, List[Dict[str, Any]]]:
        # Deliberately empty: demo mode exercises the pipeline without inventing applicant data.
        return "", 0.0, []

    def parse_document_fields(self, doc_type: str, raw_text: str, confidence: float) -> Dict[str, Any]:
        text = raw_text or ""
        fields: Dict[str, Any] = {}
        name = re.search(r"(?:name|candidate|applicant)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{1,100})", text, re.I)
        if name: fields["candidate_name"] = name.group(1).strip()
        date = re.search(r"(?:date of issue|issued on|date)\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})", text, re.I)
        if date: fields["issue_date"] = date.group(1)
        if doc_type == "caste_cert":
            community = re.search(r"(?:community|tribe|caste)\s*[:\-]\s*([A-Za-z ]+)", text, re.I)
            cert = re.search(r"(?:certificate|cert)\s*(?:no|number)\s*[:#\-]?\s*([A-Z0-9/\-]+)", text, re.I)
            if community: fields["community_name"] = community.group(1).strip()
            if cert: fields["certificate_number"] = cert.group(1).strip()
        elif doc_type == "income_cert":
            income = re.search(r"(?:annual|family|gross|total)\s+income[^\d]{0,30}([\d,]+(?:\.\d+)?)", text, re.I)
            if income:
                fields["annual_income"] = float(income.group(1).replace(",", ""))
            guardian = re.search(r"(?:son|daughter|ward)\s+of\s*[:\-]?\s*([A-Za-z .'-]+)", text, re.I)
            if guardian: fields["guardian_name"] = guardian.group(1).strip()
        elif doc_type == "marksheet":
            marks = re.search(r"(?:marks|percentage|score)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*%?", text, re.I)
            if marks: fields["marks_percentage"] = float(marks.group(1))
            inst = re.search(r"(?:institution|institute|college|university)\s*[:\-]\s*([A-Za-z0-9 ,.&'-]+)", text, re.I)
            if inst: fields["institution_name"] = inst.group(1).strip()
        elif doc_type == "bonafide":
            inst = re.search(r"(?:institution|institute|college|university)\s*[:\-]\s*([A-Za-z0-9 ,.&'-]+)", text, re.I)
            course = re.search(r"(?:course|program)\s*[:\-]\s*([A-Za-z0-9 ,.&'-]+)", text, re.I)
            if inst: fields["institution_name"] = inst.group(1).strip()
            if course: fields["course_name"] = course.group(1).strip()
        return fields

    async def process_document_buffer(self, doc_type: str, file_bytes: bytes, filename: str = "", mime_type: str | None = None) -> Dict[str, Any]:
        kind = self.validate_file(file_bytes, mime_type, filename)
        images: List[Image.Image] = []
        if kind == "image":
            images = [self._preprocess(Image.open(io.BytesIO(file_bytes)))]
        else:
            from pdf2image import convert_from_bytes
            if not shutil.which("pdftoppm"):
                raise RuntimeError("PDF OCR requires the Poppler pdftoppm executable")
            images = [self._preprocess(img) for img in convert_from_bytes(file_bytes, dpi=200, first_page=1, last_page=10)]
        if settings.OCR_MODE == "demo":
            raw_text, confidence, boxes = self._demo_ocr(doc_type)
        else:
            raw_text, confidence, boxes = self._real_ocr(images)
        fields = self.parse_document_fields(doc_type, raw_text, confidence)
        return {"doc_type": doc_type, "filename": filename, "ocr_mode": settings.OCR_MODE, "confidence_score": confidence, "extracted_fields": fields, "raw_text": raw_text, "boxes_count": len(boxes), "processed_at": datetime.now(timezone.utc).isoformat()}


ocr_engine = OCREngine()
