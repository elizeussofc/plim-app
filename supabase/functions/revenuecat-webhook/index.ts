// Webhook do RevenueCat — é o servidor que marca quem é Pro no banco.
// Configure no painel do RevenueCat (Integrations > Webhooks):
//   URL:            https://<seu-projeto>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization:  o mesmo valor do segredo REVENUECAT_WEBHOOK_AUTH
//
// Esta função é publicada com --no-verify-jwt: quem chama é o RevenueCat,
// não um usuário logado. A proteção é o cabeçalho Authorization acima.
//
// Segredos necessários: REVENUECAT_WEBHOOK_AUTH

import { createClient } from 'npm:@supabase/supabase-js@2';

// Eventos que dão acesso Pro.
const ATIVA = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
]);
// Evento que tira o acesso. CANCELLATION e BILLING_ISSUE não tiram na hora:
// o acesso vale até o fim do período pago, quando chega o EXPIRATION.
const ENCERRA = new Set(['EXPIRATION']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const segredo = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!segredo) return json({ erro: 'config' }, 500);
  if (!igual(req.headers.get('Authorization') ?? '', segredo)) return json({ erro: 'nao-autorizado' }, 401);

  let evento: Record<string, unknown> | undefined;
  try {
    evento = (await req.json())?.event;
  } catch {
    return json({ erro: 'entrada' }, 400);
  }
  if (!evento || typeof evento.type !== 'string') return json({ erro: 'entrada' }, 400);

  const tipo = evento.type;
  let plano: 'pro' | 'free' | null = null;
  if (ATIVA.has(tipo)) plano = 'pro';
  else if (ENCERRA.has(tipo)) plano = 'free';

  // Eventos que não mudam o acesso (TEST, CANCELLATION, BILLING_ISSUE...): só confirma.
  if (!plano) return json({ ok: true, ignorado: tipo });

  // O app faz Purchases.logIn(<id do usuário no Supabase>), então o id vem aqui.
  const ids = [evento.app_user_id, evento.original_app_user_id, ...((evento.aliases as unknown[]) ?? [])]
    .filter((v): v is string => typeof v === 'string' && UUID.test(v));
  const userId = ids[0];
  if (!userId) return json({ ok: true, ignorado: 'sem-usuario' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { error } = await admin.from('profiles').update({ plano }).eq('id', userId);
  if (error) {
    console.error('[revenuecat-webhook]', error.message);
    return json({ erro: 'servidor' }, 500); // RevenueCat tenta de novo
  }

  return json({ ok: true, userId, plano });
});
