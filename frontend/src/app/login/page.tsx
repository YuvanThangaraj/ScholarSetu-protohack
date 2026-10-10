"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clipboard, GraduationCap, Landmark, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type PortalRole = "student" | "official";

type DemoAccount = {
  role: PortalRole;
  label: string;
  name: string;
  email: string;
  password: string;
  destination: string;
  icon: typeof GraduationCap;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "student",
    label: "Student demo",
    name: "Ananya Kumar",
    email: "student.demo@example.com",
    password: "AnanyaDemo!2026",
    destination: "/student/dashboard",
    icon: GraduationCap,
  },
  {
    role: "official",
    label: "Government Officer demo",
    name: "Rahul Sharma",
    email: "officer.demo@example.com",
    password: "RahulDemo!2026",
    destination: "/official/dashboard",
    icon: Landmark,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<PortalRole>("student");
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const selected = DEMO_ACCOUNTS.find((account) => account.role === role)!;

  const selectRole = (nextRole: PortalRole) => {
    setRole(nextRole);
    const account = DEMO_ACCOUNTS.find((item) => item.role === nextRole)!;
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  const signIn = async (accountEmail = email, accountPassword = password, accountRole = role) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.demoLogin(accountEmail.trim(), accountRole, accountPassword);
      if (result.user.role !== accountRole) {
        throw new Error("This account is not enabled for the selected portal.");
      }
      api.storeAuthToken(result.access_token);
      const identity = await api.getCurrentIdentity();
      if (accountRole === "student" && !identity.is_student) throw new Error("Student access could not be verified.");
      if (accountRole === "official" && !identity.is_official) throw new Error("Officer access could not be verified.");
      router.push(accountRole === "student" ? "/student/dashboard" : "/official/dashboard");
    } catch (cause) {
      api.clearAuthToken();
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void signIn();
  };

  const copyCredentials = async (account: DemoAccount) => {
    try {
      await navigator.clipboard.writeText(`Email: ${account.email}\nPassword: ${account.password}`);
      setCopied(account.email);
      window.setTimeout(() => setCopied((current) => (current === account.email ? null : current)), 1800);
    } catch {
      setError("Could not copy credentials. Please select the email manually.");
    }
  };

  return (
    <div className="heritage-login max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-8 items-start">
        <section className="heritage-auth-intro space-y-5 pt-2">
          <div className="inline-flex items-center gap-2 text-sm text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4" /> Secure portal access
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">Sign in to Scholarsetu</h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-md">
            Choose the portal that matches your role. Your session is verified by the existing backend authentication system before you are redirected.
          </p>
          <div className="relative z-10 border-l-4 border-emerald-700 pl-4 py-1.5 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Demo workspace</p>
            <p>Both accounts below are simulated and intended for demonstration only.</p>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Sign in as a student or government officer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100" role="tablist" aria-label="Choose portal">
              <button
                type="button"
                role="tab"
                aria-selected={role === "student"}
                onClick={() => selectRole("student")}
                className={cn("rounded-md px-3 py-2.5 text-sm font-medium transition-colors", role === "student" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                Student
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === "official"}
                onClick={() => selectRole("official")}
                className={cn("rounded-md px-3 py-2.5 text-sm font-medium transition-colors", role === "official" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900")}
              >
                Government Officer
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-800 mb-1.5">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                  placeholder={selected.email}
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-800 mb-1.5">Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                />
              </div>
              {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? "Verifying access…" : `Continue as ${role === "student" ? "student" : "officer"}`}
                {!busy && <ArrowRight className="w-4 h-4" />}
              </Button>
              <p className="text-xs text-slate-500">Production sign-in remains governed by the configured authentication provider. Demo sign-in is available only in development mode.</p>
              <p className="text-sm text-slate-600 text-center">Need an account? <Link href="/register" className="font-semibold text-emerald-800 hover:text-emerald-900 hover:underline">Register as a student</Link></p>
            </form>
          </CardContent>
        </Card>
      </div>

      <section className="mt-10 sm:mt-14 space-y-4" aria-labelledby="demo-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Demo access</p>
            <h2 id="demo-heading" className="text-2xl font-semibold text-slate-900">Try a demo account</h2>
          </div>
          <p className="text-xs text-slate-500">Demo-only accounts · no production credentials</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = account.icon;
            const isCopied = copied === account.email;
            return (
              <Card key={account.email} className="demo-account-card border-emerald-100">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{account.label}</p>
                        <h3 className="font-semibold text-slate-900">{account.name}</h3>
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Demo only</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 space-y-1">
                      <code className="block break-all">Email: {account.email}</code>
                      <code className="block break-all">Password: {account.password}</code>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void copyCredentials(account)} aria-label={`Copy ${account.name} demo credentials`}>
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                      {isCopied ? "Copied" : "Copy credentials"}
                    </Button>
                  </div>
                  <Button type="button" variant="primary" className="w-full" onClick={() => { selectRole(account.role); void signIn(account.email, account.password, account.role); }} disabled={busy}>
                    Demo Login as {account.role === "student" ? "Student" : "Officer"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
