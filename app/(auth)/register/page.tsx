"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(60, "Nama terlalu panjang"),
  email: z.string().email("Format email tidak valid"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(128, "Password terlalu panjang"),
});

type FormValues = z.infer<typeof formSchema>;

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "Email sudah terdaftar. Silakan masuk.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/weak-password": "Password terlalu lemah. Gunakan minimal 6 karakter.",
  "auth/operation-not-allowed": "Metode pendaftaran ini tidak diaktifkan.",
  "auth/popup-closed-by-user": "Pendaftaran Google dibatalkan.",
  "auth/cancelled-popup-request": "Pendaftaran Google dibatalkan.",
};

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  // Ensure Firestore profile exists for this user (creates if new, skips if exists)
  const ensureFirestoreProfile = async (uid: string, email: string | null, name: string) => {
    if (!db) return;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        email: email ?? "",
        name,
        role: "citizen",
        createdAt: new Date(),
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!auth) {
      toast.error("Firebase tidak terkonfigurasi dengan benar");
      return;
    }
    setIsLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(user, { displayName: values.name });
      await ensureFirestoreProfile(user.uid, values.email, values.name);

      // Send email verification
      await sendEmailVerification(user);

      // Set session cookie — onAuthStateChanged in AuthProvider will sync the store
      const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
      document.cookie = `session=${user.uid}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;

      toast.success("Akun berhasil dibuat!", {
        description: `Silakan cek email ${values.email} untuk verifikasi.`,
      });
      router.replace("/verify");
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      const msg = FIREBASE_ERRORS[code ?? ""] ?? "Pendaftaran gagal. Silakan coba lagi.";
      toast.error("Pendaftaran Gagal", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithGoogle = async () => {
    if (!auth) {
      toast.error("Firebase tidak terkonfigurasi dengan benar");
      return;
    }
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      await ensureFirestoreProfile(
        user.uid,
        user.email,
        user.displayName || "Pengguna"
      );

      // Set session cookie — onAuthStateChanged in AuthProvider will sync the store
      const isSecureGoogle = typeof window !== "undefined" && window.location.protocol === "https:";
      document.cookie = `session=${user.uid}; path=/; max-age=86400; SameSite=Lax${isSecureGoogle ? "; Secure" : ""}`;

      toast.success("Berhasil masuk dengan Google!", {
        description: `Selamat datang, ${user.displayName || "Pengguna"}!`,
      });
      router.replace("/dashboard");
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        const msg = FIREBASE_ERRORS[code ?? ""] ?? "Pendaftaran Google gagal.";
        toast.error("Pendaftaran Google Gagal", { description: msg });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isSubmitting = isLoading || isGoogleLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Akun</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daftar sekarang untuk mulai berpartisipasi dalam membangun kota yang lebih baik.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nama Lengkap</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Budi Santoso"
            className="h-11"
            disabled={isSubmitting}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive font-medium" role="alert">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className="h-11"
            disabled={isSubmitting}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive font-medium" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-11 pr-10"
              disabled={isSubmitting}
              {...form.register("password")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive font-medium" role="alert">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all mt-1"
          disabled={isSubmitting}
          id="register-submit-btn"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Daftar
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">
            atau daftar dengan
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        type="button"
        className="w-full h-11 border-border/70"
        onClick={registerWithGoogle}
        disabled={isSubmitting}
        id="register-google-btn"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Lanjutkan dengan Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Masuk di sini
        </Link>
      </p>
    </motion.div>
  );
}
