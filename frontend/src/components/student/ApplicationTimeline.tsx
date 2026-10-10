"use client";

import { AlertTriangle, Check, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApplicationStatus } from "@/lib/types";
import { statusInfo } from "@/lib/status";
import { cn, formatDate } from "@/lib/utils";

interface Props {
  applicationId: string;
  schemeTitle: string;
  status: ApplicationStatus;
  submittedAt?: string;
  verifiedAt?: string;
  officialRemarks?: string;
  onReuploadTrigger?: () => void;
}

type StepState = "done" | "current" | "todo" | "problem";

export function ApplicationTimeline({ applicationId, schemeTitle, status, submittedAt, verifiedAt, officialRemarks, onReuploadTrigger }: Props) {
  const s = statusInfo(status);
  const submitted = status !== "draft";
  const decided = ["verified", "approved", "rejected"].includes(status);
  const inReview = ["submitted", "under_review", "resubmitted"].includes(status);
  const approved = status === "verified" || status === "approved";

  const steps: { title: string; text: string; state: StepState }[] = [
    {
      title: "Application submitted",
      text: submittedAt ? `Received on ${formatDate(submittedAt)}.` : "Not submitted yet. Finish your application to send it for review.",
      state: submitted ? "done" : "current",
    },
    {
      title: "Officer review",
      text: status === "action_required" ? "An officer needs a corrected document from you." : decided ? "Review completed." : inReview ? "Your documents and details are being checked." : "Starts after you submit.",
      state: status === "action_required" ? "problem" : decided ? "done" : inReview ? "current" : "todo",
    },
    {
      title: decided ? (approved ? "Approved" : "Not approved") : "Decision",
      text: decided ? `${approved ? "Your application was approved" : "Your application was not approved"}${verifiedAt ? ` on ${formatDate(verifiedAt)}` : ""}.` : "You will see the outcome here.",
      state: decided ? "done" : "todo",
    },
  ];

  return (
    <div className="space-y-6">
      {status === "action_required" && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold font-sans">Action required</h2>
              <p className="text-sm text-slate-800 mt-1">{officialRemarks || "An officer asked for a clearer or corrected document."}</p>
            </div>
          </div>
          {onReuploadTrigger && (
            <Button onClick={onReuploadTrigger} className="shrink-0"><UploadCloud className="w-4 h-4" /> Upload documents</Button>
          )}
        </div>
      )}

      {status === "rejected" && officialRemarks && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <p className="font-semibold">Officer remarks</p>
          <p className="mt-1">{officialRemarks}</p>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-semibold">{schemeTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">Reference {applicationId}</p>
          </div>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>

        <ol className="space-y-6">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4" aria-current={step.state === "current" ? "step" : undefined}>
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2",
                    step.state === "done" && "bg-emerald-700 border-emerald-700 text-white",
                    step.state === "current" && "border-emerald-700 text-emerald-800 bg-emerald-50",
                    step.state === "problem" && "border-amber-600 text-amber-800 bg-amber-50",
                    step.state === "todo" && "border-slate-300 text-slate-400"
                  )}
                >
                  {step.state === "done" ? <Check className="w-4 h-4" aria-label="Completed" /> : i + 1}
                </span>
                {i < steps.length - 1 && <span className="flex-1 w-px bg-slate-200 mt-1" />}
              </div>
              <div className="pb-2">
                <h3 className={cn("text-sm font-semibold", step.state === "todo" ? "text-slate-500" : "text-slate-900")}>{step.title}</h3>
                <p className="text-sm text-slate-600 mt-0.5">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
