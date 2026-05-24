"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-2xl" />,
});

export function MapView() {
  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-border/50 shadow-sm">
      <MapInner />
      
      {/* Floating Legend — z-[600] keeps it below Leaflet popups (z-700) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[600] glass-panel bg-card/90 backdrop-blur-md px-6 py-3 rounded-full flex gap-4 text-sm font-medium border border-border/50 shadow-lg flex-wrap justify-center min-w-[max-content]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div> Menunggu
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div> Diverifikasi
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div> Diproses
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Selesai
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div> Ditolak
        </div>
      </div>
    </div>
  );
}
