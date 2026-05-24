"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert, CheckSquare, Clock, MapPin, Search, Filter, Inbox, Loader2, RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, addDoc
} from "firebase/firestore";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  location: { address: string };
  status: "Menunggu" | "Diverifikasi" | "Diproses" | "Selesai" | "Ditolak";
  category: string;
  createdAt: Date;
  priority?: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  Tinggi: "bg-red-500/10 text-red-500",
  Sedang: "bg-amber-500/10 text-amber-600",
  Rendah: "bg-blue-500/10 text-blue-600",
};

const STATUS_STYLE: Record<string, string> = {
  Selesai: "bg-emerald-500/10 text-emerald-600",
  Diproses: "bg-blue-500/10 text-blue-600",
  Diverifikasi: "bg-purple-500/10 text-purple-600",
  Ditolak: "bg-red-500/10 text-red-500",
  Menunggu: "bg-muted text-muted-foreground",
};

const STATUS_TRANSITIONS: Record<string, string> = {
  Menunggu: "Diverifikasi",
  Diverifikasi: "Diproses",
  Diproses: "Selesai",
};

const ACTION_LABELS: Record<string, string> = {
  Menunggu: "Verifikasi",
  Diverifikasi: "Mulai Proses",
  Diproses: "Selesaikan",
};

const ALL_STATUSES = ["Semua", "Menunggu", "Diverifikasi", "Diproses", "Selesai", "Ditolak"];

export default function TugasPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) { setIsLoading(false); return; }

    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Task[];
      setTasks(data);
      setIsLoading(false);
    }, (err) => {
      console.error("Tugas fetch error:", err);
      toast.error("Gagal memuat daftar tugas");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = useCallback(async (taskId: string, currentStatus: string) => {
    const nextStatus = STATUS_TRANSITIONS[currentStatus];
    if (!nextStatus || !db) return;
    setUpdatingId(taskId);
    try {
      // Get report details to find userId
      const reportRef = doc(db, "reports", taskId);
      const reportSnap = await getDoc(reportRef);
      const reportData = reportSnap.data();

      await updateDoc(reportRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        ...(nextStatus === "Diverifikasi" && { verifiedBy: user?.name, verifiedAt: serverTimestamp() }),
        ...(nextStatus === "Diproses" && { processedBy: user?.name, processedAt: serverTimestamp() }),
        ...(nextStatus === "Selesai" && { resolvedBy: user?.name, resolvedAt: serverTimestamp() }),
      });

      // Send notification to the user
      if (reportData?.userId) {
        await addDoc(collection(db, "notifications"), {
          userId: reportData.userId,
          title: "Status Laporan Diperbarui",
          message: `Laporan Anda "${reportData.title}" kini berstatus: ${nextStatus}.`,
          read: false,
          type: nextStatus === "Selesai" ? "success" : "info",
          createdAt: serverTimestamp(),
          link: `/dashboard/detail/${taskId}`,
        });
      }

      toast.success(`Status diperbarui ke "${nextStatus}"`);
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Gagal memperbarui status");
    } finally {
      setUpdatingId(null);
    }
  }, [user?.name]);

  const filtered = tasks.filter((t) => {
    const matchSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.location?.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Semua" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: "Menunggu", value: tasks.filter((t) => t.status === "Menunggu").length, color: "text-red-500", bg: "bg-red-500/10", icon: ShieldAlert },
    { label: "Diproses", value: tasks.filter((t) => t.status === "Diproses" || t.status === "Diverifikasi").length, color: "text-blue-500", bg: "bg-blue-500/10", icon: Clock },
    { label: "Selesai", value: tasks.filter((t) => t.status === "Selesai").length, color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckSquare },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Daftar Tugas</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Kelola dan perbarui status laporan yang ditugaskan kepada Anda.
        </p>
      </div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className="p-4 md:p-5 rounded-2xl border border-border/50 shadow-sm flex items-center gap-4">
            {isLoading ? (
              <><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1"><Skeleton className="h-6 w-12 mb-1" /><Skeleton className="h-3 w-20" /></div></>
            ) : (
              <>
                <div className={`p-3 rounded-xl ${s.bg} shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                </div>
              </>
            )}
          </Card>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border/50 gap-3">
          <h3 className="text-base font-bold">Semua Laporan</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari laporan..."
                className="pl-9 h-9 text-sm w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Cari laporan"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-semibold">Tidak ada laporan ditemukan</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada laporan masuk saat ini."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Laporan</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Prioritas</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((task) => {
                  const canUpdate = !!STATUS_TRANSITIONS[task.status];
                  const isUpdating = updatingId === task.id;
                  return (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 max-w-xs">
                        <p className="font-semibold text-foreground truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{task.location?.address ?? "Lokasi tidak diketahui"}</span>
                        </p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${PRIORITY_STYLE[task.priority ?? "Sedang"]}`}>
                          {task.priority ?? "Sedang"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${STATUS_STYLE[task.status]}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canUpdate ? (
                          <Button
                            size="sm"
                            className="h-8 rounded-lg text-xs min-w-[100px]"
                            onClick={() => handleUpdateStatus(task.id, task.status)}
                            disabled={isUpdating}
                            aria-label={`${ACTION_LABELS[task.status]} laporan`}
                          >
                            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : ACTION_LABELS[task.status]}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{task.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {tasks.length} laporan
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3" /> Realtime
          </div>
        </div>
      </motion.div>
    </div>
  );
}
