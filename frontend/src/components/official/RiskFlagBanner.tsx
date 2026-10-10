"use client";

import React, { useState } from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert, Check } from "lucide-react";
import { VerificationFlag } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface RiskFlagBannerProps {
  flags: VerificationFlag[];
  onResolveFlag?: (flagId: string, notes: string) => Promise<void>;
}

export function RiskFlagBanner({ flags, onResolveFlag }: RiskFlagBannerProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The flag only shows as resolved once the backend has accepted it.
  const handleResolve = async (id: string) => {
    setPending(id);
    setError(null);
    try {
      await onResolveFlag?.(id, "Cleared by official after verification.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPending(null);
    }
  };

  if (!flags || flags.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-xs font-semibold">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>No cross-document mismatches or policy flags were raised for this application.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Risk flags ({flags.length})
          </h4>
        </div>
        <span className="text-[11px] text-slate-500">
          Raised automatically from document checks
        </span>
      </div>

      {error && <p role="alert" className="text-xs text-red-800">{error}</p>}
      <div className="space-y-2.5">
        {flags.map((flag) => {
          const isResolved = flag.is_resolved;
          const isHigh = flag.severity === "high";

          return (
            <div
              key={flag.id}
              className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
                isResolved
                  ? "bg-slate-50 border-slate-200 opacity-60"
                  : isHigh
                  ? "bg-red-50/70 border-red-300 text-red-950"
                  : "bg-amber-50/70 border-amber-300 text-amber-950"
              }`}
            >
              <div className="flex items-start gap-3">
                {isResolved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : isHigh ? (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge
                      variant={isResolved ? "default" : isHigh ? "danger" : "warning"}
                      size="sm"
                      className="text-[10px] uppercase font-bold"
                    >
                      {flag.severity}
                    </Badge>
                    <span className="font-semibold text-slate-800">
                      {flag.field_name.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="leading-relaxed opacity-95">
                    {flag.rule_triggered}
                  </p>
                  {flag.recommended_action && <p className="mt-0.5 text-slate-600">Suggested: {flag.recommended_action}</p>}
                  {flag.is_resolved && flag.resolution_notes && <p className="mt-0.5 text-slate-500">Note: {flag.resolution_notes}</p>}
                </div>
              </div>

              {/* Action */}
              <div className="shrink-0 self-end sm:self-center">
                {isResolved ? (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Resolved
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve(flag.id)}
                    disabled={pending === flag.id}
                    className="h-7 text-xs"
                  >
                    {pending === flag.id ? "Clearing…" : "Clear flag"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
