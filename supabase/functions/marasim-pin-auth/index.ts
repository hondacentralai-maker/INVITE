import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(raw: string): string {
  // Convert Arabic-Indic / Eastern Arabic numerals to ASCII digits
  const converted = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  return converted.replace(/[^\d]/g, '');
}

async function hashPin(pin: string, existingSaltHex?: string): Promise<string> {
  const enc = new TextEncoder();
  const saltBytes = existingSaltHex
    ? Uint8Array.from(existingSaltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHash] = stored.split(':');
  if (!saltHex || !expectedHash) return false;
  const computed = await hashPin(pin, saltHex);
  const [, actualHash] = computed.split(':');
  if (!actualHash || actualHash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHash.length; i += 1) {
    diff |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const adminClient = createClient(supabaseUrl, serviceKey, {
    db: { schema: 'invite_cart' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey, {
    db: { schema: 'invite_cart' },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const payload = await req.json();
    const action = String(payload.action || '');

    if (action === 'signup') {
      const phone = normalizePhone(String(payload.phone || ''));
      const password = String(payload.password || '');
      const pin = normalizePhone(String(payload.pin || ''));
      const fullName = String(payload.fullName || '').trim();
      const lang = payload.lang === 'en' ? 'en' : 'ar';

      if (phone.length < 6 || phone.length > 20) {
        return jsonResponse({ error: 'يرجى إدخال رقم هاتف صحيح (6 أرقام على الأقل)' }, 400);
      }
      if (password.length < 6) {
        return jsonResponse({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, 400);
      }
      if (pin.length < 4 || pin.length > 8) {
        return jsonResponse({ error: 'رمز الاسترجاع PIN يجب أن يتكون من 4 إلى 8 أرقام' }, 400);
      }

      // Check if phone already registered
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (existingProfile) {
        return jsonResponse({ error: 'رقم الهاتف مسجل مسبقاً، يمكنك تسجيل الدخول أو استعادة كلمة المرور عبر PIN' }, 409);
      }

      const syntheticEmail = `p_${phone}@phone.marasim.local`;
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || phone,
          phone,
        },
      });

      if (createErr || !created.user) {
        return jsonResponse({ error: createErr?.message || 'Unable to create account' }, 400);
      }

      const userId = created.user.id;
      await adminClient.from('profiles').upsert({
        id: userId,
        email: syntheticEmail,
        phone,
        full_name: fullName || phone,
        preferred_lang: lang,
        role: 'user',
        plan_tier: 'free',
        is_active: true,
      });

      const pinHash = await hashPin(pin);
      const { error: pinErr } = await adminClient.rpc('internal_upsert_user_pin', {
        p_user_id: userId,
        p_phone: phone,
        p_pin_hash: pinHash,
      });

      if (pinErr) {
        return jsonResponse({ error: pinErr.message }, 500);
      }

      const { data: signInData, error: signInErr } = await publicClient.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });

      if (signInErr || !signInData.session) {
        return jsonResponse({ error: signInErr?.message || 'Created account, please sign in' }, 400);
      }

      return jsonResponse({
        session: signInData.session,
        user: signInData.user,
      });
    }

    if (action === 'signin') {
      const identifier = String(payload.identifier || '').trim();
      const password = String(payload.password || '');

      if (!identifier || !password) {
        return jsonResponse({ error: 'يرجى إدخال رقم الهاتف وكلمة المرور' }, 400);
      }

      let loginEmail = identifier;
      if (!identifier.includes('@')) {
        const phone = normalizePhone(identifier);
        if (phone.length < 6) {
          return jsonResponse({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' }, 401);
        }
        const { data: prof } = await adminClient
          .from('profiles')
          .select('email')
          .eq('phone', phone)
          .maybeSingle();

        loginEmail = prof?.email || `p_${phone}@phone.marasim.local`;
      }

      const { data: signInData, error: signInErr } = await publicClient.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInErr || !signInData.session) {
        return jsonResponse({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' }, 401);
      }

      return jsonResponse({
        session: signInData.session,
        user: signInData.user,
      });
    }

    if (action === 'recover') {
      const phone = normalizePhone(String(payload.phone || ''));
      const pin = normalizePhone(String(payload.pin || ''));
      const newPassword = String(payload.newPassword || '');

      if (phone.length < 6 || pin.length < 4 || newPassword.length < 6) {
        return jsonResponse(
          { error: 'يرجى إدخال رقم الهاتف، رمز الـ PIN (4-8 أرقام)، وكلمة مرور جديدة (6+ أحرف)' },
          400,
        );
      }

      const { data: pinRows, error: lookupErr } = await adminClient.rpc('internal_get_pin_record', {
        p_phone: phone,
      });

      const rec = Array.isArray(pinRows) ? pinRows[0] : pinRows;
      if (lookupErr || !rec) {
        return jsonResponse({ error: 'بيانات الاسترجاع غير صحيحة' }, 401);
      }

      if (rec.locked_until && new Date(rec.locked_until).getTime() > Date.now()) {
        return jsonResponse(
          { error: 'تم تجاوز عدد محاولات الـ PIN المسموحة. يرجى المحاولة بعد 15 دقيقة.' },
          429,
        );
      }

      const ok = await verifyPin(pin, rec.pin_hash);
      await adminClient.rpc('internal_record_pin_attempt', {
        p_user_id: rec.user_id,
        p_success: ok,
      });

      if (!ok) {
        return jsonResponse({ error: 'رقم الهاتف أو رمز الـ PIN غير صحيح' }, 401);
      }

      const { data: userRes, error: updateErr } = await adminClient.auth.admin.updateUserById(
        rec.user_id,
        { password: newPassword },
      );

      if (updateErr || !userRes.user) {
        return jsonResponse({ error: updateErr?.message || 'Failed to update password' }, 500);
      }

      const emailToSignIn = userRes.user.email || `p_${phone}@phone.marasim.local`;
      const { data: signInData } = await publicClient.auth.signInWithPassword({
        email: emailToSignIn,
        password: newPassword,
      });

      return jsonResponse({
        ok: true,
        session: signInData?.session ?? null,
        user: signInData?.user ?? userRes.user,
      });
    }

    if (action === 'set_pin') {
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (!token) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
      if (userErr || !userData.user) {
        return jsonResponse({ error: 'Invalid session' }, 401);
      }

      const phone = normalizePhone(String(payload.phone || ''));
      const pin = normalizePhone(String(payload.pin || ''));

      if (phone.length < 6 || pin.length < 4 || pin.length > 8) {
        return jsonResponse({ error: 'يرجى إدخال رقم هاتف صحيح ورمز PIN من 4 إلى 8 أرقام' }, 400);
      }

      // Check phone not used by another user
      const { data: conflict } = await adminClient
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .neq('id', userData.user.id)
        .maybeSingle();

      if (conflict) {
        return jsonResponse({ error: 'رقم الهاتف مرتبط بحساب آخر' }, 409);
      }

      await adminClient
        .from('profiles')
        .update({ phone })
        .eq('id', userData.user.id);

      const pinHash = await hashPin(pin);
      const { error: pinErr } = await adminClient.rpc('internal_upsert_user_pin', {
        p_user_id: userData.user.id,
        p_phone: phone,
        p_pin_hash: pinHash,
      });

      if (pinErr) {
        return jsonResponse({ error: pinErr.message }, 500);
      }

      return jsonResponse({ ok: true, phone });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      500,
    );
  }
});
