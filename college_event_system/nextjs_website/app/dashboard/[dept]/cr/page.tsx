/// <reference types="react" />
"use client";
import * as React from "react";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Wallet, CheckCircle, TrendingUp } from "lucide-react";

export default function CRDashboard({ params }: { params: { dept: string } }) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ collected: 0, departmentTotal: 0, liveEvents: 0 });

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
          setStats({ collected: 0, departmentTotal: 0, liveEvents: 0 });
          return;
        }

        const selectedEventId = liveEvents[0].id;
        const collRes = await fetch(`${flaskUrl}/api/events/${selectedEventId}/money-collection`, { headers });
        const collData = await collRes.json().catch(() => ({}));
        const collection = (collData.collection ?? []) as Array<{
          year: string;
          branch: string;
          section: string;
          amount_collected: number;
        }>;

        const user = meData.user ?? {};
        const mine = collection.find(
          (row) => row.year === user.year && row.branch === user.branch && row.section === user.section
        );
        const departmentTotal = collection.reduce((sum, row) => sum + (row.amount_collected || 0), 0);

        setStats({
          collected: mine?.amount_collected ?? 0,
          departmentTotal,
          liveEvents: liveEvents.length,
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
        <h2 className="text-3xl font-bold tracking-tight">CR Collection Portal</h2>
        <p className="text-muted-foreground">
          Track and manage event fee collections for your specific class.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-semibold mb-2">
            <Wallet className="w-5 h-5" /> Total Collected
          </div>
          <div className="text-3xl font-bold">{loading ? "-" : `Rs ${stats.collected.toLocaleString()}`}</div>
          <p className="text-sm text-muted-foreground mt-1">Your class collection (latest live event)</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-500 font-semibold mb-2">
            <TrendingUp className="w-5 h-5" /> Department Total
          </div>
          <div className="text-3xl font-bold">{loading ? "-" : `Rs ${stats.departmentTotal.toLocaleString()}`}</div>
          <p className="text-sm text-muted-foreground mt-1">All class entries for latest live event</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-red-500 font-semibold mb-2">
            <CheckCircle className="w-5 h-5" /> Live Events
          </div>
          <div className="text-3xl font-bold text-red-500">{loading ? "-" : stats.liveEvents}</div>
          <p className="text-sm text-muted-foreground mt-1">Available for class collection updates</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/40 font-semibold flex items-center justify-between">
          Class Collection List
          <Link href={`/dashboard/${params.dept}/cr/collection`} className="text-xs text-primary hover:underline">
            Open Collection Page
          </Link>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          Use the collection page to edit your class entry with role-based isolation.
        </div>
      </div>
    </div>
  );
}
