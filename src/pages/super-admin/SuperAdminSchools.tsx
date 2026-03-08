import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { School, Users, Search, Pencil, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface SchoolData {
  id: string;
  name: string;
  address: string | null;
  logo: string | null;
  created_at: string;
  studentCount?: number;
  subscription?: { plan_name: string; status: string; expires_at: string | null } | null;
}

const SuperAdminSchools = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editSchool, setEditSchool] = useState<SchoolData | null>(null);
  const [detailSchool, setDetailSchool] = useState<SchoolData | null>(null);
  const [editForm, setEditForm] = useState({ name: "", address: "" });

  const fetchSchools = async () => {
    const [schoolsRes, studentsRes, subsRes] = await Promise.all([
      supabase.from("schools").select("*"),
      supabase.from("students").select("school_id"),
      supabase.from("school_subscriptions").select("school_id, status, expires_at, subscription_plans(name)").eq("status", "active"),
    ]);

    const schoolsList = schoolsRes.data || [];
    const students = studentsRes.data || [];
    const subs = subsRes.data || [];

    const mapped: SchoolData[] = schoolsList.map((s: any) => {
      const count = students.filter((st: any) => st.school_id === s.id).length;
      const sub = subs.find((sb: any) => sb.school_id === s.id);
      return {
        ...s,
        studentCount: count,
        subscription: sub ? { plan_name: (sub as any).subscription_plans?.name || "—", status: sub.status, expires_at: sub.expires_at } : null,
      };
    });
    setSchools(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchSchools(); }, []);

  const filtered = schools.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleEditSave = async () => {
    if (!editSchool) return;
    const { error } = await supabase.from("schools").update({ name: editForm.name, address: editForm.address || null }).eq("id", editSchool.id);
    if (error) { toast.error("Gagal update: " + error.message); return; }
    toast.success("Sekolah berhasil diupdate");
    setEditSchool(null);
    fetchSchools();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Sekolah</h1>
          <p className="text-muted-foreground text-sm">{schools.length} sekolah terdaftar</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari sekolah..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <School className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{s.name}</h3>
                    {s.address && <p className="text-xs text-muted-foreground truncate">{s.address}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]"><Users className="h-3 w-3 mr-0.5" />{s.studentCount} siswa</Badge>
                      {s.subscription ? (
                        <Badge className="bg-success/10 text-success border-success/20 text-[10px]">{s.subscription.plan_name}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Belum berlangganan</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailSchool(s)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditSchool(s); setEditForm({ name: s.name, address: s.address || "" }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editSchool} onOpenChange={() => setEditSchool(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Sekolah</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama Sekolah</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Alamat</Label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleEditSave} className="gradient-primary text-primary-foreground">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailSchool} onOpenChange={() => setDetailSchool(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detailSchool?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><p className="text-xs text-muted-foreground">Alamat</p><p className="text-sm text-foreground">{detailSchool?.address || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Jumlah Siswa</p><p className="text-sm font-semibold text-foreground">{detailSchool?.studentCount}</p></div>
            <div><p className="text-xs text-muted-foreground">Langganan</p>{detailSchool?.subscription ? <Badge className="bg-success/10 text-success border-success/20">{detailSchool.subscription.plan_name} ({detailSchool.subscription.status})</Badge> : <p className="text-sm text-muted-foreground">Belum berlangganan</p>}</div>
            <div><p className="text-xs text-muted-foreground">Terdaftar</p><p className="text-sm text-foreground">{detailSchool ? new Date(detailSchool.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}</p></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSchools;
