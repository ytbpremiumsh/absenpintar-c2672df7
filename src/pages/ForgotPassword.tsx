import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Loader2, Mail, Lock, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Step = "email" | "otp" | "new-password" | "done";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("forgot-password", {
        body: { email },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); setLoading(false); return; }
      if (!data.has_wa_integration) {
        toast.error("Belum ada integrasi WhatsApp yang aktif. Hubungi admin.");
        setLoading(false);
        return;
      }
      if (!data.has_phone) {
        toast.error("Nomor WhatsApp belum terdaftar di profil Anda. Hubungi admin untuk menambahkan nomor.");
        setLoading(false);
        return;
      }

      setUserName(data.user_name || "");
      setSchoolId(data.school_id || "");
      setMaskedPhone(data.masked_phone || "");

      // Auto-send OTP using stored phone
      const { data: otpData, error: otpError } = await supabase.functions.invoke("send-otp", {
        body: { email, school_id: data.school_id },
      });
      if (otpError) throw otpError;
      if (otpData.error) { toast.error(otpData.error); setLoading(false); return; }

      toast.success("Kode OTP berhasil dikirim ke WhatsApp!");
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    }
    setLoading(false);
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("Masukkan 6 digit kode OTP"); return; }
    if (step === "otp") { setStep("new-password"); return; }
    if (newPassword.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    if (newPassword !== confirmPassword) { toast.error("Password tidak cocok"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp-reset", {
        body: { email, otp_code: otp, new_password: newPassword },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); setLoading(false); return; }
      toast.success("Password berhasil diubah!");
      setStep("done");
    } catch (err: any) {
      toast.error(err.message || "Gagal reset password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Lupa Password</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {step === "email" && "Masukkan email akun Anda"}
              {step === "otp" && `Masukkan kode OTP yang dikirim ke WhatsApp (${maskedPhone})`}
              {step === "new-password" && "Buat password baru Anda"}
              {step === "done" && "Password Anda telah berhasil diubah!"}
            </p>
          </div>

          {/* Progress */}
          {step !== "done" && (
            <div className="flex items-center gap-1">
              {["email", "otp", "new-password"].map((s, i) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${
                  ["email", "otp", "new-password"].indexOf(step) >= i
                    ? "bg-indigo-500"
                    : "bg-slate-200 dark:bg-slate-700"
                }`} />
              ))}
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleCheckEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="email" type="email" placeholder="email@sekolah.com" value={email} onChange={e => setEmail(e.target.value)}
                    className="h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim Kode OTP"}
              </Button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kode OTP (6 digit)</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-center text-slate-400">Cek pesan WhatsApp di nomor {maskedPhone}</p>
              </div>
              <Button type="submit" disabled={loading || otp.length !== 6} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verifikasi OTP"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setStep("email"); setOtp(""); }} className="w-full text-sm text-slate-500">
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === "new-password" && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pw" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password Baru</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="new-pw" type="password" placeholder="Minimal 6 karakter" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Konfirmasi Password</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="confirm-pw" type="password" placeholder="Ketik ulang password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="h-12 pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Password Baru"}
              </Button>
            </form>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Silakan login dengan password baru Anda.</p>
              <Button onClick={() => navigate("/login")} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold">
                Ke Halaman Login
              </Button>
            </div>
          )}

          {/* Back to login */}
          {step !== "done" && (
            <div className="text-center">
              <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                ← Kembali ke Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
