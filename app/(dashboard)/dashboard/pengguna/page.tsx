"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Users, ShieldCheck, Briefcase, User, Loader2, Inbox, RefreshCw,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

interface UserRecord {
  uid: string;
  name: string;
  email: string;
  role: "citizen" | "officer" | "admin";
  photoURL?: string;
  createdAt: Date;
}

const ROLE_CONFIG = {
  citizen: {
    label: "Warga",
    style: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: User,
  },
  officer: {
    label: "Petugas",
    style: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: Briefcase,
  },
  admin: {
    label: "Administrator",
    style: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    icon: ShieldCheck,
  },
};

const ALL_ROLES = ["Semua", "citizen", "officer", "admin"];

export default function PenggunaPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) { setIsLoading(false); return; }

    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as UserRecord[];
      setUsers(data);
      setIsLoading(false);
    }, (err) => {
      console.error("Users fetch error:", err);
      toast.error("Gagal memuat data pengguna");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid: string, newRole: string) => {
    if (!db || uid === currentUser?.uid) {
      toast.error("Tidak dapat mengubah role akun Anda sendiri");
      return;
    }
    setUpdatingId(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      toast.success(`Role berhasil diubah ke "${ROLE_CONFIG[newRole as keyof typeof ROLE_CONFIG]?.label ?? newRole}"`);
    } catch {
      toast.error("Gagal mengubah role pengguna");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "Semua" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = [
    { label: "Total Pengguna", value: users.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Warga", value: users.filter((u) => u.role === "citizen").length, icon: User, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Petugas", value: users.filter((u) => u.role === "officer").length, icon: Briefcase, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Admin", value: users.filter((u) => u.role === "admin").length, icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Kelola akun dan hak akses seluruh pengguna platform.
        </p>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {stats.map((s, i) => (
          <Card key={i} className="p-4 rounded-2xl border border-border/50 shadow-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <>
                <div className={`p-2 rounded-lg w-fit ${s.bg} mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value.toLocaleString("id")}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </>
            )}
          </Card>
        ))}
      </motion.div>

      {/* User Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold">Daftar Pengguna</h3>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari nama atau email..."
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {/* Role filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {ALL_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                  roleFilter === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {r === "Semua" ? "Semua" : ROLE_CONFIG[r as keyof typeof ROLE_CONFIG]?.label ?? r}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 flex flex-col items-center justify-center text-center">
            <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-semibold">Tidak ada pengguna ditemukan</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada pengguna terdaftar."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((u) => {
              const roleConf = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.citizen;
              const RoleIcon = roleConf.icon;
              const isUpdating = updatingId === u.uid;
              const isSelf = u.uid === currentUser?.uid;

              return (
                <div
                  key={u.uid}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
                >
                  <Avatar className="h-10 w-10 border border-border shrink-0">
                    <AvatarImage src={u.photoURL} alt={u.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{u.name}</p>
                      {isSelf && (
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          Anda
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>

                  {/* Role badge (visible on md+) */}
                  <span className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full shrink-0 ${roleConf.style}`}>
                    <RoleIcon className="w-3 h-3" />
                    {roleConf.label}
                  </span>

                  {/* Role change select */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                      disabled={isUpdating || isSelf}
                      className="text-xs border border-input rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      aria-label={`Ubah role ${u.name}`}
                    >
                      <option value="citizen">Warga</option>
                      <option value="officer">Petugas</option>
                      <option value="admin">Administrator</option>
                    </select>
                    {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between bg-muted/10">
          <p className="text-xs text-muted-foreground">
            Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> dari{" "}
            <span className="font-semibold text-foreground">{users.length}</span> pengguna
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3" /> Update real-time
          </div>
        </div>
      </motion.div>
    </div>
  );
}
