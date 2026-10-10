"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="heritage-login max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 items-start">
        <section className="heritage-auth-intro space-y-5 pt-2">
          <div className="inline-flex items-center gap-2 text-sm text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4" /> Secure account setup
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">Begin your Scholarsetu journey</h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-md">
            Student accounts are created through the configured authentication provider, keeping passwords and account recovery in the secure provider flow.
          </p>
          <div className="border-l-4 border-emerald-700 pl-4 text-sm text-slate-600 space-y-1">
            <p className="font-medium text-slate-800">For students</p>
            <p>Have your ST certificate and basic academic details ready for your profile.</p>
          </div>
          <div className="border-l-4 border-amber-500 pl-4 text-sm text-slate-600 space-y-1">
            <p className="font-medium text-slate-800">For government officers</p>
            <p>Officer access is provisioned by an administrator and is not self-created from this page.</p>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Register as a student</CardTitle>
            <CardDescription>Start with your details. You will continue through the configured secure authentication provider.</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="w-5 h-5" /> Registration details received</div>
                <p>Connect the configured authentication provider to complete account creation. No password or account has been stored by this portal.</p>
                <div className="pt-2"><Link href="/login"><Button size="sm">Go to login <ArrowRight className="w-4 h-4" /></Button></Link></div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label htmlFor="register-name" className="block text-sm font-medium text-slate-800 mb-1.5">Full name</label>
                  <input id="register-name" name="name" required autoComplete="name" className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none" placeholder="Your full name" />
                </div>
                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium text-slate-800 mb-1.5">Email address</label>
                  <input id="register-email" name="email" required type="email" autoComplete="email" className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none" placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="register-community" className="block text-sm font-medium text-slate-800 mb-1.5">ST community</label>
                  <input id="register-community" name="community" required className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none" placeholder="e.g. Gond, Bhil, Santhal" />
                </div>
                <label className="flex items-start gap-2.5 text-sm text-slate-600">
                  <input type="checkbox" required className="mt-1 accent-emerald-700" />
                  <span>I understand that account creation and password handling are completed by the configured authentication provider.</span>
                </label>
                <Button type="submit" size="lg" className="w-full">Continue to secure registration <ArrowRight className="w-4 h-4" /></Button>
                <p className="text-xs text-slate-500">This portal does not store passwords locally. Officer accounts require administrator provisioning.</p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border-emerald-100">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center"><GraduationCap className="w-5 h-5" /></div>
            <div><p className="font-semibold text-slate-900">Just exploring?</p><p className="text-sm text-slate-600">Try Ananya Kumar’s clearly marked demo account.</p></div>
          </div>
          <Link href="/login"><Button variant="outline">View demo login <ArrowRight className="w-4 h-4" /></Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
