import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, School, CreditCard, Receipt, LogOut, Shield, CalendarCheck, MessageSquare, Building2, Megaphone, LifeBuoy, Globe, Presentation, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { title: "Dashboard", url: "/super-admin", icon: LayoutDashboard, group: "overview" },
  { title: "Sekolah", url: "/super-admin/schools", icon: School, group: "overview" },
  { title: "Paket Langganan", url: "/super-admin/plans", icon: CreditCard, group: "billing" },
  { title: "Langganan", url: "/super-admin/subscriptions", icon: CalendarCheck, group: "billing" },
  { title: "Riwayat Pembayaran", url: "/super-admin/payments", icon: Receipt, group: "billing" },
  { title: "Pengumuman", url: "/super-admin/announcements", icon: Megaphone, group: "communication" },
  { title: "Tiket Bantuan", url: "/super-admin/tickets", icon: LifeBuoy, group: "communication" },
  { title: "WhatsApp Gateway", url: "/super-admin/whatsapp", icon: MessageSquare, group: "integration" },
  { title: "Notif Registrasi", url: "/super-admin/registration-wa", icon: MessageSquare, group: "integration" },
  { title: "Multi Cabang", url: "/super-admin/branches", icon: Building2, group: "integration" },
  { title: "Landing Page", url: "/super-admin/landing", icon: Globe, group: "content" },
  { title: "Presentasi", url: "/super-admin/presentation", icon: Presentation, group: "content" },
  { title: "Model Bisnis", url: "/super-admin/business-model", icon: TrendingUp, group: "content" },
];

const groups = [
  { key: "overview", label: "Overview" },
  { key: "billing", label: "Billing & Langganan" },
  { key: "communication", label: "Komunikasi" },
  { key: "integration", label: "Integrasi" },
  { key: "content", label: "Konten" },
];

function SuperAdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => path === "/super-admin" ? location.pathname === "/super-admin" : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm font-['Nunito',sans-serif]">
      <SidebarHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive shrink-0 shadow-md">
            <Shield className="h-5 w-5 text-destructive-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-sidebar-foreground tracking-tight">Super Admin</span>
              <span className="text-[11px] text-sidebar-foreground/50 font-medium">Platform Control</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        )}
      </SidebarHeader>
      <SidebarContent className="px-2">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group.key);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-xs uppercase tracking-widest font-semibold px-4 mb-1.5">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                        <NavLink to={item.url} end={item.url === "/super-admin"} className="text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground rounded-xl px-4 py-3 transition-all duration-200" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span className="text-sm">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="mb-3 mx-2 h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl px-4 py-3" onClick={async () => { await signOut(); navigate("/login"); }}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="text-sm font-medium">Keluar</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SuperAdminLayout() {
  const { user, roles, loading, profile } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-32" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes("super_admin")) return <Navigate to="/dashboard" replace />;

  const initials = profile?.full_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "SA";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Super Admin Panel</span>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-destructive text-destructive-foreground text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
