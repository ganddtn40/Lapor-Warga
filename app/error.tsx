"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="w-full max-w-md p-8 flex flex-col items-center text-center rounded-2xl shadow-xl border-border/50">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Terjadi Kesalahan</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Maaf, kami mengalami masalah teknis saat memuat halaman ini.
            <br className="hidden sm:block" /> {error.message || "Silakan coba lagi beberapa saat kemudian."}
          </p>
          <div className="flex gap-4 w-full">
            <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => window.location.href = "/"}>
              Ke Beranda
            </Button>
            <Button className="flex-1 rounded-xl h-11" onClick={() => reset()}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
