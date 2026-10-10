"use client";

import React, { useState } from "react";
import {
  User,
  ShieldCheck,
  GraduationCap,
  IndianRupee,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { StudentProfile } from "@/lib/types";

interface ProfileWizardProps {
  initialData?: StudentProfile;
  onSave: (data: Partial<StudentProfile>) => Promise<void> | void;
}

const ST_COMMUNITIES = [
  { code: "GOND", name: "Gond (Gondi / Koitur)" },
  { code: "SANTHAL", name: "Santhal (Santal)" },
  { code: "BHIL", name: "Bhil (Bhilala)" },
  { code: "MUNDA", name: "Munda" },
  { code: "ORAON", name: "Oraon (Kurukh)" },
  { code: "KOL", name: "Kol" },
  { code: "MEENA", name: "Meena" },
  { code: "BAIGA", name: "Baiga (PVTG)" },
  { code: "BIRHOR", name: "Birhor (PVTG)" },
  { code: "KONDH", name: "Kondh (Dongria Kondh - PVTG)" },
  { code: "BODO", name: "Bodo" },
];

export function ProfileWizard({ initialData, onSave }: ProfileWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<StudentProfile>>(
    initialData || {
      full_name: "",
      st_community_code: "",
      annual_income: undefined,
      course_name: "",
      institution_code: "",
      institution_name: "",
      gpa_marks: undefined,
      phone_number: "",
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const steps = [
    { id: 1, label: "Personal Info", icon: User },
    { id: 2, label: "ST Community", icon: ShieldCheck },
    { id: 3, label: "Academics", icon: GraduationCap },
    { id: 4, label: "Income & Family", icon: IndianRupee },
    { id: 5, label: "Institution", icon: Building2 },
  ];

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    // Steps unmount their inputs, so browser validation cannot see earlier steps; check them here.
    const stepOf: [keyof StudentProfile, number][] = [
      ["full_name", 1], ["phone_number", 1], ["st_community_code", 2], ["course_name", 3],
      ["gpa_marks", 3], ["annual_income", 4], ["institution_code", 5],
    ];
    const bad = stepOf.find(([k]) => formData[k] === undefined || formData[k] === "" || formData[k] === null);
    if (bad) {
      setCurrentStep(bad[1]);
      setSaveError("Please fill in all required fields before saving.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(formData);
      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || "Could not save your profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="bg-slate-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Your profile</CardTitle>
            <CardDescription className="text-xs mt-1">
              Used to match scholarships and to check against your certificates.
            </CardDescription>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Step {currentStep} of 5
          </span>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          {steps.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? "bg-emerald-700 text-white"
                      : isCompleted
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={`text-[11px] hidden sm:block ${
                    isCurrent ? "text-emerald-800 font-semibold" : "text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-8">
        {saveError && (
          <div role="alert" className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm">{saveError}</div>
        )}
        {successNotice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Profile saved.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Personal Details */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Personal Identification
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name (as per Certificate / Aadhaar) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Koram"
                  value={formData.full_name || ""}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ensure spelling matches exactly with your Scheduled Tribe Community Certificate.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number (Aadhaar Linked) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone_number || ""}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: ST Community Details */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Scheduled Tribe (ST) Community Information
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select ST Community / Tribe Code *
                </label>
                <select
                  value={formData.st_community_code || ""}
                  onChange={(e) => setFormData({ ...formData, st_community_code: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                >
                  <option value="" disabled>Select community</option>
                  {ST_COMMUNITIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-800">
                  ST Community classifications enable automatic eligibility matching for PVTG special quotas, state sub-plans, and centrally funded post-matric schemes.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Academic Credentials */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Current Course & Academic Standing
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Degree / Program Enrolled *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech Computer Science and Engineering"
                  value={formData.course_name || ""}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Qualifying Exam Percentage / Cumulative CGPA *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    placeholder="78.5"
                    value={formData.gpa_marks ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, gpa_marks: e.target.value === "" ? undefined : parseFloat(e.target.value) })
                    }
                    className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-500">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Will be validated via OCR against your uploaded official semester marksheet.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Income Details */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Family Annual Income Declaration
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Annual Family Income (in INR ₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    placeholder="120000"
                    value={formData.annual_income ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, annual_income: e.target.value === "" ? undefined : parseFloat(e.target.value) })
                    }
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                  />
                </div>
                <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900">
                  The system will match this exact numerical amount with the Tehsildar Income Certificate. Most National ST Schemes require income below ₹2,50,000 / ₹6,00,000 per annum.
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Institution Affiliation */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Educational Institution Affiliation
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Institution Code (AISHE / National Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NITR02 / U-0355"
                  value={formData.institution_code || ""}
                  onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Institution / University Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. National Institute of Technology, Rourkela"
                  value={formData.institution_name || ""}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" size="md" onClick={handlePrev}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <Button type="button" variant="primary" size="md" onClick={handleNext}>
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-1.5" />
                {isSubmitting ? "Saving…" : "Save profile"}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
