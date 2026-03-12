import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  Monitor,
  History,
  CreditCard,
  LogOut,
  GraduationCap,
  UserCheck,
  FileBarChart,
  Lock,
  LifeBuoy,
  ClipboardCheck,
  Users2,
  MessageSquare,
} from "lucide-react";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Monitoring", url: "/monitoring", icon: Monitor },
  { title: "Scan Absensi", url: "/scan", icon: ScanLine },
];

const dataNav = [
  { title: "Kelas", url: "/classes", icon: GraduationCap },
  { title: "Siswa", url: "/students", icon: Users },
  { title: "Wali Murid", url: "/teachers", icon: UserCheck },
  { title: "Wali Kelas", url: "/wali-kelas", icon: ClipboardCheck },
  { title: "Staff / Operator", url: "/staff", icon: Users2 },
];

const settingsNav = [
  { title: "WhatsApp", url: "/whatsapp-settings", icon: MessageSquare },
  { title: "Langganan", url: "/subscription", icon: CreditCard },
  { title: "Bantuan", url: "/support", icon: LifeBuoy },
];

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, roles, profile } = useAuth();
  const features = useSubscriptionFeatures();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const [schoolData, setSchoolData] = useState<{ name: string; logo: string | null } | null>(null);

  const isPremiumBrand = ["School", "Premium"].includes(features.planName);

  useEffect(() => {
    if (!profile?.school_id) return;
    supabase.from("schools").select("name, logo").eq("id", profile.school_id).single().then(({ data }) => {
      if (data) setSchoolData(data);
    });
  }, [profile?.school_id]);

  const planColors: Record<string, string> = {
    Free: "bg-muted text-white",
    Basic: "bg-blue-500 text-white",
    School: "bg-amber-500 text-white",
    Premium: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  };

  const isTeacherOnly = roles.includes("teacher") && !roles.includes("school_admin") && !roles.includes("staff");

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderNavItems = (items: typeof mainNav) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
          <NavLink
            to={item.url}
            end
            onClick={handleNavClick}
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground rounded-xl px-3 py-2.5 transition-all duration-200"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="text-sm truncate">{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border font-['Nunito',sans-serif]">
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-3">
          {isPremiumBrand && schoolData?.logo ? (
            <img src={schoolData.logo} alt={schoolData.name} className="h-9 w-9 rounded-xl object-cover shrink-0 shadow-md" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shrink-0 shadow-md">
              <ClipboardCheck className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-extrabold text-sidebar-foreground tracking-tight truncate">
              {isPremiumBrand && schoolData ? schoolData.name : "Smart Attendance"}
            </span>
            <Badge className={`w-fit text-[9px] font-bold border-0 px-1.5 py-0 h-4 ${planColors[features.planName] || planColors.Free}`}>
              {features.planName === "Free" ? "Free" : `Paket ${features.planName}`}
            </Badge>
          </div>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-y-auto overflow-x-hidden">
        {isTeacherOnly ? (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold px-3 mb-1">
              Wali Kelas
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {renderNavItems([
                  { title: "Dashboard Kelas", url: "/wali-kelas-dashboard", icon: LayoutDashboard },
                ])}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold px-3 mb-1">
                Menu Utama
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">{renderNavItems(mainNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold px-3 mb-1">
                Data Sekolah
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">{renderNavItems(dataNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold px-3 mb-1">
                Laporan
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {renderNavItems([
                    { title: "Riwayat Absensi", url: "/history", icon: History },
                    { title: "Rekap & Export", url: "/export-history", icon: FileBarChart },
                  ])}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold px-3 mb-1">
                Pengaturan
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">{renderNavItems(settingsNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="mb-2 mx-2 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl px-3 py-2.5 transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
