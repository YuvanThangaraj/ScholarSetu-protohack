"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRightLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CrossDocSimilarityMetric } from "@/lib/types";

interface ConsistencyMatrixProps {
  metrics: CrossDocSimilarityMetric[];
}

export function ConsistencyMatrix({ metrics }: ConsistencyMatrixProps) {
  const getStatusBadge = (status: string, score: number) => {
    switch (status) {
      case "MATCH":
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1" /> {Math.round(score)}% Match
          </Badge>
        );
      case "PARTIAL_MATCH":
        return (
          <Badge variant="warning" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1" /> {Math.round(score)}% Partial
          </Badge>
        );
      default:
        return (
          <Badge variant="danger" size="sm">
            <XCircle className="w-3 h-3 mr-1" /> {Math.round(score)}% Mismatch
          </Badge>
        );
    }
  };

  const getSourceLabel = (src: string) => {
    const labels: Record<string, string> = {
      profile: "Student Profile",
      caste_cert: "Caste Certificate",
      income_cert: "Income Certificate",
      marksheet: "Marksheet",
      bonafide: "Bonafide Cert",
    };
    return labels[src] || src;
  };

  return (
    <Card>
      <CardHeader className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-slate-700" />
          <CardTitle className="text-sm font-semibold text-slate-900">
            Cross-document consistency
          </CardTitle>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Name, income and institution compared across documents
        </span>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 pl-5">Field Tested</th>
                <th className="p-3.5">Source A</th>
                <th className="p-3.5">Source B</th>
                <th className="p-3.5 pr-5 text-right">Fuzzy Similarity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {metrics.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500">No comparisons yet. They appear once documents have been read.</td></tr>
              )}
              {metrics.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 pl-5 font-bold text-slate-900 capitalize">
                    {m.field_name.replace(/_/g, " ")}
                  </td>
                  <td className="p-3.5">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      {getSourceLabel(m.doc_1)}
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {m.value_1 || "—"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      {getSourceLabel(m.doc_2)}
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {m.value_2 || "—"}
                    </span>
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    {getStatusBadge(m.status, m.similarity_score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
