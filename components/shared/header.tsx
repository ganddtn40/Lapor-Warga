"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export function Header() {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const NAV_LINKS = [
    { label: "Peta Laporan", href: "/peta" },
    { label: "Tentang", href: "/#fitur" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-500 ease-out flex justify-center px-4 md:px-6",
          isScrolled ? "pt-4" : "pt-6"
        )}
      >
        <div 
          className={cn(
            "flex items-center justify-between gap-4 w-full max-w-6xl transition-all duration-500 ease-out rounded-full border",
            isScrolled
              ? "bg-background/70 backdrop-blur-2xl border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-3"
              : "bg-transparent border-transparent px-2 py-2"
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <Image src="/icon.png" alt="LaporWarga" width={30} height={30} className="w-[30px] h-[30px] object-contain group-hover:scale-110 transition-transform duration-200" />
            <span className="font-bold text-[1.1rem] tracking-tight">
              LaporWarga
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Navigasi utama">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 py-2 rounded-full transition-all"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 py-2.5 rounded-full transition-all"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary text-primary-foreground rounded-full px-6 py-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_10px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_15px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all active:translate-y-0"
            >
              Buat Laporan
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-full h-10 w-10 hover:bg-muted transition-colors border border-transparent hover:border-border/50"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        >
          <div
            className="absolute top-[calc(var(--header-h,64px)+8px)] left-4 right-4 bg-card border border-border rounded-2xl shadow-xl p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-border my-2" />
            <Link
              href="/login"
              className="block px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="block px-3 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground text-center hover:opacity-90 transition-opacity"
              onClick={() => setMobileOpen(false)}
            >
              Buat Laporan
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
