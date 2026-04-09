import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Database, Download, RefreshCw, Shield, Clock, HardDrive, Loader2,
  CheckCircle, AlertTriangle, Table2, BarChart3, FileDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BackupStats {
  tables: number;
  total_rows: number;
  stats: Record<string, number>;
}

const SuperAdminBackup = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentStats, setCurrentStats] = useState<BackupStats | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [lastBackupStats, setLastBackupStats] = useState<BackupStats | null>(null);

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

  useEffect(() => { fetchStats(); }, []);

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

      // Download as JSON file
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

      // Refresh stats
      setLastBackupAt(data.meta.exported_at);
      setLastBackupStats({ tables: data.meta.tables, total_rows: data.meta.total_rows, stats: data.meta.stats });
    } catch (err: any) {
      toast.error("Gagal export: " + err.message);
    }
    setTimeout(() => { setExporting(false); setExportProgress(0); }, 1500);
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
        subtitle="Export data platform, backup otomatis, dan sistem pemulihan darurat"
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

      {/* Manual Backup */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Backup Manual
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

      {/* Auto Backup Info */}
      <Card className="border-0 shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Auto Backup
          </h3>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.02] p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Rekomendasi Backup</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Disarankan untuk melakukan backup manual secara rutin (minimal 1x seminggu). 
                  Simpan file backup di lokasi aman (Google Drive, OneDrive, atau penyimpanan lokal).
                  Backup ini bisa digunakan untuk pemulihan data jika terjadi masalah pada sistem.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
            <p className="text-xs font-bold text-foreground">Tips Keamanan Data</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { icon: Shield, text: "Simpan backup di min. 2 lokasi berbeda" },
                { icon: Clock, text: "Lakukan backup rutin setiap minggu" },
                { icon: HardDrive, text: "Gunakan cloud storage untuk keamanan" },
                { icon: Database, text: "Verifikasi backup bisa di-restore" },
              ].map((tip, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-background p-2.5 border border-border/50">
                  <tip.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-[11px] text-muted-foreground">{tip.text}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminBackup;
