import OpenAI from 'openai';

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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    console.error('OPENAI_API_KEY not configured in environment variables');
    return res.status(500).json({ 
      error: 'Servidor não configurado. Configure OPENAI_API_KEY nas variáveis de ambiente.' 
    });
  }

  try {
    const { imageBase64, userNotes } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 é obrigatório' });
    }

    const openai = new OpenAI({
      apiKey: openaiKey
    });

    const messages = [
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

    const treatmentPlan = JSON.parse(content);
    
    // Validar estrutura básica
    if (!treatmentPlan.planTitle || !treatmentPlan.summary || !Array.isArray(treatmentPlan.items)) {
      throw new Error('Formato de resposta inválido da OpenAI');
    }

    return res.status(200).json(treatmentPlan);
  } catch (error) {
    console.error('Erro ao processar receita:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ 
        error: 'Cota da OpenAI esgotada. Verifique seu plano na OpenAI.' 
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: 'Chave da OpenAI inválida. Verifique a configuração do servidor.' 
      });
    }

    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    });
  }
}