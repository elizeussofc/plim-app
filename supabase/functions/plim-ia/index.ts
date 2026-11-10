// Plim IA — a chave da Anthropic fica só aqui no servidor.
// O app chama esta função com o login do usuário; ela confere quem é,
// aplica o limite diário do plano e só então fala com a Anthropic.
//
// Segredos necessários (supabase secrets set ...):
//   ANTHROPIC_API_KEY
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.

import { createClient } from 'npm:@supabase/supabase-js@2';

const LIMITE_DIARIO = { free: 10, pro: 150 } as const;
const MAX_MENSAGENS = 30; // quantas mensagens do histórico vão para a IA
const MAX_CARACTERES = 4000; // por mensagem
const MODELO = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `Você é o Plim IA — um assistente especializado em TDAH (Transtorno do Déficit de Atenção com Hiperatividade), criado para ajudar pessoas com TDAH a organizar pensamentos, superar a paralisia por análise, e dar pequenos passos concretos.

Seu estilo de comunicação:
- Respostas CURTAS e diretas (máximo 3-4 parágrafos)
- Use emojis com moderação para deixar mais visual
- Quebre tarefas grandes em micro-passos numerados
- Seja encorajador, nunca julgue
- Valide a experiência do TDAH ("Faz sentido você se sentir assim...")
- Pergunte uma coisa de cada vez, não sobrecarregue
- Se a pessoa está travada, ajude a identificar O PRÓXIMO passo mínimo
- Linguagem informal e acolhedora, como um amigo que entende de TDAH

Exemplos do que você pode ajudar:
- Quebrar uma tarefa enorme em passos pequenos
- Superar a paralisia por análise
- Lidar com sobrecarga sensorial ou emocional
- Técnicas de foco (Pomodoro, Body Doubling, etc.)
- Estratégias para não esquecer coisas importantes
- Lidar com a procrastinação sem se culpar

Nunca dê diagnósticos médicos, nunca sugira dose ou troca de medicação e nunca substitua um profissional de saúde. Se a pessoa falar em se machucar ou em não querer mais viver, acolha com calma, diga que ela não precisa passar por isso sozinha e indique o CVV (ligue 188 ou cvv.org.br, 24h) e o SAMU (192) em caso de emergência.`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

type Mensagem = { role: 'user' | 'assistant'; content: string };

function limparMensagens(entrada: unknown): Mensagem[] | null {
  if (!Array.isArray(entrada)) return null;
  const limpas: Mensagem[] = [];
  for (const m of entrada) {
    if (!m || typeof m !== 'object') return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    const texto = content.trim().slice(0, MAX_CARACTERES);
    if (texto) limpas.push({ role, content: texto });
  }
  let recentes = limpas.slice(-MAX_MENSAGENS);
  // A API exige que a conversa comece com uma mensagem do usuário.
  while (recentes.length && recentes[0].role !== 'user') recentes = recentes.slice(1);
  if (!recentes.length || recentes[recentes.length - 1].role !== 'user') return null;
  return recentes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const chave = Deno.env.get('ANTHROPIC_API_KEY');
  if (!chave) return json({ erro: 'config' }, 500);

  // 1) Quem está chamando?
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ erro: 'login' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: auth, error: authErro } = await admin.auth.getUser(token);
  if (authErro || !auth?.user) return json({ erro: 'login' }, 401);
  const userId = auth.user.id;

  // 2) Mensagens válidas?
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: 'entrada' }, 400);
  }
  const mensagens = limparMensagens((corpo as Record<string, unknown>)?.mensagens);
  if (!mensagens) return json({ erro: 'entrada' }, 400);

  // 3) Limite diário conforme o plano (o plano vem do banco, nunca do app).
  const { data: perfil } = await admin.from('profiles').select('plano').eq('id', userId).maybeSingle();
  const plano = perfil?.plano === 'pro' ? 'pro' : 'free';
  const limite = LIMITE_DIARIO[plano];

  const { data: total, error: usoErro } = await admin.rpc('ia_registrar_uso', {
    p_user: userId,
    p_limite: limite,
  });
  if (usoErro) {
    console.error('[plim-ia] ia_registrar_uso:', usoErro.message);
    return json({ erro: 'servidor' }, 500);
  }
  if (total === -1) return json({ erro: 'limite', plano, limite }, 429);

  // 4) Anthropic
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: mensagens,
      }),
    });

    if (!resp.ok) {
      console.error('[plim-ia] anthropic', resp.status, await resp.text());
      return json({ erro: 'ia' }, 502);
    }

    const dados = await resp.json();
    const texto = dados?.content?.[0]?.text;
    if (typeof texto !== 'string' || !texto) return json({ erro: 'ia' }, 502);

    return json({ resposta: texto, restante: Math.max(0, limite - (total as number)), plano });
  } catch (e) {
    console.error('[plim-ia] fetch:', e);
    return json({ erro: 'ia' }, 502);
  }
});
