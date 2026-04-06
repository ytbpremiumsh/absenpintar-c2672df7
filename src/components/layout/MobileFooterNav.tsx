import { useNavigate, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface FooterNavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  isCenter?: boolean;
}

interface MobileFooterNavProps {
  items: FooterNavItem[];
  accentColor?: string; // tailwind gradient classes for center button
}

export function MobileFooterNav({ items, accentColor }: MobileFooterNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const centerGradient = accentColor || "from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)]";
  const centerShadow = accentColor
    ? "shadow-[0_4px_20px_-2px_rgba(239,68,68,0.45)]"
    : "shadow-[0_4px_20px_-2px_hsl(var(--primary)/0.5)]";
  const centerGlow = accentColor
    ? "from-red-500 to-rose-600"
    : "from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)]";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/30" />

      <nav className="relative flex items-end justify-around px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {items.map((item) => {
          const active = location.pathname === item.path;

          if (item.isCenter) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="relative -mt-6 flex flex-col items-center gap-0.5 outline-none"
              >
                <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 h-[60px] w-[60px] rounded-full bg-gradient-to-br opacity-20 blur-lg", centerGlow)} />
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "relative h-14 w-14 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br", centerGradient,
                    centerShadow,
                    "ring-[3px] ring-background"
                  )}
                >
                  <item.icon className="h-6 w-6 text-white stroke-[2.5]" />
                </motion.div>
                <span className={cn(
                  "text-[10px] font-semibold mt-0.5",
                  accentColor ? "text-red-500" : "text-primary"
                )}>{item.label}</span>
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
                  className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-full",
                    accentColor ? "bg-red-500" : "bg-primary"
                  )}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center transition-colors duration-200",
                  active
                    ? accentColor ? "bg-red-500/10" : "bg-primary/10"
                    : "bg-transparent"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] stroke-[2] transition-colors duration-200",
                    active
                      ? accentColor ? "text-red-500" : "text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  active
                    ? accentColor ? "text-red-500 font-semibold" : "text-primary font-semibold"
                    : "text-muted-foreground"
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
