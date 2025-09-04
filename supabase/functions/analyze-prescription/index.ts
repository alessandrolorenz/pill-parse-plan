import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, userNotes } = await req.json()

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiKey) {
      console.error('OPENAI_API_KEY not configured in environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'Servidor não configurado. Configure OPENAI_API_KEY nas variáveis de ambiente.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Cota da OpenAI esgotada. Verifique seu plano na OpenAI.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Chave da OpenAI inválida ou expirada. Configure uma nova chave de API válida.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          error: `Erro da OpenAI API (${response.status}): ${errorData.error?.message || response.statusText}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('Nenhuma resposta recebida da OpenAI')
    }

    const treatmentPlan = JSON.parse(content)
    
    // Validar estrutura básica
    if (!treatmentPlan.planTitle || !treatmentPlan.summary || !Array.isArray(treatmentPlan.items)) {
      throw new Error('Formato de resposta inválido da OpenAI')
    }

    return new Response(
      JSON.stringify(treatmentPlan),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Erro ao processar receita:', error)

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})