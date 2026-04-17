import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileFooterNav } from "./MobileFooterNav";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Settings, LogOut, School, KeyRound, Gift, LayoutGrid, Activity, ScanLine, Users, CalendarDays, HelpCircle, Award } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import atskollaLogo from "@/assets/Logo_atskolla.png";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const buildFooterItems = (isTeacherOnly: boolean) => [
  { label: "Dashboard", icon: LayoutGrid, path: isTeacherOnly ? "/teacher-dashboard" : "/dashboard" },
  { label: "Monitoring", icon: Activity, path: "/monitoring" },
  { label: "Scan", icon: ScanLine, path: "/scan", isCenter: true },
  // Teachers/Wali Kelas → siswa kelas mereka. Admin/Staff sekolah → semua siswa sekolah
  { label: "Siswa", icon: Users, path: isTeacherOnly ? "/wali-kelas-students" : "/students" },
  { label: "Jadwal", icon: CalendarDays, path: isTeacherOnly ? "/teaching-schedule" : "/live-schedule" },
];

function AppContent() {
  const { user, profile, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobileDevice = useIsMobile();

  const [headerLogo, setHeaderLogo] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("platform_settings").select("key, value").eq("key", "login_logo_url").maybeSingle().then(({ data }) => {
      if (data?.value) setHeaderLogo(data.value);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles.includes("super_admin")) return <Navigate to="/super-admin" replace />;

  const isTeacherOnly = roles.includes("teacher") && !roles.includes("school_admin") && !roles.includes("staff");
  if (isTeacherOnly && location.pathname === "/dashboard") {
    return <Navigate to="/teacher-dashboard" replace />;
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const logoSrc = headerLogo || atskollaLogo;

  return (
    <>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="h-14 flex items-center justify-between glass-subtle border-b border-border/40 px-3 sm:px-5 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="h-8 w-8 rounded-xl hover:bg-secondary/80 transition-colors" />
            {/* Mobile logo */}
            <div className="sm:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] flex items-center justify-center shadow-sm">
                <img src={logoSrc} alt="Logo" className="h-5 w-5 object-contain" />
              </div>
              <span className="text-sm font-bold text-foreground tracking-tight">ATSkolla</span>
            </div>
            {/* Desktop info */}
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-bold text-foreground tracking-tight truncate max-w-[200px]">
                {profile?.full_name || "Dashboard"}
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-medium -mt-0.5">Selamat datang kembali</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl hover:bg-secondary/80 transition-all duration-200 p-1.5 pr-2.5">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                    <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Settings className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-elevated border-border/50">
                <DropdownMenuLabel className="font-normal px-4 py-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roles.includes("school_admin") && (
                  <DropdownMenuItem onClick={() => navigate("/school-settings")} className="rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                    <School className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    Identitas Sekolah
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/account-settings")} className="rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                  <KeyRound className="h-4 w-4 mr-2.5 text-muted-foreground" />
                  Ganti Password
                </DropdownMenuItem>
                {/* Admin Sekolah pakai Referral & Point */}
                {roles.includes("school_admin") && (
                  <DropdownMenuItem onClick={() => navigate("/referral")} className="rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                    <Award className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    Referral & Point
                  </DropdownMenuItem>
                )}
                {/* Guru / Wali Kelas pakai Affiliate Komisi */}
                {(roles.includes("teacher") || (!roles.includes("school_admin") && !roles.includes("staff"))) && (
                  <DropdownMenuItem onClick={() => navigate("/affiliate-teacher")} className="rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                    <Gift className="h-4 w-4 mr-2.5 text-muted-foreground" />
                    Affiliate & Komisi
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/support")} className="rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                  <HelpCircle className="h-4 w-4 mr-2.5 text-muted-foreground" />
                  Bantuan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2.5" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className={cn("flex-1 overflow-auto p-3 sm:p-5 md:p-6", isMobileDevice && "pb-24")}>
          <Outlet />
        </main>
        {isMobileDevice && <MobileFooterNav items={buildFooterItems(isTeacherOnly)} />}
      </div>
    </>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-svh flex w-full bg-background">
        <AppContent />
      </div>
    </SidebarProvider>
  );
}
