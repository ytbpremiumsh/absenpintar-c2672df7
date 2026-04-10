import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Database, Download, RefreshCw, Shield, Clock, HardDrive, Loader2,
  CheckCircle, AlertTriangle, Table2, BarChart3, FileDown, Cloud,
  FolderOpen, ExternalLink, BookOpen, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BackupStats {
  tables: number;
  total_rows: number;
  stats: Record<string, number>;
}

interface GDriveInfo {
  file_name: string;
  folder: string;
  file_id: string;
  web_link: string;
  total_rows: number;
  tables: number;
}

const SuperAdminBackup = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentStats, setCurrentStats] = useState<BackupStats | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [lastBackupStats, setLastBackupStats] = useState<BackupStats | null>(null);

  // Google Drive state
  const [gdriveConfigured, setGdriveConfigured] = useState(false);
  const [gdriveBackingUp, setGdriveBackingUp] = useState(false);
  const [gdriveLastAt, setGdriveLastAt] = useState<string | null>(null);
  const [gdriveLastInfo, setGdriveLastInfo] = useState<GDriveInfo | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("database-backup", {
        body: { action: "stats" },
      });
      if (error) throw error;
      if (data?.success) {
        setCurrentStats(data.current);
        setLastBackupAt(data.last_backup_at);
        setLastBackupStats(data.last_backup_stats);
      }
    } catch (err: any) {
      toast.error("Gagal memuat statistik: " + err.message);
    }
    setLoading(false);
  };

  const fetchGdriveStatus = async () => {
    try {
      const { data } = await supabase.functions.invoke("backup-gdrive", {
        body: { action: "get-status" },
      });
      if (data) {
        setGdriveConfigured(data.configured || false);
        setGdriveLastAt(data.last_backup_at || null);
        setGdriveLastInfo(data.last_backup_info || null);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchStats();
    fetchGdriveStatus();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setExportProgress(10);
    try {
      setExportProgress(30);
      const { data, error } = await supabase.functions.invoke("database-backup", {
        body: { action: "export" },
      });
      setExportProgress(80);
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Export gagal");

      const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      toast.success(`Backup berhasil! ${data.meta.total_rows} baris dari ${data.meta.tables} tabel`);

      setLastBackupAt(data.meta.exported_at);
      setLastBackupStats({ tables: data.meta.tables, total_rows: data.meta.total_rows, stats: data.meta.stats });
    } catch (err: any) {
      toast.error("Gagal export: " + err.message);
    }
    setTimeout(() => { setExporting(false); setExportProgress(0); }, 1500);
  };

  const handleGdriveBackup = async () => {
    setGdriveBackingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-gdrive", {
        body: { action: "backup-now" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success) {
        toast.success(`Backup ke Google Drive berhasil! File: ${data.file_name}`);
        setGdriveLastAt(new Date().toISOString());
        setGdriveLastInfo({
          file_name: data.file_name,
          folder: data.folder,
          file_id: data.file_id,
          web_link: data.web_link,
          total_rows: data.total_rows,
          tables: data.tables,
        });
      }
    } catch (err: any) {
      toast.error("Gagal backup ke Google Drive: " + err.message);
    }
    setGdriveBackingUp(false);
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }); }
    catch { return iso; }
  };


  const topTables = currentStats?.stats
    ? Object.entries(currentStats.stats).sort((a, b) => b[1] - a[1]).slice(0, 8)
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        icon={Database}
        title="Backup & Migrasi"
        subtitle="Export data platform, backup ke Google Drive, dan sistem pemulihan darurat"
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "—" : currentStats?.total_rows?.toLocaleString("id-ID") || "0"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">Total Record</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Table2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "—" : currentStats?.tables || "0"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">Tabel Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${lastBackupAt ? "bg-success/10" : "bg-amber-500/10"}`}>
                <Clock className={`h-5 w-5 ${lastBackupAt ? "text-success" : "text-amber-500"}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground truncate max-w-[160px]">
                  {loading ? "—" : lastBackupAt ? formatDate(lastBackupAt) : "Belum pernah"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">Backup Terakhir</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Google Drive Backup */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" />
                Backup ke Google Drive
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Simpan backup otomatis ke Google Drive dengan folder per tanggal
              </p>
            </div>
            <Badge className={`text-[10px] ${gdriveConfigured ? "bg-success/10 text-success border-success/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
              {gdriveConfigured ? "Terhubung" : "Belum Dikonfigurasi"}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4 space-y-4">
          {gdriveConfigured ? (
            <>
              {/* Connected state */}
              <div className="rounded-xl border border-success/15 bg-success/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Google Drive Terhubung</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Backup akan disimpan di folder <strong>ATSkolla Backup / [tanggal]</strong> di Google Drive.
                      Setiap backup menghasilkan file JSON terpisah.
                    </p>
                  </div>
                </div>
              </div>

              {gdriveLastInfo && (
                <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 text-primary" />
                    Backup Terakhir ke Google Drive
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">File:</span>{" "}
                      <span className="font-medium text-foreground">{gdriveLastInfo.file_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Folder:</span>{" "}
                      <span className="font-medium text-foreground">{gdriveLastInfo.folder}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Record:</span>{" "}
                      <span className="font-medium text-foreground">{gdriveLastInfo.total_rows?.toLocaleString("id-ID")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Waktu:</span>{" "}
                      <span className="font-medium text-foreground">{gdriveLastAt ? formatDate(gdriveLastAt) : "-"}</span>
                    </div>
                  </div>
                  {gdriveLastInfo.web_link && (
                    <a
                      href={gdriveLastInfo.web_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Buka di Google Drive
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGdriveBackup}
                  disabled={gdriveBackingUp}
                  className="gradient-primary hover:opacity-90 shadow-md h-10 px-6 gap-2"
                >
                  {gdriveBackingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4" />
                  )}
                  {gdriveBackingUp ? "Mengupload ke Drive..." : "Backup ke Google Drive Sekarang"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Not configured */}
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Google Drive Belum Dikonfigurasi</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Untuk mengaktifkan backup otomatis ke Google Drive, Anda perlu membuat Google Service Account
                      dan menambahkan kredensialnya ke sistem. Ikuti tutorial di bawah ini.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowTutorial(!showTutorial)}
                variant="outline"
                className="h-9 gap-2 text-xs"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {showTutorial ? "Sembunyikan Tutorial" : "Lihat Tutorial Koneksi Google Drive"}
              </Button>
            </>
          )}

          {/* Tutorial Section */}
          {showTutorial && (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-4 space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Tutorial: Menghubungkan Google Drive untuk Backup
              </h4>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                    <p className="text-xs font-semibold text-foreground">Buat Project di Google Cloud Console</p>
                  </div>
                  <div className="ml-8 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Buka <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">console.cloud.google.com</a> dan
                      buat project baru atau pilih project yang sudah ada.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                    <p className="text-xs font-semibold text-foreground">Aktifkan Google Drive API</p>
                  </div>
                  <div className="ml-8 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Di Google Cloud Console, buka <strong>APIs & Services → Library</strong>.
                      Cari "Google Drive API" dan klik <strong>Enable</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</div>
                    <p className="text-xs font-semibold text-foreground">Buat Service Account</p>
                  </div>
                  <div className="ml-8 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Buka <strong>APIs & Services → Credentials → Create Credentials → Service Account</strong>.
                    </p>
                    <ul className="text-[11px] text-muted-foreground list-disc list-inside space-y-0.5">
                      <li>Beri nama, contoh: "ATSkolla Backup"</li>
                      <li>Role: tidak perlu (skip)</li>
                      <li>Klik Done</li>
                    </ul>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</div>
                    <p className="text-xs font-semibold text-foreground">Download JSON Key</p>
                  </div>
                  <div className="ml-8 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Klik service account yang baru dibuat → Tab <strong>Keys</strong> → <strong>Add Key → Create new key → JSON</strong>.
                      File JSON akan terdownload. <strong>Simpan file ini dengan aman!</strong>
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">5</div>
                    <p className="text-xs font-semibold text-foreground">Share Folder Google Drive</p>
                  </div>
                  <div className="ml-8 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Buka Google Drive Anda, buat folder "ATSkolla Backup" (opsional).
                      Klik kanan folder → <strong>Share</strong> → masukkan <strong>email service account</strong> 
                      (format: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">nama@project.iam.gserviceaccount.com</code>)
                      dan beri akses <strong>Editor</strong>.
                    </p>
                    <div className="rounded-lg bg-muted/50 p-2 border border-border/50">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3 shrink-0" />
                        Email service account bisa ditemukan di file JSON yang didownload (field "client_email")
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">6</div>
                    <p className="text-xs font-semibold text-foreground">Tambahkan Secret Key ke Sistem</p>
                  </div>
                  <div className="ml-8 space-y-1.5">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Hubungi developer untuk menambahkan isi file JSON sebagai secret <strong>GOOGLE_SERVICE_ACCOUNT_KEY</strong>
                      di pengaturan backend. Setelah ditambahkan, tombol "Backup ke Google Drive" akan aktif.
                    </p>
                  </div>
                </div>
              </div>

              {/* Structure info */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <FolderOpen className="h-3.5 w-3.5 text-primary" />
                  Struktur Folder di Google Drive
                </p>
                <div className="font-mono text-[11px] text-muted-foreground bg-background rounded-lg p-3 border border-border/50 space-y-0.5">
                  <p>📁 ATSkolla Backup/</p>
                  <p className="ml-4">📁 2026-04-10/</p>
                  <p className="ml-8">📄 backup_2026-04-10T08-00-00.json</p>
                  <p className="ml-8">📄 backup_2026-04-10T20-00-00.json</p>
                  <p className="ml-4">📁 2026-04-11/</p>
                  <p className="ml-8">📄 backup_2026-04-11T08-00-00.json</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Backup */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Backup Manual (Download)
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Export seluruh data platform ke file JSON yang bisa diunduh
          </p>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="rounded-xl border border-primary/10 bg-primary/[0.02] p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Apa yang di-backup?</p>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Data sekolah, profil pengguna, siswa, kelas</li>
                  <li>Log absensi, penjemputan, dan pesan WhatsApp</li>
                  <li>Langganan, pembayaran, dan pengaturan platform</li>
                  <li>Tiket support, referral, affiliate, dan konten landing</li>
                </ul>
              </div>
            </div>
          </div>

          {exporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Mengexport data...</span>
                <span className="text-primary font-bold">{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              disabled={exporting || loading}
              className="gradient-primary hover:opacity-90 shadow-md h-10 px-6 gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : exportProgress === 100 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {exporting ? "Mengexport..." : exportProgress === 100 ? "Selesai!" : "Export Backup Sekarang"}
            </Button>

            <Button variant="outline" onClick={fetchStats} disabled={loading} className="h-10 gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {lastBackupStats && (
            <div className="rounded-xl border border-success/15 bg-success/[0.02] p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <p className="text-xs font-semibold text-foreground">Backup Terakhir Berhasil</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {lastBackupStats.total_rows?.toLocaleString("id-ID")} record dari {lastBackupStats.tables} tabel •{" "}
                {lastBackupAt && formatDate(lastBackupAt)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Stats */}
      {topTables.length > 0 && (
        <Card className="border-0 shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Statistik Tabel
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Distribusi data per tabel (top {topTables.length})
            </p>
          </div>
          <CardContent className="p-4">
            <div className="space-y-2.5">
              {topTables.map(([table, count]) => {
                const maxCount = topTables[0][1] as number;
                const pct = maxCount > 0 ? ((count as number) / maxCount) * 100 : 0;
                return (
                  <div key={table} className="flex items-center gap-3">
                    <div className="w-36 sm:w-44 shrink-0">
                      <p className="text-xs font-medium text-foreground truncate">{table}</p>
                    </div>
                    <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-16 text-right">
                      {(count as number).toLocaleString("id-ID")}
                    </span>
                  </div>
                );
              })}
            </div>

            {currentStats?.stats && Object.keys(currentStats.stats).length > 8 && (
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                + {Object.keys(currentStats.stats).length - 8} tabel lainnya
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Tips Keamanan Data
          </h3>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { icon: Shield, text: "Simpan backup di min. 2 lokasi berbeda" },
              { icon: Clock, text: "Lakukan backup rutin setiap minggu" },
              { icon: Cloud, text: "Gunakan Google Drive untuk backup otomatis" },
              { icon: Database, text: "Verifikasi backup bisa di-restore" },
            ].map((tip, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-background p-2.5 border border-border/50">
                <tip.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground">{tip.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminBackup;
