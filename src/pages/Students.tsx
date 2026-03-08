import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, QrCode, Trash2, Loader2, Users, GraduationCap, Phone, ChevronDown, ChevronRight, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { motion, AnimatePresence } from "framer-motion";

const Students = () => {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [form, setForm] = useState({ name: "", class: "", student_id: "", parent_name: "", parent_phone: "" });
  const [saving, setSaving] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const fetchStudents = async () => {
    if (!profile?.school_id) return;
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", profile.school_id)
      .order("class")
      .order("name");
    setStudents(data || []);
    setLoading(false);
    // Auto-expand all classes
    if (data) {
      const classes = new Set(data.map((s: any) => s.class));
      setExpandedClasses(classes);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [profile?.school_id]);

  const handleAdd = async () => {
    if (!profile?.school_id || !form.name || !form.student_id) {
      toast.error("Nama dan NIS wajib diisi");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("students").insert({
      school_id: profile.school_id,
      name: form.name,
      class: form.class,
      student_id: form.student_id,
      parent_name: form.parent_name,
      parent_phone: form.parent_phone,
      qr_code: form.student_id,
    });
    setSaving(false);
    if (error) {
      toast.error("Gagal menambah siswa: " + error.message);
      return;
    }
    toast.success("Siswa berhasil ditambahkan!");
    setDialogOpen(false);
    setForm({ name: "", class: "", student_id: "", parent_name: "", parent_phone: "" });
    fetchStudents();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
      return;
    }
    toast.success("Siswa dihapus");
    fetchStudents();
  };

  const toggleClass = (cls: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.class.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id.toLowerCase().includes(search.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by class
  const groupedByClass = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const list = activeFilter === "all" ? filtered : filtered.filter((s) => s.class === activeFilter);
    for (const s of list) {
      if (!groups[s.class]) groups[s.class] = [];
      groups[s.class].push(s);
    }
    return groups;
  }, [filtered, activeFilter]);

  const allClasses = useMemo(() => {
    const set = new Set(students.map((s) => s.class));
    return Array.from(set).sort();
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Data Siswa</h1>
          <p className="text-muted-foreground text-sm">Kelola data siswa, QR Code, dan kategori kelas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary hover:opacity-90 h-10">
              <Plus className="h-4 w-4 mr-2" /> Tambah Siswa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Siswa Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nama Siswa</Label>
                <Input placeholder="Nama lengkap siswa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kelas</Label>
                  <Input placeholder="TK-A" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>NIS</Label>
                  <Input placeholder="STD009" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nama Wali</Label>
                <Input placeholder="Nama orang tua/wali" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>No. HP Wali</Label>
                <Input placeholder="08xxxxxxxxxx" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full gradient-primary hover:opacity-90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats per Class */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card
          className={`shadow-card border-0 cursor-pointer transition-all hover:shadow-elevated ${activeFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{students.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Semua Kelas</p>
          </CardContent>
        </Card>
        {allClasses.map((cls) => {
          const count = students.filter((s) => s.class === cls).length;
          return (
            <Card
              key={cls}
              className={`shadow-card border-0 cursor-pointer transition-all hover:shadow-elevated ${activeFilter === cls ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveFilter(cls)}
            >
              <CardContent className="p-3 text-center">
                <GraduationCap className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{cls}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari siswa, kelas, NIS, wali..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedByClass).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada data siswa</p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedByClass).sort(([a], [b]) => a.localeCompare(b)).map(([cls, classStudents]) => (
                <div key={cls}>
                  {/* Class Header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                    onClick={() => toggleClass(cls)}
                  >
                    {expandedClasses.has(cls) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm">Kelas {cls}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {classStudents.length} siswa
                    </Badge>
                  </button>

                  {/* Class Students */}
                  <AnimatePresence>
                    {expandedClasses.has(cls) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-secondary/30">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Nama Siswa</TableHead>
                                <TableHead className="hidden sm:table-cell">NIS</TableHead>
                                <TableHead className="hidden md:table-cell">Wali</TableHead>
                                <TableHead className="hidden lg:table-cell">No. HP</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {classStudents.map((student: any, i: number) => (
                                <TableRow key={student.id} className="hover:bg-secondary/20">
                                  <TableCell className="font-medium text-muted-foreground text-xs">{i + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                                        {student.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{student.name}</p>
                                        <p className="text-xs text-muted-foreground sm:hidden">{student.student_id}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{student.student_id}</span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div>
                                      <p className="text-sm">{student.parent_name}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {student.parent_phone}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setSelectedStudent(student);
                                          setQrDialogOpen(true);
                                        }}
                                      >
                                        <QrCode className="h-4 w-4 text-primary" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(student.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code Siswa</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="text-center space-y-4 py-2">
              <QRCodeDisplay
                data={selectedStudent.qr_code || selectedStudent.student_id}
                size={220}
                studentName={selectedStudent.name}
              />
              <div>
                <p className="font-bold">{selectedStudent.name}</p>
                <p className="text-sm text-muted-foreground">Kelas: {selectedStudent.class}</p>
                <p className="text-sm text-muted-foreground">NIS: {selectedStudent.student_id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
