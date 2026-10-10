"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { SchemeMatcherCard } from "@/components/student/SchemeMatcherCard";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { Reveal } from "@/components/ui/Motion";
import { api } from "@/services/api";
import { useLoad } from "@/lib/useLoad";

async function load() {
  const profile = await api.getStudentProfile();
  return profile ? (await api.matchSchemes()).matches : null;
}

export default function StudentSchemesPage() {
  const { data: matches, error, loading, reload } = useLoad(load);
  const [query, setQuery] = useState("");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  if (loading) return <LoadingState label="Matching scholarships to your profile…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!matches)
    return (
      <EmptyState
        title="Create your profile to see matches"
        hint="Scholarships are matched using your community, marks and family income."
        action={<Link href="/student/profile"><Button>Create profile</Button></Link>}
      />
    );

  const q = query.toLowerCase();
  const shown = matches
    .filter((m) => (!eligibleOnly || m.is_eligible) && (m.title.toLowerCase().includes(q) || m.ministry.toLowerCase().includes(q)))
    .sort((a, b) => Number(b.is_eligible) - Number(a.is_eligible) || b.eligibility_score - a.eligibility_score);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Scholarships</h1>
        <p className="text-sm text-slate-600 mt-1">Each result shows which criteria you meet and which you do not.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" aria-hidden />
          <input
            type="search"
            aria-label="Search scholarships"
            placeholder="Search by scheme or ministry"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm"
          />
        </div>
        <Button variant={eligibleOnly ? "primary" : "outline"} aria-pressed={eligibleOnly} onClick={() => setEligibleOnly(!eligibleOnly)}>
          Eligible only
        </Button>
      </div>

      <div className="space-y-4">
        {shown.map((m, i) => (
          <Reveal key={m.scheme_id} delay={Math.min(i, 6) * 40}>
            <SchemeMatcherCard scheme={m} />
          </Reveal>
        ))}
        {shown.length === 0 && <EmptyState title="No scholarships found" hint="Try a different search or show all schemes." />}
      </div>
    </div>
  );
}
