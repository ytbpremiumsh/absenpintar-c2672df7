import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReferralData {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: string;
  points_awarded: number;
  created_at: string;
  referred_name: string;
  school_name: string;
}

interface RewardClaim {
  id: string;
  reward_id: string;
  points_used: number;
  created_at: string;
  reward: { name: string; points_required: number; duration_days: number };
}

interface PointTransaction {
  id: string;
  points: number;
  type: string;
  source: string;
  description: string;
  created_at: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
}

interface ReferralStats {
  referral_code: string;
  current_points: number;
  lifetime_points: number;
  referrals: ReferralData[];
  claims: RewardClaim[];
  transactions: PointTransaction[];
  total_referrals: number;
  total_claims: number;
}

export function useReferral() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/referral`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'get_stats' }),
        }
      );
      const data = await res.json();
      if (data.success) setStats(data);
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
    }
  }, [user]);

  const fetchRewards = useCallback(async () => {
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    setRewards((data as any) || []);
  }, []);

  const claimReward = async (rewardId: string) => {
    if (!user || claiming) return false;
    setClaiming(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/referral`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'claim_reward', reward_id: rewardId }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      await fetchStats();
      setClaiming(false);
      return true;
    } catch (err) {
      setClaiming(false);
      throw err;
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRewards()]);
      setLoading(false);
    };
    load();
  }, [fetchStats, fetchRewards]);

  const referralLink = stats?.referral_code
    ? `${window.location.origin}/register?ref=${stats.referral_code}`
    : '';

  const getBadge = (count: number) => {
    if (count >= 50) return { label: 'Gold', color: 'text-yellow-500', icon: '🥇' };
    if (count >= 20) return { label: 'Silver', color: 'text-gray-400', icon: '🥈' };
    if (count >= 5) return { label: 'Bronze', color: 'text-amber-700', icon: '🥉' };
    return null;
  };

  return {
    stats,
    rewards,
    loading,
    claiming,
    referralLink,
    claimReward,
    refresh: fetchStats,
    getBadge,
  };
}
