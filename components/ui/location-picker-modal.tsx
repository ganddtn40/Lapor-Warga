"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "./input";
import { toast } from "sonner";

const LocationPickerMap = dynamic(() => import("./location-picker-map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
});

interface LocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialPosition?: { lat: number; lng: number } | null;
}

export function LocationPickerModal({ open, onOpenChange, onSelect, initialPosition }: LocationPickerModalProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(initialPosition || null);
  const [address, setAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    } else if (open && !position && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setPosition({ lat: -6.2, lng: 106.816666 }) // Default Jakarta
      );
    }
  }, [open, initialPosition]);

  useEffect(() => {
    if (!position) return;
    const fetchAddress = async () => {
      setIsGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
        );
        const data = await res.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
        } else {
          setAddress(`${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`);
        }
      } catch (err) {
        setAddress(`${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`);
      } finally {
        setIsGeocoding(false);
      }
    };
    const timer = setTimeout(fetchAddress, 500); // debounce
    return () => clearTimeout(timer);
  }, [position]);

  const handleConfirm = () => {
    if (!position) {
      toast.error("Pilih lokasi di peta terlebih dahulu");
      return;
    }
    onSelect({ lat: position.lat, lng: position.lng, address });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl flex flex-col h-[80vh] sm:h-[600px]">
        <DialogHeader className="p-5 border-b border-border/50 shrink-0 bg-background z-10">
          <DialogTitle>Pilih Lokasi Kejadian</DialogTitle>
          <DialogDescription>
            Geser atau klik peta untuk menentukan titik koordinat yang tepat.
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex-1 w-full bg-muted/20">
          {position && (
            <LocationPickerMap position={position} setPosition={setPosition} />
          )}
          {!position && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border/50 bg-background shrink-0 z-10 space-y-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Alamat Terdeteksi
              </p>
              {isGeocoding ? (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  Mencari alamat...
                </div>
              ) : (
                <p className="text-sm font-medium line-clamp-2 leading-tight">
                  {address || "Belum ada lokasi yang dipilih"}
                </p>
              )}
            </div>
          </div>
          <Button 
            className="w-full h-11 rounded-xl shadow-md font-semibold" 
            onClick={handleConfirm}
            disabled={!position || isGeocoding}
          >
            Konfirmasi Lokasi Ini
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
