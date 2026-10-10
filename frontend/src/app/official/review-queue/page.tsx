"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { api } from "@/services/api";
import { useLoad } from "@/lib/useLoad";
import { RISK, statusInfo } from "@/lib/status";
import { cn, formatDate } from "@/lib/utils";

const FILTERS = ["all", "high", "medium", "low"] as const;

export default function ReviewQueuePage() {
  const [risk, setRisk] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useLoad(() => api.getReviewQueue(risk === "all" ? undefined : risk), [risk]);

  const q = query.toLowerCase();
  const rows = (data?.items || []).filter((i) => [i.student_name, i.student_community, i.application_id].some((v) => v.toLowerCase().includes(q)));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold">Review queue</h1>
        <Button variant="outline" size="sm" onClick={reload}><RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" aria-hidden />
          <input type="search" aria-label="Search queue" placeholder="Name, community or ID" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm" />
        </div>
        <div className="flex gap-1" role="group" aria-label="Filter by risk">
          {FILTERS.map((f) => (
            <button key={f} aria-pressed={risk === f} onClick={() => setRisk(f)} className={cn("px-3 py-2 rounded-md text-sm capitalize", risk === f ? "bg-emerald-700 text-white" : "text-slate-700 hover:bg-slate-100")}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={reload} /> : rows.length === 0 ? (
        <EmptyState title="No applications match" hint="Change the filter or search." />
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 border-b border-slate-200">
              <tr><th className="p-3">Applicant</th><th className="p-3">Scheme</th><th className="p-3">Risk</th><th className="p-3">Open flags</th><th className="p-3">Status</th><th className="p-3">Submitted</th><th className="p-3"><span className="sr-only">Open</span></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((i) => (
                <tr key={i.application_id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium">{i.student_name}<span className="block text-xs text-slate-500 font-normal">{i.student_community}</span></td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">{i.scheme_title}</td>
                  <td className="p-3"><Badge variant={RISK[i.risk_level].variant} size="sm">{RISK[i.risk_level].label}</Badge></td>
                  <td className={cn("p-3", i.unresolved_flags_count > 0 && "text-red-800 font-medium")}>{i.unresolved_flags_count}</td>
                  <td className="p-3"><Badge variant={statusInfo(i.status).variant} size="sm">{statusInfo(i.status).label}</Badge></td>
                  <td className="p-3 text-slate-500">{formatDate(i.submitted_at)}</td>
                  <td className="p-3 text-right"><Link className="text-emerald-800 hover:underline" href={`/official/audit/${i.application_id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
