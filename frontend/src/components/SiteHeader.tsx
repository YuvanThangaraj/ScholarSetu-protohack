"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flower2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = {
  student: [
    { href: "/student/dashboard", label: "Dashboard" },
    { href: "/student/schemes", label: "Scholarships" },
    { href: "/student/profile", label: "Profile" },
  ],
  official: [
    { href: "/official/dashboard", label: "Dashboard" },
    { href: "/official/review-queue", label: "Review queue" },
    { href: "/official/policies", label: "Policies" },
  ],
};

export function SiteHeader() {
  const path = usePathname() || "/";
  const area = path.startsWith("/official") ? "official" : path.startsWith("/student") ? "student" : null;

  return (
    <header className="heritage-header sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 shrink-0 group" aria-label="Scholarsetu home">
          <span className="heritage-brand-mark w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:rotate-6" aria-hidden="true">
            <Flower2 className="w-5 h-5" strokeWidth={1.5} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-xl font-semibold tracking-tight text-emerald-900">Scholarsetu</span>
            <span className="text-[10px] sm:text-[11px] tracking-[.08em] uppercase text-slate-600 mt-0.5">
              {area === "official" ? "Officials portal" : area === "student" ? "Student portal" : "Rooted in opportunity"}
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1.5 sm:gap-2">
          {area
            ? NAV[area].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={path.startsWith(n.href) ? "page" : undefined}
                  className="heritage-nav-link px-3 py-2 rounded-full text-sm text-slate-600"
                >
                  {n.label}
                </Link>
              ))
            : null}
          <Link
            href="/login"
            aria-current={path.startsWith("/login") ? "page" : undefined}
            className={cn(
              "heritage-nav-link heritage-nav-cta inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold",
              path.startsWith("/login") && "ring-2 ring-amber-300 ring-offset-2 ring-offset-[#F8F3E8]"
            )}
          >
            Login <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <Link
            href="/register"
            aria-current={path.startsWith("/register") ? "page" : undefined}
            className={cn(
              "heritage-nav-link hidden sm:inline-flex px-3 py-2 rounded-full text-sm text-slate-600",
              path.startsWith("/register") && "font-semibold"
            )}
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
