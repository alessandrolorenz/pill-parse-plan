import { TreatmentPlan } from './types';
import { supabase } from '@/integrations/supabase/client';

export async function extractPlanFromImage(
  imageBase64: string, 
  userNotes?: string
): Promise<TreatmentPlan> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-prescription', {
      body: {
        imageBase64,
        userNotes
      }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao chamar a função do Supabase');
    }

    const treatmentPlan: TreatmentPlan = data;
    
    // Validar estrutura básica
    if (!treatmentPlan.planTitle || !treatmentPlan.summary || !Array.isArray(treatmentPlan.items)) {
      throw new Error('Formato de resposta inválido do servidor');
    }

    return treatmentPlan;
  } catch (error) {
    console.error('Erro ao analisar receita:', error);
    throw new Error(
      error instanceof Error 
        ? `Erro ao processar imagem: ${error.message}`
        : 'Erro desconhecido ao processar a receita'
    );
  }
}