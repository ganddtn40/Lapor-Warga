import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Sidebar - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-primary/5 flex-col justify-between p-12 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-primary/5 z-0" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground">
              LaporWarga
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Smart City <br />
            <span className="text-gradient-primary">Enterprise Platform</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Sistem pengaduan masyarakat modern dengan integrasi AI, pemetaan real-time, dan analitik data cerdas.
          </p>
          
          <div className="mt-12 glass-card p-6 rounded-2xl border border-white/10 dark:border-white/5">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">"Platform ini mengubah cara pemerintah merespon keluhan warga. Jauh lebih cepat dan transparan."</p>
                <p className="text-xs text-muted-foreground">Studi Kasus Implementasi 2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-muted-foreground font-medium">
          © {new Date().getFullYear()} LaporWarga. All rights reserved.
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-8 w-fit">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground">
              LaporWarga
            </span>
          </Link>
          
          {children}
        </div>
      </div>
    </div>
  );
}
