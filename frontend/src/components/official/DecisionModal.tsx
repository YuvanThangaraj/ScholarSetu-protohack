"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Send, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionType: "APPROVE" | "REQUEST_DEFICIENCY" | "REJECT" | null;
  applicationId: string;
  studentName: string;
  onConfirm: (decision: "APPROVE" | "REQUEST_DEFICIENCY" | "REJECT", comments: string) => Promise<void>;
}

const DEFICIENCY_TEMPLATES = [
  "Discrepancy in annual family income certificate. Please upload an updated revenue tehsildar income declaration.",
  "Scheduled Tribe Community Certificate is illegible or missing official revenue seal/signature.",
  "Candidate name on Marksheet does not match name on ST Caste Certificate. Provide name affidavit or revised marksheet.",
  "Semester academic marks transcript is missing total aggregate percentage.",
];

export function DecisionModal({
  isOpen,
  onClose,
  decisionType,
  applicationId,
  studentName,
  onConfirm,
}: DecisionModalProps) {
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!decisionType) return null;

  const handleTemplateSelect = (template: string) => {
    setComments(template);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(decisionType, comments.trim());
      setComments("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "The decision could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (decisionType) {
      case "APPROVE":
        return "Approve application";
      case "REQUEST_DEFICIENCY":
        return "Request corrected documents";
      case "REJECT":
        return "Reject application";
    }
  };

  const getBadgeColor = () => {
    switch (decisionType) {
      case "APPROVE":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "REQUEST_DEFICIENCY":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "REJECT":
        return "text-red-700 bg-red-50 border-red-200";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {decisionType === "APPROVE" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          {decisionType === "REQUEST_DEFICIENCY" && <AlertTriangle className="w-5 h-5 text-amber-600" />}
          {decisionType === "REJECT" && <XCircle className="w-5 h-5 text-red-600" />}
          <span>{getTitle()}</span>
        </div>
      }
      description={`Application ID: ${applicationId} • Applicant: ${studentName}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template reasons for deficiency */}
        {decisionType === "REQUEST_DEFICIENCY" && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Standard reasons
            </label>
            <div className="space-y-1.5">
              {DEFICIENCY_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTemplateSelect(tmpl)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-xs text-slate-700 transition-colors"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Notes for the record *
          </label>
          <textarea
            required
            rows={4}
            minLength={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={
              decisionType === "APPROVE"
                ? "Enter verification notes confirming tribal community and income compliance..."
                : "Specify clear reason and steps required from student..."
            }
            className="w-full px-3.5 py-2.5 text-xs rounded-md border border-slate-300 focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}

        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            This decision is recorded in the audit history.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={decisionType === "APPROVE" ? "success" : "danger"}
            size="sm"
            disabled={isSubmitting}
            className="gap-1.5"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? "Saving…" : "Confirm decision"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
