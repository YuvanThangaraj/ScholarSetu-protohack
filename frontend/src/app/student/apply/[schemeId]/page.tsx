"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { DocumentUploader } from "@/components/student/DocumentUploader";
import { api } from "@/services/api";
import { useLoad } from "@/lib/useLoad";
import { profileCompletion, statusInfo, REQUIRED_DOCS, DOC_TITLES } from "@/lib/status";
import { ApplicationDetail, DocumentType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

async function loadContext(schemeId: string) {
  const [scheme, profile, apps] = await Promise.all([api.getScheme(schemeId), api.getStudentProfile(), api.getStudentApplications()]);
  const existing = apps.find((a) => a.scheme_id === schemeId && a.status !== "rejected") || null;
  return { scheme, profile, existing };
}

export default function ApplySchemePage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useLoad(() => loadContext(schemeId), [schemeId]);

  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<ApplicationDetail | null>(null);

  useEffect(() => {
    if (!data?.existing) return;
    // Already past the editable stage: nothing to do here, show tracking instead.
    if (!["draft", "action_required"].includes(data.existing.status)) router.replace(`/student/tracking/${data.existing.id}`);
    else setApp(data.existing);
  }, [data, router]);

  const refresh = async (id: string) => setApp(await api.getApplicationStatus(id));

  // Poll while the backend is still reading documents.
  const reading = app?.documents?.some((d) => d.processing_status === "pending" || d.processing_status === "in_progress");
  useEffect(() => {
    if (!app || !reading) return;
    const t = setInterval(() => refresh(app.id).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [app?.id, reading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error || "Could not load this scheme."} onRetry={reload} />;

  const { scheme, profile } = data;
  const completion = profileCompletion(profile);

  const start = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const created = await api.createApplication(schemeId);
      setApp(await api.getApplicationStatus(created.id));
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const upload = async (type: DocumentType, file: File) => {
    await api.uploadDocument(app!.id, file, type);
    await refresh(app!.id);
  };

  const docs = app?.documents || [];
  const byType = (t: string) => docs.find((d) => d.doc_type === t);
  const missing = REQUIRED_DOCS.filter((t) => !byType(t));
  const unread = docs.some((d) => d.processing_status !== "processed");
  const canSubmit = !!app && missing.length === 0 && !unread;

  const submit = async () => {
    setBusy(true);
    setActionError(null);
    try {
      // The backend decides the new status; we only display what it returns.
      setSubmitted(await api.submitApplication(app!.id));
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    const s = statusInfo(submitted.status);
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-700" />
        <h1 className="text-3xl font-semibold">Application submitted</h1>
        <p className="text-sm text-slate-600">Current status: <Badge variant={s.variant}>{s.label}</Badge></p>
        <Button onClick={() => router.push(`/student/tracking/${submitted.id}`)}>Track your application</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link href="/student/schemes" className="text-sm text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Scholarships
      </Link>

      <div>
        <p className="text-sm text-slate-500">{scheme.ministry}</p>
        <h1 className="text-3xl font-semibold">{scheme.title}</h1>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6 border-y border-slate-200 py-5 text-sm">
        <div><dt className="text-slate-500">Annual grant</dt><dd className="font-semibold">{scheme.scholarship_amount ? formatCurrency(scheme.scholarship_amount) : "As per scheme"}</dd></div>
        <div><dt className="text-slate-500">Family income</dt><dd className="font-semibold">{scheme.income_criteria || (scheme.max_income_limit != null ? `Up to ${formatCurrency(scheme.max_income_limit)}` : "See official criteria")}</dd></div>
        <div><dt className="text-slate-500">Minimum marks</dt><dd className="font-semibold">{scheme.min_marks_percentage != null && scheme.min_marks_percentage > 0 ? `${scheme.min_marks_percentage}%` : "See official criteria"}</dd></div>
      </dl>

      {actionError && <div role="alert" className="p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-900">{actionError}</div>}

      {!profile || completion.percent < 100 ? (
        <EmptyState
          title="Complete your profile first"
          hint="Your profile is checked against your certificates, so it needs to be complete before you apply."
          action={<Link href="/student/profile"><Button>Go to profile</Button></Link>}
        />
      ) : !app ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Before you start</h2>
          <p className="text-sm text-slate-600">
            You will upload: {REQUIRED_DOCS.map((t) => DOC_TITLES[t]).join(", ")}. Each file is read automatically and checked against your profile.
          </p>
          <Button onClick={start} disabled={busy}>{busy ? "Starting…" : "Start application"}</Button>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Upload documents</h2>
            <Badge variant={statusInfo(app.status).variant} size="sm">{statusInfo(app.status).label}</Badge>
          </div>
          <DocumentUploader documents={docs} onUpload={upload} />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-sm text-slate-600" aria-live="polite">
              {missing.length > 0
                ? `Still needed: ${missing.map((t) => DOC_TITLES[t]).join(", ")}.`
                : unread
                ? "Waiting for documents to finish being read…"
                : "All required documents are ready."}
            </p>
            <Button onClick={submit} disabled={!canSubmit || busy}>{busy ? "Submitting…" : "Submit application"}</Button>
          </div>
        </section>
      )}
    </div>
  );
}
