import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SchoolCard, { SchoolData } from "@/components/super-admin/SchoolCard";
import SchoolDetailDialog from "@/components/super-admin/SchoolDetailDialog";
import SchoolEditDialog from "@/components/super-admin/SchoolEditDialog";
import SchoolSubscriptionDialog from "@/components/super-admin/SchoolSubscriptionDialog";

interface PlanOption {
  id: string;
  name: string;
  price: number;
}

const statusOptions = [
  { value: "active", label: "Aktif", color: "bg-success/10 text-success" },
  { value: "expired", label: "Kedaluwarsa", color: "bg-warning/10 text-warning" },
  { value: "cancelled", label: "Dibatalkan", color: "bg-destructive/10 text-destructive" },
  { value: "pending", label: "Menunggu", color: "bg-muted text-muted-foreground" },
];

const getStatusBadge = (status: string) => {
  const opt = statusOptions.find((o) => o.value === status);
  return <Badge className={`${opt?.color || "bg-muted text-muted-foreground"} text-[10px] border-0`}>{opt?.label || status}</Badge>;
};

const SuperAdminSchools = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [detailSchool, setDetailSchool] = useState<SchoolData | null>(null);
  const [editSchool, setEditSchool] = useState<SchoolData | null>(null);
  const [subSchool, setSubSchool] = useState<SchoolData | null>(null);

  const fetchSchools = async () => {
    const [schoolsRes, studentsRes, subsRes, plansRes, profilesRes, loginLogsRes] = await Promise.all([
      supabase.from("schools").select("*"),
      supabase.from("students").select("school_id, class"),
      supabase.from("school_subscriptions").select("id, school_id, plan_id, status, expires_at, subscription_plans(name)"),
      supabase.from("subscription_plans").select("id, name, price").eq("is_active", true).order("sort_order"),
      supabase.from("profiles").select("school_id, full_name, phone, user_id"),
      supabase.from("login_logs").select("user_id, email").order("created_at", { ascending: false }),
    ]);

    const { data: adminRoles } = await supabase.from("user_roles").select("user_id, role").eq("role", "school_admin");
    const adminUserIds = new Set((adminRoles || []).map((r: any) => r.user_id));

    // Build email map from login_logs (most recent per user)
    const emailMap: Record<string, string> = {};
    (loginLogsRes.data || []).forEach((l: any) => {
      if (l.email && !emailMap[l.user_id]) emailMap[l.user_id] = l.email;
    });

    const schoolsList = schoolsRes.data || [];
    const students = studentsRes.data || [];
    const subs = subsRes.data || [];
    const profiles = profilesRes.data || [];
    setPlans(plansRes.data || []);

    const mapped: SchoolData[] = schoolsList.map((s: any) => {
      const schoolStudents = students.filter((st: any) => st.school_id === s.id);
      const uniqueClasses = new Set(schoolStudents.map((st: any) => st.class));
      const schoolSubs = subs.filter((sb: any) => sb.school_id === s.id);
      const activeSub = schoolSubs.find((sb: any) => sb.status === "active") || schoolSubs[0];
      
      const adminProfile = profiles.find((p: any) => p.school_id === s.id && adminUserIds.has(p.user_id));
      
      return {
        ...s,
        studentCount: schoolStudents.length,
        classCount: uniqueClasses.size,
        adminName: adminProfile?.full_name || null,
        adminPhone: adminProfile?.phone || null,
        adminEmail: adminProfile ? (emailMap[adminProfile.user_id] || null) : null,
        subscription: activeSub
          ? { id: activeSub.id, plan_id: activeSub.plan_id, plan_name: (activeSub as any).subscription_plans?.name || "—", status: activeSub.status, expires_at: activeSub.expires_at }
          : null,
      };
    });
    setSchools(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchSchools(); }, []);

  const filtered = schools.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

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
          <SchoolCard
            key={s.id}
            school={s}
            index={i}
            onDetail={setDetailSchool}
            onSubscription={setSubSchool}
            onEdit={setEditSchool}
            getStatusBadge={getStatusBadge}
          />
        ))}
      </div>

      <SchoolDetailDialog school={detailSchool} onClose={() => setDetailSchool(null)} getStatusBadge={getStatusBadge} />
      <SchoolEditDialog school={editSchool} onClose={() => setEditSchool(null)} onSaved={fetchSchools} />
      <SchoolSubscriptionDialog school={subSchool} plans={plans} onClose={() => setSubSchool(null)} onSaved={fetchSchools} />
    </div>
  );
};

export default SuperAdminSchools;
