import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Search, Users, School, Clock, Monitor } from "lucide-react";

interface LoginLog {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  school_name: string | null;
  user_agent: string | null;
  created_at: string;
}

const roleBadge = (role: string | null) => {
  if (!role) return <Badge variant="outline" className="text-[10px]">Unknown</Badge>;
  const r = role.toLowerCase();
  if (r.includes("super_admin")) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Super Admin</Badge>;
  if (r.includes("school_admin")) return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Admin Sekolah</Badge>;
  if (r.includes("staff")) return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">Operator</Badge>;
  if (r.includes("teacher")) return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Wali Kelas</Badge>;
  return <Badge variant="outline" className="text-[10px]">{role}</Badge>;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const getBrowser = (ua: string | null) => {
  if (!ua) return "—";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  return "Other";
};

export default function SuperAdminLoginLogs() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("login_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500) as { data: LoginLog[] | null };
    setLogs(data || []);
    setLoading(false);
  };

  const filtered = logs.filter((l) => {
    const matchSearch = !search || 
      (l.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.school_name || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || (l.role || "").toLowerCase().includes(roleFilter);
    return matchSearch && matchRole;
  });

  const todayCount = logs.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length;
  const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
  const uniqueSchools = new Set(logs.filter((l) => l.school_name).map((l) => l.school_name)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Log Riwayat Login</h1>
          <p className="text-xs text-muted-foreground">Pantau aktivitas login semua pengguna platform</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Login Hari Ini", value: todayCount, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pengguna Unik", value: uniqueUsers, icon: Users, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Sekolah Aktif", value: uniqueSchools, icon: School, color: "text-blue-600", bg: "bg-blue-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, email, atau sekolah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              <SelectItem value="school_admin">Admin Sekolah</SelectItem>
              <SelectItem value="staff">Operator</SelectItem>
              <SelectItem value="teacher">Wali Kelas</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Riwayat Login ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Belum ada data login</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold">Nama</TableHead>
                    <TableHead className="text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-xs font-semibold">Role</TableHead>
                    <TableHead className="text-xs font-semibold">Sekolah</TableHead>
                    <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                    <TableHead className="text-xs font-semibold">Jam</TableHead>
                    <TableHead className="text-xs font-semibold">Browser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/20">
                      <TableCell className="text-sm font-medium py-3">{log.full_name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.email || "—"}</TableCell>
                      <TableCell>{roleBadge(log.role)}</TableCell>
                      <TableCell className="text-xs">{log.school_name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                      <TableCell className="text-xs font-mono font-semibold">{formatTime(log.created_at)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{getBrowser(log.user_agent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
