import { supabase } from './supabase';

export interface EntradaRanking {
  user_id: string;
  nome_exibido: string;
  avatar_emoji: string;
  pontos: number;
  nivel: number;
  streak: number;
  tarefas_feitas: number;
  tarefas_puladas: number;
  posicao?: number;
}

/** Busca o top 50 do ranking ordenado por pontos. */
export async function buscarRanking(): Promise<EntradaRanking[]> {
  const { data, error } = await supabase
    .from('ranking_scores')
    .select('*')
    .order('pontos', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((row, i) => ({ ...row, posicao: i + 1 }));
}

/** Upsert da pontuação do usuário autenticado. */
export async function sincronizarPontuacao(payload: {
  userId: string;
  nomeExibido: string;
  avatarEmoji: string;
  pontos: number;
  nivel: number;
  streak: number;
  tarefasFeitas: number;
  tarefasPuladas: number;
}): Promise<void> {
  await supabase.from('ranking_scores').upsert({
    user_id:        payload.userId,
    nome_exibido:   payload.nomeExibido,
    avatar_emoji:   payload.avatarEmoji,
    pontos:         Math.max(0, payload.pontos),
    nivel:          payload.nivel,
    streak:         payload.streak,
    tarefas_feitas: payload.tarefasFeitas,
    tarefas_puladas: payload.tarefasPuladas,
    atualizado_em:  new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

/** Inscreve em mudanças em tempo real na tabela ranking_scores. */
export function assinarRankingRealtime(
  onMudanca: (ranking: EntradaRanking[]) => void
) {
  const channel = supabase
    .channel('ranking-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ranking_scores' },
      async () => {
        // Sempre rebusca a lista completa após qualquer mudança
        const ranking = await buscarRanking();
        onMudanca(ranking);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
