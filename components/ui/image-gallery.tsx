"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Maximize2, ImageIcon } from "lucide-react";
import { getCloudinaryUrl } from "@/lib/cloudinary";

interface ImageGalleryProps {
  photos: string[];
  className?: string;
  showCount?: boolean;
  aspectRatio?: "square" | "video" | "auto";
}

interface LightboxProps {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const touchStartX = { current: 0 };

  const prev = useCallback(() => { setZoom(1); setCurrent((i) => (i - 1 + photos.length) % photos.length); }, [photos.length]);
  const next = useCallback(() => { setZoom(1); setCurrent((i) => (i + 1) % photos.length); }, [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "+") setZoom((z) => Math.min(z + 0.5, 4));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.5, 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black/97 flex items-center justify-center select-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
      }}
    >
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold border border-white/10">
            {current + 1} / {photos.length}
          </div>
          {zoom > 1 && (
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold border border-white/10">
              {Math.round(zoom * 100)}%
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button onClick={() => setZoom((z) => Math.min(z + 0.5, 4))} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10 transition-colors" aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={() => setZoom((z) => Math.max(z - 0.5, 1))} disabled={zoom === 1} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10 transition-colors disabled:opacity-30" aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></button>
          <a href={photos[current]} download target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/10 transition-colors" aria-label="Download"><Download className="w-4 h-4" /></a>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500/40 rounded-full text-white border border-white/10 transition-colors" aria-label="Tutup"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Main Image */}
      <div className="relative flex items-center justify-center w-full h-full px-16">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={current}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: zoom }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            src={getCloudinaryUrl(photos[current], { quality: "auto", format: "auto" })}
            alt={`Foto ${current + 1}`}
            className="max-w-[88vw] max-h-[80vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </AnimatePresence>
      </div>

      {/* Nav Arrows */}
      {photos.length > 1 && (
        <>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 md:left-6 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white border border-white/10 z-10" aria-label="Foto sebelumnya"><ChevronLeft className="w-5 h-5" /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 md:right-6 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white border border-white/10 z-10" aria-label="Foto selanjutnya"><ChevronRight className="w-5 h-5" /></motion.button>
        </>
      )}

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-2xl p-2 border border-white/10">
            {photos.map((url, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); setZoom(1); setCurrent(idx); }}
                className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 transition-all duration-200 ${idx === current ? "border-white scale-110 shadow-lg" : "border-white/20 opacity-50 hover:opacity-80"}`}
                aria-label={`Foto ${idx + 1}`}
              >
                <img src={getCloudinaryUrl(url, { width: 80, height: 80 })} alt="" className="w-full h-full object-cover" />
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function GalleryThumb({ url, index, onOpen, aspectClass = "aspect-square", isPrimary = false }: {
  url: string; index: number; onOpen: (i: number) => void; aspectClass: string; isPrimary?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative group rounded-xl overflow-hidden border border-border/50 bg-muted cursor-zoom-in ${aspectClass}`}
      onClick={() => onOpen(index)}
    >
      <img
        src={getCloudinaryUrl(url, { width: 400, height: 400, quality: "auto", format: "auto", crop: "fill" })}
        alt={`Foto ${index + 1}`}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-all duration-200 scale-75 group-hover:scale-100" />
      </div>
      {isPrimary && (
        <span className="absolute top-2 left-2 text-[9px] font-bold bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full border border-white/10">
          UTAMA
        </span>
      )}
    </motion.div>
  );
}

export function ImageGallery({ photos, className = "", showCount = true, aspectRatio = "square" }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className={`flex items-center justify-center py-8 rounded-xl bg-muted/30 border border-dashed border-border/50 ${className}`}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
          <ImageIcon className="w-8 h-8" />
          <p className="text-xs font-medium">Tidak ada foto</p>
        </div>
      </div>
    );
  }

  const aspectClass = { square: "aspect-square", video: "aspect-video", auto: "" }[aspectRatio];

  return (
    <>
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox photos={photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
        )}
      </AnimatePresence>

      <div className={className}>
        {showCount && (
          <div className="flex items-center gap-1.5 mb-3">
            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Foto Bukti ({photos.length})
            </p>
          </div>
        )}

        {photos.length === 1 ? (
          <motion.div whileHover={{ scale: 1.005 }} className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted cursor-zoom-in aspect-video" onClick={() => setLightboxIndex(0)}>
            <img src={getCloudinaryUrl(photos[0], { width: 1200, quality: "auto", format: "auto" })} alt="Foto bukti utama" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
              <div className="p-3 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all"><Maximize2 className="w-5 h-5" /></div>
            </div>
          </motion.div>
        ) : photos.length === 2 ? (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((url, idx) => <GalleryThumb key={idx} url={url} index={idx} onOpen={setLightboxIndex} aspectClass={aspectClass} />)}
          </div>
        ) : photos.length === 3 ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><GalleryThumb url={photos[0]} index={0} onOpen={setLightboxIndex} aspectClass="aspect-square" isPrimary /></div>
            <div className="flex flex-col gap-2">
              <GalleryThumb url={photos[1]} index={1} onOpen={setLightboxIndex} aspectClass="aspect-square" />
              <GalleryThumb url={photos[2]} index={2} onOpen={setLightboxIndex} aspectClass="aspect-square" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.slice(0, 5).map((url, idx) => (
              <div key={idx} className="relative">
                <GalleryThumb url={url} index={idx} onOpen={setLightboxIndex} aspectClass={aspectClass} isPrimary={idx === 0} />
                {idx === 4 && photos.length > 5 && (
                  <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center cursor-pointer" onClick={() => setLightboxIndex(4)}>
                    <span className="text-white font-bold text-xl">+{photos.length - 5}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
