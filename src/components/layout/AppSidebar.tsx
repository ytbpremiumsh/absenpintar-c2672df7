import {
  LayoutDashboard,
  Users,
  ScanLine,
  Monitor,
  History,
  CreditCard,
  School,
  LogOut,
  Globe,
  Copy,
  GraduationCap,
  UserCheck,
  FileBarChart,
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
  { title: "Scan QR", url: "/scan", icon: ScanLine },
];

const dataNav = [
  { title: "Kelas", url: "/classes", icon: GraduationCap },
  { title: "Siswa", url: "/students", icon: Users },
  { title: "Wali Murid", url: "/teachers", icon: UserCheck },
  { title: "Riwayat", url: "/history", icon: History },
];

const settingsNav = [
  { title: "Langganan", url: "/subscription", icon: CreditCard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const copyPublicLink = () => {
    if (profile?.school_id) {
      const link = `${window.location.origin}/live/${profile.school_id}`;
      navigator.clipboard.writeText(link);
      toast.success("Link publik disalin!");
    }
  };

  const renderNavItems = (items: typeof mainNav) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
          <NavLink
            to={item.url}
            end
            className="hover:bg-sidebar-accent/60 rounded-xl px-3 py-2.5 transition-all duration-200"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
          >
            <item.icon className="h-5 w-5" />
            {!collapsed && <span className="text-[15px]">{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
      <SidebarHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shrink-0 shadow-md">
            <School className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-sidebar-foreground tracking-tight">Smart Pickup</span>
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
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-semibold px-3 mb-1">
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderNavItems(mainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-semibold px-3 mb-1">
            Data Sekolah
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderNavItems(dataNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Public Link */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-semibold px-3 mb-1">
            Halaman Publik
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Salin Link Publik"
                  onClick={copyPublicLink}
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 rounded-xl px-3 py-2.5 transition-all duration-200"
                >
                  <Globe className="h-5 w-5" />
                  {!collapsed && <span className="text-[15px]">Live Monitor</span>}
                  {!collapsed && <Copy className="h-3.5 w-3.5 ml-auto opacity-40" />}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-semibold px-3 mb-1">
            Pengaturan
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderNavItems(settingsNav)}</SidebarMenu>
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
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl px-3 py-2.5 transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="text-[15px] font-medium">Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
