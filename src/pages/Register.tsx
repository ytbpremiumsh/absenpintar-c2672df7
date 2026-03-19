import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { School, Eye, EyeOff, Loader2, Search, CheckCircle2, MapPin, GraduationCap, PenLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface SchoolData {
  npsn: string;
  name: string;
  address: string;
  level: string;
  status: string;
  district: string;
  province: string;
}

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 - School input mode
  const [inputMode, setInputMode] = useState<"npsn" | "manual" | null>(null);
  const [npsn, setNpsn] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);

  // Manual school input
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  // Step 2 - Admin details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registering, setRegistering] = useState(false);

  const handleNpsnLookup = async () => {
    if (npsn.length !== 8 || !/^\d{8}$/.test(npsn)) {
      toast.error("NPSN harus 8 digit angka");
      return;
    }
    setLookingUp(true);
    setSchoolData(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lookup-npsn?npsn=${npsn}`;
      const response = await fetch(url, {
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || "Sekolah tidak ditemukan");
        setLookingUp(false);
        return;
      }
      setSchoolData(data.school);
      toast.success(`Sekolah ditemukan: ${data.school.name}`);
    } catch (err: any) {
      toast.error("Gagal mencari data sekolah");
    }
    setLookingUp(false);
  };

  const handleManualConfirm = () => {
    if (!manualName.trim()) { toast.error("Nama sekolah wajib diisi"); return; }
    setSchoolData({
      npsn: "",
      name: manualName.trim(),
      address: manualAddress.trim(),
      level: "",
      status: "",
      district: "",
      province: "",
    });
    toast.success("Data sekolah berhasil diisi");
  };

  const canProceed = !!schoolData;

  const resetStep1 = () => {
    setInputMode(null);
    setNpsn("");
    setSchoolData(null);
    setManualName("");
    setManualAddress("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolData) { toast.error("Data sekolah belum diisi"); return; }
    if (!fullName.trim()) { toast.error("Nama lengkap wajib diisi"); return; }
    if (!email.trim()) { toast.error("Email wajib diisi"); return; }
    if (password.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (password !== confirmPassword) { toast.error("Password tidak cocok"); return; }

    setRegistering(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role: 'school_admin',
          npsn: schoolData.npsn || undefined,
          school_name: schoolData.name,
          school_address: schoolData.address,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Registrasi gagal");
        setRegistering(false);
        return;
      }

      toast.success("Registrasi berhasil! Silakan login.");
      navigate("/login");
    } catch (err: any) {
      toast.error("Registrasi gagal: " + (err.message || "Unknown error"));
    }
    setRegistering(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-elevated mb-4">
            <School className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">Daftar Sekolah Baru</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Registrasi data sekolah untuk mulai menggunakan sistem</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${step === 1 ? "gradient-primary text-primary-foreground" : "bg-primary-foreground/20 text-primary-foreground/60"}`}>
            <span>1</span> Data Sekolah
          </div>
          <div className="w-8 h-px bg-primary-foreground/20" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${step === 2 ? "gradient-primary text-primary-foreground" : "bg-primary-foreground/20 text-primary-foreground/60"}`}>
            <span>2</span> Data Admin
          </div>
        </div>

        <Card className="shadow-elevated border-0">
          <CardContent className="pt-6">
            {step === 1 ? (
              <div className="space-y-4">
                {/* Mode selection */}
                {!inputMode && !schoolData && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground text-center mb-1">Pilih cara memasukkan data sekolah</p>
                    <button
                      type="button"
                      onClick={() => setInputMode("npsn")}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-md">
                        <Search className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Cari dengan NPSN</p>
                        <p className="text-[11px] text-muted-foreground">Data sekolah otomatis terisi dari database Dapodik</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("manual")}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <PenLine className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Isi Manual</p>
                        <p className="text-[11px] text-muted-foreground">Masukkan nama sekolah dan alamat secara manual</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* NPSN Input */}
                {inputMode === "npsn" && !schoolData && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="npsn">NPSN (Nomor Pokok Sekolah Nasional)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="npsn"
                          placeholder="Masukkan 8 digit NPSN"
                          value={npsn}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                            setNpsn(v);
                          }}
                          className="h-11 font-mono text-lg tracking-widest"
                          maxLength={8}
                        />
                        <Button
                          type="button"
                          onClick={handleNpsnLookup}
                          disabled={npsn.length !== 8 || lookingUp}
                          className="h-11 px-4 gradient-primary text-primary-foreground"
                        >
                          {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Masukkan NPSN untuk mencari data sekolah otomatis dari Dapodik</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={resetStep1} className="text-xs text-muted-foreground">
                      ← Pilih metode lain
                    </Button>
                  </div>
                )}

                {/* Manual Input */}
                {inputMode === "manual" && !schoolData && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">Nama Sekolah</Label>
                      <Input
                        id="schoolName"
                        placeholder="Contoh: SDN 1 Surabaya"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolAddress">Alamat Sekolah <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                      <Input
                        id="schoolAddress"
                        placeholder="Jl. Pendidikan No. 1, Kota ..."
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={resetStep1} className="text-xs text-muted-foreground">
                        ← Kembali
                      </Button>
                      <Button
                        type="button"
                        onClick={handleManualConfirm}
                        disabled={!manualName.trim()}
                        className="flex-1 h-10 gradient-primary text-primary-foreground"
                      >
                        Konfirmasi
                      </Button>
                    </div>
                  </div>
                )}

                {/* School Data Result */}
                {schoolData && (
                  <div className="p-4 rounded-xl bg-success/5 border border-success/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <span className="text-sm font-bold text-foreground">
                        {schoolData.npsn ? "Sekolah Ditemukan!" : "Data Sekolah Siap"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <School className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{schoolData.name}</p>
                          {schoolData.npsn && <p className="text-xs text-muted-foreground">NPSN: {schoolData.npsn}</p>}
                        </div>
                      </div>
                      {schoolData.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{schoolData.address}</p>
                        </div>
                      )}
                      {(schoolData.level || schoolData.status || schoolData.district || schoolData.province) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {schoolData.level && <Badge variant="secondary" className="text-[10px]"><GraduationCap className="h-3 w-3 mr-0.5" />{schoolData.level}</Badge>}
                          {schoolData.status && <Badge variant="outline" className="text-[10px]">{schoolData.status}</Badge>}
                          {schoolData.district && <Badge variant="outline" className="text-[10px]">{schoolData.district}</Badge>}
                          {schoolData.province && <Badge variant="outline" className="text-[10px]">{schoolData.province}</Badge>}
                        </div>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={resetStep1} className="text-xs text-muted-foreground mt-1 px-0">
                      Ubah data sekolah
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                  className="w-full h-11 gradient-primary hover:opacity-90 text-primary-foreground"
                >
                  Lanjutkan
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* School summary */}
                <div className="p-3 rounded-lg bg-secondary flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                    <School className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{schoolData?.name}</p>
                    {schoolData?.npsn ? (
                      <p className="text-[10px] text-muted-foreground">NPSN: {schoolData.npsn}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Input manual</p>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto text-xs shrink-0" onClick={() => setStep(1)}>Ubah</Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap Admin</Label>
                  <Input id="fullName" placeholder="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regEmail">Email</Label>
                  <Input id="regEmail" type="email" placeholder="admin@sekolah.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon / WhatsApp</Label>
                  <Input id="phone" type="tel" placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="regPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-11">Kembali</Button>
                  <Button type="submit" disabled={registering} className="flex-1 h-11 gradient-primary hover:opacity-90 text-primary-foreground">
                    {registering ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Mendaftar...</> : "Daftar Sekarang"}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link to="/login" className="text-primary font-semibold hover:underline">Masuk di sini</Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-primary-foreground/40 text-xs mt-6">© 2026 ATSkolla — Absensi Digital Sekolah</p>
      </div>
    </div>
  );
};

export default Register;
