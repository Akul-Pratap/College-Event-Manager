"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface MoneyCollection {
  id: string;
  year: string;
  branch: string;
  section: string;
  amount_collected: number;
  updated_at: string;
  events?: { title: string };
  collectors?: { name: string };
}

export default function FCMoneyCollectionPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [collections, setCollections] = useState<MoneyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/money-collection`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCollections(data.collections ?? []);
      } catch (err) {
        setError("Could not load collections.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  const totalCollected = collections.reduce((sum, c) => sum + c.amount_collected, 0);

  const filtered = collections.filter((c) => {
    const q = search.toLowerCase();
    return (
      !search ||
      c.year.toLowerCase().includes(q) ||
      c.branch.toLowerCase().includes(q) ||
      c.section.toLowerCase().includes(q) ||
      c.events?.title?.toLowerCase().includes(q)
    );
  });

  // Group by event
  const grouped = filtered.reduce<Record<string, MoneyCollection[]>>((acc, c) => {
    const key = c.events?.title ?? "Unknown Event";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/faculty-coordinator`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Money Collection</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">₹{totalCollected.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Classes</p>
              <p className="text-2xl font-bold text-primary">{collections.length}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by year, branch, section, event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">No collections found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([eventTitle, cols]) => (
              <div key={eventTitle} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border">
                  <h3 className="font-semibold text-foreground">{eventTitle}</h3>
                  <span className="text-sm font-bold text-green-600">
                    ₹{cols.reduce((s, c) => s + c.amount_collected, 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {cols.map((col, i) => (
                    <motion.div key={col.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {col.year} {col.branch} — Section {col.section}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(col.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {col.collectors?.name && ` · by ${col.collectors.name}`}
                        </p>
                      </div>
                      <span className="font-bold text-foreground">₹{col.amount_collected.toLocaleString("en-IN")}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
