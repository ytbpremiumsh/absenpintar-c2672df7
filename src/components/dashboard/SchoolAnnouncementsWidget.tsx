import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Megaphone, Pin, AlertTriangle, Info, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { RichContent } from "@/components/RichContent";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  is_pinned: boolean;
  created_at: string;
  created_by: string | null;
}

const TYPE_STYLES: Record<string, { icon: any; badge: string; bar: string; iconBg: string; label: string }> = {
  info: {
    icon: Info,
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    bar: "bg-gradient-to-b from-sky-500 to-sky-400",
    iconBg: "bg-gradient-to-br from-sky-500 to-sky-600",
    label: "Informasi",
  },
  penting: {
    icon: Sparkles,
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    bar: "bg-gradient-to-b from-violet-500 to-violet-400",
    iconBg: "bg-gradient-to-br from-violet-500 to-violet-600",
    label: "Penting",
  },
  urgent: {
    icon: AlertTriangle,
    badge: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    bar: "bg-gradient-to-b from-red-500 to-orange-400",
    iconBg: "bg-gradient-to-br from-red-500 to-orange-500",
    label: "Mendesak",
  },
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  schoolId: string;
  isAdmin?: boolean;
}

export function SchoolAnnouncementsWidget({ schoolId, isAdmin = false }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    let mounted = true;
    const fetchData = async () => {
      const { data } = await supabase
        .from("school_announcements")
        .select("*")
        .eq("school_id", schoolId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      if (mounted) {
        setItems(data || []);
        setLoading(false);
      }
    };
    fetchData();

    const channel = supabase
      .channel(`school-announcements-${schoolId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "school_announcements", filter: `school_id=eq.${schoolId}` }, fetchData)
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [schoolId]);

  return (
    <>
      <Card className="rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] flex items-center justify-center shadow-sm">
                <Megaphone className="h-3.5 w-3.5 text-white" />
              </div>
              Pengumuman Sekolah
              {items.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-1">{items.length}</Badge>
              )}
            </CardTitle>
            {isAdmin && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs rounded-lg" onClick={() => navigate("/announcements")}>
                Kelola <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
                <Megaphone className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">Belum ada pengumuman</p>
              {isAdmin && (
                <Button size="sm" variant="outline" className="mt-3 text-xs h-8 rounded-lg" onClick={() => navigate("/announcements")}>
                  Buat Pengumuman
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((a, i) => {
                const cfg = TYPE_STYLES[a.type] || TYPE_STYLES.info;
                const Icon = cfg.icon;
                return (
                  <motion.button
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(a)}
                    className={cn(
                      "w-full text-left relative overflow-hidden rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-md transition-all group",
                      a.is_pinned && "ring-1 ring-amber-400/40 bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/20"
                    )}
                  >
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", cfg.bar)} />
                    <div className="flex items-start gap-3 p-3 pl-4">
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", cfg.iconBg)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          {a.is_pinned && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] h-4 px-1.5 gap-0.5">
                              <Pin className="h-2.5 w-2.5" /> Disematkan
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 border", cfg.badge)}>
                            {cfg.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">{formatRelative(a.created_at)}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{a.title}</p>
                        <RichContent html={a.message} className="mt-0.5 line-clamp-2 [&_img]:hidden [&_*]:!text-xs [&_*]:!text-muted-foreground [&_*]:!my-0" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 overflow-hidden rounded-2xl">
          {selected && (() => {
            const cfg = TYPE_STYLES[selected.type] || TYPE_STYLES.info;
            const Icon = cfg.icon;
            return (
              <>
                <div className={cn("p-5 border-b border-border", cfg.bar.replace("bg-gradient-to-b", "bg-gradient-to-r"), "bg-opacity-10")}
                     style={{ background: `linear-gradient(135deg, ${cfg.iconBg.includes("sky") ? "rgba(14,165,233,0.1)" : cfg.iconBg.includes("violet") ? "rgba(139,92,246,0.1)" : "rgba(239,68,68,0.1)"}, transparent)` }}>
                  <div className="flex items-start gap-3">
                    <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md", cfg.iconBg)}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {selected.is_pinned && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] h-4 px-1.5 gap-0.5">
                            <Pin className="h-2.5 w-2.5" /> Disematkan
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", cfg.badge)}>{cfg.label}</Badge>
                      </div>
                      <DialogTitle className="text-base font-bold leading-snug">{selected.title}</DialogTitle>
                      <DialogDescription className="text-[11px] mt-1">{formatRelative(selected.created_at)}</DialogDescription>
                    </div>
                  </div>
                </div>
                <ScrollArea className="max-h-[55vh]">
                  <div className="p-5">
                    <RichContent html={selected.message} />
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
