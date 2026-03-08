import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GraduationCap, Users, Search, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const Teachers = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.school_id) return;
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

  // Group by parent (wali) and class
  const waliData = useMemo(() => {
    const groups: Record<string, { name: string; phone: string; children: any[] }> = {};

    for (const s of students) {
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
  }, [students, search]);

  return (
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
            <p className="text-2xl font-bold">{new Set(students.map((s) => s.class)).size}</p>
            <p className="text-xs text-muted-foreground">Kelas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari wali, siswa, kelas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Wali Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : waliData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada data wali</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {waliData.map((wali, i) => (
            <motion.div
              key={`${wali.name}-${wali.phone}`}
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
                    {wali.children.map((child) => (
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
      )}
    </div>
  );
};

export default Teachers;
