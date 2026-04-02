import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { Users, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const AffiliateRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", custom_code: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { toast.error("Anda harus menyetujui syarat & ketentuan"); return; }
    if (!form.full_name || !form.email || !form.password) { toast.error("Nama, email, dan password wajib diisi"); return; }
    if (form.password.length < 6) { toast.error("Password minimal 6 karakter"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/affiliate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ action: 'register', ...form }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setSuccess(data.affiliate_code);
      toast.success("Registrasi affiliate berhasil!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Registrasi Berhasil!</h2>
            <p className="text-muted-foreground text-sm">Kode affiliate Anda:</p>
            <div className="bg-muted rounded-lg p-3 font-mono text-lg font-bold text-primary">{success}</div>
            <p className="text-xs text-muted-foreground">Simpan kode ini. Gunakan untuk login ke dashboard affiliate Anda.</p>
            <Button onClick={() => navigate('/affiliate/login')} className="w-full gap-2">
              Masuk ke Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Daftar Affiliate</CardTitle>
          <CardDescription>Promosikan AbsenPintar dan dapatkan komisi 50% dari setiap langganan berbayar!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@contoh.com" />
            </div>
            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimal 6 karakter" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kode Affiliate Custom (opsional)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">AFF-</span>
                <Input value={form.custom_code} onChange={e => setForm(f => ({ ...f, custom_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) }))} placeholder="KODEKAMU" className="font-mono" />
              </div>
              <p className="text-xs text-muted-foreground">Kosongkan untuk kode otomatis</p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} id="terms" className="mt-0.5" />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                Saya menyetujui{" "}
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-primary underline font-medium">Syarat & Ketentuan</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Syarat & Ketentuan Affiliate</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                      <div className="space-y-3 text-sm text-muted-foreground pr-4">
                        <h4 className="font-semibold text-foreground">1. Definisi</h4>
                        <p>Program Affiliate AbsenPintar adalah program kemitraan di mana individu dapat mempromosikan layanan AbsenPintar dan mendapatkan komisi dari setiap penjualan paket berlangganan berbayar.</p>
                        <h4 className="font-semibold text-foreground">2. Komisi</h4>
                        <p>Affiliate mendapatkan komisi sebesar 50% dari harga paket langganan berbayar (non-free) untuk setiap transaksi yang berhasil melalui kode affiliate.</p>
                        <h4 className="font-semibold text-foreground">3. Pencairan Dana</h4>
                        <p>Minimum pencairan adalah Rp 500.000. Pencairan memerlukan persetujuan admin dan akan diproses dalam waktu maksimal 7 hari kerja setelah disetujui.</p>
                        <h4 className="font-semibold text-foreground">4. Larangan</h4>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Dilarang menggunakan spam atau metode promosi yang menyesatkan</li>
                          <li>Dilarang membuat akun palsu untuk mendapatkan komisi</li>
                          <li>Dilarang mengatasnamakan pihak AbsenPintar tanpa izin</li>
                        </ul>
                        <h4 className="font-semibold text-foreground">5. Penangguhan</h4>
                        <p>AbsenPintar berhak menangguhkan atau menghentikan akun affiliate yang melanggar ketentuan tanpa pemberitahuan sebelumnya.</p>
                        <h4 className="font-semibold text-foreground">6. Perubahan Ketentuan</h4>
                        <p>AbsenPintar berhak mengubah syarat & ketentuan ini sewaktu-waktu. Perubahan akan diberitahukan melalui email.</p>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>{" "}
                program affiliate AbsenPintar
              </label>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading || !agreed}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Daftar Sebagai Affiliate
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Sudah punya akun?{" "}
            <Link to="/affiliate/login" className="text-primary font-medium hover:underline">Masuk</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateRegister;
