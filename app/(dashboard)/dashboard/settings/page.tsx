"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useTheme } from "next-themes";
import {
  Bell, Shield, Database, Globe, Zap, CheckCircle,
  AlertCircle, Server, HardDrive, Activity, Moon, Sun,
} from "lucide-react";
import { toast } from "sonner";

interface ToggleSetting {
  id: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

const NOTIFICATION_SETTINGS: ToggleSetting[] = [
  { id: "notif_new_report", label: "Laporan Baru Masuk", description: "Notifikasi saat warga membuat laporan baru", defaultValue: true },
  { id: "notif_status_change", label: "Perubahan Status", description: "Notifikasi saat status laporan diperbarui", defaultValue: true },
  { id: "notif_overdue", label: "Laporan Terlambat", description: "Peringatan laporan yang belum tertangani > 3 hari", defaultValue: true },
  { id: "notif_weekly_report", label: "Laporan Mingguan", description: "Ringkasan performa mingguan via email", defaultValue: false },
];

const SYSTEM_SETTINGS: ToggleSetting[] = [
  { id: "sys_dark_mode", label: "Tema Gelap Otomatis", description: "Sesuaikan tema dengan preferensi sistem pengguna", defaultValue: true },
  { id: "sys_realtime", label: "Update Real-time", description: "Sinkronisasi data secara langsung via Firestore listener", defaultValue: true },
  { id: "sys_ai_classify", label: "Klasifikasi AI", description: "Aktifkan auto-kategorisasi laporan menggunakan AI", defaultValue: true },
  { id: "sys_analytics", label: "Analytics Anonim", description: "Kirim data penggunaan anonim untuk meningkatkan platform", defaultValue: false },
];

function ToggleSwitch({
  enabled,
  onChange,
  id,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      id={id}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        enabled ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingToggleRow({ setting, value, onChange }: {
  setting: ToggleSetting;
  value: boolean;
  onChange: (id: string, v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{setting.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
      </div>
      <ToggleSwitch
        id={setting.id}
        enabled={value}
        onChange={(v) => onChange(setting.id, v)}
      />
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Local toggle state
  const [notifState, setNotifState] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((s) => [s.id, s.defaultValue]))
  );
  const [sysState, setSysState] = useState<Record<string, boolean>>({
    sys_dark_mode: theme === "dark" || theme === "system",
    sys_realtime: true,
    sys_ai_classify: true,
    sys_analytics: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleNotifChange = (id: string, value: boolean) => {
    setNotifState((prev) => ({ ...prev, [id]: value }));
  };

  const handleSysChange = (id: string, value: boolean) => {
    setSysState((prev) => ({ ...prev, [id]: value }));
    if (id === "sys_dark_mode") {
      setTheme(value ? "dark" : "light");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (db) {
        // Persist settings to Firestore under /settings/{uid}
        await setDoc(
          doc(db, "settings", user.uid),
          {
            notifications: notifState,
            system: sysState,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
      toast.success("Pengaturan berhasil disimpan");
    } catch (err) {
      console.error("Settings save error:", err);
      toast.error("Gagal menyimpan pengaturan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const systemInfo = [
    { label: "Versi Platform", value: "2.0.0", icon: Zap },
    { label: "Firebase Project", value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "—", icon: Database },
    { label: "Region", value: "asia-southeast1", icon: Globe },
    { label: "Environment", value: "Production", icon: Server },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pengaturan Sistem</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Konfigurasi platform LaporWarga untuk kebutuhan operasional kota.
        </p>
      </div>

      {/* System Info */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Informasi Sistem</h3>
            <Badge variant="outline" className="ml-auto text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Operasional
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/50">
            {systemInfo.map((info) => (
              <div key={info.label} className="p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <info.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{info.label}</p>
                </div>
                <p className="text-sm font-semibold truncate">{info.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Notifikasi</h3>
          </div>
          <div className="p-5 divide-y divide-border/30">
            {NOTIFICATION_SETTINGS.map((setting) => (
              <SettingToggleRow
                key={setting.id}
                setting={setting}
                value={notifState[setting.id]}
                onChange={handleNotifChange}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* System Settings */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Konfigurasi Platform</h3>
          </div>
          <div className="p-5 divide-y divide-border/30">
            {SYSTEM_SETTINGS.map((setting) => (
              <SettingToggleRow
                key={setting.id}
                setting={setting}
                value={sysState[setting.id]}
                onChange={handleSysChange}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Data Management */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Manajemen Data</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between py-2 gap-4">
              <div>
                <p className="text-sm font-medium">Export Data Laporan</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Unduh seluruh data laporan dalam format CSV
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-8 rounded-lg"
                onClick={() => toast.info("Fitur export akan segera tersedia")}
              >
                Export CSV
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2 gap-4">
              <div>
                <p className="text-sm font-medium text-destructive">Arsipkan Laporan Selesai</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pindahkan laporan &gt; 30 hari ke arsip. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-8 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={() => toast.warning("Konfirmasi diperlukan untuk mengarsipkan data")}
              >
                Arsipkan
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Perubahan akan diterapkan segera setelah disimpan.
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !user}
            className="h-9 px-5 rounded-xl text-sm font-semibold"
            id="save-settings-btn"
          >
            {isSaving ? (
              <><span className="w-4 h-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" /> Menyimpan...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Simpan Pengaturan</>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
