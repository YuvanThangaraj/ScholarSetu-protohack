"use client";

import { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { api } from "@/services/api";
import { DOC_TITLES } from "@/lib/status";
import { cn } from "@/lib/utils";

interface Props {
  documents: Record<string, { document_id: string; file_name?: string }>;
  activeDocType: string;
  onSelectDocType: (docType: string) => void;
}

/** Shows the original uploaded file, fetched with the official's credentials. */
export function SplitDocumentViewer({ documents, activeDocType, onSelectDocType }: Props) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [file, setFile] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = documents[activeDocType];

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    setFile(null);
    setError(null);
    setZoom(100);
    setRotation(0);
    if (!active) return;
    api
      .getDocumentBlob(active.document_id)
      .then((b) => {
        if (cancelled) return;
        url = URL.createObjectURL(b);
        setFile({ url, type: b.type });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [active?.document_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPdf = file?.type === "application/pdf";

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200 shrink-0">
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Documents">
          {Object.keys(documents).map((type) => (
            <button
              key={type}
              role="tab"
              aria-selected={type === activeDocType}
              onClick={() => onSelectDocType(type)}
              className={cn("px-3 py-1.5 rounded-md text-xs whitespace-nowrap", type === activeDocType ? "bg-emerald-700 text-white font-semibold" : "text-slate-700 hover:bg-slate-200")}
            >
              {DOC_TITLES[type] || type}
            </button>
          ))}
        </div>
        {!isPdf && (
          <div className="flex items-center gap-1 shrink-0">
            <button aria-label="Zoom out" className="p-1.5 rounded hover:bg-slate-200" onClick={() => setZoom((z) => Math.max(50, z - 25))}><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs w-9 text-center">{zoom}%</span>
            <button aria-label="Zoom in" className="p-1.5 rounded hover:bg-slate-200" onClick={() => setZoom((z) => Math.min(250, z + 25))}><ZoomIn className="w-4 h-4" /></button>
            <button aria-label="Rotate" className="p-1.5 rounded hover:bg-slate-200" onClick={() => setRotation((r) => (r + 90) % 360)}><RotateCw className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto min-h-[480px] bg-slate-200/60 flex items-center justify-center p-4">
        {!active ? (
          <p className="text-sm text-slate-500">No document uploaded for this type.</p>
        ) : error ? (
          <p role="alert" className="text-sm text-slate-600 text-center max-w-xs">{error} The extracted fields are still shown alongside.</p>
        ) : !file ? (
          <p role="status" className="text-sm text-slate-500">Loading document…</p>
        ) : isPdf ? (
          <iframe title={active.file_name || "Document"} src={file.url} className="w-full h-[640px] bg-white" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={active.file_name || DOC_TITLES[activeDocType] || "Uploaded document"}
            style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
            className="max-w-full origin-center transition-transform bg-white"
          />
        )}
      </div>
    </Card>
  );
}
