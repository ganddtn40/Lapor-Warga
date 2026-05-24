"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { auth, db } from "@/lib/firebase";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { User, Lock, Loader2, CheckCircle, Camera } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(60, "Nama terlalu panjang"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z.string().min(6, "Password baru minimal 6 karakter").max(128),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const ROLE_LABEL: Record<string, string> = {
  citizen: "Warga",
  officer: "Petugas",
  admin: "Administrator",
};

const ROLE_COLOR: Record<string, string> = {
  citizen: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  officer: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  admin: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

export default function ProfilPage() {
  const { user, setUser, isHydrated } = useAuthStore();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "" },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (user?.name) {
      profileForm.reset({ name: user.name });
    }
  }, [user?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSaveProfile = async (values: ProfileValues) => {
    if (!auth?.currentUser || !db || !user) return;
    setIsSavingProfile(true);
    try {
      await updateProfile(auth.currentUser, { displayName: values.name });
      await updateDoc(doc(db, "users", user.uid), { name: values.name });
      setUser({ ...user, name: values.name });
      toast.success("Profil berhasil diperbarui");
    } catch (err) {
      console.error("Update profile error:", err);
      toast.error("Gagal memperbarui profil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Upload avatar via Cloudinary (no Firebase Storage needed)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth?.currentUser || !db || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 2MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "laporwarga"
      );
      formData.append("folder", "avatars");

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfmbpcgxo"
        }/image/upload`,
        { method: "POST", body: formData }
      );

      if (!res.ok) throw new Error("Cloudinary upload failed");
      const data = await res.json();
      const photoURL: string = data.secure_url;

      await updateProfile(auth.currentUser, { photoURL });
      await updateDoc(doc(db, "users", user.uid), { photoURL });
      setUser({ ...user, photoURL });
      toast.success("Foto profil berhasil diperbarui");
    } catch (error) {
      console.error("Avatar update error:", error);
      toast.error("Gagal memperbarui foto profil");
    } finally {
      setIsUploadingAvatar(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onChangePassword = async (values: PasswordValues) => {
    if (!auth?.currentUser || !user?.email) return;
    setIsSavingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, values.newPassword);
      toast.success("Password berhasil diubah");
      passwordForm.reset();
    } catch (err: any) {
      const code = err.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Password saat ini salah");
      } else if (code === "auth/too-many-requests") {
        toast.error("Terlalu banyak percobaan. Coba beberapa saat lagi.");
      } else {
        toast.error("Gagal mengubah password. Coba lagi.");
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!isHydrated || !user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profil Saya</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Kelola informasi akun dan keamanan Anda.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          {/* Avatar Header */}
          <div className="p-6 flex items-center gap-5 border-b border-border/50 bg-muted/20">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-4 border-background shadow-sm transition-transform group-hover:scale-105">
                <AvatarImage src={user.photoURL} alt={user.name || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
                aria-label="Ubah foto profil"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </div>
            <div>
              <p className="text-xl font-bold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span
                className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
                  ROLE_COLOR[user.role] ?? ROLE_COLOR.citizen
                }`}
              >
                {ROLE_LABEL[user.role] ?? "Pengguna"}
              </span>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Informasi Profil</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nama Lengkap</Label>
              <Input
                id="profile-name"
                className="h-11 rounded-xl"
                disabled={isSavingProfile}
                {...profileForm.register("name")}
              />
              {profileForm.formState.errors.name && (
                <p className="text-xs text-destructive font-medium" role="alert">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={user.email}
                readOnly
                className="h-11 rounded-xl bg-muted/40 cursor-default"
              />
              <p className="text-xs text-muted-foreground">Email tidak dapat diubah.</p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold mt-4 shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" /> Simpan Perubahan
                </>
              )}
            </Button>
          </form>
        </Card>
      </motion.div>

      {/* Password Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-muted/10">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Keamanan Akun</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hanya tersedia untuk akun email/password.
            </p>
          </div>
          <form
            onSubmit={passwordForm.handleSubmit(onChangePassword)}
            className="p-6 space-y-4"
          >
            {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => {
              const labels = {
                currentPassword: "Password Saat Ini",
                newPassword: "Password Baru",
                confirmPassword: "Konfirmasi Password Baru",
              };
              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{labels[field]}</Label>
                  <Input
                    id={field}
                    type="password"
                    className="h-11 rounded-xl"
                    autoComplete={
                      field === "currentPassword" ? "current-password" : "new-password"
                    }
                    disabled={isSavingPassword}
                    {...passwordForm.register(field)}
                  />
                  {passwordForm.formState.errors[field] && (
                    <p className="text-xs text-destructive font-medium" role="alert">
                      {passwordForm.formState.errors[field]?.message}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="pt-2">
              <Button
                type="submit"
                variant="outline"
                className="w-full h-11 rounded-xl text-sm font-semibold border-primary/30 text-primary hover:bg-primary/5 transition-all"
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengubah...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" /> Ubah Password
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
