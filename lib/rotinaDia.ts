/**
 * Regras do dia da rotina, sem depender de tela nem de armazenamento (por isso têm teste).
 * Tipos e funções são reexportados por stores/rotinaStore.ts.
 */

export type StatusTarefa = 'pendente' | 'feita' | 'pulada';
export type StatusDia = 'vazia' | 'parcial' | 'completa';

export interface Tarefa {
  id: string;
  icone: string;
  titulo: string;
  categoria: string;
  horario: string;
  status: StatusTarefa;
  lembreteAgendado: boolean;
  calendarioAdicionado: boolean;
}

export interface EstadoDoDia {
  tarefas: Tarefa[];
  historicoDias: Record<string, StatusDia>;
  diaAtual: string;
  premiadasHoje: string[];
}

/** Como foi o dia, olhando as tarefas: nada feito, um pouco ou tudo. */
export function calcularStatusDia(tarefas: Pick<Tarefa, 'status'>[]): StatusDia {
  if (tarefas.length === 0) return 'vazia';
  const feitas = tarefas.filter((t) => t.status === 'feita').length;
  if (feitas === 0) return 'vazia';
  if (feitas === tarefas.length) return 'completa';
  return 'parcial';
}

/**
 * Dia novo: o que foi feito no dia anterior fica no histórico e as tarefas voltam a "pendente".
 * Não rebaixa um dia que já estava registrado melhor do que o estado atual das tarefas.
 */
export function virarDia(s: Pick<EstadoDoDia, 'tarefas' | 'historicoDias' | 'diaAtual'>, hoje: string): EstadoDoDia {
  const historicoDias = { ...s.historicoDias };
  if (s.diaAtual && s.diaAtual < hoje) {
    const anterior = calcularStatusDia(s.tarefas);
    if (anterior !== 'vazia' || !historicoDias[s.diaAtual]) historicoDias[s.diaAtual] = anterior;
  }
  return {
    historicoDias,
    diaAtual: hoje,
    premiadasHoje: [],
    tarefas: s.tarefas.map((t) => ({ ...t, status: 'pendente' as StatusTarefa })),
  };
}
