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
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Crown className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Fitur Premium</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            <span className="font-semibold text-foreground">{featureLabel}</span> tersedia untuk paket{" "}
            <span className="font-semibold text-primary">{requiredPlan}</span> ke atas.
            Upgrade sekarang untuk mengakses fitur ini.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span>Paket Anda saat ini: <span className="font-semibold">{features.planName}</span></span>
          </div>
          <Button onClick={() => navigate("/subscription")} className="w-full gradient-primary text-primary-foreground font-semibold">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Langganan
          </Button>
        </div>
      </div>
    </div>
  );
}
