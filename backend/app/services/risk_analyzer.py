import uuid
from typing import List, Dict, Any, Optional
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.application import Application, RiskLevel, ApplicationStatus
from app.models.profile import Profile
from app.models.scheme import Scheme
from app.models.document import Document
from app.models.risk_flag import VerificationFlag, FlagSeverity
from app.services.cross_checker import cross_checker

logger = logging.getLogger(__name__)


class RiskAnalyzer:
    """
    Engine C: Explainable Risk and Anomaly Flagging Engine.
    Examines student profile, uploaded documents OCR, cross-document similarity matrix,
    and target scheme policy rules. Produces actionable, human-in-the-loop verification flags.
    """

    async def analyze_application(
        self,
        db: AsyncSession,
        application_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end risk evaluation for an application:
        1. Loads Application, Student Profile, Scheme, and Processed Documents.
        2. Evaluates Scheme Policy compliance.
        3. Evaluates Cross-Document consistency using RapidFuzz.
        4. Persists new VerificationFlag records.
        5. Computes overall application risk level (LOW, MEDIUM, HIGH) and updates DB.
        """
        # Fetch Application with relationships
        query = select(Application).where(Application.id == application_id)
        result = await db.execute(query)
        application = result.scalar_one_or_none()

        if not application:
            raise ValueError(f"Application {application_id} not found")

        # Fetch student profile
        profile_res = await db.execute(select(Profile).where(Profile.id == application.student_id))
        student = profile_res.scalar_one_or_none()

        # Fetch scheme
        scheme_res = await db.execute(select(Scheme).where(Scheme.id == application.scheme_id))
        scheme = scheme_res.scalar_one_or_none()

        # Fetch documents
        docs_res = await db.execute(select(Document).where(Document.application_id == application_id))
        documents = docs_res.scalars().all()

        if not student or not scheme:
            raise ValueError("Incomplete application data for risk evaluation")

        # Build documents OCR dictionary
        docs_ocr_map: Dict[str, Dict[str, Any]] = {}
        for doc in documents:
            if doc.ocr_extracted_data:
                docs_ocr_map[doc.doc_type] = doc.ocr_extracted_data

        flags_to_create: List[VerificationFlag] = []

        # ---------------------------------------------------------
        # Check 1: Scheme Policy Violations
        # ---------------------------------------------------------
        # Income limit check against profile
        if student.annual_income > scheme.max_income_limit:
            flags_to_create.append(
                VerificationFlag(
                    application_id=application_id,
                    field_name="annual_income",
                    source_doc_a="profile",
                    value_a=f"₹{student.annual_income:,.2f}",
                    source_doc_b="scheme_policy",
                    value_b=f"₹{scheme.max_income_limit:,.2f}",
                    similarity_score=0.0,
                    severity=FlagSeverity.HIGH.value,
                    rule_triggered=f"Flag: Income exceeds policy limit of ₹{scheme.max_income_limit:,.2f}",
                    recommended_action="Request an official income certificate within the scheme limit or reject if eligibility is not met",
                    is_resolved=False,
                )
            )

        # Income limit check against OCR Income Certificate
        income_cert_ocr = docs_ocr_map.get("income_cert", {}).get("extracted_fields", {})
        cert_income = income_cert_ocr.get("annual_income")
        if cert_income and float(cert_income) > scheme.max_income_limit:
            flags_to_create.append(
                VerificationFlag(
                    application_id=application_id,
                    field_name="annual_income",
                    source_doc_a="income_cert",
                    value_a=f"₹{cert_income:,.2f}",
                    source_doc_b="scheme_policy",
                    value_b=f"₹{scheme.max_income_limit:,.2f}",
                    similarity_score=0.0,
                    severity=FlagSeverity.HIGH.value,
                    rule_triggered=f"Flag: Income Certificate shows ₹{cert_income:,.2f}, exceeding policy threshold of ₹{scheme.max_income_limit:,.2f}",
                    recommended_action="Review the original income certificate and policy eligibility",
                    is_resolved=False,
                )
            )

        # Marks check against profile
        if student.gpa_marks < scheme.min_marks_percentage:
            flags_to_create.append(
                VerificationFlag(
                    application_id=application_id,
                    field_name="gpa_marks",
                    source_doc_a="profile",
                    value_a=f"{student.gpa_marks:.2f}%",
                    source_doc_b="scheme_policy",
                    value_b=f"{scheme.min_marks_percentage:.2f}%",
                    similarity_score=0.0,
                    severity=FlagSeverity.HIGH.value,
                    rule_triggered=f"Flag: Academic score of {student.gpa_marks:.2f}% is below policy minimum requirement of {scheme.min_marks_percentage:.2f}%",
                    recommended_action="Review marks evidence and scheme eligibility",
                    is_resolved=False,
                )
            )

        # Community check
        if scheme.eligible_communities and "*" not in scheme.eligible_communities:
            if student.st_community_code.upper() not in [c.upper() for c in scheme.eligible_communities]:
                flags_to_create.append(
                    VerificationFlag(
                        application_id=application_id,
                        field_name="st_community_code",
                        source_doc_a="profile",
                        value_a=student.st_community_code,
                        source_doc_b="scheme_policy",
                        value_b=",".join(scheme.eligible_communities),
                        similarity_score=0.0,
                        severity=FlagSeverity.HIGH.value,
                    rule_triggered=f"Flag: Student ST Community '{student.st_community_code}' is not in scheme eligible list",
                    recommended_action="Review community eligibility evidence and scheme policy",
                        is_resolved=False,
                    )
                )

        # ---------------------------------------------------------
        # Check 2: Cross-Document Consistency (RapidFuzz)
        # ---------------------------------------------------------
        student_profile_dict = {
            "full_name": student.full_name,
            "annual_income": student.annual_income,
            "institution_name": student.institution_name or student.institution_code,
            "st_community_code": student.st_community_code,
        }

        cross_result = cross_checker.evaluate_consistency(student_profile_dict, docs_ocr_map)
        similarity_matrix = cross_result.get("similarity_matrix", [])
        discrepancies = cross_result.get("discrepancies", [])

        for disc in discrepancies:
            flags_to_create.append(
                VerificationFlag(
                    application_id=application_id,
                    field_name=disc.get("field_name", "unknown"),
                    source_doc_a=disc.get("doc_1", ""),
                    value_a=str(disc.get("value_1", "")),
                    source_doc_b=disc.get("doc_2", ""),
                    value_b=str(disc.get("value_2", "")),
                    similarity_score=disc.get("score"),
                    severity=disc.get("severity", FlagSeverity.MEDIUM.value),
                    rule_triggered=disc.get("reason", "Discrepancy detected across documents"),
                    recommended_action="Compare the cited source values and request clarification or corrected documents",
                    is_resolved=False,
                )
            )

        # ---------------------------------------------------------
        # Check 3: Missing Required Documents Flag
        # ---------------------------------------------------------
        uploaded_types = {d.doc_type for d in documents}
        mandatory_types = {"caste_cert", "income_cert", "marksheet"}
        missing_docs = mandatory_types - uploaded_types

        for missing in missing_docs:
            flags_to_create.append(
                VerificationFlag(
                    application_id=application_id,
                    field_name="document_completeness",
                    source_doc_a="documents",
                    value_a="None",
                    source_doc_b="scheme_policy",
                    value_b=missing,
                    similarity_score=0.0,
                    severity=FlagSeverity.HIGH.value,
                    rule_triggered=f"Flag: Missing mandatory verification document: {missing}",
                    recommended_action=f"Upload the missing {missing} document",
                    is_resolved=False,
                )
            )

        # ---------------------------------------------------------
        # Persist Verification Flags
        # ---------------------------------------------------------
        # Clear existing unresolved flags for fresh run to prevent duplicates
        existing_flags_q = select(VerificationFlag).where(
            VerificationFlag.application_id == application_id,
            VerificationFlag.is_resolved == False,
        )
        existing_flags = (await db.execute(existing_flags_q)).scalars().all()
        for f in existing_flags:
            await db.delete(f)

        for flag in flags_to_create:
            db.add(flag)

        # ---------------------------------------------------------
        # Determine Overall Application Risk Level
        # ---------------------------------------------------------
        high_count = sum(1 for f in flags_to_create if f.severity == FlagSeverity.HIGH.value)
        medium_count = sum(1 for f in flags_to_create if f.severity == FlagSeverity.MEDIUM.value)

        if high_count > 0:
            overall_risk = RiskLevel.HIGH.value
        elif medium_count >= 2:
            overall_risk = RiskLevel.MEDIUM.value
        elif medium_count >= 1:
            overall_risk = RiskLevel.MEDIUM.value
        else:
            overall_risk = RiskLevel.LOW.value

        application.risk_level = overall_risk
        
        # Advance status if currently in_ocr
        if application.status == ApplicationStatus.IN_OCR.value:
            application.status = ApplicationStatus.PENDING_REVIEW.value

        await db.commit()
        await db.refresh(application)

        return {
            "application_id": str(application_id),
            "risk_level": overall_risk,
            "flags_count": len(flags_to_create),
            "high_severity_flags": high_count,
            "medium_severity_flags": medium_count,
            "similarity_matrix": similarity_matrix,
        }


# Singleton risk analyzer instance
risk_analyzer = RiskAnalyzer()
