import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold transition-all rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:translate-y-px";
    const variants = {
      primary: "bg-emerald-800 text-white hover:bg-emerald-900 focus-visible:ring-emerald-700 shadow-sm",
      secondary: "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700 shadow-sm",
      outline: "border border-[#CBB893] bg-[#FFFCF5] text-slate-800 hover:bg-[#F1E7D4] focus-visible:ring-amber-500",
      ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
      danger: "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700 shadow-sm",
      success: "bg-emerald-800 text-white hover:bg-emerald-900 focus-visible:ring-emerald-700 shadow-sm",
    };
    const sizes = {
      sm: "text-xs px-3 py-2 gap-1.5",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-sm sm:text-base px-5 py-3 gap-2.5",
    };
    return <button ref={ref} disabled={disabled} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>{children}</button>;
  }
);
Button.displayName = "Button";
