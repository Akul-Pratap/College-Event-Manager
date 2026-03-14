"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Users, Send, CheckCircle, Clock, X, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  member_count?: number;
  departments?: { name: string };
}

interface JoinRequest {
  club_id: string;
  status: "pending" | "approved" | "rejected";
}

export default function StudentClubsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [clubs, setClubs] = useState<Club[]>([]);
  const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [clubsRes, reqsRes] = await Promise.all([
          fetch(`${flaskUrl}/api/clubs`, { headers }),
          fetch(`${flaskUrl}/api/my-club-requests`, { headers }),
        ]);
        const [clubsData, reqsData] = await Promise.all([clubsRes.json(), reqsRes.json()]);
        setClubs(clubsData.clubs ?? []);
        setMyRequests(reqsData.requests ?? []);
      } catch (err) {
        setError("Could not load clubs.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  const getRequestStatus = (clubId: string) =>
    myRequests.find((r) => r.club_id === clubId);

  async function applyToClub(clubId: string, type: "permanent" | "event_only") {
    setApplying(clubId);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/clubs/${clubId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ request_type: type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to apply");
      setMyRequests((prev) => [
        ...prev.filter((r) => r.club_id !== clubId),
        { club_id: clubId, status: "pending" },
      ]);
      setSuccess(`Application submitted to ${clubs.find((c) => c.id === clubId)?.name}!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApplying(null);
    }
  }

  const filtered = clubs.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/student`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Browse Clubs</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4 flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin" />
            <p className="text-sm">Loading clubs…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">No clubs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((club, i) => {
              const req = getRequestStatus(club.id);
              return (
                <motion.div
                  key={club.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
                >
                  {/* Club header */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      {club.logo_url ? (
                        <img src={club.logo_url} alt={club.name} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground leading-snug truncate">{club.name}</h3>
                      {club.member_count !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5">{club.member_count} members</p>
                      )}
                    </div>
                  </div>

                  {club.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
                  )}

                  {/* Status or action */}
                  {req ? (
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl ${
                      req.status === "approved" ? "bg-green-500/10 text-green-600"
                        : req.status === "rejected" ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {req.status === "approved" ? <CheckCircle className="w-3.5 h-3.5" />
                        : req.status === "rejected" ? <X className="w-3.5 h-3.5" />
                        : <Clock className="w-3.5 h-3.5" />}
                      {req.status === "approved" ? "Member"
                        : req.status === "rejected" ? "Application rejected"
                        : "Application pending"}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => applyToClub(club.id, "permanent")}
                        disabled={applying === club.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition disabled:opacity-60"
                      >
                        {applying === club.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Join Club
                      </button>
                      <button
                        onClick={() => applyToClub(club.id, "event_only")}
                        disabled={applying === club.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-accent transition disabled:opacity-60"
                      >
                        Volunteer
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
