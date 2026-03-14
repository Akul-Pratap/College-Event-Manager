"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { FileText, Download, User, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Response {
  id: string;
  registered_at: string;
  users?: { name: string; email: string; roll_no?: string };
  answers: Array<{ label: string; answer: string }>;
}

export default function ResponsesPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;
  const eventId = params?.id as string;

  const [eventTitle, setEventTitle] = useState("");
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [evtRes, rspRes] = await Promise.all([
          fetch(`${flaskUrl}/api/events/${eventId}`, { headers }),
          fetch(`${flaskUrl}/api/events/${eventId}/responses`, { headers }),
        ]);
        const [evtData, rspData] = await Promise.all([evtRes.json(), rspRes.json()]);
        setEventTitle(evtData.event?.title ?? "Event");
        setResponses(rspData.responses ?? []);
      } catch (err) {
        setError("Could not load responses.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, flaskUrl, getToken]);

  async function exportCSV() {
    const token = await getToken();
    const res = await fetch(`${flaskUrl}/api/events/${eventId}/responses/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle}_responses.csv`;
    a.click();
  }

  const filtered = responses.filter((r) => {
    const q = search.toLowerCase();
    return (
      !search ||
      r.users?.name?.toLowerCase().includes(q) ||
      r.users?.email?.toLowerCase().includes(q) ||
      r.users?.roll_no?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${dept}/organizer`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
            <span className="font-bold text-foreground truncate">Responses — {eventTitle}</span>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm text-foreground hover:bg-accent transition">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Search + count */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 py-2 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {!loading && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {filtered.length} / {responses.length} responses
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">No responses found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{r.users?.name ?? "Student"}</p>
                    <p className="text-xs text-muted-foreground">{r.users?.email} {r.users?.roll_no ? `· ${r.users.roll_no}` : ""}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(r.registered_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </button>
                {expanded === r.id && r.answers.length > 0 && (
                  <div className="border-t border-border p-4 space-y-3 bg-muted/30">
                    {r.answers.map((a) => (
                      <div key={a.label}>
                        <p className="text-xs font-medium text-muted-foreground">{a.label}</p>
                        <p className="text-sm text-foreground mt-0.5">{a.answer || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
