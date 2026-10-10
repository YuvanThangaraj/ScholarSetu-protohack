import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileCheck2, ScanSearch, ShieldCheck, Sprout, CheckCircle2, GraduationCap, Landmark } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

const STEPS = [
  { icon: ScanSearch, number: "01", title: "Find your fit", text: "Understand which scholarship schemes may suit your income, marks and community details—with the reasons made clear." },
  { icon: FileCheck2, number: "02", title: "Prepare with confidence", text: "Keep required certificates together, upload readable documents, and see when something needs attention." },
  { icon: ShieldCheck, number: "03", title: "Follow every step", text: "Track an application from submission through review, including corrections and the next action to take." },
];

export default function LandingPage() {
  return (
    <div className="heritage-landing max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-9 sm:pt-14 pb-16 sm:pb-24 space-y-16 sm:space-y-24">
      <Reveal>
        <section className="heritage-hero grid lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.75fr)] items-stretch">
          <div className="relative z-10 px-7 py-10 sm:px-11 sm:py-14 lg:py-16 space-y-6">
            <p className="heritage-kicker">A bridge to opportunity</p>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.7rem] font-semibold text-slate-900 leading-[1.06] max-w-2xl">
              Let opportunity take <span className="italic text-emerald-800">root.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Scholarsetu helps Scheduled Tribe students explore scholarship opportunities, prepare documents, and follow their applications with greater clarity.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/student/dashboard" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-800 text-white text-sm font-semibold shadow-sm hover:bg-emerald-900 hover:-translate-y-0.5 transition-all">
                Enter student portal <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#D8C5A6] text-slate-800 text-sm font-semibold bg-white/70 hover:bg-white transition-colors">
                Explore demo access <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" /> Clear eligibility signals</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" /> Document guidance</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" /> Status tracking</span>
            </div>
          </div>

          <div className="heritage-motif-panel min-h-[340px] lg:min-h-full p-7 sm:p-9 flex flex-col justify-between rounded-b-[1.4rem] lg:rounded-bl-none lg:rounded-r-[1.4rem]">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-[.19em] text-[#E6D5B8]">Scholarsetu pathway</span>
              <Sprout className="w-5 h-5 text-[#D5B56F]" strokeWidth={1.5} />
            </div>
            <div className="relative z-10 flex-1 flex items-center justify-center py-7">
              <div className="heritage-medallion" aria-hidden="true">
                <div className="heritage-medallion-ring heritage-medallion-ring-one" />
                <div className="heritage-medallion-ring heritage-medallion-ring-two" />
                <div className="heritage-medallion-core"><Sprout className="w-11 h-11 text-[#F8F3E8]" strokeWidth={1.25} /></div>
              </div>
            </div>
            <div className="relative z-10 border-t border-[#E6D5B8]/25 pt-5">
              <p className="font-serif text-2xl sm:text-3xl leading-tight text-[#FFF9EA]">A little more clarity.<br />A wider path ahead.</p>
              <p className="text-sm leading-relaxed text-[#E6D5B8] mt-3 max-w-sm">One place to discover schemes, organise documents, and stay informed as an application moves forward.</p>
            </div>
            <span className="heritage-panel-corner heritage-panel-corner-top" aria-hidden="true" />
            <span className="heritage-panel-corner heritage-panel-corner-bottom" aria-hidden="true" />
          </div>
        </section>
      </Reveal>

      <section className="grid lg:grid-cols-[.65fr_1.35fr] gap-8 lg:gap-14 items-start">
        <Reveal>
          <div className="space-y-4 max-w-sm">
            <p className="heritage-kicker">Made to guide, not confuse</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">A clearer journey, from first search to final decision.</h2>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600">Scholarship processes can feel complicated. Scholarsetu brings key steps into view, so students know where they stand and what they can do next.</p>
            <Link href="/student/schemes" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-900 group">
              Browse scholarships <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 75}>
              <article className="heritage-step-card heritage-card h-full rounded-xl p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="heritage-icon-tile w-11 h-11 rounded-xl flex items-center justify-center"><step.icon className="w-5 h-5" strokeWidth={1.65} /></div>
                  <span className="font-serif text-lg italic text-[#B85C38]">{step.number}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{step.text}</p>
                </div>
                <div className="heritage-rule" />
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="heritage-access-panel rounded-2xl p-6 sm:p-9 lg:p-10 grid md:grid-cols-[1fr_auto] gap-7 items-center">
        <div className="space-y-3 max-w-2xl">
          <p className="heritage-kicker">Choose your doorway</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900">The right tools for each role.</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">Students can explore opportunities and follow their applications. Government officers can review submitted applications and document information in their official workspace.</p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 md:min-w-52">
          <Link href="/student/dashboard" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors"><GraduationCap className="w-4 h-4" /> Student portal</Link>
          <Link href="/official/dashboard" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#CBB893] bg-white/75 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-white transition-colors"><Landmark className="w-4 h-4" /> Officials portal</Link>
        </div>
      </section>

      <div className="text-center space-y-3">
        <p className="font-serif italic text-xl sm:text-2xl text-emerald-900">“A bridge is built one step at a time.”</p>
        <p className="text-[10px] uppercase tracking-[.2em] text-slate-500">Scholarsetu · Rooted in opportunity</p>
      </div>
    </div>
  );
}
