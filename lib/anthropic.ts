import { supabase } from '@/lib/supabase';

export interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

const MSG_LOGIN =
  '🔐 Para conversar com a Plim IA, entre na sua conta (é grátis). Assim suas conversas ficam protegidas.';
const MSG_ERRO = '❌ Não consegui falar com a IA agora. Tenta de novo em instantes.';
const MSG_REDE = '❌ Sem conexão com a internet. Verifique sua rede e tente novamente.';

/** A resposta é um aviso do app (sem login, sem rede, limite do dia) e não uma fala da IA? */
export function ehAvisoDaIA(texto: string): boolean {
  return texto.startsWith('🔐') || texto.startsWith('❌') || texto.startsWith('⏳');
}

function msgLimite(plano?: string, limite?: number) {
  const n = limite ?? 10;
  return plano === 'pro'
    ? `⏳ Você usou as ${n} mensagens de hoje. Amanhã tem mais!`
    : `⏳ Você usou as ${n} mensagens grátis de hoje. Amanhã tem mais — ou vire Pro para conversar muito mais com a Plim IA.`;
}

/**
 * Envia a conversa para a Plim IA.
 * A chamada passa pela Edge Function `plim-ia` (supabase/functions/plim-ia),
 * que guarda a chave da Anthropic no servidor e aplica o limite diário do plano.
 */
export async function enviarMensagem(historico: MensagemChat[]): Promise<string> {
  const { data: sessao } = await supabase.auth.getSession();

  if (sessao.session) {
    try {
      const { data, error } = await supabase.functions.invoke('plim-ia', {
        body: { mensagens: historico },
      });

      if (!error && typeof data?.resposta === 'string') return data.resposta;

      // Erro HTTP da função: o corpo traz o motivo.
      const resp = (error as { context?: Response } | null)?.context;
      const status = resp?.status;
      const corpo = resp ? await resp.json().catch(() => ({})) : {};

      if (status === 429 || corpo?.erro === 'limite') return msgLimite(corpo?.plano, corpo?.limite);
      if (status === 401) return MSG_LOGIN;
      // 404 = função ainda não publicada → cai no modo de transição abaixo.
      if (status !== 404) return status ? MSG_ERRO : MSG_REDE;
    } catch {
      return MSG_REDE;
    }
  }

  return enviarDiretoLegado(historico, !!sessao.session);
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO DE TRANSIÇÃO — REMOVER depois de publicar a função `plim-ia`.
// Mantém a IA funcionando enquanto a função não está no ar, usando a chave
// antiga embutida no app (EXPO_PUBLIC_ANTHROPIC_KEY). Essa chave fica visível
// para qualquer pessoa que baixar o app: assim que a função estiver publicada,
// apague a variável na Vercel/EAS, gere uma chave nova na Anthropic e delete
// este bloco. Sem a variável, este caminho simplesmente pede login.
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT_LEGADO = `Você é o Plim IA — um assistente especializado em TDAH, criado para ajudar pessoas com TDAH a organizar pensamentos, superar a paralisia por análise e dar pequenos passos concretos. Respostas curtas e diretas (máximo 3-4 parágrafos), tom informal e acolhedor, sem julgamento. Quebre tarefas grandes em micro-passos numerados e pergunte uma coisa de cada vez. Nunca dê diagnósticos médicos ou substitua um profissional de saúde.`;

async function enviarDiretoLegado(historico: MensagemChat[], logado: boolean): Promise<string> {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;
  if (!key) return logado ? MSG_ERRO : MSG_LOGIN;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT_LEGADO,
        messages: historico,
      }),
    });
    if (!resp.ok) return MSG_ERRO;
    const data = await resp.json();
    return data.content?.[0]?.text ?? MSG_ERRO;
  } catch {
    return MSG_REDE;
  }
}
