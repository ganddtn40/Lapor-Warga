"use client";

import { motion } from "framer-motion";
import { MapView } from "@/components/shared/map-view";

export default function PetaDashboardPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Peta Laporan Real-time</h2>
        <p className="text-muted-foreground">Pantau sebaran masalah dan progres penanganan di seluruh kota.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 min-h-[600px]"
      >
        <MapView />
      </motion.div>
    </div>
  );
}
