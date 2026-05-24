"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud, X, RefreshCw, CheckCircle, AlertCircle,
  FileImage, Loader2, ImagePlus,
} from "lucide-react";
import { uploadToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UploadedPhoto {
  url: string;
  previewUrl: string; // blob URL for local preview before upload
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  file?: File;
}

interface CloudinaryUploadProps {
  value: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

// ─── Upload Zone ────────────────────────────────────────────────────────────

export function CloudinaryUpload({
  value,
  onChange,
  maxFiles = 5,
  disabled = false,
}: CloudinaryUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const uploadingRef = useRef(false);

  const processFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled || uploadingRef.current) return;

      // Filter valid files
      const validFiles: File[] = [];
      for (const file of acceptedFiles) {
        const err = validateImageFile(file);
        if (err) { toast.error(err); continue; }
        validFiles.push(file);
      }

      if (value.length + validFiles.length > maxFiles) {
        toast.error(`Maksimal ${maxFiles} foto diperbolehkan`);
        return;
      }

      if (validFiles.length === 0) return;

      // Create initial pending entries with local previews
      const newPhotos: UploadedPhoto[] = validFiles.map((file) => ({
        url: "",
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
        progress: 0,
        file,
      }));

      const startIdx = value.length;
      onChange([...value, ...newPhotos]);

      // Upload each file to Cloudinary
      uploadingRef.current = true;
      const updated = [...value, ...newPhotos];

      for (let i = 0; i < validFiles.length; i++) {
        const photoIdx = startIdx + i;
        try {
          const result = await uploadToCloudinary(
            validFiles[i],
            (progress) => {
              updated[photoIdx] = { ...updated[photoIdx], progress };
              onChange([...updated]);
            }
          );
          updated[photoIdx] = {
            ...updated[photoIdx],
            url: result.secure_url,
            status: "done",
            progress: 100,
          };
          onChange([...updated]);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah foto";
          updated[photoIdx] = {
            ...updated[photoIdx],
            status: "error",
            progress: 0,
            error: errorMsg,
          };
          onChange([...updated]);
          toast.error("Gagal upload foto", { description: errorMsg });
        }
      }

      uploadingRef.current = false;
    },
    [value, onChange, maxFiles, disabled]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    onDropAccepted: () => setIsDragOver(false),
    onDropRejected: () => setIsDragOver(false),
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles,
    disabled: disabled || value.length >= maxFiles,
    noClick: false,
  });

  const removePhoto = useCallback(
    (idx: number) => {
      const photo = value[idx];
      if (photo.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      onChange(value.filter((_, i) => i !== idx));
    },
    [value, onChange]
  );

  const retryUpload = useCallback(
    async (idx: number) => {
      const photo = value[idx];
      if (!photo.file) return;

      const updated = [...value];
      updated[idx] = { ...updated[idx], status: "uploading", progress: 0, error: undefined };
      onChange(updated);

      try {
        const result = await uploadToCloudinary(photo.file, (progress) => {
          updated[idx] = { ...updated[idx], progress };
          onChange([...updated]);
        });
        updated[idx] = { ...updated[idx], url: result.secure_url, status: "done", progress: 100 };
        onChange([...updated]);
        toast.success("Foto berhasil diupload");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah foto";
        updated[idx] = { ...updated[idx], status: "error", progress: 0, error: errorMsg };
        onChange([...updated]);
        toast.error("Retry gagal", { description: errorMsg });
      }
    },
    [value, onChange]
  );

  const canAdd = value.length < maxFiles && !disabled;
  const hasUploading = value.some((p) => p.status === "uploading");
  const overallProgress =
    value.length > 0
      ? Math.round(value.reduce((sum, p) => sum + p.progress, 0) / value.length)
      : 0;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {canAdd && (
        <div {...getRootProps()} className="outline-none">
          <input {...getInputProps()} />
          <motion.div
            animate={{
              scale: isDragActive || isDragOver ? 1.02 : 1,
              borderColor: isDragActive || isDragOver ? "var(--primary)" : "var(--border)",
            }}
            transition={{ duration: 0.2 }}
            className={`relative overflow-hidden flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 group ${
              isDragActive || isDragOver
                ? "bg-primary/5 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]"
                : disabled
                ? "border-border bg-muted/20 cursor-not-allowed opacity-60"
                : "border-border hover:border-primary/50 hover:bg-primary/3"
            }`}
          >
            {/* Animated background blobs */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <motion.div
              animate={{
                scale: isDragActive ? [1, 1.15, 1] : 1,
                rotate: isDragActive ? [0, -5, 5, 0] : 0,
              }}
              transition={{ duration: 0.4, repeat: isDragActive ? Infinity : 0 }}
              className={`mb-3 p-4 rounded-2xl transition-colors ${
                isDragActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/50 group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              {isDragActive ? (
                <ImagePlus className="w-8 h-8" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </motion.div>

            <p className="text-sm font-semibold text-center text-foreground/80">
              {isDragActive ? "Lepaskan foto di sini..." : "Drag & drop foto, atau klik untuk memilih"}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              JPG, PNG, WEBP · Maks. 10MB per foto · {value.length}/{maxFiles} foto
            </p>

            {hasUploading && (
              <div className="absolute bottom-0 inset-x-0 h-1 bg-muted overflow-hidden rounded-b-2xl">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Photo Grid */}
      <AnimatePresence>
        {value.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          >
            {value.map((photo, idx) => (
              <motion.div
                key={photo.previewUrl}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative group aspect-square rounded-xl overflow-hidden border border-border shadow-sm bg-muted"
              >
                {/* Thumbnail */}
                <img
                  src={photo.previewUrl}
                  alt={`Foto ${idx + 1}`}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    photo.status === "error" ? "opacity-30 grayscale" : "group-hover:scale-105"
                  }`}
                />

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Status overlays */}
                {photo.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/20">
                      <motion.div
                        className="h-full bg-white"
                        animate={{ width: `${photo.progress}%` }}
                        transition={{ ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-white text-xs font-bold absolute bottom-3">{photo.progress}%</span>
                  </div>
                )}

                {photo.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                    <p className="text-[9px] text-center text-destructive font-medium leading-tight line-clamp-2">{photo.error}</p>
                    {photo.file && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => retryUpload(idx)}
                        className="flex items-center gap-1 px-2 py-1 bg-destructive/90 text-white text-[10px] font-bold rounded-lg"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </motion.button>
                    )}
                  </div>
                )}

                {photo.status === "done" && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1 bg-emerald-500 rounded-full shadow-sm">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}

                {/* Remove button */}
                {photo.status !== "uploading" && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removePhoto(idx)}
                    className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                    aria-label={`Hapus foto ${idx + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                )}

                {/* Primary badge */}
                {idx === 0 && (
                  <span className="absolute bottom-2 left-2 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    UTAMA
                  </span>
                )}
              </motion.div>
            ))}

            {/* Add more slot */}
            {canAdd && (
              <div {...getRootProps()} className="outline-none">
                <input {...getInputProps()} />
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/3 flex flex-col items-center justify-center cursor-pointer transition-all gap-1 text-muted-foreground/50 hover:text-primary"
                >
                  <FileImage className="w-6 h-6" />
                  <span className="text-[10px] font-semibold">{maxFiles - value.length} tersisa</span>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overall progress bar when uploading */}
      <AnimatePresence>
        {hasUploading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-1.5"
          >
            <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Mengunggah ke Cloudinary...</span>
              </div>
              <span className="font-bold text-foreground">{overallProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${overallProgress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
