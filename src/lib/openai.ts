import { TreatmentPlan } from './types';

export async function extractPlanFromImage(
  imageBase64: string, 
  userNotes?: string
): Promise<TreatmentPlan> {
  try {
    const response = await fetch('/api/functions/v1/analyze-prescription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        userNotes
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const treatmentPlan: TreatmentPlan = await response.json();
    
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