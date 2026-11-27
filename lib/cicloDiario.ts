/**
 * Ciclo diário do Plim: vira o dia, conta a sequência de dias e atualiza o desafio dela.
 *
 * Antes disto nada chamava a virada do dia: uma tarefa marcada ficava "feita" para sempre
 * e a sequência de dias nunca saía do zero.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { sequenciaDeDias } from '@/lib/dia';
import { useDesafiosStore } from '@/stores/desafiosStore';
import { rotinaCarregada, useRotinaStore } from '@/stores/rotinaStore';
import { useUserStore } from '@/stores/userStore';

/** Confere o dia e a sequência. Pode ser chamada a qualquer momento; só age se algo mudou. */
export function sincronizarDia() {
  if (!rotinaCarregada) return; // ainda lendo o que está salvo no aparelho
  useRotinaStore.getState().virarDiaSeNecessario();

  const { historicoDias } = useRotinaStore.getState();
  // Aparelho novo, sem histórico local: mantém a sequência que veio da conta.
  if (Object.keys(historicoDias).length === 0) return;

  const dias = sequenciaDeDias(historicoDias);
  const usuario = useUserStore.getState();
  if (usuario.profile.streak !== dias) usuario.definirStreak(dias);
  if (dias > 0) useDesafiosStore.getState().definirProgresso('streak_3', dias)(usuario.addXp, usuario.addMoedas);
}

/** Liga o ciclo enquanto o app está aberto: ao abrir, ao voltar para o app e a cada minuto. */
export function useCicloDiario() {
  useEffect(() => {
    const primeira = setTimeout(sincronizarDia, 900);
    const relogio = setInterval(sincronizarDia, 60_000);
    const estado = AppState.addEventListener('change', (s) => { if (s === 'active') sincronizarDia(); });
    return () => {
      clearTimeout(primeira);
      clearInterval(relogio);
      estado.remove();
    };
  }, []);
}

/** Dá o XP de uma tarefa uma única vez por dia (marcar, desmarcar e marcar de novo não soma). */
export function premiarTarefa(id: string) {
  const rotina = useRotinaStore.getState();
  if (rotina.premiadasHoje.includes(id)) return;
  rotina.marcarPremiada(id);
  const usuario = useUserStore.getState();
  usuario.addXp(10);
  usuario.addMoedas(5);
  usuario.unlockConquista('primeiro_passo');
  useDesafiosStore.getState().registrarEvento('tarefas_dia', 1)(usuario.addXp, usuario.addMoedas);
}

/** Marca a tarefa como feita, com prêmio e sequência em dia. Usado pelo botão "Feito" do Início. */
export function concluirTarefa(id: string) {
  premiarTarefa(id);
  useRotinaStore.getState().concluir(id);
  sincronizarDia();
}
