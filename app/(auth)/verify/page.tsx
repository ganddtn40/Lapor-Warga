"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, reload } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, RefreshCw, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";

export default function VerifyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.emailVerified) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleResend = async () => {
    if (!auth?.currentUser) return;
    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Email terkirim!", {
        description: "Silakan cek kotak masuk atau folder spam Anda.",
      });
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        toast.error("Terlalu banyak permintaan. Silakan tunggu beberapa saat.");
      } else {
        toast.error("Gagal mengirim ulang email.", { description: error.message });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!auth?.currentUser) return;
    setIsChecking(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        toast.success("Email berhasil diverifikasi!");
        // Give auth-provider a moment to catch the state
        setTimeout(() => router.replace("/dashboard"), 1000);
      } else {
        toast.error("Email belum diverifikasi", {
          description: "Silakan klik link yang kami kirim ke email Anda.",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col space-y-6 text-center"
    >
      <div className="flex justify-center mb-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-primary" />
        </div>
      </div>
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verifikasi Email Anda</h1>
        <p className="text-sm text-muted-foreground mt-2 px-4">
          Kami telah mengirimkan email verifikasi ke <strong className="text-foreground">{user.email}</strong>. 
          Silakan klik link di dalamnya untuk mengaktifkan akun Anda.
        </p>
      </div>

      <div className="space-y-3 pt-4">
        <Button 
          onClick={handleCheckVerified} 
          disabled={isChecking}
          className="w-full h-11 shadow-md shadow-primary/20 hover:shadow-primary/30"
        >
          {isChecking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Saya Sudah Verifikasi
        </Button>
        <Button 
          variant="outline" 
          onClick={handleResend} 
          disabled={isResending}
          className="w-full h-11 border-border/70"
        >
          {isResending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Kirim Ulang Email"}
        </Button>
      </div>
      
      <div className="pt-2">
        <Button 
          variant="ghost" 
          onClick={() => {
            useAuthStore.getState().logout();
            router.replace("/login");
          }}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Kembali ke Login <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
