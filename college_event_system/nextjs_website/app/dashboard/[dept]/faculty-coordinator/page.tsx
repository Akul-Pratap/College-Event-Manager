"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  UserPlus,
  FileText,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface DutyLeave {
  id: string;
  name: string;
  roll_no: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  events?: { title: string };
}

interface ClubMember {
  id: string;
  designation: string;
  is_permanent: boolean;
  users?: { name: string; roll_no: string };
}

interface MoneyCollection {
  year: string;
  branch: string;
  section: string;
  amount_collected: number;
}

interface Stats {
  total_clubs: number;
  pending_dl: number;
  club_members: number;
  total_collection: number;
}

export default function FacultyCoordinatorDashboard() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [dutyLeaves, setDutyLeaves] = useState<DutyLeave[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [moneyCollection, setMoneyCollection] = useState<MoneyCollection[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_clubs: 0,
    pending_dl: 0,
    club_members: 0,
    total_collection: 0,
  });
  const [loading, setLoading] = useState(true);
  const [processingDL, setProcessingDL] = useState<string | null>(null);

  const flaskUrl =
    process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function loadData() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [dlRes, membersRes, collectionRes] = await Promise.all([
          fetch(`${flaskUrl}/api/duty-leaves/pending`, { headers }),
          fetch(`${flaskUrl}/api/club-members`, { headers }),
          fetch(`${flaskUrl}/api/money-collection`, { headers }),
        ]);

        const [dlData, membersData, collectionData] = await Promise.all([
          dlRes.json().catch(() => ({ duty_leaves: [] })),
          membersRes.json().catch(() => ({ members: [] })),
          collectionRes.json().catch(() => ({ collections: [] })),
        ]);

        setDutyLeaves(dlData.duty_leaves ?? []);
        setClubMembers(membersData.members ?? []);
        setMoneyCollection(collectionData.collections ?? []);

        const totalCollection = (collectionData.collections ?? []).reduce(
          (sum: number, c: MoneyCollection) => sum + c.amount_collected,
          0
        );

        setStats({
          total_clubs: 1,
          pending_dl: (dlData.duty_leaves ?? []).length,
          club_members: (membersData.members ?? []).length,
          total_collection: totalCollection,
        });
      } catch (err) {
        console.error("Failed to load faculty coordinator data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [flaskUrl, getToken]);

  const handleDutyLeaveAction = async (
    dlId: string,
    status: "approved" | "rejected"
  ) => {
    setProcessingDL(dlId);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/duty-leaves/${dlId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setDutyLeaves((prev) => prev.filter((dl) => dl.id !== dlId));
        setStats((prev) => ({ ...prev, pending_dl: prev.pending_dl - 1 }));
      }
    } catch (err) {
      console.error("DL action failed:", err);
    } finally {
      setProcessingDL(null);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Faculty Coordinator Dashboard</h1>
        <p className="page-subtitle">
          Manage clubs, approve duty leaves, and monitor collections
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Club Members",
            value: stats.club_members,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Pending DL",
            value: stats.pending_dl,
            icon: Clock,
            color: "text-yellow-600",
            bg: "bg-yellow-50 dark:bg-yellow-950/30",
          },
          {
            label: "Total Collection",
            value: `₹${stats.total_collection.toLocaleString()}`,
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-950/30",
          },
          {
            label: "Clubs Managed",
            value: stats.total_clubs,
            icon: TrendingUp,
            color: "text-violet-600",
            bg: "bg-violet-50 dark:bg-violet-950/30",
          },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="card-base p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? (
                    <span className="skeleton h-6 w-12 rounded inline-block" />
                  ) : (
                    value
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        {[
          {
            label: "Manage Members",
            href: `/dashboard/${dept}/faculty-coordinator/members`,
            icon: Users,
            color: "bg-blue-500/10 text-blue-600",
          },
          {
            label: "Duty Leave Queue",
            href: `/dashboard/${dept}/faculty-coordinator/duty-leaves`,
            icon: FileText,
            color: "bg-yellow-500/10 text-yellow-600",
          },
          {
            label: "Money Collection",
            href: `/dashboard/${dept}/faculty-coordinator/money-collection`,
            icon: DollarSign,
            color: "bg-green-500/10 text-green-600",
          },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link
            key={label}
            href={href}
            className="card-hover p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-foreground">{label}</span>
          </Link>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Duty Leaves */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Pending Duty Leaves
              {dutyLeaves.length > 0 && (
                <span className="badge-warning text-xs">{dutyLeaves.length}</span>
              )}
            </h2>
            <Link
              href={`/dashboard/${dept}/faculty-coordinator/duty-leaves`}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-base p-4 space-y-2">
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : dutyLeaves.length === 0 ? (
            <div className="card-base p-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No pending duty leave requests
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dutyLeaves.slice(0, 5).map((dl) => (
                <div key={dl.id} className="card-base p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {dl.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dl.roll_no} • {dl.events?.title ?? "Event"}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-3">
                    <p>
                      📅 {new Date(dl.date).toLocaleDateString("en-IN")}
                    </p>
                    <p>
                      ⏰ {dl.start_time} – {dl.end_time}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDutyLeaveAction(dl.id, "approved")}
                      disabled={processingDL === dl.id}
                      className="flex-1 btn-primary text-xs py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDutyLeaveAction(dl.id, "rejected")}
                      disabled={processingDL === dl.id}
                      className="flex-1 btn-danger-outline text-xs py-1.5 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Club Members */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Club Members
            </h2>
            <Link
              href={`/dashboard/${dept}/faculty-coordinator/members`}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Manage
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-14 rounded-lg" />
              ))}
            </div>
          ) : clubMembers.length === 0 ? (
            <div className="card-base p-8 text-center">
              <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No members yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clubMembers.slice(0, 8).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {member.users?.name ?? "Member"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.users?.roll_no}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge-primary text-xs">
                      {member.designation}
                    </span>
                    {member.is_permanent && (
                      <span className="badge-success text-xs">Permanent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Money Collection Summary */}
      {moneyCollection.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Money Collection Summary
            </h2>
            <Link
              href={`/dashboard/${dept}/faculty-coordinator/money-collection`}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Full Report
            </Link>
          </div>

          <div className="table-container">
            <table className="table-base">
              <thead className="table-header">
                <tr>
                  <th className="table-th">Year</th>
                  <th className="table-th">Branch</th>
                  <th className="table-th">Section</th>
                  <th className="table-th text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {moneyCollection.slice(0, 6).map((row, i) => (
                  <tr key={i} className="table-row-hover">
                    <td className="table-td">{row.year}</td>
                    <td className="table-td">{row.branch}</td>
                    <td className="table-td">{row.section}</td>
                    <td className="table-td text-right collection-total">
                      ₹{row.amount_collected.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
