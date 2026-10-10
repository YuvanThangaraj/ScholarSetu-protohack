"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ApplicationTimeline } from "@/components/student/ApplicationTimeline";
import { DocumentUploader } from "@/components/student/DocumentUploader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState, ErrorState } from "@/components/ui/State";
import { api } from "@/services/api";
import { useLoad } from "@/lib/useLoad";
import { DocumentType } from "@/lib/types";

export default function TrackingPage() {
  const { appId } = useParams<{ appId: string }>();
  const { data: app, setData, error, loading, reload } = useLoad(() => api.getApplicationStatus(appId), [appId]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Keep the status current while the officer review is in progress.
  const waiting = app && ["submitted", "under_review", "resubmitted"].includes(app.status);
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => api.getApplicationStatus(appId).then(setData).catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [waiting, appId, setData]);

  const reading = app?.documents?.some((d) => d.processing_status === "pending" || d.processing_status === "in_progress");
  useEffect(() => {
    if (!reading) return;
    const t = setInterval(() => api.getApplicationStatus(appId).then(setData).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [reading, appId, setData]);

  if (loading && !app) return <LoadingState label="Loading application…" />;
  if (error && !app) return <ErrorState message={error} onRetry={reload} />;
  if (!app) return null;

  const upload = async (type: DocumentType, file: File) => {
    await api.uploadDocument(app.id, file, type);
    setData(await api.getApplicationStatus(app.id));
  };

  const resubmit = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await api.submitApplication(app.id);
      setData(await api.getApplicationStatus(app.id));
      setOpen(false);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/student/dashboard" className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <Button variant="outline" size="sm" onClick={reload} aria-label="Refresh status">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <h1 className="text-3xl font-semibold">Application status</h1>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}

      <ApplicationTimeline
        applicationId={app.id}
        schemeTitle={app.scheme?.title || "Scholarship application"}
        status={app.status}
        submittedAt={app.submitted_at}
        verifiedAt={app.verified_at}
        officialRemarks={app.official_remarks}
        onReuploadTrigger={() => setOpen(true)}
      />

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Upload corrected documents" description="Replace the document the officer asked for, then resubmit." maxWidth="2xl">
        <div className="space-y-4">
          <DocumentUploader documents={app.documents || []} onUpload={upload} />
          {actionError && <p role="alert" className="text-sm text-red-800">{actionError}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500" aria-live="polite">{reading ? "Reading your documents…" : ""}</p>
            <Button onClick={resubmit} disabled={busy || !!reading}>{busy ? "Submitting…" : "Resubmit application"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
