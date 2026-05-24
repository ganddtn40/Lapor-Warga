"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { AlertCircle, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { getCloudinaryUrl } from "@/lib/cloudinary";

function createColorMarker(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

const STATUS_MARKER_COLOR: Record<string, string> = {
  Menunggu: "#ef4444",
  Diverifikasi: "#a855f7",
  Diproses: "#3b82f6",
  Selesai: "#10b981",
  Ditolak: "#6b7280",
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Menunggu: "destructive",
  Diverifikasi: "secondary",
  Diproses: "secondary",
  Selesai: "default",
  Ditolak: "outline",
};

interface Report {
  id: string;
  title: string;
  category: string;
  status: string;
  location: { lat: number; lng: number; address?: string };
  createdAt: Date;
  userName?: string;
  photoUrl?: string;
  photoUrls?: string[];
  assignedToName?: string;
  progress?: { status: string; timestamp: any; note: string }[];
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 13, { animate: true }); }, [center, map]);
  return null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Mini photo carousel inside map popup */
function PopupPhotoCarousel({ photos }: { photos: string[] }) {
  const [idx, setIdx] = useState(0);

  if (photos.length === 0) return null;

  const url = getCloudinaryUrl(photos[idx], { width: 280, height: 140, quality: "auto", format: "auto", crop: "fill" });

  return (
    <div className="relative w-full h-28 rounded-lg overflow-hidden mb-2 bg-gray-100">
      <img
        src={url}
        alt={`Foto ${idx + 1}`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + photos.length) % photos.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % photos.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label="Foto selanjutnya"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
          <div className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
            {idx + 1}/{photos.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function MapInner() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) { setUserLocation([-6.2, 106.816666]); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => setUserLocation([-6.2, 106.816666]),
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    if (!db) { setIsLoadingReports(false); return; }
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() ?? new Date(),
          }))
          .filter((r): r is Report =>
            typeof (r as Report).location?.lat === "number" &&
            typeof (r as Report).location?.lng === "number"
          ) as Report[];
        setReports(data);
        setIsLoadingReports(false);
      },
      (err) => {
        console.error("Map: Error fetching reports:", err);
        setIsLoadingReports(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const markers = useMemo(() => {
    return reports.map((report) => {
      const markerColor = STATUS_MARKER_COLOR[report.status] ?? "#6b7280";
      return { report, marker: createColorMarker(markerColor) };
    });
  }, [reports]);

  const userMarker = useMemo(
    () => L.divIcon({
      className: "",
      html: `<div style="
        width: 16px; height: 16px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -12],
    }),
    []
  );

  if (!userLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Memuat Peta...</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={userLocation}
      zoom={13}
      scrollWheelZoom={true}
      className="w-full h-full rounded-2xl z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position="bottomright" />
      <MapController center={userLocation} />

      {/* User Location */}
      <Marker position={userLocation} icon={userMarker}>
        <Popup>
          <div className="p-1 min-w-[140px]">
            <p className="font-bold text-sm">📍 Lokasi Anda</p>
            <p className="text-xs text-muted-foreground mt-0.5">Posisi saat ini</p>
          </div>
        </Popup>
      </Marker>

      {/* Report Markers */}
      {!isLoadingReports &&
        markers.map(({ report, marker }) => {
          // Collect all photos (support both photoUrls[] and legacy photoUrl)
          const photos: string[] = report.photoUrls?.length
            ? report.photoUrls
            : report.photoUrl ? [report.photoUrl] : [];

          return (
            <Marker
              key={report.id}
              position={[report.location.lat, report.location.lng]}
              icon={marker}
            >
              <Popup className="custom-popup" maxWidth={300}>
                <div className="p-1 min-w-[240px] max-w-[280px]">
                  {/* Photo Carousel */}
                  {photos.length > 0 && <PopupPhotoCarousel photos={photos} />}

                  <h3 className="font-bold text-sm mb-2 leading-tight">{report.title}</h3>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{report.category}</Badge>
                    <Badge variant={STATUS_BADGE_VARIANT[report.status] ?? "outline"} className="text-[10px] h-5 px-1.5">{report.status}</Badge>
                  </div>

                  {report.location.address && (
                    <p className="text-xs text-muted-foreground mb-1 flex items-start gap-1">
                      📍 <span className="line-clamp-2">{report.location.address}</span>
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {formatDate(report.createdAt)}
                    {report.userName && ` · ${report.userName}`}
                  </p>

                  {/* View detail link */}
                  <a
                    href={`/dashboard/detail/${report.id}`}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Lihat Detail Laporan
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
