import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TicketPlus, Loader2, MessageSquare, Clock, CheckCircle2, AlertCircle, Send, ArrowLeft, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Menunggu", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  in_progress: { label: "Diproses", color: "bg-primary/10 text-primary border-primary/20", icon: AlertCircle },
  resolved: { label: "Selesai", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Rendah", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-primary/10 text-primary" },
  high: { label: "Tinggi", color: "bg-destructive/10 text-destructive" },
};

const SupportTickets = () => {
  const { profile, user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    if (!profile?.school_id) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("school_id", profile.school_id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [profile?.school_id]);

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
    fetchReplies(ticket.id);
  };

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Mohon isi semua field");
      return;
    }
    if (!profile?.school_id || !user) return;
    setCreating(true);
    const { error } = await supabase.from("support_tickets").insert({
      school_id: profile.school_id,
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
      priority,
    });
    if (error) {
      toast.error("Gagal membuat tiket");
    } else {
      toast.success("Tiket berhasil dikirim!");
      setSubject("");
      setMessage("");
      setPriority("normal");
      setDialogOpen(false);
      fetchTickets();
    }
    setCreating(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;
    setSendingReply(true);
    const { error } = await supabase.from("ticket_replies").insert({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      message: replyText.trim(),
      is_admin: false,
    });
    if (error) {
      toast.error("Gagal mengirim balasan");
    } else {
      setReplyText("");
      fetchReplies(selectedTicket.id);
    }
    setSendingReply(false);
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  // Detail view
  if (selectedTicket) {
    const status = statusConfig[selectedTicket.status] || statusConfig.open;
    const isResolved = selectedTicket.status === "resolved";

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>

        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">{selectedTicket.subject}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(selectedTicket.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
            </div>

            {/* Original message */}
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>

            {/* Chat thread */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
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
                    className={`flex ${r.is_admin ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-[80%] rounded-xl p-3 ${
                      r.is_admin
                        ? "bg-primary/5 border border-primary/10"
                        : "bg-muted"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {r.is_admin && <Shield className="h-3 w-3 text-primary" />}
                        <span className="text-[10px] font-semibold text-foreground">
                          {r.is_admin ? "Admin" : "Anda"}
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

            {/* Reply input */}
            {isResolved ? (
              <div className="mt-4 p-3 bg-success/5 rounded-lg border border-success/10 text-center">
                <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
                <p className="text-xs text-success font-medium">Tiket ini telah ditandai selesai</p>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
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
                  disabled={sendingReply || !replyText.trim()}
                  size="icon"
                  className="gradient-primary text-primary-foreground h-auto"
                >
                  {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bantuan & Tiket</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Laporkan kendala atau ajukan pertanyaan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <TicketPlus className="h-4 w-4 mr-2" /> Buat Tiket Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Tiket Bantuan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Subjek</Label>
                <Input placeholder="Ringkasan masalah..." value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <Label>Prioritas</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Rendah</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Tinggi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Detail Masalah</Label>
                <Textarea placeholder="Jelaskan kendala yang Anda alami..." rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full gradient-primary text-primary-foreground">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kirim Tiket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Menunggu", value: openCount, color: "text-warning" },
          { label: "Diproses", value: inProgressCount, color: "text-primary" },
          { label: "Selesai", value: resolvedCount, color: "text-success" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-card">
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tickets.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada tiket bantuan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket, i) => {
            const status = statusConfig[ticket.status] || statusConfig.open;
            const prio = priorityConfig[ticket.priority] || priorityConfig.normal;
            const StatusIcon = status.icon;
            return (
              <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card
                  className="border-0 shadow-card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openTicket(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className="h-4 w-4 shrink-0" style={{ color: "currentColor" }} />
                          <h3 className="text-sm font-semibold text-foreground truncate">{ticket.subject}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{ticket.message}</p>
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

export default SupportTickets;
