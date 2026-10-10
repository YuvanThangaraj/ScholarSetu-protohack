"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/State";
import { CountUp, Reveal } from "@/components/ui/Motion";
import { api } from "@/services/api";
import { useLoad } from "@/lib/useLoad";
import { profileCompletion, statusInfo, DOC_TITLES } from "@/lib/status";
import { ApplicationDetail } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

async function loadDashboard() {
  const profile = await api.getStudentProfile();
  if (!profile) return { profile, matches: [], applications: [] };
  const [m, applications] = await Promise.all([api.matchSchemes(), api.getStudentApplications()]);
  return { profile, matches: m.matches, applications };
}

function nextAction(profileDone: boolean, apps: ApplicationDetail[], hasEligible: boolean) {
  if (!profileDone) return { text: "Complete your profile so we can match you to schemes.", href: "/student/profile", cta: "Complete profile" };
  const fix = apps.find((a) => a.status === "action_required");
  if (fix) return { text: "An officer asked for a corrected document.", href: `/student/tracking/${fix.id}`, cta: "Fix and resubmit" };
  const draft = apps.find((a) => a.status === "draft");
  if (draft) return { text: "You have an application that has not been submitted yet.", href: `/student/apply/${draft.scheme_id}`, cta: "Continue application" };
  if (apps.length) return { text: "Your application is with the verification team. No action needed right now.", href: `/student/tracking/${apps[0].id}`, cta: "View progress" };
  return hasEligible
    ? { text: "You are eligible for scholarships. Pick one to start applying.", href: "/student/schemes", cta: "Browse scholarships" }
    : { text: "See which scholarships match your profile.", href: "/student/schemes", cta: "Browse scholarships" };
}

export default function StudentDashboardPage() {
  const { data, error, loading, reload } = useLoad(loadDashboard);

  if (loading) return <LoadingState label="Loading your dashboard…" />;
  if (error || !data) return <ErrorState message={error || "Could not load your dashboard."} onRetry={reload} />;

  const { profile, matches, applications } = data;
  const { percent, missing } = profileCompletion(profile);
  const eligible = matches.filter((m) => m.is_eligible);
  const docIssues = applications.flatMap((a) =>
    (a.documents || []).filter((d) => d.processing_status === "failed").map((d) => ({ app: a, doc: d }))
  );
  const needsAction = applications.filter((a) => a.status === "action_required");
  const action = nextAction(percent === 100, applications, eligible.length > 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <Reveal>
        <h1 className="text-3xl font-semibold text-slate-900">
          {profile ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Welcome"}
        </h1>
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-red-800 bg-white pl-5 pr-4 py-4 rounded-r-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-800">Next step</p>
            <p className="text-slate-800 mt-0.5">{action.text}</p>
          </div>
          <Link href={action.href}>
            <Button variant="primary">{action.cta} <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      </Reveal>

      {!profile ? (
        <EmptyState
          title="You have not created a profile yet"
          hint="Add your community, marks and income details to see scholarships you qualify for."
          action={<Link href="/student/profile"><Button>Create profile</Button></Link>}
        />
      ) : (
        <>
          <Reveal delay={60}>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 border-y border-slate-200 py-6">
              <div>
                <dt className="text-xs text-slate-500">Profile completion</dt>
                <dd className="text-2xl font-semibold mt-1"><CountUp value={percent} />%</dd>
                <Progress value={percent} className="mt-2" />
                {missing.length > 0 && <Link href="/student/profile" className="text-xs text-red-800 hover:underline mt-1 inline-block">{missing.length} field{missing.length > 1 ? "s" : ""} missing</Link>}
              </div>
              <div>
                <dt className="text-xs text-slate-500">Eligible scholarships</dt>
                <dd className="text-2xl font-semibold mt-1"><CountUp value={eligible.length} /> <span className="text-sm font-normal text-slate-500">of {matches.length}</span></dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Applications</dt>
                <dd className="text-2xl font-semibold mt-1"><CountUp value={applications.length} /></dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Documents needing attention</dt>
                <dd className={`text-2xl font-semibold mt-1 ${docIssues.length + needsAction.length ? "text-red-800" : ""}`}>
                  <CountUp value={docIssues.length + needsAction.length} />
                </dd>
              </div>
            </dl>
          </Reveal>

          {(needsAction.length > 0 || docIssues.length > 0) && (
            <Reveal delay={100}>
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-2" aria-label="Documents needing attention">
                <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-700" /> Needs your attention</h2>
                <ul className="text-sm text-slate-800 space-y-1">
                  {needsAction.map((a) => (
                    <li key={a.id}>
                      <Link className="underline" href={`/student/tracking/${a.id}`}>{a.scheme?.title || "Application"}</Link>: {a.official_remarks || "an officer requested a corrected document."}
                    </li>
                  ))}
                  {docIssues.map(({ app, doc }) => (
                    <li key={doc.id}>
                      {DOC_TITLES[doc.doc_type] || doc.doc_type} could not be read for <Link className="underline" href={`/student/tracking/${app.id}`}>{app.scheme?.title || "your application"}</Link>. Please upload a clearer copy.
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          <div className="grid lg:grid-cols-2 gap-10">
            <Reveal delay={140}>
              <section aria-label="Applications" className="space-y-3">
                <h2 className="text-xl font-semibold">Your applications</h2>
                {applications.length === 0 ? (
                  <p className="text-sm text-slate-500">You have not started any application.</p>
                ) : (
                  <ul className="divide-y divide-slate-200 border-y border-slate-200">
                    {applications.map((a) => {
                      const s = statusInfo(a.status);
                      return (
                        <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{a.scheme?.title || "Scholarship application"}</p>
                            <p className="text-xs text-slate-500">{a.submitted_at ? `Submitted ${formatDate(a.submitted_at)}` : "Not submitted"}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant={s.variant} size="sm">{s.label}</Badge>
                            <Link href={a.status === "draft" ? `/student/apply/${a.scheme_id}` : `/student/tracking/${a.id}`} className="text-sm text-emerald-800 hover:underline">
                              {a.status === "draft" ? "Continue" : "Track"}
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </Reveal>

            <Reveal delay={180}>
              <section aria-label="Recommended scholarships" className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold">Recommended for you</h2>
                  <Link href="/student/schemes" className="text-sm text-emerald-800 hover:underline">All scholarships</Link>
                </div>
                {eligible.length === 0 ? (
                  <p className="text-sm text-slate-500">No scheme matches your current profile. Check your income and marks, or review the criteria on the scholarships page.</p>
                ) : (
                  <ul className="divide-y divide-slate-200 border-y border-slate-200">
                    {eligible.slice(0, 3).map((m) => (
                      <li key={m.scheme_id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{m.title}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> {Math.round(m.eligibility_score)}% match
                            {m.scholarship_amount ? ` · ${formatCurrency(m.scholarship_amount)} / year` : ""}
                          </p>
                        </div>
                        <Link href={`/student/apply/${m.scheme_id}`}><Button size="sm" variant="outline">Apply</Button></Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}
