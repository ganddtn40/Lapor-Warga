"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldAlert, CheckSquare, Clock, MapPin, Search, Filter, Inbox, Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
  Selesai: "Lihat Detail",
  Ditolak: "Lihat Detail",
};

export function OfficerDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() ?? new Date(),
      })) as Task[];
      setTasks(data);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching tasks:", err);
      toast.error("Gagal memuat daftar laporan");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = useCallback(async (taskId: string, currentStatus: string) => {
    const nextStatus = STATUS_TRANSITIONS[currentStatus];
    if (!nextStatus || !db) return;

    setUpdatingId(taskId);
    try {
      await updateDoc(doc(db, "reports", taskId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        ...(nextStatus === "Diverifikasi" && { verifiedBy: user?.name, verifiedAt: serverTimestamp() }),
        ...(nextStatus === "Diproses" && { processedBy: user?.name, processedAt: serverTimestamp() }),
        ...(nextStatus === "Selesai" && { resolvedBy: user?.name, resolvedAt: serverTimestamp() }),
      });
      toast.success(`Status laporan diperbarui ke "${nextStatus}"`, {
        description: `ID: ${taskId.slice(0, 8)}...`,
      });
    } catch (err) {
      console.error("Update status error:", err);
      toast.error("Gagal memperbarui status laporan", {
        description: "Periksa koneksi atau izin Firestore Anda.",
      });
    } finally {
      setUpdatingId(null);
    }
  }, [user?.name]);

  const filtered = tasks.filter(
    (t) =>
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.location?.address?.toLowerCase().includes(search.toLowerCase())
  );

  const newCount = tasks.filter((t) => t.status === "Menunggu").length;
  const inProgressCount = tasks.filter((t) => t.status === "Diproses" || t.status === "Diverifikasi").length;
  const doneCount = tasks.filter((t) => t.status === "Selesai").length;

  const stats = [
    { label: "Laporan Baru", value: newCount, icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Sedang Diproses", value: inProgressCount, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Selesai", value: doneCount, icon: CheckSquare, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Petugas</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Selamat bertugas, <strong>{user?.name}</strong>. Berikut adalah laporan yang perlu ditangani.
        </p>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3"
      >
        {stats.map((stat, i) => (
          <Card key={i} className="p-4 md:p-5 rounded-2xl border border-border/50 shadow-sm flex items-center gap-4">
            {isLoading ? (
              <><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1"><Skeleton className="h-7 w-16 mb-1" /><Skeleton className="h-4 w-full" /></div></>
            ) : (
              <>
                <div className={`p-3 rounded-xl ${stat.bg} shrink-0`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                </div>
              </>
            )}
          </Card>
        ))}
      </motion.div>

      {/* Task Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border/50 gap-3">
          <h3 className="text-base font-bold">Daftar Tugas Penanganan</h3>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari laporan..."
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Cari laporan"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Filter">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => router.push(`/dashboard/detail/${task.id}`)}
                          >
                            Lihat Detail
                          </Button>
                          {canUpdate && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 rounded-lg text-xs min-w-[90px]"
                              onClick={() => handleUpdateStatus(task.id, task.status)}
                              disabled={isUpdating}
                              aria-label={`${ACTION_LABELS[task.status] ?? "Lihat Detail"} laporan ${task.title}`}
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                ACTION_LABELS[task.status]
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
