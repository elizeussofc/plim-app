/**
 * Resumo da semana: junta o que a pessoa registrou no Plim nos últimos 7 dias, compara com os
 * 7 anteriores e escolhe um destaque, um ponto de atenção e um conselho.
 * Só lógica, sem tela, para ter teste (tests/resumo.test.mjs).
 *
 * Regra de tom: o resumo descreve a semana, não julga a pessoa. Semana parada vira
 * "por onde recomeçar", nunca cobrança.
 */

export interface DadosDaSemana {
  hoje: string;
  /** Histórico da rotina: dia → 'vazia' | 'parcial' | 'completa'. */
  rotina: Record<string, string>;
  /** Minutos de foco e missões cumpridas por dia. */
  atividade: Record<string, { foco?: number; missoes?: number }>;
  humor: { data: string; humor: number }[];
  treinos: { data: string }[];
  noites: { data: string; minutos: number; qualidade: number }[];
  metaDeSonoMin: number;
  estudos: { data: string; minutos: number }[];
  /** Dia em que cada tarefa de casa foi feita pela última vez. */
  casa: string[];
  financas: { data: string; tipo: 'gasto' | 'ganho'; valor: number; categoria: string }[];
}

export type AreaId = 'rotina' | 'foco' | 'missoes' | 'treino' | 'sono' | 'estudos' | 'casa' | 'humor' | 'dinheiro';

export interface Area {
  id: AreaId;
  nome: string;
  icone: string;
  /** O número principal, já escrito ("5 de 7 dias"). */
  valor: string;
  /** Uma medida para comparar semanas (dias, minutos, treinos...). */
  medida: number;
  /** A mesma medida na semana anterior; null se não havia registro. */
  antes: number | null;
  /** De 0 a 1: quão perto de uma semana boa. Usado só para escolher destaque e atenção. */
  nota: number;
  rota: string;
}

export interface Conselho { titulo: string; texto: string; rota: string; acao: string }

export interface Resumo {
  de: string;
  ate: string;
  /** Só as áreas com registro nesta semana. */
  areas: Area[];
  /** Áreas sem nenhum registro na semana, para convidar. */
  semRegistro: { id: AreaId; nome: string; rota: string }[];
  destaque: string | null;
  atencao: string | null;
  conselho: Conselho;
  /** A semana teve registro em pelo menos 3 áreas ou 4 dias de rotina. */
  movimentada: boolean;
  /** O resumo em texto para a Plim IA ler. Nunca inclui dinheiro. */
  paraAIA: string;
}

const dois = (n: number) => String(n).padStart(2, '0');
function diasAntes(base: string, dias: number): string {
  const [a, m, d] = base.split('-').map(Number);
  const x = new Date(a, m - 1, d - dias);
  return `${x.getFullYear()}-${dois(x.getMonth() + 1)}-${dois(x.getDate())}`;
}
const tempo = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? dois(min % 60) : ''}` : `${min} min`);
const reais = (centavos: number) => `R$ ${Math.round(centavos / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const NOMES: Record<AreaId, { nome: string; icone: string; rota: string }> = {
  rotina: { nome: 'Rotina', icone: 'rotina', rota: '/(tabs)/rotina' },
  foco: { nome: 'Foco', icone: 'alvo', rota: '/sessao-foco' },
  missoes: { nome: 'Trilhas', icone: 'placa', rota: '/trilhas' },
  treino: { nome: 'Treino', icone: 'trilha-corpo', rota: '/gym' },
  sono: { nome: 'Sono', icone: 'sono-cama', rota: '/sono' },
  estudos: { nome: 'Estudos', icone: 'estudo-caderno', rota: '/estudos' },
  casa: { nome: 'Casa', icone: 'casa-vassoura', rota: '/casa' },
  humor: { nome: 'Humor', icone: 'humor-4', rota: '/(tabs)' },
  dinheiro: { nome: 'Dinheiro', icone: 'fin-cofre', rota: '/financas' },
};

interface Medidas {
  diasAtivos: number; diasCompletos: number; foco: number; missoes: number; treinos: number;
  noites: number; sonoMedio: number; estudo: number; casa: number; humorMedio: number; humores: number;
  gastou: number; ganhou: number; guardou: number; lancamentos: number;
}

function medir(d: DadosDaSemana, ate: string): Medidas {
  const de = diasAntes(ate, 6);
  const dentro = (data: string) => data >= de && data <= ate;
  const dias = Array.from({ length: 7 }, (_, i) => diasAntes(ate, i));
  const noites = d.noites.filter((n) => dentro(n.data));
  const humores = d.humor.filter((h) => dentro(h.data));
  const fin = d.financas.filter((l) => dentro(l.data));
  const soma = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  return {
    diasAtivos: dias.filter((x) => d.rotina[x] === 'parcial' || d.rotina[x] === 'completa').length,
    diasCompletos: dias.filter((x) => d.rotina[x] === 'completa').length,
    foco: soma(dias.map((x) => d.atividade[x]?.foco ?? 0)),
    missoes: soma(dias.map((x) => d.atividade[x]?.missoes ?? 0)),
    treinos: d.treinos.filter((t) => dentro(t.data)).length,
    noites: noites.length,
    sonoMedio: noites.length ? Math.round(soma(noites.map((n) => n.minutos)) / noites.length) : 0,
    estudo: soma(d.estudos.filter((e) => dentro(e.data)).map((e) => e.minutos)),
    casa: d.casa.filter(dentro).length,
    humorMedio: humores.length ? Math.round((soma(humores.map((h) => h.humor)) / humores.length) * 10) / 10 : 0,
    humores: humores.length,
    gastou: soma(fin.filter((l) => l.tipo === 'gasto' && l.categoria !== 'guardado').map((l) => l.valor)),
    ganhou: soma(fin.filter((l) => l.tipo === 'ganho').map((l) => l.valor)),
    guardou: soma(fin.filter((l) => l.tipo === 'gasto' && l.categoria === 'guardado').map((l) => l.valor)),
    lancamentos: fin.length,
  };
}

const HUMORES = ['', 'péssimo', 'ruim', 'ok', 'bem', 'ótimo'];

export function montarResumo(d: DadosDaSemana): Resumo {
  const ate = d.hoje;
  const de = diasAntes(ate, 6);
  const m = medir(d, ate);
  const a = medir(d, diasAntes(ate, 7));
  const alvoSono = Math.max(1, d.metaDeSonoMin);

  const todas: (Area & { tem: boolean })[] = [
    { id: 'rotina', ...NOMES.rotina, valor: `${m.diasAtivos} de 7 dias${m.diasCompletos ? ` · ${plural(m.diasCompletos, 'completo', 'completos')}` : ''}`, medida: m.diasAtivos, antes: a.diasAtivos || null, nota: m.diasAtivos / 7, tem: m.diasAtivos > 0 },
    { id: 'foco', ...NOMES.foco, valor: tempo(m.foco), medida: m.foco, antes: a.foco || null, nota: Math.min(1, m.foco / 120), tem: m.foco > 0 },
    { id: 'missoes', ...NOMES.missoes, valor: plural(m.missoes, 'missão cumprida', 'missões cumpridas'), medida: m.missoes, antes: a.missoes || null, nota: Math.min(1, m.missoes / 5), tem: m.missoes > 0 },
    { id: 'treino', ...NOMES.treino, valor: plural(m.treinos, 'treino', 'treinos'), medida: m.treinos, antes: a.treinos || null, nota: Math.min(1, m.treinos / 3), tem: m.treinos > 0 },
    { id: 'sono', ...NOMES.sono, valor: `${tempo(m.sonoMedio)} por noite · ${plural(m.noites, 'noite', 'noites')}`, medida: m.sonoMedio, antes: a.noites ? a.sonoMedio : null, nota: Math.min(1, m.sonoMedio / alvoSono), tem: m.noites > 0 },
    { id: 'estudos', ...NOMES.estudos, valor: tempo(m.estudo), medida: m.estudo, antes: a.estudo || null, nota: Math.min(1, m.estudo / 150), tem: m.estudo > 0 },
    { id: 'casa', ...NOMES.casa, valor: plural(m.casa, 'tarefa de casa', 'tarefas de casa'), medida: m.casa, antes: null, nota: Math.min(1, m.casa / 7), tem: m.casa > 0 },
    { id: 'humor', ...NOMES.humor, valor: `na média, ${HUMORES[Math.round(m.humorMedio)] || 'ok'}`, medida: m.humorMedio, antes: a.humores ? a.humorMedio : null, nota: m.humorMedio / 5, tem: m.humores > 0 },
    { id: 'dinheiro', ...NOMES.dinheiro, valor: `gastou ${reais(m.gastou)}${m.ganhou ? ` · entrou ${reais(m.ganhou)}` : ''}${m.guardou ? ` · guardou ${reais(m.guardou)}` : ''}`, medida: m.gastou, antes: a.lancamentos ? a.gastou : null, nota: m.ganhou > 0 ? Math.max(0, Math.min(1, 1 - (m.gastou - m.ganhou) / m.ganhou)) : 0.5, tem: m.lancamentos > 0 },
  ];
  const areas: Area[] = todas.filter((x) => x.tem).map(({ tem: _tem, ...resto }) => resto);
  const semRegistro = todas.filter((x) => !x.tem && x.id !== 'humor' && x.id !== 'missoes').map((x) => ({ id: x.id, nome: x.nome, rota: x.rota }));

  // Destaque: a área com a melhor nota. O dinheiro não concorre ("gastar pouco" não é mérito por si só),
  // e sono abaixo de 7 horas também não: noite curta não é "o melhor da semana".
  const sonoCurto = m.noites > 0 && m.sonoMedio < 7 * 60;
  const melhor = areas.filter((x) => x.id !== 'dinheiro' && x.id !== 'humor' && !(x.id === 'sono' && sonoCurto)).sort((x, y) => y.nota - x.nota)[0];
  const destaque = !melhor ? (m.noites ? `Você anotou ${plural(m.noites, 'noite', 'noites')} de sono. Enxergar o padrão é o primeiro passo.` : null)
    : melhor.id === 'rotina' ? `Você cuidou da rotina em ${m.diasAtivos} de 7 dias.`
    : melhor.id === 'foco' ? `Foram ${tempo(m.foco)} de foco de verdade.`
    : melhor.id === 'missoes' ? `${plural(m.missoes, 'missão cumprida', 'missões cumpridas')} nas trilhas.`
    : melhor.id === 'treino' ? `${plural(m.treinos, 'treino feito', 'treinos feitos')} na semana.`
    : melhor.id === 'sono' ? `Média de ${tempo(m.sonoMedio)} de sono por noite.`
    : melhor.id === 'estudos' ? `${tempo(m.estudo)} de estudo com o cronômetro.`
    : `${plural(m.casa, 'tarefa de casa resolvida', 'tarefas de casa resolvidas')}.`;

  // Atenção: o que mais caiu em relação à semana anterior, ou o que está abaixo do saudável.
  let atencao: string | null = null;
  if (m.noites >= 3 && m.sonoMedio < 7 * 60) atencao = `Você dormiu em média ${tempo(m.sonoMedio)} por noite, abaixo das 7 horas recomendadas para adultos.`;
  else if (m.ganhou > 0 && m.gastou > m.ganhou) atencao = `Saiu mais dinheiro do que entrou: ${reais(m.gastou - m.ganhou)} de diferença.`;
  else {
    const quedas = areas.filter((x) => x.antes !== null && x.id !== 'dinheiro' && x.antes > 0 && x.medida < x.antes * 0.6).sort((x, y) => x.medida / (x.antes as number) - y.medida / (y.antes as number));
    if (quedas[0]) atencao = `${quedas[0].nome} caiu em relação à semana anterior. Acontece; vale olhar o que mudou.`;
    else if (a.diasAtivos >= 3 && m.diasAtivos === 0) atencao = 'A rotina ficou parada esta semana, depois de uma semana com movimento.';
  }

  const conselho: Conselho =
    m.noites >= 3 && m.sonoMedio < 7 * 60 ? { titulo: 'Meia hora mais cedo', texto: 'Por três noites seguidas, comece o ritual de desligar 30 minutos antes. Sono é o que segura o resto.', rota: '/sono', acao: 'Abrir o Sono' }
    : m.diasAtivos <= 2 ? { titulo: 'Uma tarefa só', texto: 'Escolha a tarefa mais fácil da rotina e faça só ela amanhã. Um dia com uma coisa feita já não é dia em branco.', rota: '/(tabs)/rotina', acao: 'Abrir a rotina' }
    : m.ganhou > 0 && m.gastou > m.ganhou ? { titulo: 'Olhe a maior categoria', texto: 'Nas Finanças, veja onde foi a maior parte do gasto. É nela que um corte pequeno aparece mais.', rota: '/financas', acao: 'Abrir as Finanças' }
    : m.foco === 0 ? { titulo: 'Quinze minutos de foco', texto: 'Esta semana, teste uma sessão curta: uma coisa só, relógio rodando, celular virado para baixo.', rota: '/sessao-foco', acao: 'Começar uma sessão' }
    : m.noites === 0 ? { titulo: 'Anote três noites', texto: 'Você ainda não anotou o sono. Três noites já mostram se o cansaço vem dele.', rota: '/sono', acao: 'Abrir o Sono' }
    : { titulo: 'Repita o que funcionou', texto: `${destaque ?? 'A semana teve movimento.'} Mantenha o mesmo horário e o mesmo lugar: repetir é mais fácil do que recomeçar.`, rota: melhor?.rota ?? '/(tabs)', acao: 'Continuar' };

  const paraAIA = [
    `Resumo dos meus últimos 7 dias no Plim (de ${de} a ${ate}).`,
    `Rotina: tarefa feita em ${m.diasAtivos} de 7 dias, ${m.diasCompletos} completos (semana anterior: ${a.diasAtivos}).`,
    `Foco: ${m.foco} minutos (anterior: ${a.foco}). Missões cumpridas: ${m.missoes}.`,
    `Treinos: ${m.treinos} (anterior: ${a.treinos}).`,
    m.noites ? `Sono: média de ${tempo(m.sonoMedio)} em ${m.noites} noites anotadas; meta de ${tempo(alvoSono)}.` : 'Sono: não anotei.',
    `Estudo: ${m.estudo} minutos. Tarefas de casa feitas: ${m.casa}.`,
    m.humores ? `Humor médio: ${String(m.humorMedio).replace('.', ',')} de 5.` : 'Humor: não registrei.',
    'Em até 4 frases curtas e em português: diga o que foi bem, um ponto de atenção e UM passo pequeno para a próxima semana. Sem diagnóstico e sem lista longa.',
  ].join('\n');

  return { de, ate, areas, semRegistro, destaque, atencao, conselho, movimentada: areas.length >= 3 || m.diasAtivos >= 4, paraAIA };
}

/** Subiu, caiu ou ficou igual em relação à semana anterior. Para o sono e o humor, mais é melhor; para o dinheiro, menos gasto é melhor. */
export function tendencia(a: Area): { seta: '↑' | '↓' | '='; boa: boolean } | null {
  if (a.antes === null) return null;
  const diferenca = a.medida - a.antes;
  const limiar = a.id === 'humor' ? 0.3 : Math.max(1, a.antes * 0.1);
  if (Math.abs(diferenca) < limiar) return { seta: '=', boa: true };
  const subiu = diferenca > 0;
  return { seta: subiu ? '↑' : '↓', boa: a.id === 'dinheiro' ? !subiu : subiu };
}

/** "20/11 a 26/11". */
export function periodo(r: Pick<Resumo, 'de' | 'ate'>): string {
  const curta = (data: string) => `${data.slice(8)}/${data.slice(5, 7)}`;
  return `${curta(r.de)} a ${curta(r.ate)}`;
}
