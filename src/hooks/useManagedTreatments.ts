import { usePlan } from '@/contexts/PlanContext';
import { useTreatments } from '@/hooks/useTreatments';
import { useSupabaseTreatments } from '@/hooks/useSupabaseTreatments';
import { TreatmentPlan } from '@/lib/types';

export interface TreatmentRestriction {
  canAddTreatment: boolean;
  reason?: 'maxTreatments' | 'authRequired';
  message?: string;
}

export function useManagedTreatments() {
  const { isPremium, features, loading: planLoading } = usePlan();
  const localTreatments = useTreatments();
  const supabaseTreatments = useSupabaseTreatments();

  // Decide which treatment system to use based on plan
  const useCloud = isPremium && features.cloudStorage;
  const treatmentHook = useCloud ? supabaseTreatments : localTreatments;

  const getActiveTreatments = () => {
    return treatmentHook.getActiveTreatments();
  };

  const getCompletedTreatments = () => {
    if (useCloud) {
      return supabaseTreatments.getArchivedTreatments();
    }
    return localTreatments.getCompletedTreatments();
  };

  const checkTreatmentRestriction = (): TreatmentRestriction => {
    const activeTreatments = getActiveTreatments();
    const maxAllowed = features.maxActiveTreatments;

    if (activeTreatments.length >= maxAllowed) {
      return {
        canAddTreatment: false,
        reason: 'maxTreatments',
        message: `Você atingiu o limite de ${maxAllowed} tratamento(s) ativo(s) do plano gratuito.`
      };
    }

    return { canAddTreatment: true };
  };

  const addTreatment = async (
    plan: TreatmentPlan, 
    startDateTime: Date,
    imagePath?: string
  ): Promise<string | null> => {
    const restriction = checkTreatmentRestriction();
    if (!restriction.canAddTreatment) {
      throw new Error(restriction.message);
    }

    if (useCloud) {
      return await supabaseTreatments.addTreatment(plan, startDateTime, imagePath);
    }
    return localTreatments.addTreatment(plan, startDateTime);
  };

  const canUseAdvancedAnalysis = (): boolean => {
    return features.advancedAnalysis;
  };

  return {
    // Data
    treatments: treatmentHook.treatments || [],
    loading: planLoading || (useCloud ? supabaseTreatments.loading : false),
    
    // Plan info
    isPremium,
    features,
    useCloud,
    
    // Treatment operations
    addTreatment,
    getActiveTreatments,
    getCompletedTreatments,
    
    // Restrictions
    checkTreatmentRestriction,
    canUseAdvancedAnalysis,
    
    // Pass through other methods based on plan
    getTreatmentEvents: useCloud ? supabaseTreatments.getTreatmentEvents : undefined,
    updateEventStatus: useCloud ? supabaseTreatments.updateEventStatus : undefined,
    uploadPrescriptionImage: useCloud ? supabaseTreatments.uploadPrescriptionImage : undefined,
    getPrescriptionImageUrl: useCloud ? supabaseTreatments.getPrescriptionImageUrl : undefined,
    updateTreatmentEvents: !useCloud ? localTreatments.updateTreatmentEvents : undefined,
    getTreatment: !useCloud ? localTreatments.getTreatment : undefined,
    getTreatmentProgress: !useCloud ? localTreatments.getTreatmentProgress : undefined,
    getNextEvent: !useCloud ? localTreatments.getNextEvent : undefined,
  };
}