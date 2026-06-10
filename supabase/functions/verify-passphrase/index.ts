const PASSPHRASE = Deno.env.get('APP_PASSPHRASE') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: corsHeaders })

  let body: { passphrase?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }

  const ok = PASSPHRASE && body.passphrase === PASSPHRASE
  return new Response(JSON.stringify({ ok }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
