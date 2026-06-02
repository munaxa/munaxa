import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Sends the "you're on the waitlist" welcome email. Fired exactly once, the
// first time an email is confirmed.
async function sendWelcomeEmail(to: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const from = Deno.env.get('FROM_EMAIL') ?? 'Munaxa <hello@munaxa.com>'
  if (!apiKey) return // never block the confirm redirect on email failure

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#0B0518;color:#F4F0FF;padding:40px 24px;">
    <div style="max-width:480px;margin:0 auto;background:#140A2E;border:1px solid rgba(184,164,255,0.18);border-radius:22px;padding:40px;">
      <h1 style="font-size:24px;margin:0 0 12px;">You’re on the Munaxa waitlist 🎉</h1>
      <p style="color:#B5ACD4;font-size:15px;line-height:1.55;margin:0 0 16px;">Your email is confirmed and your founder-tier seat is saved. You’re officially on the list for early access.</p>
      <p style="color:#B5ACD4;font-size:15px;line-height:1.55;margin:0 0 28px;">We only email when there’s something real to say — see you at launch, Q3 2026.</p>
      <p style="color:#8B83A8;font-size:12px;line-height:1.6;margin:0;">— The Munaxa team</p>
    </div>
  </div>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: 'You’re on the Munaxa waitlist', html }),
    })
  } catch (_) {
    // swallow — confirmation already succeeded in the DB
  }
}

serve(async (req) => {
  const siteUrl = (Deno.env.get('SITE_URL') ?? 'https://munaxa.com').replace(/\/$/, '')

  function redirect(state: string) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${siteUrl}/confirmed.html?state=${state}` },
    })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token') ?? ''
    if (!token) return redirect('invalid')

    const serviceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SECRET_KEYS') ?? ''
    if (!serviceKey) return redirect('error')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Atomic, idempotent confirm: only flips a row that is still unconfirmed.
    // This is what makes a link impossible to "confirm twice" — the second
    // click matches no unconfirmed row and sends no second welcome email.
    const { data: confirmedRow } = await supabaseAdmin
      .from('waitlist')
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('confirm_token', token)
      .eq('confirmed', false)
      .select('email')
      .maybeSingle()

    if (confirmedRow && confirmedRow.email) {
      await sendWelcomeEmail(confirmedRow.email)
      return redirect('confirmed')
    }

    // No unconfirmed row was updated. Either the token is already confirmed
    // (used before) or it doesn't exist at all.
    const { data: existing } = await supabaseAdmin
      .from('waitlist')
      .select('confirmed')
      .eq('confirm_token', token)
      .maybeSingle()

    if (existing && existing.confirmed) return redirect('already')
    return redirect('invalid')
  } catch (_) {
    return redirect('error')
  }
})
