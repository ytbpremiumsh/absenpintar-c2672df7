import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, Eye, EyeOff, Loader2, Search, CheckCircle2, MapPin, GraduationCap, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence, type Easing } from "framer-motion";

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
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);

  const [inputMode, setInputMode] = useState<"npsn" | "manual" | null>(null);
  const [npsn, setNpsn] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);

  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralInput, setReferralInput] = useState(refCode);
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
          referral_code: referralInput || undefined,
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as Easing } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 dark:from-indigo-900 dark:via-slate-900 dark:to-indigo-950 p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-6"
        >
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-4">
            <School className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Daftar Sekolah Baru</h1>
          <p className="text-white/60 text-sm mt-1">Registrasi data sekolah untuk mulai menggunakan sistem</p>
        </motion.div>

        {/* Step Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-500 ${step === 1 ? "bg-white text-indigo-700 shadow-lg shadow-white/20" : "bg-white/15 text-white/60 backdrop-blur-sm"}`}>
            <span>1</span> Data Sekolah
          </div>
          <div className="w-8 h-px bg-white/20" />
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-500 ${step === 2 ? "bg-white text-indigo-700 shadow-lg shadow-white/20" : "bg-white/15 text-white/60 backdrop-blur-sm"}`}>
            <span>2</span> Data Admin
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-3xl blur-xl opacity-50" />

          <div className="relative bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-[0_30px_80px_-15px_rgba(0,0,0,0.3)] overflow-hidden">
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500" />

            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: -30, transition: { duration: 0.2 } }}
                    variants={containerVariants}
                    className="space-y-4"
                  >
                    {/* Mode selection */}
                    {!inputMode && !schoolData && (
                      <motion.div variants={itemVariants} className="space-y-3">
                        <p className="text-sm font-medium text-foreground text-center mb-1">Pilih cara memasukkan data sekolah</p>
                        <motion.button
                          type="button"
                          onClick={() => setInputMode("npsn")}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-indigo-400/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
                            <Search className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Cari dengan NPSN</p>
                            <p className="text-[11px] text-muted-foreground">Data sekolah otomatis terisi dari database Dapodik</p>
                          </div>
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => setInputMode("manual")}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-indigo-400/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <PenLine className="h-5 w-5 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Isi Manual</p>
                            <p className="text-[11px] text-muted-foreground">Masukkan nama sekolah dan alamat secara manual</p>
                          </div>
                        </motion.button>
                      </motion.div>
                    )}

                    {/* NPSN Input */}
                    {inputMode === "npsn" && !schoolData && (
                      <motion.div variants={itemVariants} className="space-y-3">
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
                              className="h-11 font-mono text-lg tracking-widest rounded-xl"
                              maxLength={8}
                            />
                            <Button
                              type="button"
                              onClick={handleNpsnLookup}
                              disabled={npsn.length !== 8 || lookingUp}
                              className="h-11 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl"
                            >
                              {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">Masukkan NPSN untuk mencari data sekolah otomatis dari Dapodik</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={resetStep1} className="text-xs text-muted-foreground">
                          ← Pilih metode lain
                        </Button>
                      </motion.div>
                    )}

                    {/* Manual Input */}
                    {inputMode === "manual" && !schoolData && (
                      <motion.div variants={itemVariants} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="schoolName">Nama Sekolah</Label>
                          <Input id="schoolName" placeholder="Contoh: SDN 1 Surabaya" value={manualName} onChange={(e) => setManualName(e.target.value)} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="schoolAddress">Alamat Sekolah <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                          <Input id="schoolAddress" placeholder="Jl. Pendidikan No. 1, Kota ..." value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} className="h-11 rounded-xl" />
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={resetStep1} className="text-xs text-muted-foreground">← Kembali</Button>
                          <Button type="button" onClick={handleManualConfirm} disabled={!manualName.trim()} className="flex-1 h-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl">Konfirmasi</Button>
                        </div>
                      </motion.div>
                    )}

                    {/* School Data Result */}
                    {schoolData && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/30 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
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
                        <Button type="button" variant="ghost" size="sm" onClick={resetStep1} className="text-xs text-muted-foreground mt-1 px-0">Ubah data sekolah</Button>
                      </motion.div>
                    )}

                    <motion.div variants={itemVariants}>
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!canProceed}
                        className="w-full h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
                      >
                        Lanjutkan
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
                    variants={containerVariants}
                  >
                    <form onSubmit={handleRegister} className="space-y-4">
                      {/* School summary */}
                      <motion.div variants={itemVariants} className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-200/40 dark:border-indigo-800/30 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
                          <School className="h-4 w-4 text-white" />
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
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="fullName">Nama Lengkap Admin</Label>
                        <Input id="fullName" placeholder="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl" required />
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="regEmail">Email</Label>
                        <Input id="regEmail" type="email" placeholder="admin@sekolah.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" required />
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="phone">No. Telepon / WhatsApp</Label>
                        <Input id="phone" type="tel" placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="h-11 rounded-xl" />
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="regPassword">Password</Label>
                        <div className="relative">
                          <Input
                            id="regPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Minimal 6 karakter"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 pr-10 rounded-xl"
                            required
                            minLength={6}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Ulangi password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-11 rounded-xl"
                          required
                        />
                      </motion.div>

                      <motion.div variants={itemVariants} className="space-y-2">
                        <Label htmlFor="referralCode">Kode Referral <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                        <Input
                          id="referralCode"
                          placeholder="Contoh: ATS-X7K29L"
                          value={referralInput}
                          onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                          className="h-11 font-mono tracking-wider rounded-xl"
                        />
                        <p className="text-[11px] text-muted-foreground">Masukkan kode referral jika Anda mendapat undangan dari sekolah lain</p>
                      </motion.div>

                      <motion.div variants={itemVariants} className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-11 rounded-xl">Kembali</Button>
                        <Button type="submit" disabled={registering} className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                          {registering ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Mendaftar...</> : "Daftar Sekarang"}
                        </Button>
                      </motion.div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-5 text-center"
              >
                <p className="text-sm text-muted-foreground">
                  Sudah punya akun?{" "}
                  <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Masuk di sini</Link>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-white/40 text-xs mt-6"
        >
          © 2026 ATSkolla — Absensi Digital Sekolah
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Register;
