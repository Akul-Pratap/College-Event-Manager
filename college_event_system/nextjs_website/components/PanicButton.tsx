"use client";
import { useState } from "react";
import { AlertTriangle, X, Zap } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

interface PanicButtonProps {
  eventId: string;
  eventTitle: string;
}

export function PanicButton({ eventId, eventTitle }: PanicButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [result, setResult] = useState<{ sent: number; total_registered: number } | null>(null);
  const { getToken } = useAuth();
  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  const triggerPanic = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/events/${eventId}/panic`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Emergency alert! Please evacuate the venue immediately and follow safety instructions." }),
      });
      const data = await res.json();
      setResult(data);
      setSent(true);
      setShowConfirm(false);
    } catch {
      alert("Failed to send emergency notification. Please contact security directly.");
    } finally {
      setLoading(false);
    }
  };

  if (sent && result) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-red-600 font-semibold mb-1">
          <Zap className="w-5 h-5" /> Emergency Alert Sent
        </div>
        <p className="text-sm text-red-500">Notified {result.sent} of {result.total_registered} registered attendees.</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-md"
      >
        <AlertTriangle className="w-4 h-4" /> Panic Button
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
                <AlertTriangle className="w-5 h-5" /> Emergency Alert
              </div>
              <button onClick={() => setShowConfirm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              You are about to send an <strong className="text-red-600">emergency push notification</strong> to all students registered for:
            </p>
            <p className="font-semibold text-foreground mb-4 bg-muted rounded-lg p-2 text-sm">{eventTitle}</p>
            <p className="text-xs text-red-500 mb-5">This cannot be undone. Only use for genuine emergencies.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-border rounded-lg py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={triggerPanic}
                disabled={loading}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
