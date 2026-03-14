"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Users,
  Calendar,
  Image,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Shield,
} from "lucide-react";

interface ApprovalRequest {
  id: string;
  stage: number;
  status: string;
  note: string | null;
  requested_at: string;
  events?: {
    id: string;
    title: string;
    date: string;
    department_id: string;
    clubs?: { name: string };
  };
}

interface DeptStats {
  total_events: number;
  live_events: number;
  pending_approvals: number;
  total_registrations: number;
  total_students: number;
}

export default function HODDashboard() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();

  const dept = params?.dept as string;

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [stats, setStats] = useState<DeptStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const flaskUrl =
    process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  const fetchData = async () => {
    try {
      const token = await getToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const [approvalsRes, statsRes] = await Promise.all([
        fetch(`${flaskUrl}/api/approvals`, { headers }),
        fetch(`${flaskUrl}/api/stats/department`, { headers }),
      ]);

      if (approvalsRes.ok) {
        const data = await approvalsRes.json();
        setApprovals(data.approvals ?? []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats ?? null);
      }
    } catch (err) {
      console.error("Failed to fetch HOD data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (approvalId: string) => {
    setProcessingId(approvalId);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved", note: "" }),
      });

      if (res.ok) {
        setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      }
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setRejectNote("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    setProcessingId(selectedApproval.id);
    try {
      const token = await getToken();
      const res = await fetch(
        `${flaskUrl}/api/approvals/${selectedApproval.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "rejected", note: rejectNote }),
        }
      );

      if (res.ok) {
        setApprovals((prev) =>
          prev.filter((a) => a.id !== selectedApproval.id)
        );
        setShowRejectModal(false);
        setSelectedApproval(null);
      }
    } catch (err) {
      console.error("Reject failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const navItems = [
    {
      label: "Approvals",
      href: `/dashboard/${dept}/hod/approvals`,
      icon: CheckCircle,
      count: approvals.length,
    },
    {
      label: "Privilege Escalation",
      href: `/dashboard/${dept}/hod/privilege-escalation`,
      icon: Shield,
    },
    {
      label: "Formal Gallery",
      href: `/dashboard/${dept}/hod/gallery`,
      icon: Image,
    },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-base p-5 space-y-2">
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-8 w-1/3 rounded" />
            </div>
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <h1 className="page-title">HOD Dashboard</h1>
        <p className="page-subtitle capitalize">
          {dept?.replace(/-/g, " ")} Department
        </p>
      </motion.div>

      {/* ── Quick Nav ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 mb-8"
      >
        {navItems.map(({ label, href, icon: Icon, count }) => (
          <button
            key={label}
            onClick={() => router.push(href)}
            className="card-hover p-4 flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{label}</p>
              {count !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {count} pending
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </motion.div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            {
              label: "Live Events",
              value: stats.live_events,
              icon: Calendar,
              color: "text-green-600",
              bg: "bg-green-50 dark:bg-green-950/30",
            },
            {
              label: "Pending Approvals",
              value: stats.pending_approvals,
              icon: Clock,
              color: "text-yellow-600",
              bg: "bg-yellow-50 dark:bg-yellow-950/30",
            },
            {
              label: "Total Events",
              value: stats.total_events,
              icon: TrendingUp,
              color: "text-blue-600",
              bg: "bg-blue-50 dark:bg-blue-950/30",
            },
            {
              label: "Students",
              value: stats.total_students,
              icon: Users,
              color: "text-violet-600",
              bg: "bg-violet-50 dark:bg-violet-950/30",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card-base p-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {value ?? 0}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Pending Approvals ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Pending Approvals
            {approvals.length > 0 && (
              <span className="badge-warning text-xs ml-1">
                {approvals.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => router.push(`/dashboard/${dept}/hod/approvals`)}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {approvals.length === 0 ? (
          <div className="card-base p-10 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-foreground">All clear!</p>
            <p className="text-sm text-muted-foreground mt-1">
              No pending approvals at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.slice(0, 5).map((approval) => (
              <motion.div
                key={approval.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="card-base p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-primary text-xs">
                        Stage {approval.stage}
                      </span>
                      {approval.events?.clubs?.name && (
                        <span className="badge-neutral text-xs">
                          {approval.events.clubs.name}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground truncate">
                      {approval.events?.title ?? "Unknown Event"}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {approval.events?.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(approval.events.date).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" }
                          )}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Requested{" "}
                        {new Date(approval.requested_at).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short" }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(approval.id)}
                      disabled={processingId === approval.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {processingId === approval.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => openRejectModal(approval)}
                      disabled={processingId === approval.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-destructive/50 text-destructive hover:bg-destructive/10 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>

                {/* Approval Stage Progress */}
                <div className="mt-4 flex gap-2">
                  {[1, 2].map((stage) => (
                    <div
                      key={stage}
                      className={`approval-stage flex-1 ${
                        stage < approval.stage
                          ? "completed"
                          : stage === approval.stage
                          ? "pending"
                          : "inactive"
                      }`}
                    >
                      <span className="text-xs font-medium">
                        Stage {stage}:{" "}
                        {stage === 1
                          ? "Faculty Coordinator"
                          : "HOD (You)"}
                      </span>
                      {stage < approval.stage && (
                        <CheckCircle className="w-3.5 h-3.5 text-green-600 ml-auto" />
                      )}
                      {stage === approval.stage && (
                        <Clock className="w-3.5 h-3.5 text-yellow-600 ml-auto animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Analytics Placeholder ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Department Analytics
          </h2>
        </div>
        <div className="card-base p-8 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Detailed analytics charts will appear here after events are created.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Registration trends · Revenue · Attendance rates
          </p>
        </div>
      </motion.div>

      {/* ── Reject Modal ───────────────────────────────────────── */}
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-card-xl"
          >
            <h3 className="text-lg font-bold text-foreground mb-1">
              Reject Event
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting{" "}
              <strong>{selectedApproval.events?.title}</strong>. The organizer
              will be notified.
            </p>

            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (e.g. venue conflict, incomplete details, budget concerns...)"
              rows={4}
              className="input-base resize-none mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedApproval(null);
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectNote.trim() || processingId !== null}
                className="btn-destructive flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {processingId ? "Rejecting..." : "Reject Event"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
