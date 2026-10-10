import { ApplicationStatus, RiskLevel, StudentProfile } from "./types";

type Variant = "default" | "success" | "warning" | "danger" | "info";

export const STATUS: Record<ApplicationStatus, { label: string; variant: Variant }> = {
  draft: { label: "Draft", variant: "default" },
  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under review", variant: "info" },
  resubmitted: { label: "Resubmitted", variant: "info" },
  action_required: { label: "Action required", variant: "warning" },
  verified: { label: "Approved", variant: "success" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export const statusInfo = (s: string) => STATUS[s as ApplicationStatus] ?? { label: s.replace(/_/g, " "), variant: "default" as Variant };

export const RISK: Record<RiskLevel, { label: string; variant: Variant }> = {
  low: { label: "Low risk", variant: "success" },
  medium: { label: "Medium risk", variant: "warning" },
  high: { label: "High risk", variant: "danger" },
};

export const DOC_TITLES: Record<string, string> = {
  caste_cert: "ST community certificate",
  income_cert: "Family income certificate",
  marksheet: "Marksheet",
  bonafide: "Bonafide certificate",
};

export const REQUIRED_DOCS = ["caste_cert", "income_cert", "marksheet"] as const;

const PROFILE_FIELDS: (keyof StudentProfile)[] = [
  "full_name", "phone_number", "st_community_code", "course_name",
  "gpa_marks", "annual_income", "institution_code",
];

export function profileCompletion(p: StudentProfile | null) {
  if (!p) return { percent: 0, missing: PROFILE_FIELDS.map(String) };
  const missing = PROFILE_FIELDS.filter((k) => p[k] === undefined || p[k] === null || p[k] === "").map(String);
  return { percent: Math.round(((PROFILE_FIELDS.length - missing.length) / PROFILE_FIELDS.length) * 100), missing };
}
