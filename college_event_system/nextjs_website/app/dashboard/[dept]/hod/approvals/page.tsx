"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Loader2,
  PanelLeft,
  ClipboardCheck,
  BellRing,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ApprovalRequest {
  id: string;
  stage: 1 | 2;
  approver_role: "faculty_coordinator" | "hod";
  status: "pending" | "approved" | "rejected";
  note: string | null;
  requested_at: string;
  events?: {
    id: string;
    title: string;
    date: string;
    clubs?: { name: string };
    creators?: { name: string };
  };
}

export default function HODApprovalsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/approvals/hod`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setApprovals(data.approvals ?? []);
      } catch (err) {
        setError("Could not load approvals.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  async function decide(approvalId: string, status: "approved" | "rejected") {
    setUpdating(approvalId);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/approvals/${approvalId}/decide`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: noteInputs[approvalId] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setApprovals((prev) => prev.map((a) => a.id === approvalId ? { ...a, status, note: noteInputs[approvalId] } : a));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  }

  const filtered = approvals.filter((a) => filter === "all" || a.status === filter);
  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const approvedCount = approvals.filter((a) => a.status === "approved").length;
  const rejectedCount = approvals.filter((a) => a.status === "rejected").length;

  const navItems = [
    {
      label: "Dashboard",
      href: `/dashboard/${dept}/hod`,
      icon: LayoutDashboard,
      active: false,
    },
    {
      label: "Approvals",
      href: `/dashboard/${dept}/hod/approvals`,
      icon: ClipboardCheck,
      active: true,
      badge: pendingCount,
    },
    {
      label: "Notifications",
      href: `/dashboard/${dept}/hod`,
      icon: BellRing,
      active: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="hidden w-72 min-h-screen border-r border-teal-900/40 bg-slate-950/95 p-6 lg:block">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.22em] text-teal-400">LTSU Admin</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-100">HOD Approval Desk</h1>
            <p className="mt-2 text-sm capitalize text-slate-400">{dept?.replace(/-/g, " ")} department</p>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ label, href, icon: Icon, active, badge }) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                  active
                    ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                    : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                {typeof badge === "number" && badge > 0 ? (
                  <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-xs font-semibold text-teal-300">{badge}</span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
          <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/65 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-teal-400">Approval Console</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-100">Pending Event Requests</h2>
                <p className="mt-1 text-sm text-slate-400">Review and finalize event requests from clubs and faculty coordinators.</p>
              </div>
              <Link
                href={`/dashboard/${dept}/hod`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-teal-500/40 hover:text-teal-300"
              >
                <PanelLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3">
                <p className="text-xs text-teal-300">Pending</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{pendingCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-300">Approved</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{approvedCount}</p>
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                <p className="text-xs text-rose-300">Rejected</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{rejectedCount}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
                <p className="text-xs text-slate-400">Total</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{approvals.length}</p>
              </div>
            </div>
          </header>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                  filter === tab
                    ? "border-teal-500 bg-teal-500/15 text-teal-300"
                    : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
              <Loader2 className="h-7 w-7 animate-spin text-teal-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-14 text-center">
              <CheckCircle className="mx-auto mb-3 h-10 w-10 text-slate-500" />
              <p className="text-lg font-medium text-slate-200">No {filter} requests</p>
              <p className="mt-1 text-sm text-slate-400">Once new event requests arrive, they will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((req) => (
                <article
                  key={req.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5 shadow-[0_0_0_1px_rgba(20,184,166,0.04)]"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        req.status === "approved"
                          ? "bg-emerald-500/15"
                          : req.status === "rejected"
                            ? "bg-rose-500/15"
                            : "bg-teal-500/15"
                      }`}
                    >
                      {req.status === "approved" ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : req.status === "rejected" ? (
                        <XCircle className="h-5 w-5 text-rose-400" />
                      ) : (
                        <Clock className="h-5 w-5 text-teal-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-100">{req.events?.title ?? "Event"}</h3>
                        <span className="rounded-full border border-teal-500/40 bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-300">
                          Stage {req.stage}/2
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                            req.status === "approved"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : req.status === "rejected"
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                                : "border-teal-500/40 bg-teal-500/10 text-teal-300"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {req.events?.clubs?.name && <p className="mt-1 text-sm text-slate-400">Organized by {req.events.clubs.name}</p>}

                      <p className="mt-1 text-xs text-slate-500">
                        Requested{" "}
                        {new Date(req.requested_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {req.events?.date &&
                          ` | Event date: ${new Date(req.events.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}`}
                      </p>
                    </div>

                    {req.note && (
                      <div className="hidden max-w-[240px] items-start gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-300 md:flex">
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" />
                        <span className="line-clamp-3">{req.note}</span>
                      </div>
                    )}
                  </div>

                  {req.status === "pending" && (
                    <div className="space-y-3">
                      <textarea
                        value={noteInputs[req.id] ?? ""}
                        onChange={(e) => setNoteInputs((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Add a decision note (optional)"
                        rows={2}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60"
                      />

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={() => decide(req.id, "approved")}
                          disabled={updating === req.id}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/45 bg-emerald-500/12 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-60"
                        >
                          {updating === req.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve Event
                        </button>

                        <button
                          onClick={() => decide(req.id, "rejected")}
                          disabled={updating === req.id}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/45 bg-rose-500/12 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject Event
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
