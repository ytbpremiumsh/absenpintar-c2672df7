import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SchoolData } from "./SchoolCard";

interface PlanOption {
  id: string;
  name: string;
  price: number;
}

interface SchoolSubscriptionDialogProps {
  school: SchoolData | null;
  plans: PlanOption[];
  onClose: () => void;
  onSaved: () => void;
}

const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "pending", label: "Menunggu" },
];

const SchoolSubscriptionDialog = ({ school, plans, onClose, onSaved }: SchoolSubscriptionDialogProps) => {
  const [form, setForm] = useState({ plan_id: "", status: "active", expires_at: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (school) {
      setForm({
        plan_id: school.subscription?.plan_id || (plans[0]?.id || ""),
        status: school.subscription?.status || "active",
        expires_at: school.subscription?.expires_at ? school.subscription.expires_at.slice(0, 10) : "",
      });
    }
  }, [school, plans]);

  const handleSave = async () => {
    if (!school || !form.plan_id) return;
    setSaving(true);

    const payload = {
      school_id: school.id,
      plan_id: form.plan_id,
      status: form.status,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };

    if (school.subscription?.id) {
      const { error } = await supabase.from("school_subscriptions").update(payload).eq("id", school.subscription.id);
      if (error) { toast.error("Gagal update: " + error.message); setSaving(false); return; }
      toast.success("Langganan berhasil diupdate");
    } else {
      const { error } = await supabase.from("school_subscriptions").insert(payload);
      if (error) { toast.error("Gagal buat langganan: " + error.message); setSaving(false); return; }
      toast.success("Langganan berhasil ditambahkan");
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!school} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Langganan — {school?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Paket Langganan</Label>
            <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih paket" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — Rp {p.price.toLocaleString("id-ID")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Berlaku Sampai (opsional)</Label>
            <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Kosongkan untuk unlimited</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolSubscriptionDialog;
