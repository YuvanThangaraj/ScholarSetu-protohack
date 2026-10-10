"use client";

import { ProfileWizard } from "@/components/student/ProfileWizard";
import { LoadingState, ErrorState } from "@/components/ui/State";
import { api } from "@/services/api";
import { useLoad } from "@/lib/useLoad";
import { profileCompletion } from "@/lib/status";
import { Progress } from "@/components/ui/Progress";
import { StudentProfile } from "@/lib/types";

export default function StudentProfilePage() {
  const { data: profile, setData, error, loading, reload } = useLoad(() => api.getStudentProfile());

  if (loading) return <LoadingState label="Loading your profile…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const handleSave = async (updated: Partial<StudentProfile>) => {
    setData(await api.saveStudentProfile(updated));
  };
  const { percent } = profileCompletion(profile);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{profile ? "Your profile" : "Create your profile"}</h1>
        <p className="text-sm text-slate-600">
          Enter details exactly as they appear on your certificates. They are checked against your uploaded documents.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Progress value={percent} className="max-w-xs" />
          <span className="text-xs text-slate-500">{percent}% complete</span>
        </div>
      </div>
      {/* key forces the form to re-seed once the loaded profile arrives */}
      <ProfileWizard key={profile?.id ?? "new"} initialData={profile || undefined} onSave={handleSave} />
    </div>
  );
}
