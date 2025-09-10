import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface PlanFeatures {
  maxActiveTreatments: number;
  advancedAnalysis: boolean;
  cloudStorage: boolean;
  unlimitedTreatments: boolean;
}

interface PlanContextType {
  isPremium: boolean;
  features: PlanFeatures;
  loading: boolean;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const FREE_FEATURES: PlanFeatures = {
  maxActiveTreatments: 1,
  advancedAnalysis: false,
  cloudStorage: false,
  unlimitedTreatments: false,
};

const PREMIUM_FEATURES: PlanFeatures = {
  maxActiveTreatments: Infinity,
  advancedAnalysis: true,
  cloudStorage: true,
  unlimitedTreatments: true,
};

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshPlan = async () => {
    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('active_subscription')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking subscription:', error);
        setIsPremium(false);
      } else {
        setIsPremium(data?.active_subscription || false);
      }
    } catch (error) {
      console.error('Error refreshing plan:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPlan();
  }, [user]);

  const features = isPremium ? PREMIUM_FEATURES : FREE_FEATURES;

  const value = {
    isPremium,
    features,
    loading,
    refreshPlan,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}