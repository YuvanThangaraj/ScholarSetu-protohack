"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { SplitDocumentViewer } from "@/components/official/SplitDocumentViewer";
import { OcrFieldInspector } from "@/components/official/OcrFieldInspector";
import { ConsistencyMatrix } from "@/components/official/ConsistencyMatrix";
import { RiskFlagBanner } from "@/components/official/RiskFlagBanner";
import { DecisionModal } from "@/components/official/DecisionModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/State";
import { api } from "@/services/api";
import { useLoad } from "@/lib/useLoad";
import { RISK, statusInfo } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";

type Decision = "APPROVE" | "REQUEST_DEFICIENCY" | "REJECT";

export default function ApplicationAuditPage() {
  const { appId } = useParams<{ appId: string }>();
  const audit = useLoad(() => api.getApplicationAudit(appId), [appId]);
  const history = useLoad(() => api.getAuditHistory(appId), [appId]);
  const [activeDoc, setActiveDoc] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const data = audit.data;
  const docs = data?.documents_ocr_summary || {};
  useEffect(() => {
    if (!activeDoc && Object.keys(docs).length) setActiveDoc(Object.keys(docs)[0]);
  }, [docs, activeDoc]);

  if (audit.loading && !data) return <LoadingState label="Loading application…" />;
  if (audit.error || !data) return <ErrorState message={audit.error || "Application not found."} onRetry={audit.reload} />;

  const student = data.student_profile;
  const status = statusInfo(data.status);
  const closed = ["verified", "approved", "rejected"].includes(data.status);

  const decide = async (d: Decision, comments: string) => {
    audit.setData(await api.submitVerificationDecision(appId, d, comments));
    history.reload();
    setNotice("Decision saved.");
  };

  const resolveFlag = async (id: string, notes: string) => {
    await api.resolveFlag(id, notes);
    audit.setData({ ...data, explainable_risk_flags: data.explainable_risk_flags.map((f) => (f.id === id ? { ...f, is_resolved: true, resolution_notes: notes } : f)) });
    history.reload();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-28">
      <div className="space-y-3 border-b border-slate-200 pb-5">
        <Link href="/official/review-queue" className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Review queue</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{student.full_name}</h1>
          <Badge variant={RISK[data.risk_level].variant} size="sm">{RISK[data.risk_level].label}</Badge>
          <Badge variant={status.variant} size="sm">{status.label}</Badge>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div><dt className="text-xs text-slate-500">Scheme</dt><dd>{data.scheme_details.title}</dd></div>
          <div><dt className="text-xs text-slate-500">Community</dt><dd>{student.st_community_code}</dd></div>
          <div><dt className="text-xs text-slate-500">Declared income</dt><dd>{formatCurrency(student.annual_income)}</dd></div>
          <div><dt className="text-xs text-slate-500">Marks</dt><dd>{student.gpa_marks}%</dd></div>
          <div><dt className="text-xs text-slate-500">Submitted</dt><dd>{formatDate(data.submitted_at)}</dd></div>
        </dl>
        {data.official_remarks && <p className="text-sm text-slate-600">Last remarks: {data.official_remarks}</p>}
      </div>

      {notice && <p role="status" className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2"><Check className="w-4 h-4" /> {notice}</p>}

      <RiskFlagBanner flags={data.explainable_risk_flags} onResolveFlag={resolveFlag} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Documents</h2>
        <div className="grid lg:grid-cols-2 gap-6 min-h-[520px]">
          <SplitDocumentViewer documents={docs} activeDocType={activeDoc} onSelectDocType={setActiveDoc} />
          <OcrFieldInspector key={activeDoc} docType={activeDoc} documentData={docs[activeDoc]} onCorrected={audit.reload} />
        </div>
      </section>

      <ConsistencyMatrix metrics={data.cross_document_similarity_matrix} />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Audit history</h2>
        {history.error ? <p role="alert" className="text-sm text-red-800">{history.error}</p> : !history.data?.length ? (
          <p className="text-sm text-slate-500">No events recorded yet.</p>
        ) : (
          <ol className="border-l border-slate-300 ml-2 space-y-4">
            {history.data.map((e) => (
              <li key={e.id} className="pl-4 text-sm">
                <p className="font-medium capitalize">{e.action.replace(/_/g, " ")}{e.new_status && e.old_status !== e.new_status ? ` · ${statusInfo(e.new_status).label}` : ""}</p>
                <p className="text-xs text-slate-500">{e.actor_role} · {new Date(e.created_at).toLocaleString("en-IN")}</p>
                {e.reason && <p className="text-slate-600 mt-0.5">{e.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-50 border-t border-slate-200 p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{closed ? `This application is ${status.label.toLowerCase()}.` : "Record your decision for this application."}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDecision("REJECT")}>Reject</Button>
            <Button variant="outline" onClick={() => setDecision("REQUEST_DEFICIENCY")}>Request correction</Button>
            <Button onClick={() => setDecision("APPROVE")}>Approve</Button>
          </div>
        </div>
      </div>

      <DecisionModal isOpen={!!decision} onClose={() => setDecision(null)} decisionType={decision} applicationId={appId} studentName={student.full_name} onConfirm={decide} />
    </div>
  );
}
