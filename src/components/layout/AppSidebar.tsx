import {
  LayoutDashboard,
  Users,
  ScanLine,
  Monitor,
  History,
  CreditCard,
  School,
  LogOut,
  GraduationCap,
  UserCheck,
  FileBarChart,
  Lock,
  LifeBuoy,
  ClipboardCheck,
} from "lucide-react";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
  { title: "Guru / Wali Kelas", url: "/teachers", icon: UserCheck },
];

const settingsNav = [
  { title: "Langganan", url: "/subscription", icon: CreditCard },
  { title: "Bantuan", url: "/support", icon: LifeBuoy },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const features = useSubscriptionFeatures();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const renderNavItems = (items: typeof mainNav) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
          <NavLink
            to={item.url}
            end
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground rounded-xl px-4 py-3 transition-all duration-200"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span className="text-sm">{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm font-['Nunito',sans-serif]">
      <SidebarHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shrink-0 shadow-md">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-sidebar-foreground tracking-tight">Smart Attendance</span>
              <span className="text-[11px] text-sidebar-foreground/50 font-medium">School System</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-widest font-semibold px-4 mb-1.5">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">{renderNavItems(mainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-widest font-semibold px-4 mb-1.5">
            Data Sekolah
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">{renderNavItems(dataNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Laporan section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-widest font-semibold px-4 mb-1.5">
            Laporan
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {renderNavItems([{ title: "Riwayat Absensi", url: "/history", icon: History }])}
              {features.canExportReport ? (
                renderNavItems([{ title: "Rekap & Export", url: "/export-history", icon: FileBarChart }])
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Rekap & Export (Upgrade)"
                    onClick={() => toast.error("Fitur Rekap & Export tersedia di paket Basic ke atas. Silakan upgrade langganan Anda.")}
                    className="text-sidebar-foreground/50 hover:bg-sidebar-accent/40 rounded-xl px-4 py-3 transition-all duration-200 opacity-60"
                  >
                    <FileBarChart className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="text-sm">Rekap & Export</span>
                        <Lock className="h-3.5 w-3.5 ml-auto text-warning" />
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-widest font-semibold px-4 mb-1.5">
            Pengaturan
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">{renderNavItems(settingsNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="mb-3 mx-2 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl px-4 py-3 transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="text-sm font-medium">Keluar</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}