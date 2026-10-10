import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  icon?: React.ReactNode;
}

export function Alert({
  variant = "info",
  title,
  icon,
  children,
  className,
  ...props
}: AlertProps) {
  const variants = {
    info: {
      container: "bg-blue-50/70 border-blue-200 text-blue-900",
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    },
    success: {
      container: "bg-emerald-50/70 border-emerald-200 text-emerald-900",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
    warning: {
      container: "bg-amber-50/70 border-amber-200 text-amber-900",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    },
    danger: {
      container: "bg-red-50/70 border-red-200 text-red-900",
      icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
    },
  };

  const currentVariant = variants[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3.5 p-4 rounded-xl border text-sm transition-all",
        currentVariant.container,
        className
      )}
      {...props}
    >
      {icon ?? currentVariant.icon}
      <div className="flex-1">
        {title && <h5 className="font-semibold text-sm mb-0.5">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-95">{children}</div>
      </div>
    </div>
  );
}
