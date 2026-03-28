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
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Monitoring", url: "/monitoring", icon: Activity },
  { title: "Scan Absensi", url: "/scan", icon: ScanLine },
];

const dataNav = [
  { title: "Kelas", url: "/classes", icon: GraduationCap },
  { title: "Siswa", url: "/students", icon: Users },
  { title: "Wali Murid", url: "/teachers", icon: UserCheck },
  { title: "Wali Kelas", url: "/wali-kelas", icon: ClipboardList },
  { title: "Staff / Operator", url: "/staff", icon: UsersRound },
];

const whatsappNav = [
  { title: "WhatsApp", url: "/whatsapp", icon: Send },
];

const settingsNav = [
  { title: "Langganan", url: "/subscription", icon: Wallet },
  { title: "Bantuan", url: "/support", icon: HelpCircle },
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
    Free: "bg-muted-foreground/80 text-white",
    Basic: "bg-blue-500/90 text-white",
    School: "bg-amber-500/90 text-white",
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
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
          <NavLink
            to={item.url}
            end
            onClick={handleNavClick}
            className="text-sidebar-foreground/60 hover:bg-primary/10 hover:text-primary rounded-xl px-3 py-2.5 transition-all duration-200 group/nav"
            activeClassName="bg-primary text-primary-foreground font-semibold shadow-md"
          >
            <item.icon className="h-[17px] w-[17px] shrink-0 stroke-[1.8] transition-transform duration-200 group-hover/nav:scale-105" />
            <span className="text-[13px] truncate">{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const renderGroupLabel = (label: string) => (
    <SidebarGroupLabel className="text-sidebar-foreground/35 text-[10px] uppercase tracking-[0.15em] font-bold px-3 mb-1">
      {label}
    </SidebarGroupLabel>
  );

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border/50 font-['Nunito',sans-serif]">
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-3">
          {isPremiumBrand && schoolData?.logo ? (
            <img src={schoolData.logo} alt={schoolData.name} className="h-10 w-10 rounded-2xl object-cover shrink-0 shadow-md ring-2 ring-primary/10" />
          ) : platformLogo ? (
            <img src={platformLogo} alt="ATSkolla" className="h-10 w-10 rounded-2xl object-cover shrink-0 shadow-md ring-2 ring-primary/10" />
          ) : (
            <img src={atskollaLogo} alt="ATSkolla" className="h-10 w-10 rounded-2xl object-cover shrink-0 shadow-md ring-2 ring-primary/10" />
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
              <SidebarMenu className="space-y-0.5">
                {renderNavItems([
                  { title: "Dashboard Kelas", url: "/wali-kelas-dashboard", icon: LayoutGrid },
                ])}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              {renderGroupLabel("Menu Utama")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">{renderNavItems(mainNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("Data Sekolah")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">{renderNavItems(dataNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("Laporan")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {renderNavItems([
                    { title: "Rekap & Export", url: "/export-history", icon: BarChart3 },
                    { title: "Riwayat Absensi", url: "/history", icon: Clock },
                  ])}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("WhatsApp")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">{renderNavItems(whatsappNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("Pengaturan")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">{renderNavItems(settingsNav)}</SidebarMenu>
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
              className="text-destructive/60 hover:text-destructive hover:bg-destructive/8 rounded-xl px-3 py-2.5 transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span className="text-[13px] font-medium">Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
