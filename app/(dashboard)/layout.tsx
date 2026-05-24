"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter, usePathname } from "next/navigation";
import {
  Map, PlusCircle, LayoutDashboard,
  Settings, LogOut, Bell, Menu, Users, FileText,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";

const NAV_ITEMS = {
  citizen: [
    { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
    { name: "Buat Laporan", href: "/dashboard/lapor", icon: PlusCircle },
    { name: "Peta Laporan", href: "/dashboard/peta", icon: Map },
  ],
  officer: [
    { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
    { name: "Daftar Tugas", href: "/dashboard/tugas", icon: FileText },
    { name: "Peta Laporan", href: "/dashboard/peta", icon: Map },
  ],
  admin: [
    { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
    { name: "Manajemen Laporan", href: "/dashboard/laporan", icon: FileText },
    { name: "Manajemen Pengguna", href: "/dashboard/pengguna", icon: Users },
    { name: "Peta Laporan", href: "/dashboard/peta", icon: Map },
    { name: "Pengaturan", href: "/dashboard/settings", icon: Settings },
  ],
};

function NavSkeleton() {
  return (
    <div className="space-y-2 px-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-xl" />
      ))}
    </div>
  );
}

function SidebarContent({
  navItems,
  pathname,
  user,
  onNavClick,
}: {
  navItems: typeof NAV_ITEMS.citizen;
  pathname: string;
  user: { name: string; role: string; photoURL?: string };
  onNavClick?: () => void;
}) {
  return (
    <>
      <div className="px-6 py-5 flex items-center gap-3 shrink-0">
        <Image src="/icon.png" alt="LaporWarga" width={36} height={36} className="w-9 h-9 object-contain" />
        <span className="font-bold text-lg tracking-tight">
          LaporWarga
        </span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto" aria-label="Navigasi dashboard">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 shrink-0 mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onNavClick?.()}>
          <Avatar className="h-9 w-9 border-2 border-background shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <AvatarImage src={user.photoURL} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground/90">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize font-medium">{user.role}</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isHydrated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    // Only redirect after store is hydrated from localStorage and Firebase auth has resolved
    if (isHydrated && !isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!user.emailVerified) {
        router.push("/verify");
      }
    }
  }, [user, isLoading, isHydrated, router]);

  // Close mobile sheet on pathname change (handles back/forward navigation)
  useEffect(() => {
    setMobileSheetOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    toast.success("Berhasil keluar");
    router.replace("/login");
  };

  // Show elegant loading skeleton while hydrating or fetching user
  if (!isHydrated || isLoading || !user) {
    return (
      <div className="min-h-screen flex bg-muted/20">
        <div className="hidden md:flex w-[280px] flex-col bg-transparent shrink-0">
          <div className="p-6">
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="p-4">
            <NavSkeleton />
          </div>
        </div>
        <div className="flex-1 flex flex-col p-2 md:p-4">
          <div className="flex-1 bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden flex flex-col">
            <div className="h-20 border-b border-border/40 flex items-center px-8 gap-4 shrink-0">
              <Skeleton className="h-8 w-40 rounded-lg" />
              <div className="ml-auto flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
            <div className="p-8 space-y-6 flex-1">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <div className="grid grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navItems = NAV_ITEMS[user.role] ?? NAV_ITEMS.citizen;
  const currentPageName = navItems.find((item) => item.href === pathname)?.name ?? "Dashboard";

  return (
    <div className="min-h-screen flex bg-muted/20 selection:bg-primary/20">
      {/* Sidebar — Desktop */}
      <aside className="hidden md:flex w-[280px] flex-col bg-transparent sticky top-0 h-screen z-20 shrink-0 py-2">
        <SidebarContent navItems={navItems} pathname={pathname} user={user} />
      </aside>

      {/* Main Content Area - Floating Card Style */}
      <div className="flex-1 flex flex-col min-w-0 p-2 md:p-3 md:pl-0 h-screen overflow-hidden">
        <div className="flex-1 flex flex-col bg-card/80 backdrop-blur-3xl md:rounded-[2.5rem] md:border border-border/40 md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
          
          {/* Subtle top glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-card/60 backdrop-blur-xl border-b border-border/40 h-20 flex items-center justify-between px-6 md:px-10 shrink-0 transition-all duration-300">
            <div className="flex items-center gap-4">
              {/* Mobile Menu */}
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger
                  className="md:hidden inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors hover:bg-muted/80 h-10 w-10"
                  aria-label="Buka menu navigasi"
                >
                  <Menu className="w-5 h-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 flex flex-col bg-background/95 backdrop-blur-xl">
                  <SidebarContent
                    navItems={navItems}
                    pathname={pathname}
                    user={user}
                    onNavClick={() => setMobileSheetOpen(false)}
                  />
                </SheetContent>
              </Sheet>

              <motion.div
                key={currentPageName}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden sm:block"
              >
                <h1 className="text-xl font-bold tracking-tight text-foreground/90">{currentPageName}</h1>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">LaporWarga Enterprise System</p>
              </motion.div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationDropdown />

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-muted/60 transition-all outline-none border border-transparent hover:border-border/50 group"
                  aria-label="Menu pengguna"
                >
                  <Avatar className="h-8 w-8 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                    <AvatarImage src={user.photoURL} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold hidden md:inline-block max-w-[120px] truncate text-foreground/80 group-hover:text-foreground">
                    {user.name}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-border/40 shadow-xl">
                  <DropdownMenuLabel className="font-normal px-2 py-1.5">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold leading-none text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground leading-none">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2 opacity-50" />
                  <DropdownMenuItem onClick={() => router.push("/dashboard/profil")} className="cursor-pointer rounded-xl py-2.5 font-medium">
                    Profil Saya
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2 opacity-50" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-xl py-2.5 font-medium focus:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
