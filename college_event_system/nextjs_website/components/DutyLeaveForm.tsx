"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle } from "lucide-react";

interface DutyLeaveFormProps {
  eventId: string;
  onSuccess?: () => void;
}

export function DutyLeaveForm({ eventId, onSuccess }: DutyLeaveFormProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";
  const [form, setForm] = useState({
    name: "", class: "", batch: "", roll_no: "", date: "", start_time: "", end_time: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/duty-leaves`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, event_id: eventId }),
      });
      if (res.ok) {
        setSubmitted(true);
        onSuccess?.();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit duty leave.");
      }
    } catch {
      alert("Failed to submit duty leave. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <CheckCircle className="w-10 h-10 text-green-500" />
        <p className="font-semibold text-lg">Duty Leave Submitted</p>
        <p className="text-muted-foreground text-sm">Your request has been sent to the Faculty Coordinator for approval.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h3 className="font-semibold text-foreground">Submit Duty Leave Request</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "name", label: "Full Name", type: "text" },
          { key: "roll_no", label: "Roll No", type: "text" },
          { key: "class", label: "Class (e.g. CSE-A)", type: "text" },
          { key: "batch", label: "Batch (e.g. 2022-26)", type: "text" },
          { key: "date", label: "Date", type: "date" },
          { key: "start_time", label: "Start Time", type: "time" },
          { key: "end_time", label: "End Time", type: "time" },
        ].map(({ key, label, type }) => (
          <div key={key} className={key === "name" ? "col-span-2" : ""}>
            <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
            <input
              type={type}
              required
              value={(form as Record<string, string>)[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit Duty Leave"}
      </button>
    </form>
  );
}
