import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Users,
  ScanLine,
  Activity,
  Clock,
  Wallet,
  LogOut,
  GraduationCap,
  UserCheck,
  BarChart3,
  HelpCircle,
  ClipboardList,
  UsersRound,
  Send,
  Gift,
  ChevronRight,
} from "lucide-react";
import atskollaLogo from "@/assets/Logo_atskolla.png";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Monitoring", url: "/monitoring", icon: Activity, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Scan Absensi", url: "/scan", icon: ScanLine, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

const dataNav = [
  { title: "Kelas", url: "/classes", icon: GraduationCap, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Siswa", url: "/students", icon: Users, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Wali Murid", url: "/teachers", icon: UserCheck, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Wali Kelas", url: "/wali-kelas", icon: ClipboardList, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Staff / Operator", url: "/staff", icon: UsersRound, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

const whatsappNav = [
  { title: "WhatsApp", url: "/whatsapp", icon: Send, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

const settingsNav = [
  { title: "Langganan", url: "/subscription", icon: Wallet, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Bantuan", url: "/support", icon: HelpCircle, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, roles, profile } = useAuth();
  const features = useSubscriptionFeatures();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const [schoolData, setSchoolData] = useState<{ name: string; logo: string | null } | null>(null);
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);

  const isPremiumBrand = ["School", "Premium"].includes(features.planName);

  useEffect(() => {
    supabase.from("platform_settings").select("key, value").eq("key", "login_logo_url").maybeSingle().then(({ data }) => {
      if (data?.value) setPlatformLogo(data.value);
    });
  }, []);

  useEffect(() => {
    if (!profile?.school_id) return;
    supabase.from("schools").select("name, logo").eq("id", profile.school_id).single().then(({ data }) => {
      if (data) setSchoolData(data);
    });
  }, [profile?.school_id]);

  const planColors: Record<string, string> = {
    Free: "bg-slate-500/80 text-white",
    Basic: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
    School: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
    Premium: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white",
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
    items.map((item) => {
      const active = isActive(item.url);
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
            <NavLink
              to={item.url}
              end
              onClick={handleNavClick}
              className={`relative rounded-xl px-3 py-2.5 transition-all duration-200 group/nav gap-3 ${
                active
                  ? "bg-gradient-to-r " + item.accent + " text-white font-semibold shadow-lg shadow-[#5B6CF9]/20"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
              activeClassName=""
            >
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                active ? "bg-white/20" : "bg-muted/80"
              }`}>
                <item.icon className="h-[15px] w-[15px] stroke-[2]" />
              </div>
              <span className={`text-[13px] truncate flex-1 ${active ? "text-white" : ""}`}>{item.title}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 stroke-[2.5] ml-auto shrink-0 opacity-70" />}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const renderGroupLabel = (label: string) => (
    <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] font-bold px-3 mb-1.5 text-muted-foreground/60">
      {label}
    </SidebarGroupLabel>
  );

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border/30 font-['Inter',sans-serif]">
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-3">
          {isPremiumBrand && schoolData?.logo ? (
            <img src={schoolData.logo} alt={schoolData.name} className="h-10 w-10 object-contain shrink-0" />
          ) : platformLogo ? (
            <img src={platformLogo} alt="ATSkolla" className="h-10 w-10 object-contain shrink-0" />
          ) : (
            <img src={atskollaLogo} alt="ATSkolla" className="h-10 w-10 object-contain shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-extrabold text-sidebar-foreground tracking-tight truncate">
              {isPremiumBrand && schoolData ? schoolData.name : "ATSkolla"}
            </span>
            <Badge className={`w-fit text-[9px] font-bold border-0 px-2 py-0 h-[18px] rounded-md ${planColors[features.planName] || planColors.Free}`}>
              {features.planName === "Free" ? "Free" : `Paket ${features.planName}`}
            </Badge>
          </div>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-y-auto overflow-x-hidden">
        {isTeacherOnly ? (
          <SidebarGroup>
            {renderGroupLabel("Wali Kelas")}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {renderNavItems([
                  { title: "Dashboard Kelas", url: "/wali-kelas-dashboard", icon: LayoutGrid, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                ])}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              {renderGroupLabel("Menu Utama")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">{renderNavItems(mainNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("Data Sekolah")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">{renderNavItems(dataNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("Laporan")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {renderNavItems([
                    { title: "Rekap & Export", url: "/export-history", icon: BarChart3, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                    { title: "Riwayat Absensi", url: "/history", icon: Clock, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                  ])}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("WhatsApp")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">{renderNavItems(whatsappNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("Pengaturan")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">{renderNavItems(settingsNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="mb-2 mx-2 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl px-3 py-2.5 transition-all duration-200"
              onClick={handleLogout}
            >
              <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <LogOut className="h-[15px] w-[15px] shrink-0" />
              </div>
              <span className="text-[13px] font-medium">Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
