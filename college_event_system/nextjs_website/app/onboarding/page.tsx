"use client";

import React, { useState } from "react";
import { completeOnboarding } from "./actions";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function OnboardingPage() {
  const [dept, setDept] = useState("computer-science");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const existingRole =
    typeof user?.publicMetadata?.role === "string" && user.publicMetadata.role
      ? user.publicMetadata.role
      : "student";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    // Keep an existing assigned role (e.g. hod/faculty) and only default new users to student.
    const res = await completeOnboarding(dept, existingRole);
    if (res.success) {
      // Must reload session info fully
      await user?.reload();
      router.push(`/dashboard/${dept}/${existingRole}`);
    } else {
      setErrorMessage(res.error ?? "Failed to save profile.");
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex text-white flex-col items-center justify-center bg-neutral-950 p-6 selection:bg-indigo-500/30">
      <div className="max-w-md w-full bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Complete Profile</h1>
        <p className="text-neutral-400 mb-8 font-medium">Please select your department to continue to your dashboard.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-300">Target Department</label>
            <select 
              value={dept} 
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDept(e.target.value)}
              className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
            >
              <option value="computer-science">Computer Science (CS)</option>
              <option value="electronics">Electronics (EC)</option>
              <option value="mechanical">Mechanical (ME)</option>
              <option value="civil">Civil (CE)</option>
              <option value="management">Management (MBA)</option>
            </select>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? "Saving Profile..." : "Continue to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
