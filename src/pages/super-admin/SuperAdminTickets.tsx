import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, Clock, AlertCircle, CheckCircle2, Send, ArrowLeft, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Menunggu", color: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "Diproses", color: "bg-primary/10 text-primary border-primary/20" },
  resolved: { label: "Selesai", color: "bg-success/10 text-success border-success/20" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Rendah", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-primary/10 text-primary" },
  high: { label: "Tinggi", color: "bg-destructive/10 text-destructive" },
};

const SuperAdminTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [schools, setSchools] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [filter, setFilter] = useState("all");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const [ticketRes, schoolRes] = await Promise.all([
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("schools").select("id, name"),
    ]);
    setTickets(ticketRes.data || []);
    const map: Record<string, string> = {};
    (schoolRes.data || []).forEach((s: any) => { map[s.id] = s.name; });
    setSchools(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchReplies = async (ticketId: string) => {
    setLoadingReplies(true);
    const { data } = await supabase
      .from("ticket_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setReplies(data || []);
    setLoadingReplies(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setNewStatus(ticket.status);
    fetchReplies(ticket.id);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !user) return;

    setSubmitting(true);

    // Update status if changed
    if (newStatus !== selectedTicket.status) {
      await supabase.from("support_tickets").update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", selectedTicket.id);

      // Send notification about status change
      if (newStatus === "resolved") {
        await supabase.from("notifications").insert({
          school_id: selectedTicket.school_id,
          title: `Tiket Selesai: ${selectedTicket.subject}`,
          message: "Tiket bantuan Anda telah ditandai selesai oleh admin.",
          type: "info",
        });
      }
    }

    // Insert reply if text provided
    if (replyText.trim()) {
      await supabase.from("ticket_replies").insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: replyText.trim(),
        is_admin: true,
      });

      // Send notification
      await supabase.from("notifications").insert({
        school_id: selectedTicket.school_id,
        title: `Balasan Tiket: ${selectedTicket.subject}`,
        message: replyText.trim().slice(0, 200),
        type: "info",
      });
    }

    toast.success("Tiket berhasil diupdate!");
    setReplyText("");

    // Refresh
    const updatedTicket = { ...selectedTicket, status: newStatus };
    setSelectedTicket(updatedTicket);
    fetchReplies(selectedTicket.id);
    fetchData();
    setSubmitting(false);
  };

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  // Detail view
  if (selectedTicket) {
    const status = statusConfig[selectedTicket.status] || statusConfig.open;

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>

        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="text-base font-bold text-foreground">{selectedTicket.subject}</h2>
                <p className="text-xs text-muted-foreground">
                  {schools[selectedTicket.school_id] || "Unknown"} • {new Date(selectedTicket.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
            </div>

            {/* Original message */}
            <div className="bg-muted/50 rounded-lg p-3 mb-4 mt-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>

            {/* Chat thread */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {loadingReplies ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
              ) : replies.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Belum ada balasan</p>
              ) : (
                replies.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${r.is_admin ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-xl p-3 ${
                      r.is_admin
                        ? "bg-primary/10 border border-primary/10"
                        : "bg-muted"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {r.is_admin ? <Shield className="h-3 w-3 text-primary" /> : <User className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] font-semibold text-foreground">
                          {r.is_admin ? "Admin" : "Sekolah"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          {" • "}
                          {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply + status */}
            <div className="mt-4 space-y-3 pt-3 border-t">
              <div className="flex items-end gap-3">
                <div className="w-40">
                  <Label className="text-[10px] text-muted-foreground">Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Menunggu</SelectItem>
                      <SelectItem value="in_progress">Diproses</SelectItem>
                      <SelectItem value="resolved">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Tulis balasan..."
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={submitting || (!replyText.trim() && newStatus === selectedTicket.status)}
                  size="icon"
                  className="gradient-primary text-primary-foreground h-auto"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tiket Bantuan</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Kelola tiket bantuan dari sekolah</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Menunggu", value: openCount, color: "text-warning" },
          { label: "Diproses", value: inProgressCount, color: "text-primary" },
          { label: "Selesai", value: resolvedCount, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-card">
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "Semua" },
          { value: "open", label: "Menunggu" },
          { value: "in_progress", label: "Diproses" },
          { value: "resolved", label: "Selesai" },
        ].map((f) => (
          <Button key={f.value} variant={filter === f.value ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada tiket</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket, i) => {
            const status = statusConfig[ticket.status] || statusConfig.open;
            const prio = priorityConfig[ticket.priority] || priorityConfig.normal;
            return (
              <motion.div key={ticket.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Card className="border-0 shadow-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => openTicket(ticket)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{schools[ticket.school_id] || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{ticket.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                        <Badge variant="secondary" className={`text-[10px] ${prio.color}`}>{prio.label}</Badge>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      {new Date(ticket.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuperAdminTickets;
