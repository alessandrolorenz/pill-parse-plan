import OpenAI from 'openai';
import { TreatmentPlan } from './types';

const SYSTEM_PROMPT = `Você é um analisador especializado de prescrições médicas. Sua função é extrair informações de medicamentos e cuidados de imagens de receitas.

INSTRUÇÕES:
- Extraia medicamentos/cuidados, doses, unidades, via de administração, frequência (qXh ou Xx/dia), duração em dias, horários preferenciais e observações
- Se algo estiver incerto ou ilegível, reduza a confidence e descreva a dúvida em notes
- NUNCA invente informações que não estão visíveis na imagem
- NUNCA forneça conselhos médicos
- Retorne APENAS um JSON TreatmentPlan válido

FORMATO DE RETORNO:
{
  "planTitle": "string - título descritivo do tratamento",
  "summary": "string - resumo em linguagem simples para o paciente",
  "items": [
    {
      "type": "medication" | "care",
      "name": "string",
      "dose": number | undefined,
      "unit": "string | undefined",
      "route": "string | undefined (VO, IM, IV, etc)",
      "frequency": {
        "everyHours": number | undefined,
        "timesPerDay": number | undefined
      },
      "durationDays": number,
      "preferredTimes": ["HH:MM"] | undefined,
      "notes": "string | undefined",
      "confidence": number (0-1)
    }
  ]
}`;

export async function extractPlanFromImage(
  imageBase64: string, 
  userNotes?: string,
  apiKey?: string
): Promise<TreatmentPlan> {
  const openaiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!openaiKey) {
    throw new Error('OpenAI API key is required. Please configure it in settings.');
  }

  const openai = new OpenAI({
    apiKey: openaiKey,
    dangerouslyAllowBrowser: true
  });

  try {
    const messages: any[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userNotes 
              ? `Analise esta receita médica. Observações do usuário: ${userNotes}`
              : "Analise esta receita médica e extraia as informações de tratamento."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Nenhuma resposta recebida da OpenAI');
    }

    const treatmentPlan: TreatmentPlan = JSON.parse(content);
    
    // Validar estrutura básica
    if (!treatmentPlan.planTitle || !treatmentPlan.summary || !Array.isArray(treatmentPlan.items)) {
      throw new Error('Formato de resposta inválido da OpenAI');
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