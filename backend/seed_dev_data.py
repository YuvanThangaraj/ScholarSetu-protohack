"""Idempotently seed verified schemes and clearly simulated demo accounts.

Only rows identified by the fixed demo UUIDs/emails are created or updated. Existing
unrelated users, profiles, applications, and documents are never deleted or changed.
"""
import asyncio
import io
import uuid
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.application import Application, ApplicationStatus, RiskLevel
from app.models.audit import AuditEvent
from app.models.document import Document, DocumentProcessingStatus
from app.models.profile import Profile
from app.models.risk_flag import VerificationFlag, FlagSeverity
from app.models.scheme import Scheme
from app.models.user import User
from app.services.ocr_engine import ocr_engine
from app.services.storage_service import storage_service

VERIFIED = datetime(2026, 10, 10, tzinfo=timezone.utc)
ANANYA_USER_ID = uuid.UUID("4c8d2a8f-9c4f-4d39-8f0c-2c0f2e8a1001")
RAHUL_USER_ID = uuid.UUID("4c8d2a8f-9c4f-4d39-8f0c-2c0f2e8a1002")
ANANYA_PROFILE_ID = uuid.UUID("4c8d2a8f-9c4f-4d39-8f0c-2c0f2e8a1101")
SUBMITTED_APP_ID = uuid.UUID("4c8d2a8f-9c4f-4d39-8f0c-2c0f2e8a1201")
DRAFT_APP_ID = uuid.UUID("4c8d2a8f-9c4f-4d39-8f0c-2c0f2e8a1202")
ACTION_APP_ID = uuid.UUID("4c8d2a8f-9c4f-4d39-8f0c-2c0f2e8a1203")
BASE = dict(provider="Ministry of Tribal Affairs", ministry="Ministry of Tribal Affairs", eligible_communities=["*"], version=1, last_verified_at=VERIFIED)
SCHEMES = [
    dict(code="PRE-MATRIC-ST", title="Pre-Matric Scholarship Scheme for ST Students", description="Financial assistance for Scheduled Tribe students studying in Classes IX and X.", eligibility="Scheduled Tribe students studying in Classes IX and X.", education_level="Classes IX-X", income_criteria="Parental income from all sources must not exceed ₹2.50 lakh per annum.", benefits="Financial assistance; see the official guideline for applicable assistance components and rates.", required_documents=["Income Certificate", "ST Certificate", "Marksheet of qualifying examination", "Domicile Certificate"], application_window="Applications through the State or National Scholarship Portal; dates vary by State/UT.", deadline="Not stated on the official MoTA summary; check the State/NSP portal.", scheme_status="active", official_url="https://tribal.nic.in/downloads/guidelines/pre-matric/guidelines-Pre-matric-17-Oct-2022.pdf", max_income_limit=250000.0, min_marks_percentage=None, scholarship_amount=None),
    dict(code="POST-MATRIC-ST", title="Post-Matric Scholarship Scheme for ST Students", description="Financial aid for Scheduled Tribe students from Class XI through postgraduate courses.", eligibility="Scheduled Tribe students studying from Class XI to postgraduate level.", education_level="Class XI to postgraduate", income_criteria="The official current summary does not state a single current income figure; verify applicable State/UT and NSP guidance.", benefits="Financial aid for post-matric and higher education; amount depends on the applicable scheme rules.", required_documents=["Income Certificate", "ST Certificate", "Offer of admission in eligible Institute", "Domicile Certificate", "Marksheet of qualifying examination", "10th Passing Certificate"], application_window="Applications through the State or National Scholarship Portal; dates vary by State/UT.", deadline="Not stated on the official MoTA summary; check the State/NSP portal.", scheme_status="active", official_url="https://tribal.nic.in/downloads/guidelines/post-matric/EDUPostMatricScholarshipPMSforSTstudents230513.pdf", max_income_limit=None, min_marks_percentage=None, scholarship_amount=None),
    dict(code="NFST-2026", title="National Fellowship for ST Students", description="Central Sector fellowship for meritorious ST students pursuing M.Phil, Integrated M.Phil.+Ph.D., and Ph.D. courses.", eligibility="ST students pursuing M.Phil, Integrated M.Phil.+Ph.D., or Ph.D.; the official guideline states a minimum of 55% at postgraduate level.", education_level="M.Phil / Integrated M.Phil.+Ph.D. / Ph.D.", income_criteria="No income criterion for eligibility under the MoTA National Fellowship guideline.", benefits="750 fresh fellowships per year; stipend, contingency, HRA as applicable, and escort allowance for Divyangjan are described in the official guideline.", required_documents=["ST Certificate", "Qualifying examination marksheet", "Admission/bonafide certificate", "Other documents specified by the National Tribal Fellowship Portal"], application_window="Once a year through the National Tribal Fellowship Portal; dates are published on the portal.", deadline="Not stated for 2026-27 on the official portal at verification time.", scheme_status="active", official_url="https://fellowship.tribal.gov.in/", max_income_limit=None, min_marks_percentage=55.0, scholarship_amount=None),
    dict(code="TOP-CLASS-ST-2026-27", title="National Scholarship for Higher Education of ST Students (Top Class)", description="Central Sector scholarship for eligible ST students in prescribed higher-education courses in Ministry-identified premier institutes.", eligibility="Eligible ST students admitted on merit to prescribed courses in Ministry-identified premier institutes; preference for girls, Divyangjan, and PVTGs.", education_level="Higher education in prescribed courses", income_criteria="Family income from all sources must not exceed ₹6.00 lakh per annum.", benefits="Tuition and admission fees, non-refundable fees, stipend, and allowances for books and computer for the course duration.", required_documents=["ST Certificate", "Income Certificate", "Fee Receipt", "Bank Passbook", "Qualifying examination marksheet", "Bonafide Certificate"], application_window="NSP 2026-27: open 01-06-2026; student close 31-10-2026; institute verification close 15-11-2026; DNO/SNO/MNO verification close 30-11-2026.", deadline="Student application: 31-10-2026; institute verification: 15-11-2026; DNO/SNO/MNO verification: 30-11-2026.", scheme_status="active", official_url="https://scholarships.gov.in/All-Scholarships", max_income_limit=600000.0, min_marks_percentage=None, scholarship_amount=None),
    dict(code="NOS-ST-2026-27", title="National Overseas Scholarship Scheme for ST Candidates", description="Financial assistance for selected ST candidates pursuing Master's and Ph.D. programmes abroad.", eligibility="ST candidates selected for higher studies abroad at Master's or Ph.D. level; MoTA also describes post-doctoral study under the scheme.", education_level="Master's / Ph.D. / post-doctoral study abroad", income_criteria="Parental or family income from all sources must not exceed ₹6.00 lakh per annum.", benefits="Tuition fee, annual maintenance allowance of USD 15,400, contingency USD 1,532, poll tax, visa fee, medical insurance, air journey, and incidental journey expenses.", required_documents=["Income Certificate", "ST/PVTG Certificate", "Offer of admission in eligible Institute", "Domicile Certificate", "Qualifying examination marksheet", "10th Passing Certificate"], application_window="Selection year 2026-27 notice: 15-05-2026 to 30-06-2026 (5:30 PM) through the NOS Portal.", deadline="30-06-2026 at 5:30 PM.", scheme_status="closed_for_2026_27_applications", official_url="https://overseas.tribal.gov.in/", max_income_limit=600000.0, min_marks_percentage=None, scholarship_amount=None),
]

def demo_pdf(title: str, lines: list[str]) -> bytes:
    image = Image.new("RGB", (1600, 1100), "white")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 42)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    except OSError:
        font = small = ImageFont.load_default()
    draw.rectangle((35, 35, 1565, 1065), outline="#19324d", width=5)
    draw.text((90, 90), "DEMO — NOT AN OFFICIAL DOCUMENT", fill="#a21d2d", font=font)
    draw.text((90, 185), title, fill="#19324d", font=font)
    y = 300
    for line in lines:
        draw.text((110, y), line, fill="black", font=small)
        y += 76
    draw.text((90, 970), "Sample record for SCHOLARSETU portal demonstration only", fill="#555555", font=small)
    out = io.BytesIO()
    image.save(out, format="PDF", resolution=150.0)
    return out.getvalue()

DOC_CONTENT = {
    "caste_cert": ("ST Community Certificate", ["Name: Ananya Kumar", "Community: GOND", "Certificate No: DEMO-ST-2026-001", "Date of Issue: 01/09/2026"]),
    "income_cert": ("Family Income Certificate", ["Name: Ananya Kumar", "Annual Family Income: 120000", "Certificate No: DEMO-INC-2026-001", "Financial Year: 2026-27"]),
    "marksheet": ("Semester Marksheet", ["Name: Ananya Kumar", "Institution: National Institute of Technology, Rourkela", "Course: B.Tech Computer Science", "Marks Percentage: 78.5"]),
    "bonafide": ("Bonafide Certificate", ["Name: Ananya Kumar", "Institution: National Institute of Technology, Rourkela", "Course: B.Tech Computer Science", "Academic Year: 2026-27"]),
}

async def get_or_create_scheme(db, item):
    scheme = (await db.execute(select(Scheme).where(Scheme.code == item["code"]))).scalar_one_or_none()
    data = {**BASE, **item, "is_active": item["scheme_status"] == "active"}
    if scheme is None:
        scheme = Scheme(**data)
        db.add(scheme)
        await db.flush()
    else:
        for key, value in data.items():
            setattr(scheme, key, value)
    return scheme

async def get_or_create_user(db, user_id, email, role):
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None:
        user = User(id=user_id, supabase_id=user_id, email=email, role=role, is_active=True)
        db.add(user)
    else:
        user.role, user.is_active, user.supabase_id = role, True, user_id
    return user

async def ensure_document(db, app, doc_type):
    existing = (await db.execute(select(Document).where(Document.application_id == app.id, Document.doc_type == doc_type))).scalar_one_or_none()
    if existing and existing.file_path:
        return existing
    title, lines = DOC_CONTENT[doc_type]
    filename = f"DEMO_{doc_type}_Ananya_Kumar.pdf"
    content = demo_pdf(title, lines)
    path = await storage_service.upload_document_file(app.id, doc_type, filename, content, "application/pdf")
    ocr = await ocr_engine.process_document_buffer(doc_type, content, filename, "application/pdf")
    if existing is None:
        existing = Document(application_id=app.id, doc_type=doc_type)
        db.add(existing)
    existing.file_name = filename
    existing.file_path = path
    existing.mime_type = "application/pdf"
    existing.file_size_bytes = str(len(content))
    existing.processing_status = DocumentProcessingStatus.PROCESSED.value
    existing.ocr_extracted_data = ocr
    existing.error_message = None
    await db.flush()
    return existing

async def ensure_app(db, app_id, profile, scheme, status, risk, remarks, required_docs):
    app = (await db.execute(select(Application).where(Application.id == app_id))).scalar_one_or_none()
    if app is None:
        app = Application(id=app_id, student_id=profile.id, scheme_id=scheme.id)
        db.add(app)
    app.student_id, app.scheme_id, app.status, app.risk_level = profile.id, scheme.id, status, risk
    app.official_remarks = remarks
    app.submitted_at = VERIFIED if status in {ApplicationStatus.SUBMITTED.value, ApplicationStatus.ACTION_REQUIRED.value} else None
    if status == ApplicationStatus.ACTION_REQUIRED.value:
        app.verified_by, app.verified_at = RAHUL_USER_ID, VERIFIED
    for doc_type in required_docs:
        await ensure_document(db, app, doc_type)
    await db.flush()
    return app

async def seed():
    async with AsyncSessionLocal() as db:
        schemes = {item["code"]: await get_or_create_scheme(db, item) for item in SCHEMES}
        await get_or_create_user(db, ANANYA_USER_ID, "student.demo@example.com", "student")
        await get_or_create_user(db, RAHUL_USER_ID, "officer.demo@example.com", "official")
        profile = (await db.execute(select(Profile).where(Profile.user_id == ANANYA_USER_ID))).scalar_one_or_none()
        if profile is None:
            profile = Profile(id=ANANYA_PROFILE_ID, user_id=ANANYA_USER_ID, full_name="Ananya Kumar", st_community_code="GOND", annual_income=120000.0, course_name="B.Tech Computer Science", institution_code="NITR01", institution_name="National Institute of Technology, Rourkela", gpa_marks=78.5, phone_number="+91 98765 43210")
            db.add(profile)
        else:
            for key, value in dict(full_name="Ananya Kumar", st_community_code="GOND", annual_income=120000.0, course_name="B.Tech Computer Science", institution_code="NITR01", institution_name="National Institute of Technology, Rourkela", gpa_marks=78.5, phone_number="+91 98765 43210").items(): setattr(profile, key, value)
        await db.flush()
        submitted = await ensure_app(db, SUBMITTED_APP_ID, profile, schemes["TOP-CLASS-ST-2026-27"], ApplicationStatus.SUBMITTED.value, RiskLevel.LOW.value, "SIMULATED DEMO APPLICATION — awaiting government officer review.", ["caste_cert", "income_cert", "marksheet", "bonafide"])
        draft = await ensure_app(db, DRAFT_APP_ID, profile, schemes["NFST-2026"], ApplicationStatus.DRAFT.value, RiskLevel.LOW.value, "SIMULATED DEMO APPLICATION — incomplete; upload the remaining required documents before submission.", ["caste_cert"])
        action = await ensure_app(db, ACTION_APP_ID, profile, schemes["POST-MATRIC-ST"], ApplicationStatus.ACTION_REQUIRED.value, RiskLevel.MEDIUM.value, "SIMULATED DEMO DECISION — please upload a clearer family income certificate and resubmit.", ["caste_cert", "income_cert", "marksheet", "bonafide"])
        flag = (await db.execute(select(VerificationFlag).where(VerificationFlag.application_id == action.id, VerificationFlag.field_name == "income_cert"))).scalar_one_or_none()
        if flag is None:
            db.add(VerificationFlag(application_id=action.id, field_name="income_cert", source_doc_a="income_cert", value_a="DEMO scan is low contrast", source_doc_b="profile", value_b="₹120,000", similarity_score=58.0, severity=FlagSeverity.MEDIUM.value, rule_triggered="Demo correction request: income certificate image needs a clearer scan.", recommended_action="Upload a clearer income certificate.", is_resolved=False))
        await db.commit()
        print("Seeded demo users, one submitted application, one incomplete draft, one action-required application, and two not-yet-applied schemes without deleting unrelated records.")

if __name__ == "__main__":
    asyncio.run(seed())
