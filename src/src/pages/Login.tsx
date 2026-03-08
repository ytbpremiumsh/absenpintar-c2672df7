import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { School, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error("Login gagal: " + error);
    } else {
      toast.success("Login berhasil!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-elevated mb-4">
            <School className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">Smart School Pickup</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Sistem Monitoring Penjemputan Siswa</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-2">
            <h2 className="text-lg font-semibold">Masuk ke Akun Anda</h2>
            <p className="text-sm text-muted-foreground">Masukkan email dan password untuk melanjutkan</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@admin.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
              </Button>
            </form>
            <div className="mt-4 p-3 rounded-lg bg-secondary text-xs text-muted-foreground">
              <p className="font-medium mb-1">Demo Login:</p>
              <p>Email: admin@admin.com</p>
              <p>Password: admin123</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-primary-foreground/40 text-xs mt-6">
          © 2026 Smart School Pickup System
        </p>
      </div>
    </div>
  );
};

export default Login;
