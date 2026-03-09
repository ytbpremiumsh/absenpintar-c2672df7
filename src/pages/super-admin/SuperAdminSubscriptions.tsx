import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { School, Calendar, CheckCircle2, XCircle, Clock, Pencil, Plus, Minus, Webhook, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface SubscriptionData {
  id: string;
  school_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  school_name: string;
  plan_name: string;
}

const SuperAdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSub, setEditSub] = useState<SubscriptionData | null>(null);
  const [editForm, setEditForm] = useState({ status: "", expires_at: "", plan_id: "", extend_days: 30 });

  const fetchData = async () => {
    const [subsRes, plansRes, schoolsRes] = await Promise.all([
      supabase.from("school_subscriptions").select("*, schools(name), subscription_plans(name)").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("id, name").order("sort_order"),
      supabase.from("schools").select("id, name"),
    ]);

    const subs = (subsRes.data || []).map((s: any) => ({
      ...s,
      school_name: s.schools?.name || "—",
      plan_name: s.subscription_plans?.name || "—",
    }));
    setSubscriptions(subs);
    setPlans(plansRes.data || []);
    setSchools(schoolsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (sub: SubscriptionData) => {
    setEditSub(sub);
    setEditForm({
      status: sub.status,
      expires_at: sub.expires_at ? sub.expires_at.split("T")[0] : "",
      plan_id: sub.plan_id,
      extend_days: 30,
    });
  };

  const handleSave = async () => {
    if (!editSub) return;
    const payload: any = {
      status: editForm.status,
      plan_id: editForm.plan_id,
      expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null,
    };
    const { error } = await supabase.from("school_subscriptions").update(payload).eq("id", editSub.id);
    if (error) { toast.error("Gagal update: " + error.message); return; }
    toast.success("Langganan berhasil diupdate");
    setEditSub(null);
    fetchData();
  };

  const handleExtend = async () => {
    if (!editSub) return;
    const currentExpiry = editSub.expires_at ? new Date(editSub.expires_at) : new Date();
    currentExpiry.setDate(currentExpiry.getDate() + editForm.extend_days);
    const { error } = await supabase.from("school_subscriptions")
      .update({ expires_at: currentExpiry.toISOString(), status: "active" })
      .eq("id", editSub.id);
    if (error) { toast.error("Gagal memperpanjang: " + error.message); return; }
    toast.success(`Langganan diperpanjang ${editForm.extend_days} hari`);
    setEditSub(null);
    fetchData();
  };

  const handleToggleStatus = async (sub: SubscriptionData) => {
    const newStatus = sub.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("school_subscriptions")
      .update({ status: newStatus })
      .eq("id", sub.id);
    if (error) { toast.error("Gagal: " + error.message); return; }
    toast.success(`Langganan ${newStatus === "active" ? "diaktifkan" : "dinonaktifkan"}`);
    fetchData();
  };

  const statusMap: Record<string, { label: string; cls: string; icon: any }> = {
    active: { label: "Aktif", cls: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    inactive: { label: "Nonaktif", cls: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
    expired: { label: "Expired", cls: "bg-muted text-muted-foreground", icon: Clock },
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const [webhookCopied, setWebhookCopied] = useState(false);
  const webhookUrl = `https://bohuglednqirnaearrkj.supabase.co/functions/v1/mayar-webhook`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    toast.success("URL Webhook disalin!");
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manajemen Langganan</h1>
        <p className="text-muted-foreground text-sm">Kelola status dan masa aktif langganan sekolah</p>
      </div>

      {/* Webhook Info */}
      <Card className="border-0 shadow-card bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground">Mayar Webhook URL</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pasang URL ini di pengaturan webhook Mayar untuk auto-accept pembayaran</p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-[11px] bg-background/80 px-3 py-1.5 rounded-lg border text-foreground truncate flex-1">
                  {webhookUrl}
                </code>
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={copyWebhook}>
                  {webhookCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {subscriptions.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Belum ada langganan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub, i) => {
            const st = statusMap[sub.status] || statusMap.inactive;
            const expired = isExpired(sub.expires_at);
            const StIcon = st.icon;
            return (
              <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                        <School className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">{sub.school_name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{sub.plan_name}</Badge>
                          <Badge className={`text-[10px] ${st.cls}`}>
                            <StIcon className="h-3 w-3 mr-0.5" />
                            {st.label}
                          </Badge>
                          {expired && sub.status === "active" && (
                            <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">⚠ Sudah Expired</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span>Mulai: {new Date(sub.started_at).toLocaleDateString("id-ID")}</span>
                          {sub.expires_at && <span>Berakhir: {new Date(sub.expires_at).toLocaleDateString("id-ID")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleStatus(sub)} title={sub.status === "active" ? "Nonaktifkan" : "Aktifkan"}>
                          {sub.status === "active" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(sub)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editSub} onOpenChange={() => setEditSub(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Langganan — {editSub?.school_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paket</Label>
              <Select value={editForm.plan_id} onValueChange={(v) => setEditForm({ ...editForm, plan_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanggal Berakhir</Label>
              <Input type="date" value={editForm.expires_at} onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })} />
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-semibold">Perpanjang Masa Aktif</Label>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditForm({ ...editForm, extend_days: Math.max(1, editForm.extend_days - 30) })}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input type="number" value={editForm.extend_days} onChange={(e) => setEditForm({ ...editForm, extend_days: Number(e.target.value) || 0 })} className="w-20 text-center" />
                <span className="text-sm text-muted-foreground">hari</span>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditForm({ ...editForm, extend_days: editForm.extend_days + 30 })}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={handleExtend}>
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Perpanjang
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSubscriptions;
