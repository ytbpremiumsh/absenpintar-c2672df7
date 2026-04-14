import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ArrowRight, Lock, Mail, Shield, QrCode, Scan } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLogo, setLoginLogo] = useState("/images/logo-atskolla.png");

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["login_logo_url"])
      .then(({ data }) => {
        if (data) {
          const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
          if (map.login_logo_url) setLoginLogo(map.login_logo_url);
        }
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      toast.error("Login gagal: " + error);
      return;
    }
    toast.success("Login berhasil!");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: roles }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("full_name, school_id").eq("user_id", user.id).maybeSingle(),
      ]);
      const rolesList = (roles || []).map((r: any) => r.role);
      const isSuperAdmin = rolesList.includes("super_admin");
      const isTeacher = rolesList.includes("teacher");

      let schoolName: string | null = null;
      if (profileData?.school_id) {
        const { data: schoolData } = await supabase.from("schools").select("name").eq("id", profileData.school_id).maybeSingle();
        schoolName = schoolData?.name || null;
      }
      await supabase.from("login_logs").insert({
        user_id: user.id,
        email: user.email || null,
        full_name: profileData?.full_name || null,
        role: rolesList.join(", ") || null,
        school_name: schoolName,
        user_agent: navigator.userAgent,
      } as any);

      setLoading(false);
      if (isSuperAdmin) navigate("/super-admin");
      else if (isTeacher) navigate("/teacher-dashboard");
      else navigate("/dashboard");
    } else {
      setLoading(false);
      navigate("/dashboard");
    }
  };

  // Scan line bars for animation
  const scanBars = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#5B6CF9]">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      {/* Floating scan animation elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated dots */}
        {[
          { top: '10%', left: '5%', delay: 0 },
          { top: '20%', left: '90%', delay: 1 },
          { top: '70%', left: '8%', delay: 0.5 },
          { top: '80%', left: '85%', delay: 1.5 },
          { top: '40%', left: '3%', delay: 2 },
          { top: '55%', left: '95%', delay: 0.8 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white"
            style={{ top: dot.top, left: dot.left }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.5, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: dot.delay }}
          />
        ))}

        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />

        {/* Barcode scan visualization - left side */}
        <div className="hidden lg:flex absolute left-[8%] top-1/2 -translate-y-1/2 flex-col items-center gap-1 opacity-20">
          {scanBars.map((i) => (
            <motion.div
              key={i}
              className="bg-white rounded-full"
              style={{ width: Math.random() * 40 + 20, height: 2 }}
              animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
        </div>

        {/* QR code outline - left side */}
        <motion.div
          className="hidden lg:block absolute left-[15%] top-[20%] w-28 h-28 border-2 border-white/10 rounded-2xl"
          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <div className="absolute top-2 left-2 w-5 h-5 border-l-2 border-t-2 border-white/20 rounded-tl-md" />
          <div className="absolute top-2 right-2 w-5 h-5 border-r-2 border-t-2 border-white/20 rounded-tr-md" />
          <div className="absolute bottom-2 left-2 w-5 h-5 border-l-2 border-b-2 border-white/20 rounded-bl-md" />
          <div className="absolute bottom-2 right-2 w-5 h-5 border-r-2 border-b-2 border-white/20 rounded-br-md" />
        </motion.div>

        {/* Floating icons */}
        <motion.div
          className="hidden lg:flex absolute left-[20%] bottom-[25%] h-16 w-16 rounded-2xl bg-white/5 border border-white/10 items-center justify-center"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <QrCode className="h-7 w-7 text-white/30" />
        </motion.div>
        <motion.div
          className="hidden lg:flex absolute left-[8%] bottom-[15%] h-12 w-12 rounded-xl bg-white/5 border border-white/10 items-center justify-center"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          <Scan className="h-5 w-5 text-white/25" />
        </motion.div>

        {/* Data stream lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <line x1="10%" y1="0" x2="30%" y2="100%" stroke="white" strokeWidth="1" strokeDasharray="6 12" />
          <line x1="45%" y1="0" x2="25%" y2="100%" stroke="white" strokeWidth="1" strokeDasharray="4 16" />
        </svg>
      </div>

      {/* Radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-300/[0.05] rounded-full blur-3xl pointer-events-none" />

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <img src={loginLogo} alt="ATSkolla" className="h-11 w-11 rounded-xl shadow-lg" />
            <span className="font-bold text-xl text-white tracking-tight">ATSkolla</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center mb-6"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Selamat Datang</h2>
            <p className="text-white/60 text-sm mt-1">Masuk ke akun Anda untuk melanjutkan</p>
          </motion.div>

          {/* Login Card with rounded design */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-white/10 rounded-[2rem] blur-xl" />

            <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-7 sm:p-8 shadow-2xl shadow-black/20">
              {/* Secure badge */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-2 mb-6"
              >
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                  <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Koneksi Aman</span>
                </div>
              </motion.div>

              <form onSubmit={handleLogin} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="space-y-2"
                >
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@sekolah.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pl-10 bg-secondary/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-300 rounded-xl"
                      required
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.42 }}
                  className="space-y-2"
                >
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-10 pr-10 bg-secondary/50 border-border focus:bg-background focus:border-primary focus:ring-primary/20 transition-all duration-300 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#5B6CF9] hover:bg-[#4c5ded] text-white font-semibold text-sm uppercase tracking-wide shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all rounded-xl"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Masuk Sekarang
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-5 text-center space-y-2"
              >
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Lupa Password?
                </Link>
                <p className="text-sm text-muted-foreground">
                  Belum punya akun?{" "}
                  <Link to="/register" className="text-primary font-semibold hover:underline">
                    Daftar Sekolah
                  </Link>
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-white/30 text-xs mt-6"
          >
            © 2026 ATSkolla - Absensi Digital Sekolah
          </motion.p>
        </motion.div>
      </div>

      {/* Rounded bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-white dark:bg-slate-950 rounded-t-[2rem] z-[5]" />
    </div>
  );
};

export default Login;
