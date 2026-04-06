import { useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, Activity, ScanLine, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const footerItems = [
  { label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
  { label: "Monitoring", icon: Activity, path: "/monitoring" },
  { label: "Scan", icon: ScanLine, path: "/scan", isCenter: true },
  { label: "Siswa", icon: Users, path: "/students" },
  { label: "Riwayat", icon: Clock, path: "/history" },
];

export function MobileFooterNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      {/* Gradient blur backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/30" />
      
      {/* Safe area + nav */}
      <nav className="relative flex items-end justify-around px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {footerItems.map((item) => {
          const active = location.pathname === item.path;

          if (item.isCenter) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="relative -mt-6 flex flex-col items-center gap-0.5 outline-none"
              >
                {/* Outer glow ring */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[60px] w-[60px] rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] opacity-20 blur-lg" />
                
                {/* Main circle button */}
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "relative h-14 w-14 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)]",
                    "shadow-[0_4px_20px_-2px_hsl(var(--primary)/0.5)]",
                    "ring-[3px] ring-background"
                  )}
                >
                  <ScanLine className="h-6 w-6 text-primary-foreground stroke-[2.5]" />
                </motion.div>
                <span className="text-[10px] font-semibold text-primary mt-0.5">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 py-1.5 px-2 outline-none min-w-[52px]"
            >
              {active && (
                <motion.div
                  layoutId="footer-active"
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center transition-colors duration-200",
                  active
                    ? "bg-primary/10"
                    : "bg-transparent"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] stroke-[2] transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
