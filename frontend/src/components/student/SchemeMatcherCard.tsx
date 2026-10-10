"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Building,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SchemeMatchItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface SchemeMatcherCardProps {
  scheme: SchemeMatchItem;
}

export function SchemeMatcherCard({ scheme }: SchemeMatcherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-500" />
                {scheme.ministry}
              </span>
              {scheme.is_eligible ? (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible
                </Badge>
              ) : (
                <Badge variant="danger" size="sm">
                  <XCircle className="w-3 h-3 mr-1" /> Criteria Not Met
                </Badge>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-950 group-hover:text-slate-800 tracking-tight">
              {scheme.title}
            </h3>

            {!scheme.is_eligible && (
              <p className="text-xs text-red-800 mt-1">
                {scheme.breakdown.filter((b) => !b.is_satisfied).map((b) => b.explanation || b.criterion).join(" ")}
              </p>
            )}

            {scheme.scholarship_amount && (
              <p className="text-xs font-medium text-slate-600 mt-1">
                Disbursement Amount:{" "}
                <span className="text-emerald-700 font-bold">
                  {formatCurrency(scheme.scholarship_amount)} / year
                </span>
              </p>
            )}
          </div>

          {/* AI Match Gauge & Action */}
          <div className="flex items-center gap-4 shrink-0">
            <div
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg border text-center ${getScoreColor(
                scheme.eligibility_score
              )}`}
            >
              <span className="text-base font-extrabold leading-none">
                {Math.round(scheme.eligibility_score)}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">
                Match
              </span>
            </div>

            {scheme.is_eligible && (
              <Link href={`/student/apply/${scheme.scheme_id}`}>
                <Button variant="primary" size="md" className="whitespace-nowrap">
                  Apply <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Expandable Eligibility Breakdown */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" aria-hidden />
              Why this result ({scheme.breakdown.filter((b) => b.is_satisfied).length}/
              {scheme.breakdown.length} criteria satisfied)
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2.5 animate-in fade-in duration-200">
              {scheme.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-md border text-xs flex items-start gap-2.5 ${
                    item.is_satisfied
                      ? "bg-emerald-50/60 border-emerald-200/60 text-emerald-950"
                      : "bg-red-50/60 border-red-200/60 text-red-950"
                  }`}
                >
                  {item.is_satisfied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>{item.criterion}</span>
                      <span className="text-[11px] font-mono opacity-80">
                        Req: {item.required_value} | Yours: {item.student_value}
                      </span>
                    </div>
                    <p className="mt-0.5 opacity-90 leading-relaxed text-[11px]">
                      {item.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
