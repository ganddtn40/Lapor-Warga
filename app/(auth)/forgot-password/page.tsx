"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { motion } from "framer-motion";

function ForgotPasswordSkeleton() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

const formSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

type FormValues = z.infer<typeof formSchema>;

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/user-not-found": "Email tidak terdaftar dalam sistem kami.",
  "auth/too-many-requests": "Terlalu banyak permintaan. Coba lagi nanti.",
  "auth/invalid-email": "Format email tidak valid.",
};

function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!auth) {
      toast.error("Firebase belum dikonfigurasi.");
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSent(true);
      toast.success("Email reset password telah dikirim!");
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      const msg = FIREBASE_ERRORS[code ?? ""] ?? "Gagal mengirim email. Silakan coba lagi.";
      toast.error("Gagal Mengirim Email", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center space-y-5"
      >
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <MailCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Terkirim!</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            Kami telah mengirim tautan reset password ke <strong>{form.getValues("email")}</strong>.
            Periksa folder inbox atau spam Anda.
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="h-11 rounded-xl w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Halaman Masuk
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lupa Password?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Masukkan email Anda dan kami akan mengirimkan tautan untuk mengatur ulang password.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Alamat Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className="h-11"
            disabled={isLoading}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive font-medium" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 font-semibold"
          disabled={isLoading}
          id="reset-password-btn"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Kirim Tautan Reset
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ingat password Anda?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Masuk di sini
        </Link>
      </p>
    </motion.div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordSkeleton />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
