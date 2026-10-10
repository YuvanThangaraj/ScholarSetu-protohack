"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sliders, Save, CheckCircle2, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/State";
import { api } from "@/services/api";
import { SchemePolicy } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function PoliciesConfiguratorPage() {
  const [schemes, setSchemes] = useState<SchemePolicy[]>([]);
  const [activeSchemeId, setActiveSchemeId] = useState<string>("");
  const [incomeLimit, setIncomeLimit] = useState<number>(250000);
  const [minMarks, setMinMarks] = useState<number>(50.0);
  const [communitiesStr, setCommunitiesStr] = useState<string>("*");
  const [scholarshipAmount, setScholarshipAmount] = useState<number>(48000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadSchemes = async () => {
    setLoadError(null);
    try {
      const data = await api.getSchemes();
      setSchemes(data);
      if (data.length > 0) selectScheme(data[0]);
    } catch (err: any) {
      setLoadError(err.message);
    }
  };
  useEffect(() => {
    loadSchemes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectScheme = (s: SchemePolicy) => {
    setActiveSchemeId(s.id);
    setIncomeLimit(s.max_income_limit ?? 0);
    setMinMarks(s.min_marks_percentage ?? 0);
    setCommunitiesStr(s.eligible_communities.join(", "));
    setScholarshipAmount(s.scholarship_amount || 0);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveError(null);
    try {
      const commList = communitiesStr
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);

      const updated = await api.updatePolicyRule(activeSchemeId, {
        max_income_limit: incomeLimit,
        min_marks_percentage: minMarks,
        eligible_communities: commList,
        scholarship_amount: scholarshipAmount,
      });

      setSchemes((prev) =>
        prev.map((s) => (s.id === activeSchemeId ? updated : s))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeScheme = schemes.find((s) => s.id === activeSchemeId);
  if (loadError) return <ErrorState message={loadError} onRetry={loadSchemes} />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/official/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600 mb-1 p-0 h-auto hover:bg-transparent">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </Link>

      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
          
          Scholarship policies
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Changes apply to new applications and increase the policy version.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scheme Selector List (Left 1/3) */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Scheme
          </span>
          {schemes.map((s) => (
            <button
              key={s.id}
              onClick={() => selectScheme(s)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                activeSchemeId === s.id
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className={activeSchemeId === s.id ? "text-emerald-100 font-mono" : "text-slate-400 font-mono"}>
                  v{s.version}
                </span>
                <span className={activeSchemeId === s.id ? "text-slate-300" : "text-slate-400"}>
                  {s.ministry}
                </span>
              </div>
              <h3 className="font-bold text-xs line-clamp-2 leading-snug">{s.title}</h3>
              <p className={`text-[11px] mt-1.5 ${activeSchemeId === s.id ? "text-slate-300" : "text-slate-500"}`}>
                Income Cap: {s.max_income_limit != null ? formatCurrency(s.max_income_limit) : "See official criteria"}
              </p>
            </button>
          ))}
        </div>

        {/* Policy Editor Form (Right 2/3) */}
        <div className="md:col-span-2">
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900">
                  {activeScheme?.title || "Scheme Policy Parameters"}
                </CardTitle>
                <Badge variant="secondary" size="sm">
                  Version {activeScheme?.version || 1}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">{activeScheme?.description}</p>
            </CardHeader>

            <CardContent className="p-6">
              {saveError && <p role="alert" className="mb-4 text-sm text-red-800">{saveError}</p>}
              {saveSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Policy saved (version {activeScheme?.version}).</span>
                </div>
              )}

              <form onSubmit={handleSavePolicy} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Family Annual Income Ceiling (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="5000"
                      value={incomeLimit}
                      onChange={(e) => setIncomeLimit(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Applicants declaring income above this threshold will be flagged as high risk.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Minimum Academic Marks Percentage (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      value={minMarks}
                      onChange={(e) => setMinMarks(parseFloat(e.target.value) || 0)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-500 text-sm font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Annual Grant Amount (₹ INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={scholarshipAmount}
                      onChange={(e) => setScholarshipAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Eligible Scheduled Tribe Communities (Comma-separated or * for all)
                  </label>
                  <input
                    type="text"
                    required
                    value={communitiesStr}
                    onChange={(e) => setCommunitiesStr(e.target.value)}
                    placeholder="e.g. *, or GOND, SANTHAL, BHIL, MUNDA"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Use * to indicate open eligibility for all recognized Scheduled Tribes.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
                    <Save className="w-4 h-4 mr-1.5" />
                    {isSubmitting ? "Saving…" : "Save policy"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
