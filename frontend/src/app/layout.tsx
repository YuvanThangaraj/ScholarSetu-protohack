import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scholarsetu — ST Scholarship Management",
  description: "Check your eligibility, apply with verified documents and track your scholarship application.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-amber-200">
        <SiteHeader />
        <main className="heritage-main flex-1">{children}</main>
        <footer className="heritage-footer py-6 text-xs text-slate-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <span><span className="font-serif text-sm font-semibold text-emerald-900">Scholarsetu</span> · Scholarship management for Scheduled Tribe students</span>
            <span className="tracking-[.12em] uppercase text-[10px] text-slate-500">A bridge to opportunity</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
