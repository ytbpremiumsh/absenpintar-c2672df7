import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileFooterNav } from "./MobileFooterNav";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Settings, LogOut, School, KeyRound, Gift } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivePlanBadge } from "@/components/ActivePlanBadge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function AppContent() {
  const { user, profile, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const isMobileDevice = useIsMobile();
  const showFooter = isMobileDevice;

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
    return <Navigate to="/wali-kelas-dashboard" replace />;
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="h-14 flex items-center justify-between glass-subtle border-b border-border/40 px-3 sm:px-5 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="h-8 w-8 rounded-xl hover:bg-secondary/80 transition-colors" />
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
                <DropdownMenuItem onClick={() => navigate("/school-settings")} className="rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                  <School className="h-4 w-4 mr-2.5 text-muted-foreground" />
                  Identitas Sekolah
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account-settings")} className="rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                  <KeyRound className="h-4 w-4 mr-2.5 text-muted-foreground" />
                  Ganti Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/referral")} className="rounded-xl mx-1 px-3 py-2.5 cursor-pointer">
                  <Gift className="h-4 w-4 mr-2.5 text-muted-foreground" />
                  Referral & Poin
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
        <main className={cn("flex-1 overflow-auto p-3 sm:p-5 md:p-6", isMobileDevice && isDashboard && "pb-24")}>
          <Outlet />
        </main>
        {isMobileDevice && isDashboard && <MobileFooterNav />}
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
