"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { MessageSquare, Copy, Loader2, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface EventInfo {
  title: string;
  date: string;
  fee: number;
  payment_type: string;
  venues?: { name: string };
  clubs?: { name: string };
}

export default function WhatsAppDrafterPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tone, setTone] = useState<"formal" | "casual" | "exciting">("casual");
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEvent(data.event ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, flaskUrl, getToken]);

  async function generateDraft() {
    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/ai/whatsapp-draft`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setDraft(data.message ?? "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/organizer`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">WhatsApp Drafter</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Event info */}
        {!loading && event && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Drafting for</p>
            <h2 className="font-bold text-foreground text-lg">{event.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              📅 {new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
              {event.venues?.name && ` · 📍 ${event.venues.name}`}
              {` · ${event.payment_type === "free" ? "Free" : `₹${event.fee}`}`}
            </p>
          </div>
        )}

        {/* Tone selector */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-3">Message Tone</p>
          <div className="flex gap-3">
            {(["formal", "casual", "exciting"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition capitalize ${
                  tone === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-accent"
                }`}
              >
                {t === "formal" ? "🎓 Formal" : t === "casual" ? "😊 Casual" : "🔥 Exciting"}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generateDraft}
          disabled={generating || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-primary text-white font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating with AI…" : "Generate WhatsApp Message"}
        </button>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* Draft output */}
        {draft && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600" /> Generated Message
              </p>
              <div className="flex gap-2">
                <button
                  onClick={generateDraft}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition ${
                    copied
                      ? "bg-green-500/10 text-green-600 border border-green-500/30"
                      : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[200px] px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono"
            />
            <p className="text-xs text-muted-foreground">You can edit the message before copying.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
