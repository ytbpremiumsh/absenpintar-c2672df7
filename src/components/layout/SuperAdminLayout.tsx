import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, School, Wallet, Receipt, LogOut, Shield, CalendarCheck, Send, Building2, Megaphone, HelpCircle, Globe, Presentation, TrendingUp, MessageSquareQuote, Clock, Gift } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { title: "Dashboard", url: "/super-admin", icon: LayoutGrid, group: "overview" },
  { title: "Sekolah", url: "/super-admin/schools", icon: School, group: "overview" },
  { title: "Log Login", url: "/super-admin/login-logs", icon: Clock, group: "overview" },
  { title: "Paket Langganan", url: "/super-admin/plans", icon: Wallet, group: "billing" },
  { title: "Langganan", url: "/super-admin/subscriptions", icon: CalendarCheck, group: "billing" },
  { title: "Riwayat Pembayaran", url: "/super-admin/payments", icon: Receipt, group: "billing" },
  { title: "Pengumuman", url: "/super-admin/announcements", icon: Megaphone, group: "communication" },
  { title: "Tiket Bantuan", url: "/super-admin/tickets", icon: HelpCircle, group: "communication" },
  { title: "WhatsApp Gateway", url: "/super-admin/whatsapp", icon: Send, group: "integration" },
  { title: "Notif Registrasi", url: "/super-admin/registration-wa", icon: Send, group: "integration" },
  { title: "Multi Cabang", url: "/super-admin/branches", icon: Building2, group: "integration" },
  { title: "Landing Page", url: "/super-admin/landing", icon: Globe, group: "content" },
  { title: "Sekolah & Testimoni", url: "/super-admin/testimonials", icon: MessageSquareQuote, group: "content" },
  { title: "Presentasi", url: "/super-admin/presentation", icon: Presentation, group: "content" },
  { title: "Model Bisnis", url: "/super-admin/business-model", icon: TrendingUp, group: "content" },
  { title: "Referral & Poin", url: "/super-admin/referral", icon: Gift, group: "billing" },
  { title: "Halaman Penawaran", url: "/super-admin/penawaran", icon: Globe, group: "content" },
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50 font-['Nunito',sans-serif]">
      <SidebarHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shrink-0 shadow-md">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold text-sidebar-foreground tracking-tight">Super Admin</span>
              <span className="text-[11px] text-sidebar-foreground/40 font-medium">Platform Control</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />
        )}
      </SidebarHeader>
      <SidebarContent className="px-2">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group.key);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel className="text-sidebar-foreground/35 text-[10px] uppercase tracking-[0.15em] font-bold px-4 mb-1">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                        <NavLink to={item.url} end={item.url === "/super-admin"} className="text-sidebar-foreground/60 hover:bg-primary/10 hover:text-primary rounded-xl px-3 py-2.5 transition-all duration-200 group/nav" activeClassName="bg-primary text-primary-foreground font-semibold shadow-md">
                          <item.icon className="h-[17px] w-[17px] stroke-[1.8] transition-transform duration-200 group-hover/nav:scale-105" />
                          {!collapsed && <span className="text-[13px]">{item.title}</span>}
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
          <div className="mb-3 mx-2 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" className="text-destructive/60 hover:text-destructive hover:bg-destructive/8 rounded-xl px-3 py-2.5 transition-all duration-200" onClick={async () => { await signOut(); navigate("/login"); }}>
              <LogOut className="h-[18px] w-[18px]" />
              {!collapsed && <span className="text-[13px] font-medium">Keluar</span>}
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
      <div className="min-h-screen flex w-full bg-background">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between glass-subtle border-b border-border/40 px-4 sm:px-5 sticky top-0 z-30">
            <div className="flex items-center gap-2.5">
              <SidebarTrigger className="h-8 w-8 rounded-xl hover:bg-secondary/80 transition-colors" />
              <span className="text-sm font-semibold text-foreground/70 hidden sm:inline">Super Admin Panel</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Avatar className="h-8 w-8 ring-2 ring-destructive/10">
                <AvatarFallback className="bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
