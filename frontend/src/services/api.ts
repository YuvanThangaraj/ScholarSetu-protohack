import {
  StudentProfile,
  SchemePolicy,
  SchemeMatchItem,
  ApplicationDetail,
  ApplicationAuditPayload,
  QueuePage,
  AuditEvent,
  VerificationFlag,
} from "@/lib/types";

const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

type Role = "student" | "official";

export interface AuthIdentity {
  user_id: string;
  email?: string;
  role: string;
  roles: string[];
  is_official: boolean;
  is_student: boolean;
  full_name?: string;
}

export interface DemoLoginResult {
  access_token: string;
  token_type: string;
  expires_in?: number | null;
  user: Pick<AuthIdentity, "user_id" | "email" | "full_name" | "role">;
}

// Token comes from a stored sign-in, else the build-time env (local development setup).
function token(role: Role): string | undefined {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("scholarsetu.token") : null;
    if (stored) return stored;
  } catch {}
  return role === "student" ? process.env.NEXT_PUBLIC_STUDENT_TOKEN : process.env.NEXT_PUBLIC_OFFICIAL_TOKEN;
}

function messageFrom(detail: any, fallback: string): string {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || String(d)).join("; ");
  if (detail.message) {
    const missing = detail.missing_documents?.length ? `: ${detail.missing_documents.join(", ")}` : "";
    return `${detail.message}${missing}`;
  }
  return fallback;
}

async function request<T>(role: Role, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const t = token(role);
  if (t) headers.set("Authorization", `Bearer ${t}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json()).detail;
    } catch {}
    const fallback =
      res.status === 401 ? "Your session has expired. Please sign in again."
      : res.status === 403 ? "You do not have access to this page."
      : res.status === 404 ? "The requested record was not found."
      : "Something went wrong on the server.";
    throw new ApiError(res.status, messageFrom(detail, fallback), detail);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  // ---------------- Authentication ----------------
  demoLogin(email: string, role: Role, password: string) {
    return request<DemoLoginResult>(role, "/auth/demo-login", json({ email, role, password }));
  },

  storeAuthToken(accessToken: string) {
    if (typeof window !== "undefined") localStorage.setItem("scholarsetu.token", accessToken);
  },

  clearAuthToken() {
    if (typeof window !== "undefined") localStorage.removeItem("scholarsetu.token");
  },

  getCurrentIdentity() {
    return request<AuthIdentity>("student", "/auth/me");
  },

  // ---------------- Student ----------------
  /** Resolves to null when the student has not created a profile yet (backend 404). */
  async getStudentProfile(): Promise<StudentProfile | null> {
    try {
      return await request<StudentProfile>("student", "/student/profile");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  // POST /student/profile upserts, so it covers both create and update.
  saveStudentProfile(data: Partial<StudentProfile>) {
    return request<StudentProfile>("student", "/student/profile", json(data));
  },

  matchSchemes() {
    return request<{
      student_id: string;
      student_name: string;
      total_schemes_evaluated: number;
      eligible_schemes_count: number;
      matches: SchemeMatchItem[];
    }>("student", "/student/schemes/match");
  },

  getScheme(id: string) {
    return request<SchemePolicy>("student", `/schemes/${id}`);
  },

  getSchemes() {
    return request<SchemePolicy[]>("official", "/schemes");
  },

  createApplication(schemeId: string) {
    return request<ApplicationDetail>("student", "/student/applications", json({ scheme_id: schemeId }));
  },

  uploadDocument(appId: string, file: File, docType: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("doc_type", docType);
    return request<{ document_id: string; processing_status: string; message: string }>(
      "student",
      `/student/applications/${appId}/upload-document`,
      { method: "POST", body: form }
    );
  },

  /** The only call that moves an application out of draft; the returned status is the source of truth. */
  submitApplication(appId: string) {
    return request<ApplicationDetail>("student", `/student/applications/${appId}/submit`, { method: "POST" });
  },

  getStudentApplications() {
    return request<ApplicationDetail[]>("student", "/student/applications");
  },

  getApplicationStatus(appId: string) {
    return request<ApplicationDetail>("student", `/student/applications/${appId}/status`);
  },

  // ---------------- Official ----------------
  getReviewQueue(riskFilter?: string, page = 1, pageSize = 100) {
    const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (riskFilter) q.set("risk_filter", riskFilter);
    return request<QueuePage>("official", `/official/applications/queue?${q}`);
  },

  getApplicationAudit(appId: string) {
    return request<ApplicationAuditPayload>("official", `/official/applications/${appId}/audit`);
  },

  getAuditHistory(appId: string) {
    return request<AuditEvent[]>("official", `/official/applications/${appId}/audit-history`);
  },

  /** Backend returns the refreshed audit payload. */
  submitVerificationDecision(appId: string, decision: "APPROVE" | "REQUEST_DEFICIENCY" | "REJECT", comments: string) {
    return request<ApplicationAuditPayload>("official", `/official/applications/${appId}/verify`, json({ decision, comments }));
  },

  correctOcr(documentId: string, extractedFields: Record<string, unknown>, reason: string) {
    return request<unknown>("official", `/official/documents/${documentId}/ocr`, {
      method: "PATCH",
      body: JSON.stringify({ extracted_fields: extractedFields, reason }),
    });
  },

  updatePolicyRule(schemeId: string, updates: Partial<SchemePolicy>) {
    return request<SchemePolicy>("official", `/official/policies/${schemeId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  resolveFlag(flagId: string, notes: string) {
    return request<VerificationFlag>("official", `/policies/flags/${flagId}/resolve`, json({ is_resolved: true, resolution_notes: notes }));
  },

  /** Fetches the stored file with auth so it can be previewed through an object URL. */
  async getDocumentBlob(docId: string): Promise<Blob> {
    const t = token("official");
    const res = await fetch(`${API_BASE}/documents/${docId}/download`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, "Document preview is unavailable.");
    return res.blob();
  },
};
