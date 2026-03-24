import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Users, Search, Phone, User, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { PremiumGate } from "@/components/PremiumGate";

const PER_PAGE = 9;

const Teachers = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.school_id) { setLoading(false); return; }
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", profile.school_id)
        .order("class")
        .order("name");
      setStudents(data || []);
      setLoading(false);
    };
    fetchData();
  }, [profile?.school_id]);

  const classList = useMemo(() => {
    return [...new Set(students.map((s) => s.class))].sort();
  }, [students]);

  // Group by parent (wali) and class
  const waliData = useMemo(() => {
    const groups: Record<string, { name: string; phone: string; children: any[] }> = {};

    const filtered = classFilter === "all" ? students : students.filter((s) => s.class === classFilter);

    for (const s of filtered) {
      const key = `${s.parent_name}|${s.parent_phone}`;
      if (!groups[key]) {
        groups[key] = { name: s.parent_name, phone: s.parent_phone, children: [] };
      }
      groups[key].children.push(s);
    }

    const list = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));

    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.phone.includes(q) ||
        w.children.some((c) => c.name.toLowerCase().includes(q) || c.class.toLowerCase().includes(q))
    );
  }, [students, search, classFilter]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, classFilter]);

  const totalPages = Math.max(1, Math.ceil(waliData.length / PER_PAGE));
  const paginatedData = waliData.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <PremiumGate featureLabel="Data Wali Murid" requiredPlan="Basic">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Wali Murid</h1>
        <p className="text-muted-foreground text-sm">Daftar orang tua/wali beserta anak yang terdaftar</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <User className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{waliData.length}</p>
            <p className="text-xs text-muted-foreground">Total Wali</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground">Total Siswa</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0 col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{classList.length}</p>
            <p className="text-xs text-muted-foreground">Kelas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari wali, siswa, kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-10">
            <SelectValue placeholder="Semua Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classList.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Wali Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : paginatedData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada data wali</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedData.map((wali, i) => (
              <motion.div
                key={`${wali.name}-${wali.phone}-${page}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="shadow-card border-0 hover:shadow-elevated transition-all h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0">
                        {wali.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{wali.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{wali.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Anak ({wali.children.length})
                      </p>
                      {wali.children.map((child: any) => (
                        <div key={child.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {child.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{child.name}</p>
                            <p className="text-[11px] text-muted-foreground">NIS: {child.student_id}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {child.class}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="icon" className="h-9 w-9" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground min-w-[100px] text-center">
                {page} dari {totalPages}
              </span>
              <Button variant="outline" size="icon" className="h-9 w-9" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
    </PremiumGate>
  );
};

export default Teachers;
