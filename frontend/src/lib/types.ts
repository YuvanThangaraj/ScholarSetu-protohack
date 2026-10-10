// Mirrors backend ApplicationStatus values.
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "action_required"
  | "resubmitted"
  | "verified"
  | "approved"
  | "rejected";

export type RiskLevel = "low" | "medium" | "high";

export type DocumentType =
  | "caste_cert"
  | "income_cert"
  | "marksheet"
  | "bonafide";

export interface StudentProfile {
  id?: string;
  user_id?: string;
  full_name: string;
  st_community_code: string;
  annual_income: number;
  course_name: string;
  institution_code: string;
  institution_name?: string;
  gpa_marks: number;
  phone_number?: string;
  created_at?: string;
}

export interface SchemePolicy {
  id: string;
  title: string;
  code?: string;
  ministry: string;
  provider?: string;
  description?: string;
  eligibility?: string;
  education_level?: string;
  income_criteria?: string;
  benefits?: string;
  required_documents?: string[];
  application_window?: string;
  deadline?: string;
  scheme_status?: string;
  official_url?: string;
  last_verified_at?: string;
  max_income_limit?: number;
  min_marks_percentage?: number;
  eligible_communities: string[];
  version: number;
  is_active: boolean;
  scholarship_amount?: number;
  created_at?: string;
}

export interface SchemeEligibilityCheck {
  criterion: string;
  required_value: string;
  student_value: string;
  is_satisfied: boolean;
  explanation: string;
}

export interface SchemeMatchItem {
  scheme_id: string;
  title: string;
  ministry: string;
  scholarship_amount?: number;
  is_eligible: boolean;
  eligibility_score: number;
  breakdown: SchemeEligibilityCheck[];
}

export interface DocumentRecord {
  id: string;
  application_id: string;
  doc_type: DocumentType;
  file_name?: string;
  file_path: string;
  mime_type?: string;
  processing_status: "pending" | "in_progress" | "processed" | "failed";
  ocr_extracted_data?: {
    doc_type: string;
    confidence_score?: number;
    extracted_fields: Record<string, any>;
    raw_text?: string;
  };
  error_message?: string;
  created_at?: string;
}

export interface VerificationFlag {
  id: string;
  application_id: string;
  field_name: string;
  source_doc_a: string;
  value_a?: string;
  source_doc_b: string;
  value_b?: string;
  similarity_score?: number;
  severity: "low" | "medium" | "high";
  rule_triggered: string;
  recommended_action?: string;
  is_resolved: boolean;
  resolution_notes?: string;
  created_at?: string;
}

export interface CrossDocSimilarityMetric {
  field_name: string;
  doc_1: string;
  value_1?: string;
  doc_2: string;
  value_2?: string;
  similarity_score: number;
  status: "MATCH" | "PARTIAL_MATCH" | "MISMATCH";
}

export interface ApplicationDetail {
  id: string;
  student_id: string;
  scheme_id: string;
  status: ApplicationStatus;
  risk_level: RiskLevel;
  submitted_at?: string;
  official_remarks?: string;
  verified_at?: string;
  student?: StudentProfile;
  scheme?: SchemePolicy;
  documents?: DocumentRecord[];
  verification_flags?: VerificationFlag[];
}

export interface ApplicationQueueItem {
  application_id: string;
  student_name: string;
  student_community: string;
  scheme_title: string;
  status: ApplicationStatus;
  risk_level: RiskLevel;
  submitted_at?: string;
  flags_count: number;
  unresolved_flags_count: number;
}

export interface ApplicationAuditPayload {
  application_id: string;
  status: ApplicationStatus;
  risk_level: RiskLevel;
  submitted_at?: string;
  student_profile: StudentProfile;
  scheme_details: SchemePolicy;
  documents_ocr_summary: Record<
    string,
    {
      document_id: string;
      file_name?: string;
      status: string;
      extracted_fields: Record<string, any>;
      confidence_score?: number;
    }
  >;
  cross_document_similarity_matrix: CrossDocSimilarityMetric[];
  explainable_risk_flags: VerificationFlag[];
  official_remarks?: string;
  verified_at?: string;
}

export interface QueuePage {
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: ApplicationQueueItem[];
}

export interface AuditEvent {
  id: string;
  application_id: string;
  actor_role?: string;
  action: string;
  old_status?: string;
  new_status?: string;
  reason?: string;
  created_at: string;
}
