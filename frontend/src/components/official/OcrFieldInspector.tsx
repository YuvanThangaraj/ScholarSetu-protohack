"use client";

import { useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { DOC_TITLES } from "@/lib/status";

interface Props {
  docType: string;
  documentData?: {
    document_id: string;
    file_name?: string;
    status: string;
    confidence_score?: number;
    extracted_fields: Record<string, any>;
  };
  /** Called after a correction is saved so the parent can reload the audit payload. */
  onCorrected?: () => void;
}

export function OcrFieldInspector({ docType, documentData, onCorrected }: Props) {
  const original = documentData?.extracted_fields || {};
  const [fields, setFields] = useState<Record<string, any>>(original);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confidence = documentData?.confidence_score != null ? Math.round(documentData.confidence_score * 100) : null;

  const cancel = () => {
    setFields(original);
    setReason("");
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    if (reason.trim().length < 3) return setError("Add a short reason for the correction.");
    if (!documentData) return;
    setSaving(true);
    setError(null);
    try {
      // Keep numeric fields numeric.
      const typed = Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, typeof original[k] === "number" && v !== "" && !isNaN(Number(v)) ? Number(v) : v])
      );
      await api.correctOcr(documentData.document_id, typed, reason.trim());
      setEditing(false);
      setReason("");
      onCorrected?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="px-5 py-4 flex flex-row items-center justify-between shrink-0 bg-slate-100">
        <CardTitle className="text-sm font-sans font-semibold">Extracted fields · {DOC_TITLES[docType] || docType}</CardTitle>
        <div className="flex items-center gap-2">
          {confidence !== null && <Badge variant={confidence >= 80 ? "success" : "warning"} size="sm">{confidence}% confidence</Badge>}
          {documentData && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="w-3 h-3" /> Correct</Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 flex-1 overflow-y-auto space-y-3">
        {!documentData ? (
          <p className="text-sm text-slate-500">This document has not been uploaded.</p>
        ) : Object.keys(fields).length === 0 ? (
          <p className="text-sm text-slate-500">No fields were extracted{documentData.status !== "processed" ? ` (status: ${documentData.status})` : ""}. Review the original file.</p>
        ) : (
          <dl className="divide-y divide-slate-100">
            {Object.entries(fields).map(([key, value]) => (
              <div key={key} className="py-2.5 grid grid-cols-3 gap-3 items-center">
                <dt className="text-xs text-slate-500 capitalize">{key.replace(/_/g, " ")}</dt>
                <dd className="col-span-2 text-sm text-slate-900 break-words">
                  {editing ? (
                    <input
                      aria-label={key.replace(/_/g, " ")}
                      value={value ?? ""}
                      onChange={(e) => setFields((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-2.5 py-1 text-sm border border-slate-300 rounded bg-white"
                    />
                  ) : typeof value === "number" && key.includes("income") ? `₹${value.toLocaleString("en-IN")}` : String(value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {editing && (
          <div className="space-y-2 pt-2">
            <label className="block text-xs text-slate-600" htmlFor="ocr-reason">Reason for correction (saved to the audit trail)</label>
            <input id="ocr-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white" />
            {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancel} disabled={saving}><X className="w-3 h-3" /> Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving}><Save className="w-3 h-3" /> {saving ? "Saving…" : "Save correction"}</Button>
            </div>
          </div>
        )}

        {documentData?.file_name && <p className="text-xs text-slate-500 pt-2 truncate">File: {documentData.file_name}</p>}
      </CardContent>
    </Card>
  );
}
