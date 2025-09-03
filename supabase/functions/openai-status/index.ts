import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Accept both GET and POST for compatibility
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  
  return new Response(
    JSON.stringify({ 
      configured: !!openaiKey,
      timestamp: new Date().toISOString()
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
})