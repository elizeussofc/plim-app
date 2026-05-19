export interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

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

Nunca dê diagnósticos médicos ou substitua um profissional de saúde.`;

export async function enviarMensagem(historico: MensagemChat[]): Promise<string> {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;

  if (!key) {
    return '⚠️ Chave da API não configurada. Adicione EXPO_PUBLIC_ANTHROPIC_KEY no arquivo .env.local para usar a IA.';
  }

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
        system: SYSTEM_PROMPT,
        messages: historico,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('Anthropic error:', err);
      return '❌ Erro ao conectar com a IA. Verifique sua chave e tente novamente.';
    }

    const data = await resp.json();
    return data.content?.[0]?.text ?? 'Resposta vazia da IA.';
  } catch (e) {
    console.error('Fetch error:', e);
    return '❌ Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }
}
