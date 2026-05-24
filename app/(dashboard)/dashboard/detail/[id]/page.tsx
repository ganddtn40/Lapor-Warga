"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, Send, CheckCheck, Clock, MapPin, Reply, X,
  MessageCircle, User
} from "lucide-react";
import { db, rtdb } from "@/lib/firebase";
import {
  doc as firestoreDoc, collection, onSnapshot as onFirestoreSnapshot,
  addDoc, serverTimestamp, updateDoc as updateFirestoreDoc,
} from "firebase/firestore";
import {
  ref, onValue, push, set,
  serverTimestamp as rtdbServerTimestamp,
  update as updateRtdb
} from "firebase/database";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { ImageGallery } from "@/components/ui/image-gallery";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  Selesai: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Diproses: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Diverifikasi: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Ditolak: "bg-red-500/10 text-red-500 border-red-500/20",
  Menunggu: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const ROLE_COLOR: Record<string, string> = {
  admin: "text-purple-500",
  officer: "text-blue-500",
  citizen: "text-emerald-500",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(senderId: string) {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-purple-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderPhotoURL?: string;
  text: string;
  createdAt: Date;
  seen: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
}

export default function LaporanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [report, setReport] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const reportId = params?.id as string;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, []);

  useEffect(() => {
    if (!db || !reportId) return;

    const docRef = firestoreDoc(db, "reports", reportId);
    const unsubReport = onFirestoreSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setReport({ id: snap.id, ...snap.data(), createdAt: snap.data().createdAt?.toDate?.() ?? null });
        } else {
          toast.error("Laporan tidak ditemukan");
          router.push("/dashboard");
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Detail fetch error:", err);
        setIsLoading(false);
        toast.error("Gagal memuat laporan");
      }
    );

    if (!rtdb) return () => unsubReport();

    const chatsRef = ref(rtdb, `reports/${reportId}/chats`);
    const unsubChats = onValue(chatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgs: ChatMessage[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
          createdAt: data[key].createdAt ? new Date(data[key].createdAt) : new Date(),
        })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        setMessages(msgs);

        // Mark unread messages as seen
        const updates: Record<string, any> = {};
        let needsUpdate = false;
        msgs.forEach((msg) => {
          if (!msg.seen && msg.senderId !== user?.uid) {
            updates[`${msg.id}/seen`] = true;
            needsUpdate = true;
          }
        });
        if (needsUpdate) updateRtdb(chatsRef, updates).catch(() => {});

        scrollToBottom();
      } else {
        setMessages([]);
      }
    });

    return () => { unsubReport(); unsubChats(); };
  }, [reportId, router, user?.uid, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !rtdb || !db || isSending) return;
    const msgText = newMessage.trim();
    const replySnapshot = replyTo;
    setNewMessage("");
    setReplyTo(null);
    setIsSending(true);

    try {
      const chatsRef = ref(rtdb, `reports/${reportId}/chats`);
      const newChatRef = push(chatsRef);

      const payload: any = {
        senderId: user.uid,
        senderName: user.name,
        senderRole: user.role,
        senderPhotoURL: user.photoURL ?? null,
        text: msgText,
        createdAt: rtdbServerTimestamp(),
        seen: false,
      };

      if (replySnapshot) {
        payload.replyTo = {
          id: replySnapshot.id,
          senderName: replySnapshot.senderName,
          text: replySnapshot.text.length > 80
            ? replySnapshot.text.slice(0, 80) + "…"
            : replySnapshot.text,
        };
      }

      await set(newChatRef, payload);

      const targetUserId = user.uid !== report?.userId ? report?.userId : null;
      if (targetUserId) {
        await addDoc(collection(db, "notifications"), {
          userId: targetUserId,
          title: "Pesan Baru di Laporan",
          message: `${user.name}: "${msgText.substring(0, 40)}${msgText.length > 40 ? "..." : ""}"`,
          read: false, type: "info", createdAt: serverTimestamp(),
          link: `/dashboard/detail/${reportId}`,
        });
      }
    } catch (e) {
      console.error("Send message error:", e);
      const errMsg = e instanceof Error ? e.message : String(e);
      toast.error("Gagal mengirim pesan", { description: errMsg });
      setNewMessage(msgText);
      setReplyTo(replySnapshot);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyTo(msg);
    textareaRef.current?.focus();
  };

  const allPhotos: string[] = report?.photoUrls?.length
    ? report.photoUrls
    : report?.photoUrl ? [report.photoUrl] : [];

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2"><Skeleton className="h-[400px] w-full rounded-2xl" /></div>
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 hover:bg-muted/80" aria-label="Kembali">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Detail Laporan</h2>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">#{report?.id?.slice(-8).toUpperCase()}</p>
        </div>
        <div className="ml-auto">
          <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${STATUS_STYLE[report?.status] || "bg-muted text-muted-foreground border-border"}`}>
            {report?.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Detail Panel */}
        <div className="md:col-span-2 space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="px-2.5 py-1 text-xs font-medium">{report?.category}</Badge>
                <Badge variant="outline" className={`px-2.5 py-1 text-xs font-semibold border ${STATUS_STYLE[report?.status] || ""}`}>{report?.status}</Badge>
              </div>

              <h3 className="text-xl font-bold mb-2 leading-tight">{report?.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-6">{report?.description}</p>

              {allPhotos.length > 0 && <ImageGallery photos={allPhotos} className="mb-6" />}

              <div className="flex flex-col gap-2.5 text-sm text-muted-foreground pt-4 border-t border-border/50">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                  <span className="leading-snug">{report?.location?.address || "Lokasi tidak diketahui"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-primary/70" />
                  <span>
                    {report?.createdAt
                      ? report.createdAt.toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
                {report?.userName && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">Pelapor</span>
                    <span>{report.userName}</span>
                  </div>
                )}
                {report?.assignedToName && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">Petugas</span>
                    <span>{report.assignedToName}</span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* ── Chat Panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="h-[620px] flex flex-col"
        >
          <Card className="flex-1 flex flex-col rounded-2xl border-border/50 shadow-sm overflow-hidden">

            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border/50 bg-muted/20 shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Diskusi Laporan</h3>
                <p className="text-[11px] text-muted-foreground">{messages.length} pesan · Real-time</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 opacity-60">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Belum ada diskusi</p>
                    <p className="text-xs text-muted-foreground mt-1">Mulai percakapan sekarang.</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.uid;
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const isSameGroup = prevMsg?.senderId === msg.senderId;
                    const avatarColor = getAvatarColor(msg.senderId);

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "flex items-end gap-2",
                          isMe ? "flex-row-reverse" : "flex-row",
                          isSameGroup ? "mt-0.5" : "mt-3"
                        )}
                      >
                        {/* Avatar */}
                        <div className="shrink-0 w-8">
                          {!isMe && !isSameGroup ? (
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={msg.senderPhotoURL} alt={msg.senderName} />
                              <AvatarFallback className={cn("text-[10px] font-bold text-white", avatarColor)}>
                                {getInitials(msg.senderName)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8" /> // spacer
                          )}
                        </div>

                        {/* Bubble */}
                        <div className={cn("flex flex-col max-w-[78%]", isMe ? "items-end" : "items-start")}>
                          {/* Sender name (only for first in group, not me) */}
                          {!isMe && !isSameGroup && (
                            <span className={cn("text-[11px] font-semibold mb-1 ml-1", ROLE_COLOR[msg.senderRole] || "text-muted-foreground")}>
                              {msg.senderName}
                              <span className="font-normal text-muted-foreground ml-1 capitalize">· {msg.senderRole}</span>
                            </span>
                          )}

                          {/* Reply preview */}
                          {msg.replyTo && (
                            <div className={cn(
                              "mb-1 px-3 py-2 rounded-xl text-xs border-l-2 max-w-full",
                              isMe
                                ? "bg-primary/20 border-primary/50 text-primary-foreground/80"
                                : "bg-muted border-border text-muted-foreground"
                            )}>
                              <p className="font-semibold truncate">{msg.replyTo.senderName}</p>
                              <p className="truncate opacity-80">{msg.replyTo.text}</p>
                            </div>
                          )}

                          {/* Message bubble with hover reply button */}
                          <div className="group relative flex items-end gap-1">
                            {/* Reply button (appears on hover) — left side for "me", right side for others */}
                            {isMe && (
                              <button
                                onClick={() => handleReply(msg)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-muted mb-1"
                                aria-label="Balas pesan"
                              >
                                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            )}

                            <div className={cn(
                              "px-3.5 py-2.5 text-sm shadow-sm",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                                : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                            )}>
                              <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>

                            {!isMe && (
                              <button
                                onClick={() => handleReply(msg)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-muted mb-1"
                                aria-label="Balas pesan"
                              >
                                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            )}
                          </div>

                          {/* Time + seen */}
                          <div className={cn("flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground", isMe ? "flex-row-reverse" : "flex-row")}>
                            <span>{msg.createdAt?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                            {isMe && (
                              msg.seen
                                ? <CheckCheck className="w-3 h-3 text-blue-500" />
                                : <CheckCheck className="w-3 h-3 text-muted-foreground/50" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 border-t border-border/50 bg-card">
              {/* Reply Preview Bar */}
              <AnimatePresence>
                {replyTo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2 px-4 pt-3 pb-1">
                      <div className="flex-1 border-l-2 border-primary pl-2 py-1">
                        <p className="text-[11px] font-semibold text-primary">
                          Membalas {replyTo.senderName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {replyTo.text}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyTo(null)}
                        className="p-1 rounded-full hover:bg-muted transition-colors mt-0.5"
                        aria-label="Batal balas"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-3 flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="min-h-[44px] max-h-28 py-3 px-4 resize-none rounded-2xl text-sm bg-muted/40 border-border/50 focus:bg-background transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSending}
                />
                <Button
                  size="icon"
                  className="shrink-0 h-11 w-11 rounded-xl shadow-sm"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  aria-label="Kirim pesan"
                >
                  {isSending
                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
