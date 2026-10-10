import React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  indicatorColor?: string;
  size?: "sm" | "md" | "lg";
}

export function Progress({
  value,
  indicatorColor = "bg-emerald-700",
  size = "sm",
  className,
  ...props
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "w-full bg-slate-200 rounded-full overflow-hidden",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <div
        className={cn("h-full transition-all duration-500 rounded-full", indicatorColor)}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
