"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { CountUp, Reveal } from "@/components/ui/Motion";
import { api } from "@/services/api";
import { useLoad } from "@/lib/useLoad";
import { RISK, statusInfo } from "@/lib/status";
import { formatDate } from "@/lib/utils";

export default function OfficialDashboardPage() {
  const { data, error, loading, reload } = useLoad(() => api.getReviewQueue());

  if (loading) return <LoadingState label="Loading review queue…" />;
  if (error || !data) return <ErrorState message={error || "Could not load the queue."} onRetry={reload} />;

  const items = data.items;
  const waitingOnStudent = items.filter((i) => i.status === "action_required").length;
  const stats = [
    { label: "In queue", value: data.total_count },
    { label: "High risk", value: items.filter((i) => i.risk_level === "high").length, alert: true },
    { label: "Unresolved flags", value: items.reduce((n, i) => n + i.unresolved_flags_count, 0) },
    { label: "Waiting on student", value: waitingOnStudent },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Review overview</h1>
            <p className="text-sm text-slate-600 mt-1">Highest-risk applications are listed first.</p>
          </div>
          <Link href="/official/review-queue"><Button>Open review queue <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-y border-slate-200 py-6">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-slate-500">{s.label}</dt>
              <dd className={`text-3xl font-semibold mt-1 ${s.alert && s.value > 0 ? "text-red-800" : ""}`}><CountUp value={s.value} /></dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal delay={120}>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Next to review</h2>
          {items.length === 0 ? (
            <EmptyState title="The queue is empty" hint="Submitted applications will appear here." />
          ) : (
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 border-b border-slate-200">
                  <tr><th className="p-3">Applicant</th><th className="p-3">Scheme</th><th className="p-3">Risk</th><th className="p-3">Status</th><th className="p-3">Submitted</th><th className="p-3"><span className="sr-only">Open</span></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.slice(0, 6).map((i) => (
                    <tr key={i.application_id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium">{i.student_name}<span className="block text-xs text-slate-500 font-normal">{i.student_community}</span></td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{i.scheme_title}</td>
                      <td className="p-3"><Badge variant={RISK[i.risk_level].variant} size="sm">{RISK[i.risk_level].label}</Badge></td>
                      <td className="p-3"><Badge variant={statusInfo(i.status).variant} size="sm">{statusInfo(i.status).label}</Badge></td>
                      <td className="p-3 text-slate-500">{formatDate(i.submitted_at)}</td>
                      <td className="p-3 text-right"><Link className="text-emerald-800 hover:underline" href={`/official/audit/${i.application_id}`}>Review</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}
