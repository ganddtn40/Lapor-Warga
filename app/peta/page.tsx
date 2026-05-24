"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/shared/header";
import { MapView } from "@/components/shared/map-view";

export default function PublicPetaPage() {
  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <Header />
      
      <main className="flex-grow pt-32 pb-20 px-4 md:px-6 z-10 flex flex-col h-screen">
        <div className="container mx-auto h-full flex flex-col">
          <div className="text-center mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            >
              Peta <span className="text-gradient-primary">Transparansi Kota</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Pantau laporan masalah infrastruktur, lingkungan, dan layanan publik secara real-time.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-h-[500px]"
          >
            <MapView />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
