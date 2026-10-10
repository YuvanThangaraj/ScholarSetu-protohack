import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "./Button";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="w-4 h-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="max-w-md mx-auto text-center py-14 space-y-3">
      <AlertCircle className="w-6 h-6 mx-auto text-red-700" />
      <p className="text-sm text-slate-800">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto text-center py-14 space-y-2">
      <Inbox className="w-6 h-6 mx-auto text-slate-400" />
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
