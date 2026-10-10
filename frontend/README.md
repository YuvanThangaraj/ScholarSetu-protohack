# 🖥️ SCHOLARS GATE — Frontend Portal

> **AI-Enabled Scholarship & Fellowship Management Platform for Scheduled Tribe (ST) Students and Verification Officials**  
> *Built with Next.js 14+ (App Router), TypeScript, Tailwind CSS, and Lucide React.*

---

## 📌 Architecture & Features

The Scholars Gate frontend is partitioned into two dedicated role portals sharing a unified design token system:

### 1. Student & Applicant Portal (`/student`)
- **Dashboard (`/student/dashboard`):** At-a-glance status of active ST fellowship applications, eligibility match scores, and official deficiency action notices.
- **Profile Wizard (`/student/profile`):** Multi-step onboarding and tribal community authentication (Personal Info → ST Community Selection → Academics → Family Income → Institution Affiliation).
- **AI Scheme Discovery Hub (`/student/schemes`):** Real-time matching against Ministry of Tribal Affairs criteria with expandable met/unmet requirement breakdowns.
- **Application & Document Uploader (`/student/apply/[schemeId]`):** Drag-and-drop document uploader for Caste, Income, and Marksheet certificates with client-side file validation.
- **Status & Tracking Timeline (`/student/tracking/[appId]`):** End-to-end audit timeline (Submission → OCR Extraction → Consistency Check → Official Review → Sanction) with 1-click deficiency re-upload modal.

### 2. Verification Officials Portal (`/official`)
- **Command Center Dashboard (`/official/dashboard`):** Top 4 KPI metrics (Pending, High Risk Anomalies, Auto-Verified Low Risk, Decisions Today) and prioritized applications queue.
- **Prioritized Review Queue (`/official/review-queue`):** Data table with multi-column sorting and filtering by Risk Level (High, Medium, Low), applicant name, or tribal community.
- **Side-by-Side Audit Studio (`/official/audit/[appId]`):**
  - **Left 50% Panel:** Interactive Certificate viewer with Zoom, Rotate, and High-Fidelity document rendering.
  - **Right 50% Panel:** Document AI Structured Field Inspector displaying extracted values with confidence scores and official override editing.
  - **Cross-Document Consistency Matrix:** RapidFuzz token matching comparing Candidate Name, Annual Income, and Institution across certificates.
  - **Explainable Anomaly Flags:** High/Medium priority banners citing exact trigger reasons and policy breaches with 1-click clearance.
  - **Human-in-the-Loop Action Bar:** Sticky bottom panel to **Approve**, **Request Deficiency**, or **Reject** with templated official comments.
- **Policy Rule Configurator (`/official/policies`):** Live hot-deploy interface to adjust income ceilings, academic cutoffs, and eligible ST tribal quotas on the fly without restarting backend services.

---

## 🎨 UI/UX Design System
- **Primary Color:** Deep Navy (`#0F172A` / Slate 900)
- **Secondary Accent:** Emerald Green (`#059669` / Emerald 600)
- **Warning & High Risk:** Amber (`#D97706`) & Coral Red (`#DC2626`)
- **Backgrounds:** Crisp Light Gray (`#F8FAFC`) with clean border styling (`#E2E8F0`).

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will be live at **[http://localhost:3000](http://localhost:3000)**.

### 3. Backend Integration & Proxy
Requests to `/api/v1/*` are automatically proxied via `next.config.mjs` to the FastAPI backend running at `http://127.0.0.1:8000`. If the backend is running, live database records are utilized. If the backend is offline, the client automatically falls back to realistic mock ST applications in `src/lib/mock-data.ts`.

---

## 📁 Folder Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── student/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── schemes/page.tsx
│   │   │   ├── apply/[schemeId]/page.tsx
│   │   │   └── tracking/[appId]/page.tsx
│   │   ├── official/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── review-queue/page.tsx
│   │   │   ├── audit/[appId]/page.tsx
│   │   │   └── policies/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx (Landing Page & Role Switcher)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/ (Button, Card, Table, Badge, Modal, Tabs, Progress, Alert)
│   │   ├── student/ (ProfileWizard, SchemeMatcherCard, DocumentUploader, ApplicationTimeline)
│   │   └── official/ (SplitDocumentViewer, OcrFieldInspector, ConsistencyMatrix, RiskFlagBanner, DecisionModal)
│   ├── lib/
│   │   ├── types.ts
│   │   ├── mock-data.ts
│   │   └── utils.ts
│   └── services/
│       └── api.ts
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```
