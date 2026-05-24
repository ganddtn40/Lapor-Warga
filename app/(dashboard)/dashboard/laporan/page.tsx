"use client";

import { ElementType } from "react";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Inbox, Loader2, RefreshCw, FileText, Clock, CheckCircle2,
  AlertCircle, XCircle, MapPin, Eye,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, addDoc
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  title: string;
  category: string;
  status: "Menunggu" | "Diverifikasi" | "Diproses" | "Selesai" | "Ditolak";
  priority: string;
  location: { address: string };
  userName: string;
  createdAt: Date;
}

const STATUS_STYLE: Record<string, string> = {
  Selesai: "bg-emerald-500/10 text-emerald-600",
  Diproses: "bg-blue-500/10 text-blue-600",
  Diverifikasi: "bg-purple-500/10 text-purple-600",
  Ditolak: "bg-red-500/10 text-red-500",
  Menunggu: "bg-amber-500/10 text-amber-600",
};

const STATUS_ICON: Record<string, ElementType> = {
  Selesai: CheckCircle2,
  Diproses: Clock,
  Diverifikasi: Eye,
  Ditolak: XCircle,
  Menunggu: AlertCircle,
};

const ALL_STATUSES = ["Semua", "Menunggu", "Diverifikasi", "Diproses", "Selesai", "Ditolak"];

const PRIORITY_STYLE: Record<string, string> = {
  Tinggi: "bg-red-500/10 text-red-500",
  Sedang: "bg-amber-500/10 text-amber-600",
  Rendah: "bg-blue-500/10 text-blue-600",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function LaporanPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) { setIsLoading(false); return; }

    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Report[];
      setReports(data);
      setIsLoading(false);
    }, () => {
      toast.error("Gagal memuat data laporan");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSetStatus = useCallback(async (reportId: string, newStatus: string) => {
    if (!db) return;
    setUpdatingId(reportId);
    try {
      const reportRef = doc(db, "reports", reportId);
      const reportSnap = await getDoc(reportRef);
      if (!reportSnap.exists()) throw new Error("Report not found");
      const reportData = reportSnap.data();

      await updateDoc(reportRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user?.name,
      });

      // Send notification to the citizen
      if (reportData.userId && reportData.userId !== user?.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: reportData.userId,
          title: "Status Laporan Diperbarui",
          message: `Laporan "${reportData.title}" sekarang berstatus: ${newStatus}`,
          read: false,
          type: newStatus === "Selesai" ? "success" : newStatus === "Ditolak" ? "error" : "info",
          createdAt: serverTimestamp(),
          link: `/dashboard/detail/${reportId}`,
        });
      }

      toast.success(`Status diperbarui ke "${newStatus}"`);
    } catch {
      toast.error("Gagal memperbarui status");
    } finally {
      setUpdatingId(null);
    }
  }, [user?.uid, user?.name]);

  const filtered = reports.filter((r) => {
    const matchSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Semua" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: "Total Laporan", value: reports.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Menunggu Tindak", value: reports.filter((r) => r.status === "Menunggu").length, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Sedang Diproses", value: reports.filter((r) => r.status === "Diproses" || r.status === "Diverifikasi").length, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Terselesaikan", value: reports.filter((r) => r.status === "Selesai").length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manajemen Laporan</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Pantau dan kelola seluruh laporan dari masyarakat secara real-time.
        </p>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {stats.map((s, i) => (
          <Card key={i} className="p-4 rounded-2xl border border-border/50 shadow-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <>
                <div className={`p-2 rounded-lg w-fit ${s.bg} mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value.toLocaleString("id")}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </>
            )}
          </Card>
        ))}
      </motion.div>

      {/* Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold">Semua Laporan</h3>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari laporan, pengguna, kategori..."
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Cari laporan"
              />
            </div>
          </div>
          {/* Status filters */}
          <div className="flex gap-1.5 flex-wrap">
            {ALL_STATUSES.map((s) => {
              const Icon = STATUS_ICON[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 flex flex-col items-center justify-center text-center">
            <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-semibold">Tidak ada laporan ditemukan</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada laporan masuk."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Laporan", "Kategori", "Pelapor", "Prioritas", "Status", "Tanggal", "Aksi"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${
                        h === "Aksi" ? "text-right" : "text-left"
                      } ${["Pelapor", "Tanggal"].includes(h) ? "hidden lg:table-cell" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((report) => {
                  const isUpdating = updatingId === report.id;
                  return (
                    <tr key={report.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-semibold truncate">{report.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{report.location?.address ?? "—"}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                          {report.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-sm font-medium">{report.userName ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${PRIORITY_STYLE[report.priority ?? "Sedang"]}`}>
                          {report.priority ?? "Sedang"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_STYLE[report.status]}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={report.status}
                            onChange={(e) => handleSetStatus(report.id, e.target.value)}
                            disabled={isUpdating}
                            className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
                            aria-label="Ubah status laporan"
                          >
                            {["Menunggu", "Diverifikasi", "Diproses", "Selesai", "Ditolak"].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => router.push(`/dashboard/detail/${report.id}`)}>
                            <Eye className="w-4 h-4 mr-1" /> Detail
                          </Button>
                          {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between bg-muted/10">
          <p className="text-xs text-muted-foreground">
            Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> dari{" "}
            <span className="font-semibold text-foreground">{reports.length}</span> laporan
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3" /> Update real-time
          </div>
        </div>
      </motion.div>
    </div>
  );
}
