import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, limit } from "firebase/firestore";
import { useAuthStore } from "@/store/auth-store";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
  createdAt: any;
  link?: string;
}

export function NotificationDropdown() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db!, "notifications", notificationId), { read: true });
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0 || !db) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach((notif) => {
        batch.update(doc(db!, "notifications", notif.id), { read: true });
      });
      await batch.commit();
      toast.success("Semua notifikasi ditandai dibaca");
    } catch (error) {
      console.error("Error marking all as read", error);
    }
  };

  const handleNotifClick = (notif: AppNotification) => {
    if (!notif.read) markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "error": return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="relative flex items-center justify-center rounded-full h-9 w-9 border border-border/50 hover:bg-muted/80 focus:outline-none">
        <Bell className="w-4 h-4 text-foreground/80" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground shadow-sm ring-2 ring-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0 overflow-hidden border-border/50 shadow-xl rounded-2xl">
        <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border/40">
          <DropdownMenuLabel className="font-semibold text-sm p-0">Notifikasi</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button 
              onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto overflow-x-hidden p-0">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex flex-col items-center justify-center py-10 px-4 text-center"
              >
                <div className="bg-muted p-3 rounded-full mb-3">
                  <Bell className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium">Belum ada notifikasi</p>
                <p className="text-xs text-muted-foreground mt-1">Notifikasi aktivitas Anda akan muncul di sini.</p>
              </motion.div>
            ) : (
              notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <DropdownMenuItem 
                    className={cn(
                      "flex items-start gap-4 p-4 cursor-pointer focus:bg-muted/50 rounded-none border-b border-border/30 last:border-0",
                      !notif.read ? "bg-primary/5 hover:bg-primary/10" : ""
                    )}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <div className="shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium leading-tight", 
                          !notif.read ? "text-foreground font-semibold" : "text-foreground/80"
                        )}>
                          {notif.title}
                        </p>
                        {!notif.read && <span className="flex h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-medium pt-1">
                        {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: id }) : 'Baru saja'}
                      </p>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
