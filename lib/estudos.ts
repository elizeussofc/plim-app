/**
 * Estudos do Plim: revisão espaçada com teste de memória e o cronômetro por matéria.
 * Só lógica, sem tela, para ter teste (tests/estudos.test.mjs).
 *
 * As duas técnicas mais bem avaliadas pela pesquisa (Dunlosky e colegas, 2013) são
 * testar a si mesmo e espalhar o estudo no tempo. É o que esta parte faz: cada tópico
 * volta em intervalos que crescem, e a pessoa tenta lembrar antes de conferir.
 * Fontes em docs/estudos/PESQUISA.md.
 */

/** Dias até a próxima revisão, a cada vez que a pessoa lembra. Escada prática, não fórmula. */
export const DEGRAUS = [1, 3, 7, 14, 30, 60];

export type TintaMateria = 'roxo' | 'laranja' | 'verde' | 'azul' | 'rosa' | 'ouro';
export const TINTAS_MATERIA: TintaMateria[] = ['roxo', 'laranja', 'verde', 'azul', 'rosa', 'ouro'];

export interface Materia {
  id: string;
  nome: string;
  tinta: TintaMateria;
  /** Dia da prova ('AAAA-MM-DD'), se houver. */
  prova?: string;
}

export interface Topico {
  id: string;
  materiaId: string;
  nome: string;
  criado: string;
  /** Quantas vezes seguidas a pessoa lembrou: decide o próximo intervalo. */
  degrau: number;
  /** Dia da próxima revisão. */
  proxima: string;
  revisoes: number;
}

export interface Sessao {
  id: string;
  materiaId: string | null;
  data: string;
  minutos: number;
}

export type Resposta = 'lembrei' | 'quase' | 'esqueci';

export const GRATIS_ESTUDOS = { materias: 2, topicos: 15 };
export const TEMPOS_DE_ESTUDO = [15, 25, 40, 50];

const dois = (n: number) => String(n).padStart(2, '0');
const partes = (data: string) => data.split('-').map(Number) as [number, number, number];

/** A data `dias` dias depois de `base` ('AAAA-MM-DD'). */
export function somarDias(base: string, dias: number): string {
  const [a, m, d] = partes(base);
  const x = new Date(a, m - 1, d + dias);
  return `${x.getFullYear()}-${dois(x.getMonth() + 1)}-${dois(x.getDate())}`;
}

/** Quantos dias de `de` até `ate` (negativo se `ate` já passou). */
export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = partes(de);
  const [a2, m2, d2] = partes(ate);
  return Math.round((new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86_400_000);
}

/** Entende "25/12", "25/12/2026" ou "25-12-26". Sem ano, usa o próximo dia assim a partir de hoje. */
export function lerData(texto: string, hoje: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  let ano = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : partes(hoje)[0];
  const valida = (a: number) => { const x = new Date(a, mes - 1, dia); return x.getMonth() === mes - 1 && x.getDate() === dia; };
  if (mes < 1 || mes > 12 || dia < 1 || !valida(ano)) return null;
  let data = `${ano}-${dois(mes)}-${dois(dia)}`;
  if (!m[3] && data < hoje) { ano += 1; if (!valida(ano)) return null; data = `${ano}-${dois(mes)}-${dois(dia)}`; }
  return data;
}

/** "25/12/2026". */
export const dataBr = (data: string) => `${data.slice(8)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;

/** Tópico novo: a primeira revisão é amanhã. */
export function novoTopico(id: string, nome: string, materiaId: string, hoje: string): Topico {
  return { id, materiaId, nome: nome.trim().slice(0, 80), criado: hoje, degrau: 0, proxima: somarDias(hoje, DEGRAUS[0]), revisoes: 0 };
}

/**
 * Marca a revisão e agenda a próxima.
 * Lembrou: sobe um degrau (o intervalo cresce). Quase: repete o mesmo intervalo.
 * Esqueceu: volta ao começo e revisa amanhã.
 * Com prova marcada, nenhuma revisão cai depois da véspera: a última fica para o dia anterior.
 */
export function revisar(t: Topico, resposta: Resposta, hoje: string, prova?: string): Topico {
  const degrau = resposta === 'lembrei' ? t.degrau + 1 : resposta === 'quase' ? t.degrau : 0;
  const intervalo = resposta === 'esqueci' ? 1 : DEGRAUS[Math.min(degrau, DEGRAUS.length - 1)];
  let proxima = somarDias(hoje, intervalo);
  if (prova && prova > hoje) {
    const vespera = somarDias(prova, -1);
    if (proxima > vespera) proxima = vespera > hoje ? vespera : somarDias(hoje, 1);
  }
  return { ...t, degrau, proxima, revisoes: t.revisoes + 1 };
}

/** Em quantos dias o tópico volta depois de cada resposta, para mostrar no botão. */
export function previsao(t: Topico, hoje: string, prova?: string): Record<Resposta, number> {
  const dias = (r: Resposta) => diasEntre(hoje, revisar(t, r, hoje, prova).proxima);
  return { lembrei: dias('lembrei'), quase: dias('quase'), esqueci: dias('esqueci') };
}

/** Tópico que a pessoa já lembrou em todos os degraus: está firme. */
export const firme = (t: Topico) => t.degrau >= DEGRAUS.length;

/** O que revisar hoje, do mais atrasado para o mais recente. */
export function paraHoje(topicos: Topico[], hoje: string): Topico[] {
  return topicos.filter((t) => t.proxima <= hoje).sort((a, b) => (a.proxima < b.proxima ? -1 : a.proxima > b.proxima ? 1 : 0));
}

/** Quantas revisões caem em cada um dos próximos `dias` dias (sem contar hoje). */
export function proximosDias(topicos: Topico[], hoje: string, dias = 7): { data: string; quantos: number }[] {
  return Array.from({ length: dias }, (_, i) => {
    const data = somarDias(hoje, i + 1);
    return { data, quantos: topicos.filter((t) => t.proxima === data).length };
  });
}

/** Minutos estudados em cada um dos últimos 7 dias, do mais antigo para hoje. */
export function minutosDaSemana(sessoes: Sessao[], hoje: string): { data: string; minutos: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(hoje, i - 6);
    return { data, minutos: sessoes.filter((s) => s.data === data).reduce((soma, s) => soma + s.minutos, 0) };
  });
}

/** Total de minutos dos últimos 7 dias por matéria, do maior para o menor. */
export function minutosPorMateria(sessoes: Sessao[], materias: Materia[], hoje: string): { materia: Materia | null; minutos: number }[] {
  const desde = somarDias(hoje, -6);
  const soma = new Map<string | null, number>();
  for (const s of sessoes) if (s.data >= desde && s.data <= hoje) soma.set(s.materiaId, (soma.get(s.materiaId) ?? 0) + s.minutos);
  return [...soma.entries()]
    .map(([id, minutos]) => ({ materia: materias.find((m) => m.id === id) ?? null, minutos }))
    .sort((a, b) => b.minutos - a.minutos);
}

/** Dias seguidos com estudo. Hoje ainda sem estudo não quebra a sequência. */
export function sequenciaDeEstudo(sessoes: Sessao[], hoje: string): number {
  const dias = new Set(sessoes.filter((s) => s.minutos > 0).map((s) => s.data));
  let cursor = dias.has(hoje) ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (dias.has(cursor) && n < 3650) { n += 1; cursor = somarDias(cursor, -1); }
  return n;
}

export interface PlanoDaProva {
  dias: number;
  /** Tópicos da matéria que ainda não estão firmes. */
  abertos: number;
  /** Quantas revisões por dia para passar por todos pelo menos duas vezes antes da prova. */
  porDia: number;
  texto: string;
}

/** Quanto revisar por dia até a prova (Pro). Devolve null se a matéria não tem prova no futuro. */
export function planoDaProva(materia: Materia, topicos: Topico[], hoje: string): PlanoDaProva | null {
  if (!materia.prova) return null;
  const dias = diasEntre(hoje, materia.prova);
  if (dias < 0) return null;
  const abertos = topicos.filter((t) => t.materiaId === materia.id && !firme(t)).length;
  if (dias === 0) return { dias, abertos, porDia: abertos, texto: 'A prova é hoje. Uma passada rápida no que você mais erra, e confie no que estudou.' };
  const porDia = abertos === 0 ? 0 : Math.max(1, Math.ceil((abertos * 2) / dias));
  const texto = abertos === 0
    ? `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}. Cadastre os tópicos da prova para o Plim espalhar as revisões.`
    : `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'} e ${abertos} ${abertos === 1 ? 'tópico' : 'tópicos'}. Com ${porDia} ${porDia === 1 ? 'revisão' : 'revisões'} por dia você passa por tudo duas vezes antes da prova.`;
  return { dias, abertos, porDia, texto };
}

/** Quantos tópicos há em cada fase: novos (nunca lembrados), firmando e firmes. */
export function fases(topicos: Topico[]): { novos: number; firmando: number; firmes: number } {
  return {
    novos: topicos.filter((t) => t.degrau === 0).length,
    firmando: topicos.filter((t) => t.degrau > 0 && !firme(t)).length,
    firmes: topicos.filter(firme).length,
  };
}

/** XP de uma sessão de estudo: um ponto por minuto, até 50. */
export const xpDaSessao = (minutos: number) => Math.min(50, Math.max(0, Math.round(minutos)));

export const COMO_ESTUDAR = [
  { titulo: 'Tente lembrar antes de olhar', texto: 'Fechar o caderno e puxar da memória fixa mais do que reler. É por isso que o Plim pergunta se você lembrou.' },
  { titulo: 'Espalhe em vez de amontoar', texto: 'Quatro revisões curtas em dias diferentes valem mais do que uma tarde inteira na véspera.' },
  { titulo: 'Um tópico é uma pergunta', texto: 'Cadastre do tamanho de uma pergunta: "O que é mitose?" funciona melhor do que "Biologia, capítulo 3".' },
  { titulo: 'Esquecer faz parte', texto: 'Errar na revisão não é perder tempo. O tópico volta amanhã e fica mais firme.' },
];
