import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LaporWarga | Smart City Enterprise Platform",
  description: "Platform pengaduan masyarakat modern dengan kualitas visual setara Enterprise Smart City Platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
