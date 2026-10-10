# 🏛️ SCHOLARS GATE — Backend Engine

> **AI-Assisted Scholarship Management Platform for Scheduled Tribe (ST) Students**  
> *Engineered with Python (FastAPI), PostgreSQL (SQLAlchemy 2.0 Async), Supabase (Auth & Storage), and a Document AI Pipeline (PaddleOCR, RapidFuzz, OpenCV).*

---

## 📌 Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │              STUDENT / APPLICANT             │
                        └──────────────────────┬───────────────────────┘
                                               │
                                     1. Submit Application
                                     2. Upload Documents
                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FASTAPI BACKEND SERVICE                                  │
│                                                                                        │
│   ┌────────────────────┐      ┌─────────────────────────┐     ┌────────────────────┐   │
│   │   Supabase Auth    │      │    Eligibility Engine   │     │  Storage Service   │   │
│   │  (JWT Verification)│      │  (Dynamic Policy Rules) │     │ (Supabase / Local) │   │
│   └────────────────────┘      └─────────────────────────┘     └─────────┬──────────┘   │
│                                                                         │              │
│                               Background Worker                         │              │
│   ┌─────────────────────────────────────────────────────────────────────▼──────────┐   │
│   │                          DOCUMENT AI PIPELINE                                  │   │
│   │                                                                                │   │
│   │  [OpenCV Preprocessing] ──► [PaddleOCR Extraction] ──► [Structured Regex/Parse]│   │
│   │    • Deskewing                • Text / Confidence        • Caste Cert No.      │   │
│   │    • Bilateral Denoising      • Bounding Boxes           • Income Amount       │   │
│   │    • CLAHE Enhancement                                   • Institution Name    │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          ▼                                             │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                    CROSS-DOCUMENT CONSISTENCY (RapidFuzz)                      │   │
│   │  • Candidate Name across Caste, Income & Marksheet (Token Sort & Set Ratio)     │   │
│   │  • Annual Income numeric parity & divergence score                             │   │
│   │  • Institution name across Marksheet, Bonafide & Profile                       │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          ▼                                             │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                    CONFIGURABLE RISK & ANOMALY ENGINE                          │   │
│   │  • Generates explainable, verifiable flags with exact citations                │   │
│   │  • Calculates composite risk severity (LOW / MEDIUM / HIGH)                    │   │
│   └──────────────────────────────────────┬─────────────────────────────────────────┘   │
└──────────────────────────────────────────┼─────────────────────────────────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────────────┐
                        │         OFFICIAL AUDIT & VERIFY QUEUE        │
                        │    • Side-by-side OCR review                 │
                        │    • Similarity matrix inspection            │
                        │    • APPROVE / REQUEST_DEFICIENCY / REJECT   │
                        └──────────────────────────────────────────────┘
```

---

## 🗂️ Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py          # Supabase token identity introspection
│   │       │   ├── student.py       # Scheme matching, applications & document upload
│   │       │   ├── official.py      # Prioritized queue, audit payload, human-in-the-loop verify
│   │       │   ├── schemes.py       # Scholarship program management
│   │       │   ├── documents.py     # OCR status and metadata
│   │       │   └── policies.py      # Dynamic policy rule controls & flag resolution
│   │       └── router.py            # Central v1 endpoint router
│   ├── core/
│   │   ├── config.py                # Pydantic v2 application settings
│   │   ├── database.py              # Async SQLAlchemy 2.0 engine & session dependency
│   │   └── security.py              # Supabase JWT middleware & RBAC
│   ├── models/                      # SQLAlchemy 2.0 Declarative Models
│   │   ├── user.py                  # Shadow user profile
│   │   ├── profile.py               # Student profile (tribal community, income, marks)
│   │   ├── scheme.py                # Scholarship scheme policy with JSONB criteria
│   │   ├── application.py           # Application lifecycle & status
│   │   ├── document.py              # Uploaded document & structured OCR JSONB
│   │   └── risk_flag.py             # Explainable verification flags & citations
│   ├── schemas/                     # Pydantic v2 validation models
│   │   ├── student.py               # Profile & eligibility match schemas
│   │   ├── application.py           # Application audit & paginated queue schemas
│   │   ├── ocr.py                   # OCR extracted fields schemas
│   │   └── policy.py                # Policy configuration & risk flag schemas
│   ├── services/                    # Business Logic & Document AI Engines
│   │   ├── ocr_engine.py            # OpenCV preprocessing + PaddleOCR text parsing
│   │   ├── cross_checker.py         # RapidFuzz fuzzy cross-document comparator
│   │   ├── eligibility_engine.py    # Policy rules evaluator & match ranker
│   │   ├── risk_analyzer.py         # Explainable anomaly & risk score generator
│   │   ├── storage_service.py       # Private Supabase/local document storage
│   │   └── document_tasks.py        # Asynchronous background pipeline task
│   └── main.py                      # FastAPI app entrypoint, lifespan & Swagger docs
├── alembic/                         # Database migrations
│   ├── env.py                       # Async Alembic environment
│   └── script.py.mako
├── alembic.ini
├── Dockerfile                       # Multi-stage production Docker container
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment template
└── README.md
```

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- **Python 3.11+** installed
- **PostgreSQL 14+** (or Supabase Postgres instance)

### 2. Virtual Environment Setup
```bash
cd backend
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Linux / macOS
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase & PostgreSQL credentials:
```bash
cp .env.example .env
```

```env
PROJECT_NAME="SCHOLARS GATE"
DEBUG=True
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/scholars_gate_db"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
SUPABASE_KEY="your-supabase-anon-key"
SUPABASE_STORAGE_BUCKET="scholarship-documents"
```

### 5. Run Database Migrations
```bash
alembic upgrade head
```
The API does not silently create or switch databases. Apply the checked-in Alembic migrations before startup. In a non-production test environment, `AUTO_CREATE_SCHEMA=True` may be used explicitly; production must use PostgreSQL and migrations.

Authentication is always required. There are no missing-token, dev-token, or default-secret bypasses.

Set `OCR_MODE=real` for actual OCR (Tesseract must be installed) or explicitly set `OCR_MODE=demo` for demonstrations. Demo mode is returned in every OCR result and leaves extracted fields empty; it does not invent applicant values.

Uploaded documents are stored privately. Students can access only documents attached to their own applications; officials can access documents through authorized backend endpoints.

### 6. Start the API Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Open **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)  
Alternative Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Core API Workflow Examples

### A. Match Schemes for a Student (`GET /api/v1/student/schemes/match`)
Evaluates the student's profile against scheme policies:
```json
{
  "student_id": "90cf495a-cfa6-48eb-a1d2-a728b7891823",
  "student_name": "Ramesh Koram",
  "community_code": "GOND",
  "annual_income": 120000.0,
  "gpa_marks": 78.5,
  "total_schemes_evaluated": 3,
  "eligible_schemes_count": 3,
  "matches": [
    {
      "scheme_id": "421cbe65-7201-447a-8f55-1ef3796ecba4",
      "title": "Post Matric Scholarship Scheme for ST Students",
      "ministry": "Ministry of Tribal Affairs",
      "scholarship_amount": 48000.0,
      "is_eligible": true,
      "eligibility_score": 100.0,
      "breakdown": [
        {
          "criterion": "Income Ceiling",
          "required_value": "<= ₹250,000.00",
          "student_value": "₹120,000.00",
          "is_satisfied": true,
          "explanation": "Annual income of ₹120,000.00 is within the limit of ₹250,000.00."
        },
        {
          "criterion": "Minimum Marks Threshold",
          "required_value": ">= 50.00%",
          "student_value": "78.50%",
          "is_satisfied": true,
          "explanation": "Marks score of 78.50% meets or exceeds the required threshold of 50.00%."
        },
        {
          "criterion": "Scheduled Tribe (ST) Community",
          "required_value": "All ST",
          "student_value": "GOND",
          "is_satisfied": true,
          "explanation": "Scheme applies to all recognized Scheduled Tribes (Student belongs to GOND)."
        }
      ]
    }
  ]
}
```

---

### B. Upload Document & Asynchronous OCR Pipeline (`POST /api/v1/student/applications/{id}/upload-document`)
Accepts `multipart/form-data`:
- `file`: certificate image or PDF
- `doc_type`: `caste_cert`, `income_cert`, `marksheet`, or `bonafide`

Immediately returns:
```json
{
  "document_id": "3b2e5910-c44d-44a6-9812-78d1f7ef33f8",
  "application_id": "c1f7a4e8-8a8b-4b1f-bc87-73b3135cf584",
  "doc_type": "caste_cert",
  "processing_status": "pending",
  "message": "Document uploaded successfully. Background OCR and Cross-Checking initiated."
}
```
*The background task automatically extracts fields, compares name and credentials with RapidFuzz across other documents, and computes risk flags.*

---

### C. Official Audit & Evidence Payload (`GET /api/v1/official/applications/{id}/audit`)
Provides officials with complete human-in-the-loop decision evidence:
```json
{
  "application_id": "c1f7a4e8-8a8b-4b1f-bc87-73b3135cf584",
  "status": "pending_review",
  "risk_level": "medium",
  "student_profile": {
    "full_name": "Ramesh Koram",
    "st_community_code": "GOND",
    "annual_income": 120000.0
  },
  "documents_ocr_summary": {
    "caste_cert": {
      "status": "processed",
      "extracted_fields": {
        "candidate_name": "RAMESH KORAM",
        "community_name": "GOND",
        "certificate_number": "ST/2026/88921",
        "issue_date": "12/04/2026"
      },
      "confidence_score": 0.94
    },
    "income_cert": {
      "status": "processed",
      "extracted_fields": {
        "candidate_name": "RAMESH K",
        "annual_income": 180000.0,
        "certificate_number": "INC/2026/41029"
      },
      "confidence_score": 0.92
    }
  },
  "cross_document_similarity_matrix": [
    {
      "field_name": "full_name",
      "doc_1": "caste_cert",
      "value_1": "RAMESH KORAM",
      "doc_2": "income_cert",
      "value_2": "RAMESH K",
      "similarity_score": 78.4,
      "status": "PARTIAL_MATCH"
    },
    {
      "field_name": "annual_income",
      "doc_1": "profile",
      "value_1": "₹120,000.00",
      "doc_2": "income_cert",
      "value_2": "₹180,000.00",
      "similarity_score": 66.67,
      "status": "MISMATCH"
    }
  ],
  "explainable_risk_flags": [
    {
      "field_name": "annual_income",
      "source_doc_a": "profile",
      "value_a": "₹120,000.00",
      "source_doc_b": "income_cert",
      "value_b": "₹180,000.00",
      "similarity_score": 66.67,
      "severity": "medium",
      "rule_triggered": "Income mismatch - Certificate shows ₹180,000.00, profile states ₹120,000.00 (Similarity Score: 66.67%)",
      "is_resolved": false
    }
  ]
}
```

---

### D. Human-in-the-Loop Decision (`POST /api/v1/official/applications/{id}/verify`)
```json
{
  "decision": "REQUEST_DEFICIENCY",
  "comments": "Income certificate states ₹1,80,000 while profile states ₹1,20,000. Please upload an updated revenue tehsildar income declaration."
}
```

---

### E. Dynamic Policy Rule Update (`PUT /api/v1/official/policies/{scheme_id}`)
Updates qualification criteria instantly in production without service restarts:
```json
{
  "max_income_limit": 300000.0,
  "min_marks_percentage": 55.0,
  "eligible_communities": ["*"]
}
```

---

## 🐳 Docker Deployment

Build and run the backend container:
```bash
docker build -t scholars-gate-backend .
docker run -p 8000:8000 --env-file .env scholars-gate-backend
```
