"use client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { MessageSquare, Mail, Copy, CheckCheck, Wand2 } from "lucide-react";

interface WhatsAppDrafterProps {
  eventDetails: {
    title: string;
    date: string;
    venue?: string;
    fee?: number;
    club?: string;
    registrationLink?: string;
  };
}

export function WhatsAppDrafter({ eventDetails }: WhatsAppDrafterProps) {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<"whatsapp" | "email">("whatsapp");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  const generateDraft = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/ai/draft-message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ event_details: eventDetails, type: mode }),
      });
      const data = await res.json();
      setDraft(data.draft || "");
    } catch {
      alert("Failed to generate draft. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappLink = mode === "whatsapp" && draft
    ? `https://wa.me/?text=${encodeURIComponent(draft)}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setMode("whatsapp")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === "whatsapp" ? "bg-white shadow text-green-600" : "text-muted-foreground"}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
        </button>
        <button
          onClick={() => setMode("email")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === "email" ? "bg-white shadow text-blue-600" : "text-muted-foreground"}`}
        >
          <Mail className="w-3.5 h-3.5" /> Email
        </button>
      </div>

      <button
        onClick={generateDraft}
        disabled={loading}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
      >
        <Wand2 className="w-4 h-4" />
        {loading ? "Generating..." : `Generate ${mode === "whatsapp" ? "WhatsApp" : "Email"} Draft`}
      </button>

      {draft && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Generated Message</span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/70"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700"
            >
              <MessageSquare className="w-4 h-4" /> Open in WhatsApp
            </a>
          )}
        </div>
      )}
    </div>
  );
}
