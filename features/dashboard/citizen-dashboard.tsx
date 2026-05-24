"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle, CheckCircle2, Clock, Plus,
  FileText, ChevronRight, Inbox,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { db } from "@/lib/firebase";
import {
  collection, query, where, orderBy, limit, onSnapshot,
} from "firebase/firestore";

interface Report {
  id: string;
  title: string;
  status: "Menunggu" | "Diverifikasi" | "Diproses" | "Selesai" | "Ditolak";
  createdAt: Date;
  category: string;
}

const STATUS_STYLE: Record<string, string> = {
  Selesai: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Diproses: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Diverifikasi: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Ditolak: "bg-red-500/10 text-red-500",
  Menunggu: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function formatDate(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 172800) return "Kemarin";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function CitizenDashboard() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !user?.uid) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "reports"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() ?? new Date(),
        })) as Report[];
        setReports(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching reports:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const total = reports.length;
  const diproses = reports.filter((r) => r.status === "Diproses" || r.status === "Diverifikasi").length;
  const selesai = reports.filter((r) => r.status === "Selesai").length;

  const stats = [
    { label: "Total Laporan", value: String(total), icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Dalam Proses", value: String(diproses), icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Selesai", value: String(selesai), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/50 rounded-2xl p-5 shadow-sm"
      >
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Overview Laporan Anda
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Punya informasi masalah di sekitarmu? Yuk, laporkan sekarang.
          </p>
        </div>
        <Link href="/dashboard/lapor" className="shrink-0">
          <Button size="sm" className="rounded-xl shadow-sm h-9 px-4 text-sm font-medium">
            <Plus className="w-4 h-4 mr-1.5" />
            Buat Laporan
          </Button>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {stats.map((stat, i) => (
          <div key={i} className="relative group rounded-[20px] overflow-hidden bg-card border border-border/40 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 ${stat.bg.replace('/10', '/30')}`} />
            <div className="p-5 md:p-6 relative z-10 flex flex-col gap-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : (
                <>
                  <div className={`p-2.5 rounded-xl w-fit ${stat.bg} shadow-sm border border-border/10`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-foreground/90">{stat.value}</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Recent Reports */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold">Laporan Terkini</h3>
          <Link href="/dashboard/lapor" className="shrink-0">
            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-full text-xs h-7">
              + Buat Laporan
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="border border-dashed border-border/60 bg-card/50 rounded-[24px] p-12 flex flex-col items-center justify-center text-center">
            <div className="bg-muted p-4 rounded-full mb-5 ring-4 ring-background shadow-sm">
              <Inbox className="w-8 h-8 text-muted-foreground/70" />
            </div>
            <h4 className="text-lg font-bold mb-1.5 text-foreground/90">Belum Ada Laporan</h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Anda belum pernah membuat laporan. Mulai laporkan masalah infrastruktur atau lingkungan di sekitar Anda.
            </p>
            <Link href="/dashboard/lapor">
              <Button className="rounded-full shadow-sm hover:shadow-md transition-shadow h-10 px-6">
                <Plus className="w-4 h-4 mr-2" />
                Buat Laporan Pertama
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border/40 rounded-[24px] shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden">
            <div className="divide-y divide-border/40">
              {reports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  onClick={() => window.location.href = `/dashboard/detail/${report.id}`}
                  className="p-5 hover:bg-muted/30 transition-colors group cursor-pointer flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-primary/20 transition-colors" />
                  <div className="bg-primary/5 p-3 rounded-xl shrink-0 border border-primary/10">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-muted/80 rounded-md text-muted-foreground uppercase tracking-widest">
                        {report.category}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm md:text-base truncate group-hover:text-primary transition-colors text-foreground/90">
                      {report.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${STATUS_STYLE[report.status] ? STATUS_STYLE[report.status] + ' border-current/10' : 'bg-muted border-border'}`}>
                      {report.status}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/40 group-hover:border-primary/30 group-hover:bg-primary/5 transition-colors">
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
