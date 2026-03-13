import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ArrowRight, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginImage, setLoginImage] = useState("/images/presentation/students.jpeg");
  const [loginLogo, setLoginLogo] = useState("/images/logo-absensi-pintar.png");

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["login_sidebar_image", "login_logo_url"])
      .then(({ data }) => {
        if (data) {
          const map = Object.fromEntries(data.map((d) => [d.key, d.value]));
          if (map.login_sidebar_image) setLoginImage(map.login_sidebar_image);
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
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isSuperAdmin = roles?.some((r: any) => r.role === "super_admin");
      setLoading(false);
      navigate(isSuperAdmin ? "/super-admin" : "/dashboard");
    } else {
      setLoading(false);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Sidebar - Hero Image */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={loginImage}
            alt="Smart School"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/60 to-primary/30" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 w-full">
          <div className="flex items-center gap-3">
            <img
              src={loginLogo}
              alt="Absensi Pintar"
              className="h-10 w-10 rounded-xl shadow-lg"
            />
            <span className="text-white font-bold text-lg tracking-tight">ABSENSI PINTAR</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Sistem<br />Absensi<br />Digital
            </h1>
            <p className="text-white/80 text-sm lg:text-base max-w-sm leading-relaxed">
              Platform manajemen kehadiran siswa yang terintegrasi, real-time, dan mudah digunakan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
              v2.0.1 (Stable)
            </span>
            <span className="text-xs text-white/60 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
              Secure Login
            </span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
            <img
              src="/images/logo-absensi-pintar.png"
              alt="Absensi Pintar"
              className="h-10 w-10 rounded-xl shadow-md"
            />
            <span className="font-bold text-lg text-foreground tracking-tight">ABSENSI PINTAR</span>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Selamat Datang Kembali</h2>
            <p className="text-muted-foreground text-sm">Silakan masuk ke akun Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@sekolah.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 bg-muted/30 border-border/50 focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 pr-10 bg-muted/30 border-border/50 focus:bg-background transition-colors"
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
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 gradient-primary hover:opacity-90 transition-opacity text-primary-foreground font-semibold text-sm uppercase tracking-wide"
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
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Daftar Sekolah
              </Link>
            </p>
          </div>

          <p className="text-center text-muted-foreground/50 text-xs">
            © 2026 Absensi Pintar - Smart School Attendance
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
