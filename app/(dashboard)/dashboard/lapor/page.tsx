"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2, Wand2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/auth-store";
import { LocationPickerModal } from "@/components/ui/location-picker-modal";
import { CloudinaryUpload, type UploadedPhoto } from "@/components/ui/cloudinary-upload";
import { resizeImageToBase64 } from "@/lib/cloudinary";

const CATEGORIES = [
  "Infrastruktur", "Kebersihan", "Lalu Lintas", "Fasilitas Umum",
  "Lingkungan Hidup", "Keamanan", "Pelayanan Publik", "Bencana Alam", "Lainnya",
];

const formSchema = z.object({
  title: z.string().min(5, "Judul minimal 5 karakter").max(100, "Judul terlalu panjang"),
  description: z.string().min(20, "Deskripsi minimal 20 karakter").max(1000, "Deskripsi terlalu panjang"),
  category: z.string().min(1, "Pilih kategori laporan"),
});

type FormValues = z.infer<typeof formSchema>;

interface LocationData { lat: number; lng: number; address: string; }

export default function LaporPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", category: "" },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiCategory, setAiCategory] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.previewUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
      });
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAiClassification = useCallback(async (base64Image: string) => {
    setIsAiProcessing(true);
    try {
      const response = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, description: form.getValues("description") }),
      });
      if (response.ok) {
        const data = await response.json();
        setAiCategory(data.category);
        form.setValue("category", data.category);
        toast.success("AI mendeteksi kategori laporan", { description: `Kategori otomatis: "${data.category}"` });
      }
    } catch (error) {
      console.error("AI Error:", error);
      toast("AI tidak dapat mendeteksi kategori", {
        description: "Silakan pilih kategori secara manual.",
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      });
    } finally {
      setIsAiProcessing(false);
    }
  }, [form]);

  // Run AI when first photo is added and done uploading
  const handlePhotosChange = useCallback(async (newPhotos: UploadedPhoto[]) => {
    setPhotos(newPhotos);
    const firstDone = newPhotos.find((p) => p.status === "done");
    if (firstDone && !aiCategory && !isAiProcessing && firstDone.file) {
      try {
        const base64 = await resizeImageToBase64(firstDone.file);
        aiTimerRef.current = setTimeout(() => runAiClassification(base64), 300);
      } catch (err) {
        console.error("Error resizing for AI", err);
      }
    }
  }, [aiCategory, isAiProcessing, runAiClassification]);

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation tidak didukung di browser ini"); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data?.display_name) address = data.display_name;
        } catch (err) { console.error("Reverse geocoding failed", err); }
        setLocation({ lat, lng, address });
        toast.success("Lokasi berhasil didapatkan");
        setIsLocating(false);
      },
      (error) => {
        let errorMsg = "Gagal mendapatkan lokasi";
        if (error.code === 1) errorMsg = "Izin lokasi ditolak. Aktifkan izin lokasi di browser Anda.";
        else if (error.code === 2) errorMsg = "Posisi lokasi tidak tersedia.";
        else if (error.code === 3) errorMsg = "Waktu pencarian lokasi habis.";
        toast.error(errorMsg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const onSubmit = async (values: FormValues) => {
    const donePhohos = photos.filter((p) => p.status === "done");
    if (donePhohos.length === 0) {
      toast.error("Lampirkan minimal 1 foto bukti yang berhasil diupload");
      return;
    }
    const hasUploading = photos.some((p) => p.status === "uploading");
    if (hasUploading) {
      toast.error("Tunggu hingga semua foto selesai diupload");
      return;
    }
    if (!location) {
      toast.error("Tentukan lokasi kejadian terlebih dahulu");
      return;
    }
    if (!db) {
      toast.error("Sistem belum terhubung ke database. Periksa konfigurasi Firebase.");
      return;
    }

    setIsLoading(true);
    try {
      const photoUrls = donePhohos.map((p) => p.url);

      await addDoc(collection(db, "reports"), {
        userId: user?.uid,
        userName: user?.name,
        userEmail: user?.email,
        title: values.title,
        description: values.description,
        photoUrl: photoUrls[0],
        photoUrls,
        location: { lat: location.lat, lng: location.lng, address: location.address },
        category: values.category,
        status: "Menunggu",
        priority: "Sedang",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("Laporan Berhasil Dikirim!", { description: "Tim kami akan segera menindaklanjuti laporan Anda." });
      router.push("/dashboard");
    } catch (error) {
      console.error("Submit report error:", error);
      toast.error("Gagal mengirim laporan", { description: "Terjadi kesalahan saat menyimpan laporan. Silakan coba lagi." });
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = isLoading || isAiProcessing || photos.some((p) => p.status === "uploading");

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Buat Laporan Baru</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Lengkapi formulir di bawah untuk melaporkan masalah di sekitar Anda.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>

            {/* FOTO */}
            <div className="p-6 border-b border-border/50">
              <Label className="text-sm font-semibold mb-3 block">
                Foto Bukti <span className="text-destructive">*</span>
              </Label>

              <CloudinaryUpload
                value={photos}
                onChange={handlePhotosChange}
                maxFiles={5}
                disabled={isLoading}
              />

              {/* AI Status */}
              <AnimatePresence mode="wait">
                {isAiProcessing && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-3 flex items-center gap-2 text-sm text-primary"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <Wand2 className="w-4 h-4" />
                    <span className="animate-pulse">AI sedang menganalisis foto...</span>
                  </motion.div>
                )}
                {aiCategory && !isAiProcessing && (
                  <motion.div
                    key="detected"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 rounded-lg px-3 py-2"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Kategori terdeteksi AI:{" "}
                      <strong className="font-semibold">{aiCategory}</strong>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* LOKASI */}
            <div className="p-6 border-b border-border/50 space-y-3">
              <Label className="text-sm font-semibold block">
                Lokasi Kejadian <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 border-primary/30 text-primary hover:bg-primary/5 rounded-xl font-medium"
                  onClick={getLocation}
                  disabled={isLocating || isLoading}
                  id="get-location-btn"
                >
                  {isLocating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                  {isLocating ? "Mendeteksi..." : "Gunakan GPS"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 rounded-xl font-medium"
                  onClick={() => setIsMapModalOpen(true)}
                  disabled={isLoading}
                >
                  Pilih di Peta
                </Button>
              </div>
              <Input
                value={location?.address ?? ""}
                placeholder="Lokasi belum ditentukan. Klik Gunakan GPS atau Pilih di Peta."
                readOnly
                className={`h-11 text-sm cursor-pointer rounded-xl transition-colors ${location ? "bg-emerald-500/5 border-emerald-500/30 text-foreground" : "bg-muted/40"}`}
                aria-label="Alamat lokasi"
                onClick={() => setIsMapModalOpen(true)}
              />
              {location && (
                <p className="text-xs text-muted-foreground font-medium pl-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  Koordinat: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}
            </div>

            <LocationPickerModal
              open={isMapModalOpen}
              onOpenChange={setIsMapModalOpen}
              onSelect={(loc) => { setLocation(loc); toast.success("Lokasi dipilih dari peta"); }}
              initialPosition={location ? { lat: location.lat, lng: location.lng } : null}
            />

            {/* DETAIL LAPORAN */}
            <div className="p-6 space-y-5">
              {/* Kategori */}
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-sm font-semibold">
                  Kategori <span className="text-destructive">*</span>
                </Label>
                <select
                  id="category"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  {...form.register("category")}
                  disabled={isLoading}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {form.formState.errors.category && (
                  <p className="text-xs text-destructive font-medium mt-1" role="alert">{form.formState.errors.category.message}</p>
                )}
              </div>

              {/* Judul */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-semibold">
                  Judul Singkat <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Contoh: Jalan Berlubang Parah di Perempatan Sudirman"
                  className="h-10"
                  disabled={isLoading}
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive font-medium mt-1" role="alert">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Deskripsi Detail <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan kondisi, potensi bahaya, serta informasi lain yang relevan..."
                  className="min-h-[120px] resize-none text-sm"
                  disabled={isLoading}
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive font-medium mt-1" role="alert">{form.formState.errors.description.message}</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                id="submit-report-btn"
                className="w-full h-11 rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all mt-2"
                disabled={isSubmitDisabled}
              >
                {isLoading ? (
                  <div className="w-full flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim Laporan...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Kirim Laporan
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
