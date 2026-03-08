import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, QrCode, Trash2, Loader2, Users, GraduationCap, Phone, ChevronDown, ChevronRight, Eye, Upload, Download, Camera, Lock, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

const Students = () => {
  const { profile } = useAuth();
  const features = useSubscriptionFeatures();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [form, setForm] = useState({ name: "", class: "", student_id: "", parent_name: "", parent_phone: "" });
  const [saving, setSaving] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [photoUploading, setPhotoUploading] = useState<string | null>(null);
  const [promoteFrom, setPromoteFrom] = useState("");
  const [promoteTo, setPromoteTo] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [qrInstructions, setQrInstructions] = useState<string[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<{ name?: string; logo?: string }>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const classParam = searchParams.get("class");
    if (classParam) setActiveFilter(classParam);
  }, [searchParams]);

  const fetchData = async () => {
    if (!profile?.school_id) return;
    const [studentsRes, classesRes, instrRes, schoolRes] = await Promise.all([
      supabase.from("students").select("*").eq("school_id", profile.school_id).order("class").order("name"),
      supabase.from("classes").select("*").eq("school_id", profile.school_id).order("name"),
      supabase.from("qr_instructions").select("instruction_text").eq("school_id", profile.school_id).order("sort_order"),
      supabase.from("schools").select("name, logo").eq("id", profile.school_id).single(),
    ]);
    setStudents(studentsRes.data || []);
    setClasses(classesRes.data || []);
    if (instrRes.data && instrRes.data.length > 0) {
      setQrInstructions(instrRes.data.map((r: any) => r.instruction_text));
    }
    if (schoolRes.data) {
      setSchoolInfo({ name: schoolRes.data.name, logo: schoolRes.data.logo || undefined });
    }
    setLoading(false);
    if (studentsRes.data) {
      setExpandedClasses(new Set(studentsRes.data.map((s: any) => s.class)));
    }
  };

  useEffect(() => { fetchData(); }, [profile?.school_id]);

  const handleAdd = async () => {
    if (!profile?.school_id || !form.name || !form.student_id || !form.class) {
      toast.error("Nama, Kelas, dan NIS wajib diisi");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("students").insert({
      school_id: profile.school_id,
      name: form.name, class: form.class, student_id: form.student_id,
      parent_name: form.parent_name, parent_phone: form.parent_phone,
      qr_code: form.student_id,
    });
    setSaving(false);
    if (error) { toast.error("Gagal menambah siswa: " + error.message); return; }
    toast.success("Siswa berhasil ditambahkan!");
    setDialogOpen(false);
    setForm({ name: "", class: "", student_id: "", parent_name: "", parent_phone: "" });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus: " + error.message); return; }
    toast.success("Siswa dihapus");
    fetchData();
  };

  const handlePhotoUpload = async (studentId: string, file: File) => {
    if (!features.canUploadPhoto) {
      toast.error("Fitur upload foto tersedia di paket Basic ke atas");
      return;
    }
    setPhotoUploading(studentId);
    const ext = file.name.split(".").pop();
    const path = `${profile?.school_id}/${studentId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("student-photos").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Gagal upload foto: " + uploadError.message); setPhotoUploading(null); return; }
    const { data: urlData } = supabase.storage.from("student-photos").getPublicUrl(path);
    await supabase.from("students").update({ photo_url: urlData.publicUrl }).eq("id", studentId);
    toast.success("Foto berhasil diupload!");
    setPhotoUploading(null);
    fetchData();
  };

  const handleExportExcel = () => {
    if (!features.canImportExport) {
      toast.error("Fitur export tersedia di paket Basic ke atas");
      return;
    }
    const data = students.map((s) => ({
      "Nama Siswa": s.name, "NIS": s.student_id, "Kelas": s.class,
      "Nama Wali": s.parent_name, "No. HP Wali": s.parent_phone,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");
    XLSX.writeFile(wb, `data-siswa-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Data siswa berhasil diexport!");
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { "Nama Siswa": "Ahmad Zaki", "NIS": "STD001", "Kelas": "1-A", "Nama Wali": "Budi Santoso", "No. HP Wali": "081234567890" },
      { "Nama Siswa": "Siti Aisyah", "NIS": "STD002", "Kelas": "1-A", "Nama Wali": "Dewi Lestari", "No. HP Wali": "082345678901" },
      { "Nama Siswa": "Muhammad Rizki", "NIS": "STD003", "Kelas": "2-B", "Nama Wali": "Hendra Wijaya", "No. HP Wali": "083456789012" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    // Set column widths
    ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
    XLSX.writeFile(wb, "template-import-siswa.xlsx");
    toast.success("Template berhasil didownload! Isi data lalu import kembali.");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!features.canImportExport) {
      toast.error("Fitur import tersedia di paket Basic ke atas");
      return;
    }
    const file = e.target.files?.[0];
    if (!file || !profile?.school_id) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) { toast.error("File kosong"); return; }

        const toInsert = rows.map((row) => ({
          school_id: profile!.school_id!,
          name: row["Nama Siswa"] || row["name"] || "",
          student_id: String(row["NIS"] || row["student_id"] || ""),
          class: row["Kelas"] || row["class"] || "",
          parent_name: row["Nama Wali"] || row["parent_name"] || "",
          parent_phone: String(row["No. HP Wali"] || row["parent_phone"] || ""),
          qr_code: String(row["NIS"] || row["student_id"] || ""),
        })).filter((r) => r.name && r.student_id && r.class);

        if (toInsert.length === 0) { toast.error("Tidak ada data valid. Pastikan kolom: Nama Siswa, NIS, Kelas"); return; }

        const { error } = await supabase.from("students").insert(toInsert);
        if (error) { toast.error("Gagal import: " + error.message); return; }
        toast.success(`${toInsert.length} siswa berhasil diimport!`);
        fetchData();
      } catch (err: any) {
        toast.error("Gagal membaca file Excel");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handlePromoteClass = async () => {
    if (!promoteFrom || !promoteTo || !profile?.school_id) {
      toast.error("Pilih kelas asal dan kelas tujuan");
      return;
    }
    if (promoteFrom === promoteTo) {
      toast.error("Kelas asal dan tujuan tidak boleh sama");
      return;
    }
    setPromoting(true);
    const studentsToPromote = students.filter(s => s.class === promoteFrom);
    if (studentsToPromote.length === 0) {
      toast.error("Tidak ada siswa di kelas " + promoteFrom);
      setPromoting(false);
      return;
    }

    const ids = studentsToPromote.map(s => s.id);
    const { error } = await supabase
      .from("students")
      .update({ class: promoteTo })
      .in("id", ids);

    setPromoting(false);
    if (error) { toast.error("Gagal naik kelas: " + error.message); return; }
    toast.success(`${studentsToPromote.length} siswa berhasil dipindahkan dari ${promoteFrom} ke ${promoteTo}!`);
    setPromoteDialogOpen(false);
    setPromoteFrom("");
    setPromoteTo("");
    fetchData();
  };

  const toggleClass = (cls: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(cls)) next.delete(cls); else next.add(cls);
      return next;
    });
  };

  const filtered = students.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.class.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id.toLowerCase().includes(search.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByClass = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const list = activeFilter === "all" ? filtered : filtered.filter((s) => s.class === activeFilter);
    for (const s of list) {
      if (!groups[s.class]) groups[s.class] = [];
      groups[s.class].push(s);
    }
    return groups;
  }, [filtered, activeFilter]);

  const allClasses = useMemo(() => Array.from(new Set(students.map((s) => s.class))).sort(), [students]);
  const classOptions = useMemo(() => {
    const fromTable = classes.map((c: any) => c.name);
    const fromStudents = students.map((s: any) => s.class);
    return Array.from(new Set([...fromTable, ...fromStudents])).sort();
  }, [classes, students]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Data Siswa</h1>
          <p className="text-muted-foreground text-sm">Kelola data siswa, QR Code, dan kategori kelas</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto">
          {/* Naik Kelas */}
          <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 text-xs px-2 sm:px-3">
                <ArrowRightLeft className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Naik Kelas</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Naik Kelas / Pindah Kelas</DialogTitle>
                <DialogDescription>Pindahkan semua siswa dari satu kelas ke kelas lain secara bersamaan</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Kelas Asal</Label>
                  <Select value={promoteFrom} onValueChange={setPromoteFrom}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas asal" /></SelectTrigger>
                    <SelectContent>
                      {allClasses.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls} ({students.filter(s => s.class === cls).length} siswa)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kelas Tujuan</Label>
                  <Select value={promoteTo} onValueChange={setPromoteTo}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas tujuan" /></SelectTrigger>
                    <SelectContent>
                      {classOptions.map((cls) => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Atau ketik nama kelas baru di bawah</p>
                  <Input
                    placeholder="Ketik kelas baru, cth: 2-A"
                    value={promoteTo}
                    onChange={(e) => setPromoteTo(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {promoteFrom && (
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-foreground mb-1">Preview:</p>
                    <p className="text-xs text-muted-foreground">
                      <strong>{students.filter(s => s.class === promoteFrom).length}</strong> siswa dari kelas <strong>{promoteFrom}</strong> akan dipindahkan ke kelas <strong>{promoteTo || "..."}</strong>
                    </p>
                  </div>
                )}

                <Button onClick={handlePromoteClass} disabled={promoting || !promoteFrom || !promoteTo} className="w-full gradient-primary hover:opacity-90">
                  {promoting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 mr-1" />}
                  {promoting ? "Memproses..." : "Pindahkan Semua Siswa"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Template Download */}
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="shrink-0 text-xs px-2 sm:px-3">
            <Download className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Template</span>
          </Button>

          {/* Import */}
          <div className="relative shrink-0">
            {features.canImportExport && (
              <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="absolute inset-0 opacity-0 cursor-pointer" />
            )}
            <Button variant="outline" size="sm"
              onClick={() => { if (!features.canImportExport) toast.error("Fitur Import tersedia di paket Basic ke atas. Silakan upgrade langganan."); }}
              className={`text-xs px-2 sm:px-3 ${!features.canImportExport ? "opacity-60 cursor-not-allowed" : ""}`}>
              <Upload className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Import</span>
              {!features.canImportExport && <Lock className="h-3 w-3 ml-1 text-warning" />}
            </Button>
          </div>
          {/* Export */}
          <Button variant="outline" size="sm"
            onClick={() => { if (features.canImportExport) handleExportExcel(); else toast.error("Fitur Export tersedia di paket Basic ke atas. Silakan upgrade langganan."); }}
            className={`shrink-0 text-xs px-2 sm:px-3 ${!features.canImportExport ? "opacity-60 cursor-not-allowed" : ""}`}>
            <Download className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Export</span>
            {!features.canImportExport && <Lock className="h-3 w-3 ml-1 text-warning" />}
          </Button>
          {/* Add Student */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary hover:opacity-90 h-9 shrink-0 text-xs px-2 sm:px-3">
                <Plus className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Tambah Siswa</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Tambah Siswa Baru</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nama Siswa</Label>
                  <Input placeholder="Nama lengkap siswa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kelas</Label>
                    <Select value={form.class} onValueChange={(val) => setForm({ ...form, class: val })}>
                      <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                      <SelectContent>
                        {classOptions.map((cls) => (<SelectItem key={cls} value={cls}>{cls}</SelectItem>))}
                      </SelectContent>
                    </Select>
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
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter Kelas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {allClasses.map((cls) => (<SelectItem key={cls} value={cls}>Kelas {cls}</SelectItem>))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{Object.values(groupedByClass).flat().length} siswa</Badge>
      </div>

      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari siswa, kelas, NIS, wali..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : Object.keys(groupedByClass).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Belum ada data siswa</p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedByClass).sort(([a], [b]) => a.localeCompare(b)).map(([cls, classStudents]) => (
                <div key={cls}>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left" onClick={() => toggleClass(cls)}>
                    {expandedClasses.has(cls) ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1"><span className="font-semibold text-sm">Kelas {cls}</span></div>
                    <Badge variant="secondary" className="text-xs">{classStudents.length} siswa</Badge>
                  </button>
                  <AnimatePresence>
                    {expandedClasses.has(cls) && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
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
                                      {student.photo_url ? (
                                        <img src={student.photo_url} alt={student.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                                      ) : (
                                        <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                                          {student.name.charAt(0)}
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium text-sm">{student.name}</p>
                                        <p className="text-xs text-muted-foreground sm:hidden">{student.student_id}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{student.student_id}</span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell"><p className="text-sm">{student.parent_name}</p></TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{student.parent_phone}</div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <div className="relative">
                                        {features.canUploadPhoto ? (
                                          <>
                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8" onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(student.id, e.target.files[0]); }} />
                                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={photoUploading === student.id}>
                                              {photoUploading === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
                                            </Button>
                                          </>
                                        ) : (
                                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50"
                                            onClick={() => toast.error("Fitur Upload Foto tersedia di paket Basic ke atas")}>
                                            <div className="relative">
                                              <Camera className="h-4 w-4 text-muted-foreground" />
                                              <Lock className="h-2.5 w-2.5 text-warning absolute -top-1 -right-1" />
                                            </div>
                                          </Button>
                                        )}
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/students/${student.id}`)}><Eye className="h-4 w-4 text-primary" /></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStudent(student); setQrDialogOpen(true); }}><QrCode className="h-4 w-4 text-primary" /></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(student.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-center">QR Code Siswa</DialogTitle></DialogHeader>
          {selectedStudent && (
            <div className="text-center space-y-4 py-2">
              <QRCodeDisplay
                data={selectedStudent.qr_code || selectedStudent.student_id}
                size={220}
                studentName={selectedStudent.name}
                studentClass={selectedStudent.class}
                schoolName={schoolInfo.name}
                customInstructions={qrInstructions.length > 0 ? qrInstructions : undefined}
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
