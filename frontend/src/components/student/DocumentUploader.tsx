"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DocumentRecord, DocumentType } from "@/lib/types";
import { DOC_TITLES } from "@/lib/status";

interface Props {
  /** Documents already stored on the backend; their processing_status is the source of truth. */
  documents: DocumentRecord[];
  onUpload: (docType: DocumentType, file: File) => Promise<void>;
  /** Limit the slots shown (e.g. only the document an officer asked for). */
  only?: DocumentType[];
}

const SLOTS: { type: DocumentType; hint: string; required: boolean }[] = [
  { type: "caste_cert", hint: "Issued by the Tehsildar or Sub-Divisional Magistrate.", required: true },
  { type: "income_cert", hint: "Current financial year, from the revenue authority.", required: true },
  { type: "marksheet", hint: "Latest semester or qualifying exam transcript.", required: true },
  { type: "bonafide", hint: "From your Dean or Principal. Optional.", required: false },
];

const STATE = {
  pending: { label: "Queued for reading", variant: "info" as const },
  in_progress: { label: "Reading document", variant: "info" as const },
  processed: { label: "Read successfully", variant: "success" as const },
  failed: { label: "Could not be read", variant: "danger" as const },
};

const FIELD_LABELS: Record<string, string> = {
  candidate_name: "Name", community_name: "Community", annual_income: "Income",
  marks_percentage: "Marks %", institution_name: "Institution", certificate_number: "Certificate no.",
};

export function DocumentUploader({ documents, onUpload, only }: Props) {
  const [busy, setBusy] = useState<DocumentType | null>(null);
  const [errors, setErrors] = useState<Partial<Record<DocumentType, string>>>({});
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<DocumentType | null>(null);

  const pick = (type: DocumentType) => {
    target.current = type;
    input.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = target.current;
    e.target.value = "";
    if (!file || !type) return;

    const setErr = (m?: string) => setErrors((p) => ({ ...p, [type]: m }));
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return setErr("Use a PDF, JPG or PNG file.");
    if (file.size > 10 * 1024 * 1024) return setErr("File is larger than 10 MB.");

    setErr(undefined);
    setBusy(type);
    try {
      await onUpload(type, file);
    } catch (err: any) {
      setErr(err?.message || "Upload failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={onFile} aria-label="Choose document file" />
      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {SLOTS.filter((s) => !only || only.includes(s.type)).map((slot) => {
          const doc = documents.find((d) => d.doc_type === slot.type);
          const st = doc ? STATE[doc.processing_status] : null;
          const fields = Object.entries(doc?.ocr_extracted_data?.extracted_fields || {})
            .filter(([k, v]) => FIELD_LABELS[k] && v !== null && v !== "")
            .slice(0, 3);
          const uploading = busy === slot.type;

          return (
            <li key={slot.type} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-slate-900">
                  {DOC_TITLES[slot.type]}
                  {slot.required && <span className="text-red-800 text-xs ml-2">Required</span>}
                </p>
                <p className="text-xs text-slate-500">{slot.hint}</p>
                {doc && (
                  <p className="text-xs text-slate-700 flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden /> {doc.file_name}
                  </p>
                )}
                {doc?.processing_status === "processed" && fields.length > 0 && (
                  <p className="text-xs text-slate-600">
                    Detected: {fields.map(([k, v]) => `${FIELD_LABELS[k]} ${v}`).join(" · ")}
                  </p>
                )}
                {doc?.processing_status === "failed" && (
                  <p className="text-xs text-red-800">{doc.error_message || "Please upload a clearer, full-page copy."}</p>
                )}
                {errors[slot.type] && (
                  <p role="alert" className="text-xs text-red-800 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors[slot.type]}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {uploading ? (
                  <Badge variant="info" size="sm"><Loader2 className="w-3 h-3 animate-spin" /> Uploading</Badge>
                ) : (
                  st && (
                    <Badge variant={st.variant} size="sm">
                      {doc!.processing_status === "processed" && <CheckCircle2 className="w-3 h-3" />}
                      {st.label}
                    </Badge>
                  )
                )}
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => pick(slot.type)}>
                  <UploadCloud className="w-4 h-4" /> {doc ? "Replace" : "Upload"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-500 mt-2">PDF, JPG or PNG, up to 10 MB each.</p>
    </div>
  );
}
