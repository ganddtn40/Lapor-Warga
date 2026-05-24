/**
 * Cloudinary upload utility — LaporWarga
 * Uses unsigned upload preset for client-side uploads.
 * API Secret is never exposed to the frontend.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfmbpcgxo";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "laporwarga";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Validates file before upload
 */
export function validateImageFile(file: File): string | null {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Format file "${file.type}" tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.`;
  }
  if (file.size > MAX_SIZE) {
    return `Ukuran file "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB) melebihi batas 10MB.`;
  }
  return null;
}

/**
 * Compresses & resizes image for AI analysis (base64, not for upload)
 */
export function resizeImageToBase64(file: File, maxWidth = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context error"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };
      img.onerror = () => reject(new Error("Gambar gagal dimuat"));
    };
    reader.onerror = () => reject(new Error("Gagal membaca file"));
  });
}

/**
 * Uploads a single file to Cloudinary with retry logic.
 * Returns the CloudinaryUploadResult on success.
 * Throws an error with a user-friendly message on failure.
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: UploadProgressCallback,
  retries = 3
): Promise<CloudinaryUploadResult> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  let lastError: Error = new Error("Upload gagal");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      onProgress?.(attempt > 1 ? 5 : 0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "laporwarga");

      onProgress?.(20);

      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      onProgress?.(80);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const cloudinaryError = errorBody?.error?.message || `HTTP ${response.status}`;
        
        // Specific error messages
        if (response.status === 400 && cloudinaryError.includes("preset")) {
          throw new Error(
            `Upload preset "${UPLOAD_PRESET}" tidak ditemukan di Cloudinary. ` +
            `Pastikan Anda telah membuat unsigned upload preset dengan nama "${UPLOAD_PRESET}" ` +
            `di Settings > Upload > Upload presets di dashboard Cloudinary.`
          );
        }
        if (response.status === 401) {
          throw new Error(`Cloudinary: Cloud name "${CLOUD_NAME}" tidak valid atau tidak ditemukan.`);
        }
        throw new Error(`Cloudinary error: ${cloudinaryError}`);
      }

      const data: CloudinaryUploadResult = await response.json();
      
      if (!data.secure_url) {
        throw new Error("Cloudinary tidak mengembalikan URL gambar yang valid.");
      }

      onProgress?.(100);
      return data;

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Don't retry on validation/auth errors
      if (
        lastError.message.includes("preset") ||
        lastError.message.includes("Cloud name") ||
        lastError.message.includes("Format file") ||
        lastError.message.includes("Ukuran file")
      ) {
        throw lastError;
      }

      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt - 1)));
        console.warn(`Upload attempt ${attempt} failed, retrying...`, lastError.message);
      }
    }
  }

  // Fallback to exactly what user expects to see on generic failures
  throw new Error("Terjadi kesalahan saat mengunggah foto");
}

/**
 * Uploads multiple files to Cloudinary sequentially.
 * onProgress is called with overall progress (0–100).
 */
export async function uploadMultipleToCloudinary(
  files: File[],
  onProgress?: (overall: number, fileIndex: number) => void
): Promise<CloudinaryUploadResult[]> {
  const results: CloudinaryUploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadToCloudinary(files[i], (fileProgress) => {
      const overall = Math.round(((i + fileProgress / 100) / files.length) * 100);
      onProgress?.(overall, i);
    });
    results.push(result);
  }

  return results;
}

/**
 * Generates a Cloudinary optimized URL with transformations.
 */
export function getCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: "auto" | number;
    format?: "auto" | "webp" | "jpg";
    crop?: "fill" | "fit" | "thumb";
  } = {}
): string {
  if (!url || !url.includes("cloudinary.com")) return url;

  const { width, height, quality = "auto", format = "auto", crop = "fill" } = options;
  const transforms: string[] = [`q_${quality}`, `f_${format}`];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  // Insert transforms into Cloudinary URL
  return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
}
