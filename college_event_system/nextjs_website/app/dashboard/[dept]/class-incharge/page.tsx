"use client";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { IndianRupee, ListChecks, CheckCircle } from "lucide-react";

export default function ClassInchargeDashboard({ params }: { params: { dept: string } }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ trackedClasses: 0, totalCollected: 0, myClassCollected: 0 });
  const [rows, setRows] = useState<Array<{ year: string; branch: string; section: string; amount_collected: number }>>([]);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [meRes, eventsRes] = await Promise.all([
          fetch(`${flaskUrl}/api/auth/me`, { headers }),
          fetch(`${flaskUrl}/api/events?status=live&limit=20`, { headers }),
        ]);

        const meData = await meRes.json().catch(() => ({}));
        const eventsData = await eventsRes.json().catch(() => ({}));
        const liveEvents = eventsData.events ?? [];

        if (liveEvents.length === 0) {
          setStats({ trackedClasses: 0, totalCollected: 0, myClassCollected: 0 });
          setRows([]);
          return;
        }

        const eventId = liveEvents[0].id;
        const collRes = await fetch(`${flaskUrl}/api/events/${eventId}/money-collection`, { headers });
        const collData = await collRes.json().catch(() => ({}));
        const collection = (collData.collection ?? []) as Array<{
          year: string;
          branch: string;
          section: string;
          amount_collected: number;
        }>;

        const totalCollected = collection.reduce((sum, r) => sum + (r.amount_collected || 0), 0);
        const user = meData.user ?? {};
        const myRow = collection.find(
          (r) => r.year === user.year && r.branch === user.branch && r.section === user.section
        );

        setRows(collection.slice(0, 5));
        setStats({
          trackedClasses: collection.length,
          totalCollected,
          myClassCollected: myRow?.amount_collected ?? 0,
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [flaskUrl, getToken]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Class Incharge Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor real-time collection data for live events in your department.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-blue-500 font-semibold mb-2">
            <ListChecks className="w-5 h-5" /> Tracked Classes
          </div>
          <div className="text-3xl font-bold">{loading ? "-" : stats.trackedClasses}</div>
          <p className="text-sm text-muted-foreground mt-1">Classes with collection entries</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-purple-500 font-semibold mb-2">
            <IndianRupee className="w-5 h-5" /> Department Total
          </div>
          <div className="text-3xl font-bold">{loading ? "-" : `Rs ${stats.totalCollected.toLocaleString()}`}</div>
          <p className="text-sm text-muted-foreground mt-1">Total collected for selected live event</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-teal-500 font-semibold mb-2">
            <CheckCircle className="w-5 h-5" /> My Class Collection
          </div>
          <div className="text-3xl font-bold">{loading ? "-" : `Rs ${stats.myClassCollected.toLocaleString()}`}</div>
          <p className="text-sm text-muted-foreground mt-1">Your class entry for selected live event</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/40 font-semibold flex justify-between items-center">
          Collection Snapshot
          <Link href={`/dashboard/${params.dept}/class-incharge/collection`} className="text-xs text-primary hover:underline">
            Open Collection Page
          </Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No live collection data available yet.</div>
          ) : (
            rows.map((row, idx) => (
              <div key={`${row.year}-${row.branch}-${row.section}-${idx}`} className="p-4 flex items-center justify-between hover:bg-muted/10">
                <div>
                  <p className="font-medium text-sm">{row.year} / {row.branch} / {row.section}</p>
                  <p className="text-xs text-muted-foreground">Class collection entry</p>
                </div>
                <span className="text-sm font-semibold">Rs {(row.amount_collected || 0).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
