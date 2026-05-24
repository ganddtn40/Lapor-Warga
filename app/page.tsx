"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/shared/header";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, BarChart3, Map, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";

function AnimatedCounter({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value === null) {
    return (
      <span className="inline-block w-16 h-8 bg-muted/50 rounded animate-pulse" />
    );
  }
  return (
    <span>
      {value.toLocaleString("id")}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const [totalResolved, setTotalResolved] = useState<number | null>(null);
  const [totalReports, setTotalReports] = useState<number | null>(null);

  useEffect(() => {
    if (!db) return;

    // Total reports
    const qAll = query(collection(db, "reports"), limit(500));
    const unsubAll = onSnapshot(qAll, (snap) => {
      setTotalReports(snap.size);
    }, () => setTotalReports(0));

    // Resolved reports
    const qResolved = query(
      collection(db, "reports"),
      where("status", "==", "Selesai"),
      limit(500)
    );
    const unsubResolved = onSnapshot(qResolved, (snap) => {
      setTotalResolved(snap.size);
    }, () => setTotalResolved(0));

    return () => {
      unsubAll();
      unsubResolved();
    };
  }, []);

  const resolutionRate =
    totalReports && totalReports > 0 && totalResolved !== null
      ? Math.round((totalResolved / totalReports) * 100)
      : null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <Header />

      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-[80vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="flex-grow pt-32 pb-20 px-4 md:px-6 z-10">
        <div className="container mx-auto">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center space-y-8 mt-10 md:mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Sistem Pelaporan Kota Cerdas · Real-time
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight"
            >
              Lapor Masalah Kota{" "}
              <br className="hidden md:block" />
              <span className="text-gradient-primary">Dalam Hitungan Detik.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Platform pelaporan masyarakat modern terintegrasi dengan kecerdasan buatan untuk respon yang lebih cepat, transparan, dan akurat.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/register">
                <Button
                  size="lg"
                  className="rounded-full px-8 text-base h-14 w-full sm:w-auto shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
                >
                  Lapor Sekarang <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/peta">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 text-base h-14 w-full sm:w-auto border-border/60 hover:bg-muted/50"
                >
                  Lihat Peta Laporan
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Live Stats Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-24 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <Card className="glass-card p-6 flex items-start gap-4 border-0">
              <Image src="/icon.png" alt="LaporWarga" width={40} height={40} className="w-10 h-10 object-contain shrink-0" />
              <div>
                <h3 className="text-3xl font-bold">
                  <AnimatedCounter value={totalResolved} />
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Laporan Terselesaikan
                </p>
                <p className="text-xs text-primary/60 mt-0.5 font-medium">Live · Real-time</p>
              </div>
            </Card>

            <Card className="glass-card p-6 flex items-start gap-4 border-0">
              <div className="bg-emerald-500/10 p-3 rounded-2xl shrink-0">
                <Zap className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-3xl font-bold">
                  <AnimatedCounter value={totalReports} />
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Total Laporan Masuk
                </p>
                <p className="text-xs text-primary/60 mt-0.5 font-medium">Live · Real-time</p>
              </div>
            </Card>

            <Card className="glass-card p-6 flex items-start gap-4 border-0">
              <div className="bg-purple-500/10 p-3 rounded-2xl shrink-0">
                <Map className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-3xl font-bold">
                  <AnimatedCounter
                    value={resolutionRate}
                    suffix="%"
                  />
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Tingkat Penyelesaian
                </p>
                <p className="text-xs text-primary/60 mt-0.5 font-medium">
                  {totalReports === 0 ? "Mulai laporan pertama" : "Dihitung otomatis"}
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Feature Bento Grid */}
          <div className="mt-40 mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Infrastruktur Kelas Enterprise
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Didesain untuk keandalan tinggi dan kemudahan penggunaan bagi seluruh lapisan masyarakat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="md:col-span-2 relative group overflow-hidden rounded-3xl glass-card p-8 min-h-[300px]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <Smartphone className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Aplikasi Mobile Friendly</h3>
                    <p className="text-muted-foreground max-w-md">
                      Tampilan responsif yang beradaptasi sempurna di berbagai perangkat. Melapor dari jalan raya semudah mengirim pesan.
                    </p>
                  </div>
                  <div className="mt-8 flex gap-4 overflow-hidden group-hover:-translate-y-2 transition-transform duration-500">
                    <div className="w-64 h-40 bg-card/80 border border-border rounded-t-2xl shadow-xl p-4 flex flex-col gap-3">
                      <div className="h-4 w-1/3 bg-muted rounded-full" />
                      <div className="h-20 w-full bg-muted/50 rounded-xl" />
                      <div className="h-4 w-2/3 bg-muted rounded-full" />
                    </div>
                    <div className="w-64 h-40 bg-card/80 border border-border rounded-t-2xl shadow-xl p-4 flex flex-col gap-3">
                      <div className="h-4 w-1/2 bg-primary/20 rounded-full" />
                      <div className="h-24 w-full bg-primary/10 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group overflow-hidden rounded-3xl glass-card p-8">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <Zap className="w-10 h-10 text-amber-500 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Klasifikasi AI</h3>
                    <p className="text-muted-foreground">
                      Otomatis mengkategorikan dan menentukan prioritas laporan Anda menggunakan kecerdasan buatan Gemini.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative group overflow-hidden rounded-3xl glass-card p-8">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <Map className="w-10 h-10 text-emerald-500 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Pemetaan Real-time</h3>
                    <p className="text-muted-foreground">
                      Lihat penyebaran masalah di kota Anda secara langsung melalui peta interaktif yang terupdate otomatis.
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 relative group overflow-hidden rounded-3xl glass-card p-8 min-h-[300px]">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <BarChart3 className="w-10 h-10 text-blue-500 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Dashboard Analitik</h3>
                    <p className="text-muted-foreground max-w-md">
                      Transparansi penuh dengan statistik penyelesaian masalah yang dapat diakses kapan saja — semua data adalah live, tidak ada data palsu.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 py-10 glass">
        <div className="container mx-auto px-4 md:px-6 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} LaporWarga. Platform Pengaduan Masyarakat Modern.</p>
        </div>
      </footer>
    </div>
  );
}
