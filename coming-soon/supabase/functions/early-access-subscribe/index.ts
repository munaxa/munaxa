import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// Build the confirmation link. It points straight at the early-access-confirm
// Edge Function (the static site has no /confirm route), which then redirects
// the visitor to the confirmed.html page.
function confirmUrl(token: string) {
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
  return `${supabaseUrl}/functions/v1/early-access-confirm?token=${encodeURIComponent(token)}`
}

async function sendConfirmEmail(to: string, token: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const from = Deno.env.get('FROM_EMAIL') ?? 'Munaxa <hello@munaxa.com>'
  if (!apiKey) throw new Error('missing_resend_key')

  const url = confirmUrl(token)

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#0B0518;color:#F4F0FF;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;background:#140A2E;border:1px solid rgba(184,164,255,0.18);border-radius:22px;padding:40px;">
      <h1 style="font-size:24px;margin:0 0 12px;">Confirm your spot on the Munaxa waitlist</h1>
      <p style="color:#B5ACD4;font-size:15px;line-height:1.55;margin:0 0 28px;">Tap the button below to confirm this email. That’s it — you’re on the list for early access.</p>
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7A3FFF,#B97BFF);color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:15px;">Confirm my email →</a>
      <p style="color:#8B83A8;font-size:12px;line-height:1.6;margin:28px 0 0;">If you didn’t request this, you can ignore this email. Link: ${url}</p>
    </div>
  </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: 'Confirm your Munaxa waitlist spot', html }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`resend_failed: ${res.status} ${detail}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  try {
    const payload = await req.json().catch(() => ({}))
    const email = (payload.email || '').toString().trim().toLowerCase()
    const source = (payload.source || 'unknown').toString()
    const turnstile_token = (payload.turnstile_token || '').toString()

    const emailOk = /^[^\s@<>"'&]+@[^\s@<>"'&]+\.[A-Za-z]{2,}$/.test(email)
    if (!emailOk) return json({ ok: false, error: 'invalid_email' }, 400)

    const serviceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SECRET_KEYS') ?? ''
    if (!serviceKey) return json({ ok: false, error: 'server_misconfigured_no_key' }, 500)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .insert([{ email, source, turnstile_token, confirmed: false }])
      .select('confirm_token, confirmed')
      .single()

    if (error) {
      if (error.code === '23505') {
        // Already exists. If still unconfirmed, re-send the link; if confirmed, just say so.
        const { data: existing } = await supabaseAdmin
          .from('waitlist')
          .select('confirm_token, confirmed')
          .eq('email', email)
          .single()
        if (existing && existing.confirmed) {
          return json({ ok: true, status: 'confirmed' })
        }
        if (existing && existing.confirm_token) {
          await sendConfirmEmail(email, existing.confirm_token)
        }
        return json({ ok: true, status: 'pending' })
      }
      return json({ ok: false, error: error.message }, 500)
    }

    await sendConfirmEmail(email, data.confirm_token)
    return json({ ok: true, status: 'pending' })
  } catch (err) {
    return json({ ok: false, error: (err as Error).message || 'unknown' }, 500)
  }
})
