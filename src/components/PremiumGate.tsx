import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { ReactNode } from "react";

interface PremiumGateProps {
  children: ReactNode;
  featureKey?: keyof ReturnType<typeof useSubscriptionFeatures>;
  requiredPlan?: string;
  featureLabel: string;
}

export function PremiumGate({ children, featureLabel, featureKey, requiredPlan = "Basic" }: PremiumGateProps) {
  const features = useSubscriptionFeatures();
  const navigate = useNavigate();

  const isLocked = featureKey ? !features[featureKey] : features.planName === "Free";

  if (features.loading || !isLocked) return <>{children}</>;

  return (
    <div className="relative min-h-[60vh]">
      <div className="pointer-events-none select-none blur-[6px] opacity-60">
        {children}
      </div>
      <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none" style={{ left: 'var(--sidebar-width, 0px)' }}>
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-8 max-w-sm w-[calc(100%-2rem)] sm:max-w-md text-center space-y-3 sm:space-y-4 pointer-events-auto">
          <div className="mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Crown className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground">Fitur Premium</h3>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            <span className="font-semibold text-foreground">{featureLabel}</span> tersedia untuk paket{" "}
            <span className="font-semibold text-primary">{requiredPlan}</span> ke atas.
            Upgrade sekarang untuk mengakses fitur ini.
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Paket Anda saat ini: <span className="font-semibold">{features.planName}</span></span>
          </div>
          <Button onClick={() => navigate("/subscription")} className="w-full gradient-primary text-primary-foreground font-semibold text-sm">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Langganan
          </Button>
        </div>
      </div>
    </div>
  );
}
