import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Settings, LogOut, School, KeyRound, Menu, Gift } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function AppContent() {
  const { user, profile, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

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
        <header className="h-14 flex items-center justify-between border-b border-border bg-card px-3 sm:px-4 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-8 w-8" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline truncate max-w-[200px]">
              {profile?.full_name || "Dashboard"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle />
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg hover:bg-secondary transition-colors p-1 pr-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Settings className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/school-settings")}>
                  <School className="h-4 w-4 mr-2" />
                  Identitas Sekolah
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account-settings")}>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Ganti Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/referral")}>
                  <Gift className="h-4 w-4 mr-2" />
                  Referral & Poin
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-svh flex w-full">
        <AppContent />
      </div>
    </SidebarProvider>
  );
}
