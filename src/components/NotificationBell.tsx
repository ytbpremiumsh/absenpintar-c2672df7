import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
// Notifications: only school admins see system-generated notifications.
// Other roles (teacher/staff) only see manual notifications (created_by NOT NULL).
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  school_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}


export function NotificationBell() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const stripEmoji = (text: string) =>
    text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{2702}-\u{27B0}\u{E0020}-\u{E007F}\u{200D}\u{20E3}\u{FE0F}\u2705\u2611\u2714\u274C\u274E\u2B50\u26A0\u2139\uFE0F\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B05}-\u{2B07}\u{2934}\u{2935}\u{25AA}-\u{25FE}\u{25FB}-\u{25FE}\u{1F1E0}-\u{1F1FF}💰💸✅🎉📋📢🔔⚡🏫💡🔥❤️💙💚💛🧡💜🤎🖤🤍]/gu, '').trim();

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      // Filter out "Pembayaran Masuk" notifications (super admin only)
      const filtered = (data as Notification[]).filter(
        (n) => !n.title.includes("Pembayaran Masuk")
      );
      setNotifications(filtered);
    }
  };

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          // Only add if it's for this school or global
          if (!newNotif.school_id || newNotif.school_id === profile.school_id) {
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
       <PopoverContent align="end" className="w-[420px] p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-sm font-bold text-foreground">Notifikasi</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              <Check className="h-3 w-3 mr-1" /> Tandai semua
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{stripEmoji(n.title)}</p>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{stripEmoji(n.message)}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
