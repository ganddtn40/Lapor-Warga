"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, FileWarning, CheckCircle, Activity, ArrowUpRight,
  Map, TrendingUp, TrendingDown,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";

import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";



interface TooltipEntry {
  name: string;
  value: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name === "masuk" ? "Masuk" : "Selesai"}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AdminDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [totalReports, setTotalReports] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [activeOfficers, setActiveOfficers] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);

  useEffect(() => {
    // Fetch active officers
    if (db) {
      const qOfficers = query(collection(db, "users"), where("role", "==", "officer"));
      onSnapshot(qOfficers, (snap) => setActiveOfficers(snap.size), () => {});
    }
  }, []);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTotalReports(snapshot.size);
      
      let resolved = 0;
      const catCount: Record<string, number> = {};
      const dayCount: Record<number, { masuk: number, selesai: number }> = {
        0: {masuk: 0, selesai: 0}, 1: {masuk: 0, selesai: 0}, 2: {masuk: 0, selesai: 0},
        3: {masuk: 0, selesai: 0}, 4: {masuk: 0, selesai: 0}, 5: {masuk: 0, selesai: 0}, 6: {masuk: 0, selesai: 0}
      };

      let totalResponseTimeMs = 0;
      let responseTimeCount = 0;

      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.status === "Selesai") resolved++;
        
        // Category count
        catCount[data.category] = (catCount[data.category] || 0) + 1;

        // Response time calculation
        if (data.createdAt && data.processedAt) {
          const created = data.createdAt.toDate();
          const processed = data.processedAt.toDate();
          totalResponseTimeMs += (processed.getTime() - created.getTime());
          responseTimeCount++;
        }

        // Day count
        if (data.createdAt) {
          const date = data.createdAt.toDate();
          const day = date.getDay(); // 0 = Sunday
          dayCount[day].masuk++;
          if (data.status === "Selesai") dayCount[day].selesai++;
        }
      });

      setResolvedCount(resolved);

      const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      setWeeklyData(
        [1, 2, 3, 4, 5, 6, 0].map(d => ({
          name: days[d],
          masuk: dayCount[d].masuk,
          selesai: dayCount[d].selesai,
        }))
      );

      setCategoryData(
        Object.entries(catCount)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
      );

      if (responseTimeCount > 0) {
        setAvgResponseTime(totalResponseTimeMs / responseTimeCount / (1000 * 60 * 60)); // in hours
      }

      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, []);

  const resolveRate = totalReports > 0
    ? Math.round((resolvedCount / totalReports) * 100)
    : 0;

  const kpis = [
    {
      label: "Total Laporan Masuk",
      value: isLoading ? "—" : totalReports.toLocaleString("id"),
      trend: "Live",
      trendUp: true,
      icon: FileWarning,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Laporan Diselesaikan",
      value: isLoading ? "—" : resolvedCount.toLocaleString("id"),
      trend: isLoading ? "—" : `${resolveRate}% selesai`,
      trendUp: resolveRate >= 50,
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Petugas Aktif",
      value: isLoading ? "—" : activeOfficers.toString(),
      trend: "Real-time",
      trendUp: true,
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Avg. Response Time",
      value: isLoading ? "—" : avgResponseTime > 0 ? `${avgResponseTime.toFixed(1)} Jam` : "—",
      trend: avgResponseTime > 0 ? "Dihitung dari data" : "Belum ada data",
      trendUp: avgResponseTime > 0 && avgResponseTime < 24,
      icon: Activity,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Smart City Command Center</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Selamat datang, <strong>{user?.name}</strong>. Berikut ringkasan analitik real-time kota Anda.
        </p>
      </div>

      {/* KPI Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {kpis.map((kpi, i) => (
          <Card key={i} className="p-4 rounded-2xl border border-border/50 shadow-sm">
            {isLoading && i < 2 ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-semibold ${kpi.trendUp ? "text-emerald-500" : "text-red-500"}`}>
                    {kpi.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {kpi.trend}
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{kpi.label}</p>
              </>
            )}
          </Card>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Area Chart */}
        <Card className="lg:col-span-2 p-5 rounded-2xl border border-border/50 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold">Trend Pelaporan Mingguan</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Laporan masuk vs terselesaikan 7 hari terakhir</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="masuk" name="masuk" stroke="#3b82f6" strokeWidth={2} fill="url(#gradMasuk)" />
                <Area type="monotone" dataKey="selesai" name="selesai" stroke="#10b981" strokeWidth={2} fill="url(#gradSelesai)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {weeklyData.length === 0 && !isLoading && (
            <p className="text-center text-xs text-muted-foreground mt-4">Belum ada data untuk ditampilkan</p>
          )}
          <div className="flex gap-5 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-0.5 bg-blue-500 rounded" /> Masuk
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-0.5 bg-emerald-500 rounded" /> Selesai
            </div>
          </div>
        </Card>

        {/* Bar Chart */}
        <Card className="p-5 rounded-2xl border border-border/50 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold">Kategori Terbanyak</h3>
            <p className="text-xs text-muted-foreground mt-0.5">30 hari terakhir</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  width={90}
                />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<CustomTooltip />} />
                <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {categoryData.length === 0 && !isLoading && (
            <p className="text-center text-xs text-muted-foreground mt-4">Belum ada data untuk ditampilkan</p>
          )}
        </Card>
      </motion.div>

      {/* Map CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-8 rounded-2xl border border-border/50 shadow-sm bg-gradient-to-r from-primary/5 via-background to-background flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-2xl shrink-0">
            <Map className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold mb-1">Live Heatmap Kota</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Pantau titik konsentrasi laporan dan distribusi masalah di seluruh wilayah secara real-time.
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/peta")}
            className="rounded-xl shadow-sm shrink-0"
          >
            Buka Peta <ArrowUpRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
