import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  Activity,
  LogOut,
  GraduationCap,
  UserCheck,
  BarChart3,
  
  ClipboardCheck,
  UsersRound,
  MessageCircle,
  ChevronRight,
  Crown,
  PenLine,
  Sparkles,
  Package,
  CalendarDays,
  Radio,
  BookOpen,
} from "lucide-react";
import atskollaLogo from "@/assets/Logo_atskolla.png";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Monitoring", url: "/monitoring", icon: Activity, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Scan Absensi", url: "/scan", icon: ScanLine, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

const dataNav = [
  { title: "Kelas", url: "/classes", icon: GraduationCap, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Siswa", url: "/students", icon: Users, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Wali Murid", url: "/teachers", icon: UserCheck, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Wali Kelas", url: "/wali-kelas", icon: ClipboardCheck, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Guru & Staff", url: "/staff", icon: UsersRound, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

const scheduleNav = [
  { title: "Jadwal Mengajar", url: "/teaching-schedule", icon: CalendarDays, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Jadwal Live", url: "/live-schedule", icon: Radio, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

const whatsappNav = [
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

const settingsNav = [
  { title: "Langganan", url: "/subscription", icon: Sparkles, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
  { title: "Add-on", url: "/addons", icon: Package, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
];

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, roles, profile, user } = useAuth();
  const features = useSubscriptionFeatures();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const [schoolData, setSchoolData] = useState<{ name: string; logo: string | null } | null>(null);
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [isWaliKelas, setIsWaliKelas] = useState(false);

  const isPremiumBrand = ["School", "Premium"].includes(features.planName);

  useEffect(() => {
    supabase.from("platform_settings").select("key, value").in("key", ["login_logo_url"]).then(({ data }) => {
      (data || []).forEach((d: any) => {
        if (d.key === "login_logo_url" && d.value) setPlatformLogo(d.value);
      });
    });
  }, []);

  useEffect(() => {
    if (!profile?.school_id) return;
    supabase.from("schools").select("name, logo").eq("id", profile.school_id).single().then(({ data }) => {
      if (data) setSchoolData(data);
    });
  }, [profile?.school_id]);

  // Check if teacher is also wali kelas
  useEffect(() => {
    if (!user || !profile?.school_id) return;
    supabase.from("class_teachers").select("id").eq("user_id", user.id).eq("school_id", profile.school_id).limit(1).then(({ data }) => {
      setIsWaliKelas((data || []).length > 0);
    });
  }, [user, profile?.school_id]);

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
          <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="!h-auto">
            <NavLink
              to={item.url}
              end
              onClick={handleNavClick}
              className={`relative rounded-xl px-2.5 py-2 transition-all duration-300 group/nav gap-2.5 overflow-hidden ${
                active
                  ? "bg-gradient-to-r from-white/90 to-white/60 dark:from-white/10 dark:to-white/5 text-[#5B6CF9] font-semibold shadow-[0_2px_8px_-2px_rgba(91,108,249,0.18),inset_0_0_0_1px_rgba(91,108,249,0.18)]"
                  : "text-muted-foreground hover:bg-white/40 dark:hover:bg-white/5 hover:text-foreground"
              }`}
              activeClassName=""
            >
              {/* Active indicator rail */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-[#5B6CF9] to-[#4c5ded] shadow-[0_0_8px_rgba(91,108,249,0.6)]" />
              )}
              <div className={`relative h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                active
                  ? "bg-gradient-to-br from-[#5B6CF9] to-[#4c5ded] shadow-[0_2px_6px_rgba(91,108,249,0.35)]"
                  : "bg-muted/40 group-hover/nav:bg-muted/70"
              }`}>
                <item.icon className={`h-[14px] w-[14px] stroke-[2] ${active ? "text-white" : ""}`} />
              </div>
              <span className={`text-[13px] truncate flex-1 tracking-tight ${active ? "text-[#5B6CF9] font-semibold" : ""}`}>{item.title}</span>
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#5B6CF9] shadow-[0_0_8px_rgba(91,108,249,0.7)] animate-pulse shrink-0" />
              )}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const renderGroupLabel = (label: string) => (
    <SidebarGroupLabel className="text-[9px] uppercase tracking-[0.22em] font-bold px-3 mb-1.5 mt-1 text-muted-foreground/50 flex items-center gap-2">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </SidebarGroupLabel>
  );

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-sidebar-border/20 font-['Inter',sans-serif] bg-gradient-to-b from-[#F8FAFE] via-[#F4F7FB] to-[#EEF2FB] dark:from-background dark:via-background dark:to-background"
    >
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-10 h-56 w-56 rounded-full bg-[#5B6CF9]/10 blur-3xl" />
        <div className="absolute top-1/3 -right-16 h-48 w-48 rounded-full bg-[#5B6CF9]/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-[#4c5ded]/8 blur-3xl" />
      </div>

      <SidebarHeader className="p-3 pb-2 relative z-10">
        {/* Premium Brand Card with depth */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5B6CF9] via-[#5566F5] to-[#4451d8] p-3.5 shadow-[0_8px_24px_-6px_rgba(91,108,249,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] border border-white/20">
          {/* Inner highlights */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
          <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-3 -left-3 h-14 w-14 rounded-full bg-white/10 blur-xl" />
          {/* Subtle dot pattern */}
          <svg className="absolute inset-0 opacity-[0.08] pointer-events-none" width="100%" height="100%">
            <defs>
              <pattern id="sidebar-dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#sidebar-dots)" />
          </svg>

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.1)]">
              {isPremiumBrand && schoolData?.logo ? (
                <img src={schoolData.logo} alt={schoolData.name} className="h-9 w-9 object-contain" />
              ) : platformLogo ? (
                <img src={platformLogo} alt="ATSkolla" className="h-9 w-9 object-contain" />
              ) : (
                <img src={atskollaLogo} alt="ATSkolla" className="h-9 w-9 object-contain" />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13.5px] font-extrabold text-white tracking-tight truncate leading-tight drop-shadow-sm">
                {isPremiumBrand && schoolData ? schoolData.name : "ATSkolla"}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white bg-white/20 backdrop-blur-md px-1.5 py-[2px] rounded-md border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                  {features.isTrial ? (
                    <Sparkles className="h-2.5 w-2.5" />
                  ) : (
                    <Crown className="h-2.5 w-2.5" />
                  )}
                  {features.isTrial
                    ? "Trial Premium"
                    : features.planName === "Free" ? "Free Plan" : `${features.planName}`}
                </span>
                <span className="h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.8)] animate-pulse" />
                <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">Online</span>
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-y-auto overflow-x-hidden relative z-10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb]:rounded-full">
        {isTeacherOnly ? (
          <>
            <SidebarGroup>
              {renderGroupLabel("Guru Mata Pelajaran")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                   {renderNavItems([
                    { title: "Dashboard Guru", url: "/teacher-dashboard", icon: BookOpen, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                    { title: "Rekap Absensi Mapel", url: "/export-history", icon: BarChart3, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                    { title: "Analytic Mapel", url: "/history", icon: Activity, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                  ])}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {isWaliKelas && (
              <SidebarGroup>
                {renderGroupLabel("Wali Kelas")}
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                     {renderNavItems([
                      { title: "Dashboard Kelas", url: "/wali-kelas-dashboard", icon: LayoutDashboard, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                      { title: "Absensi Manual", url: "/wali-kelas-attendance", icon: ClipboardCheck, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                      { title: "Siswa Kelas Saya", url: "/wali-kelas-students", icon: Users, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                      { title: "Rekap Absensi Kelas", url: "/wali-kelas-export", icon: BarChart3, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                      { title: "Analytic Kelas Wali", url: "/wali-kelas-history", icon: Activity, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                    ])}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            <SidebarGroup>
              {renderGroupLabel("Jadwal")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {renderNavItems(scheduleNav)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
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
              {renderGroupLabel("Jadwal")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">{renderNavItems(scheduleNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              {renderGroupLabel("Laporan")}
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {renderNavItems([
                    { title: "Rekap Absensi", url: "/export-history", icon: BarChart3, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                    { title: "Analytic Kelas", url: "/history", icon: Activity, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
                    { title: "Riwayat Absensi", url: "/edit-attendance", icon: PenLine, accent: "from-[#5B6CF9]/85 to-[#4c5ded]" },
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

      <SidebarFooter className="p-3 relative z-10">
        {/* Premium User Card */}
        <div className="relative overflow-hidden rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/60 dark:border-white/10 p-2.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]">
          <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-[#5B6CF9]/10 blur-2xl" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Logout"
                className="!h-auto text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-xl px-2.5 py-2 transition-all duration-200 gap-2.5"
                onClick={handleLogout}
              >
                <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]">
                  <LogOut className="h-[14px] w-[14px] shrink-0 stroke-[2]" />
                </div>
                <span className="text-[13px] font-semibold tracking-tight">Keluar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
