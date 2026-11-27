/**
 * Casa do Plim: limpeza por cômodo em pedaços pequenos, cardápio da semana e lista de mercado.
 * Só lógica, sem tela, para ter teste (tests/casa.test.mjs).
 *
 * A ideia central é para quem trava diante da casa inteira: cada tarefa tem uma frequência,
 * o Plim sabe o que está mais atrasado e monta uma "faxina relâmpago" que cabe no tempo
 * que a pessoa tem agora.
 */

export interface TarefaCasa {
  id: string;
  comodoId: string;
  nome: string;
  /** De quantos em quantos dias a tarefa volta. */
  cadaDias: number;
  minutos: number;
  /** Último dia em que foi feita ('AAAA-MM-DD'). */
  ultima?: string;
}

export interface Comodo {
  id: string;
  nome: string;
  icone: string;
}

interface ModeloDeComodo extends Comodo { tarefas: { nome: string; cadaDias: number; minutos: number }[] }

/** Cômodos prontos, com as tarefas mais comuns e uma frequência razoável para começar. */
export const COMODOS_PRONTOS: ModeloDeComodo[] = [
  { id: 'cozinha', nome: 'Cozinha', icone: 'casa-cozinha', tarefas: [
    { nome: 'Lavar a louça', cadaDias: 1, minutos: 10 },
    { nome: 'Passar pano na pia e no fogão', cadaDias: 1, minutos: 5 },
    { nome: 'Tirar o lixo', cadaDias: 2, minutos: 3 },
    { nome: 'Varrer o chão', cadaDias: 3, minutos: 5 },
    { nome: 'Limpar a geladeira por dentro', cadaDias: 30, minutos: 20 },
  ] },
  { id: 'banheiro', nome: 'Banheiro', icone: 'casa-banheiro', tarefas: [
    { nome: 'Limpar o vaso', cadaDias: 7, minutos: 5 },
    { nome: 'Limpar a pia e o espelho', cadaDias: 7, minutos: 5 },
    { nome: 'Lavar o box', cadaDias: 14, minutos: 15 },
    { nome: 'Trocar as toalhas', cadaDias: 4, minutos: 2 },
  ] },
  { id: 'quarto', nome: 'Quarto', icone: 'sono-cama', tarefas: [
    { nome: 'Arrumar a cama', cadaDias: 1, minutos: 2 },
    { nome: 'Guardar a roupa espalhada', cadaDias: 2, minutos: 5 },
    { nome: 'Trocar a roupa de cama', cadaDias: 7, minutos: 10 },
    { nome: 'Tirar o pó e varrer', cadaDias: 7, minutos: 10 },
  ] },
  { id: 'sala', nome: 'Sala', icone: 'casa-sala', tarefas: [
    { nome: 'Recolher o que está fora do lugar', cadaDias: 1, minutos: 5 },
    { nome: 'Tirar o pó dos móveis', cadaDias: 7, minutos: 10 },
    { nome: 'Varrer ou aspirar', cadaDias: 4, minutos: 10 },
  ] },
  { id: 'lavanderia', nome: 'Lavanderia', icone: 'casa-lavanderia', tarefas: [
    { nome: 'Colocar roupa para lavar', cadaDias: 3, minutos: 5 },
    { nome: 'Estender ou recolher a roupa', cadaDias: 3, minutos: 10 },
    { nome: 'Dobrar e guardar', cadaDias: 3, minutos: 15 },
  ] },
  { id: 'quintal', nome: 'Quintal e plantas', icone: 'casa-quintal', tarefas: [
    { nome: 'Regar as plantas', cadaDias: 3, minutos: 5 },
    { nome: 'Varrer a área', cadaDias: 7, minutos: 10 },
  ] },
];

export const GRATIS_CASA = { comodos: 3 };
export const TEMPOS_DE_FAXINA = [10, 20, 30];

const dois = (n: number) => String(n).padStart(2, '0');
function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86_400_000);
}

/**
 * Quanto a tarefa está pedindo para ser feita: 1 = venceu hoje, 2 = passou um ciclo inteiro.
 * Nunca feita conta como recém-vencida, para aparecer sem furar a fila do que está parado há mais tempo.
 */
export function urgencia(t: TarefaCasa, hoje: string): number {
  if (!t.ultima) return 1;
  return Math.max(0, diasEntre(t.ultima, hoje)) / Math.max(1, t.cadaDias);
}

export type EstadoTarefa = 'em-dia' | 'hoje' | 'passou';

/** Estado da tarefa e em quantos dias ela volta (negativo = há quantos dias venceu). */
export function estadoDaTarefa(t: TarefaCasa, hoje: string): { estado: EstadoTarefa; dias: number } {
  if (!t.ultima) return { estado: 'hoje', dias: 0 };
  const dias = t.cadaDias - Math.max(0, diasEntre(t.ultima, hoje));
  return { estado: dias > 0 ? 'em-dia' : dias === 0 ? 'hoje' : 'passou', dias };
}

/** "todo dia", "a cada 3 dias", "toda semana"... */
export function frequenciaTexto(cadaDias: number): string {
  if (cadaDias <= 1) return 'todo dia';
  if (cadaDias === 7) return 'toda semana';
  if (cadaDias === 14) return 'a cada 2 semanas';
  if (cadaDias === 30) return 'todo mês';
  return `a cada ${cadaDias} dias`;
}

/** Parte da casa que está em dia, de 0 a 1. Casa sem tarefa conta como em dia. */
export function casaEmDia(tarefas: TarefaCasa[], hoje: string): number {
  if (!tarefas.length) return 1;
  return tarefas.filter((t) => estadoDaTarefa(t, hoje).estado === 'em-dia').length / tarefas.length;
}

/**
 * Faxina relâmpago: as tarefas vencidas mais urgentes que cabem em `minutos`.
 * Sempre entra pelo menos uma (a mais urgente), mesmo que estoure um pouco o tempo:
 * melhor uma tarefa feita do que uma lista vazia.
 */
export function faxinaRelampago(tarefas: TarefaCasa[], hoje: string, minutos: number): TarefaCasa[] {
  const vencidas = tarefas
    .filter((t) => estadoDaTarefa(t, hoje).estado !== 'em-dia')
    .sort((a, b) => urgencia(b, hoje) - urgencia(a, hoje) || a.minutos - b.minutos);
  const escolhidas: TarefaCasa[] = [];
  let resta = minutos;
  for (const t of vencidas) {
    if (t.minutos <= resta) { escolhidas.push(t); resta -= t.minutos; }
  }
  if (!escolhidas.length && vencidas.length) escolhidas.push(vencidas[0]);
  return escolhidas;
}

/** XP de uma tarefa de casa: mais para as mais demoradas, até 10. */
export const xpDaTarefa = (minutos: number) => Math.min(10, Math.max(2, Math.round(minutos / 2)));

// ───────────────────────── Cardápio ─────────────────────────

export const DIAS_DA_SEMANA = [
  { id: 'seg', nome: 'Segunda' }, { id: 'ter', nome: 'Terça' }, { id: 'qua', nome: 'Quarta' }, { id: 'qui', nome: 'Quinta' },
  { id: 'sex', nome: 'Sexta' }, { id: 'sab', nome: 'Sábado' }, { id: 'dom', nome: 'Domingo' },
] as const;
export const REFEICOES = [{ id: 'almoco', nome: 'Almoço' }, { id: 'jantar', nome: 'Jantar' }] as const;
export type DiaId = typeof DIAS_DA_SEMANA[number]['id'];
export type RefeicaoId = typeof REFEICOES[number]['id'];

/** O que a pessoa planejou: chave 'seg-almoco' → nome do prato. */
export type Cardapio = Record<string, string>;
export const chaveDoCardapio = (dia: DiaId, refeicao: RefeicaoId) => `${dia}-${refeicao}`;

export interface Prato {
  nome: string;
  ingredientes: string[];
  /** Pratos leves vão melhor no jantar; os de panela, no almoço. */
  leve?: boolean;
}

/** Pratos simples do dia a dia, com o que comprar para cada um. Arroz, feijão, óleo, sal e alho ficam de fora: são de casa. */
export const PRATOS: Prato[] = [
  { nome: 'Frango grelhado com legumes', ingredientes: ['Peito de frango', 'Cenoura', 'Abobrinha', 'Cebola'] },
  { nome: 'Carne moída com batata', ingredientes: ['Carne moída', 'Batata', 'Tomate', 'Cebola'] },
  { nome: 'Macarrão ao molho de tomate', ingredientes: ['Macarrão', 'Molho de tomate', 'Queijo ralado', 'Cebola'] },
  { nome: 'Omelete com salada', ingredientes: ['Ovos', 'Queijo', 'Alface', 'Tomate'], leve: true },
  { nome: 'Peixe assado com batata', ingredientes: ['Filé de peixe', 'Batata', 'Limão', 'Cebola'] },
  { nome: 'Strogonoff de frango', ingredientes: ['Peito de frango', 'Creme de leite', 'Molho de tomate', 'Batata palha', 'Cebola'] },
  { nome: 'Sopa de legumes', ingredientes: ['Batata', 'Cenoura', 'Chuchu', 'Macarrão para sopa', 'Cebola'], leve: true },
  { nome: 'Bife acebolado', ingredientes: ['Bife', 'Cebola', 'Alface', 'Tomate'] },
  { nome: 'Frango ensopado com quiabo', ingredientes: ['Coxa e sobrecoxa de frango', 'Quiabo', 'Tomate', 'Cebola'] },
  { nome: 'Escondidinho de carne moída', ingredientes: ['Carne moída', 'Mandioca', 'Queijo', 'Leite'] },
  { nome: 'Panqueca de carne', ingredientes: ['Carne moída', 'Farinha de trigo', 'Ovos', 'Leite', 'Molho de tomate'] },
  { nome: 'Sanduíche natural de frango', ingredientes: ['Pão integral', 'Peito de frango', 'Cenoura', 'Alface', 'Requeijão'], leve: true },
  { nome: 'Arroz de forno', ingredientes: ['Presunto', 'Queijo', 'Milho', 'Ervilha', 'Creme de leite'] },
  { nome: 'Linguiça com mandioca', ingredientes: ['Linguiça', 'Mandioca', 'Cebola', 'Couve'] },
  { nome: 'Salada completa com atum', ingredientes: ['Atum', 'Alface', 'Tomate', 'Ovos', 'Milho'], leve: true },
  { nome: 'Feijão tropeiro', ingredientes: ['Linguiça', 'Bacon', 'Ovos', 'Couve', 'Farinha de mandioca'] },
  { nome: 'Legumes refogados com ovo', ingredientes: ['Ovos', 'Abobrinha', 'Cenoura', 'Brócolis', 'Cebola'], leve: true },
  { nome: 'Carne de panela com legumes', ingredientes: ['Carne para panela', 'Batata', 'Cenoura', 'Cebola', 'Tomate'] },
  { nome: 'Cuscuz com ovo e queijo', ingredientes: ['Flocão de milho', 'Ovos', 'Queijo', 'Tomate'], leve: true },
  { nome: 'Tapioca com frango', ingredientes: ['Goma de tapioca', 'Peito de frango', 'Queijo', 'Tomate'], leve: true },
  { nome: 'Lasanha de presunto e queijo', ingredientes: ['Massa de lasanha', 'Presunto', 'Queijo', 'Molho de tomate', 'Leite'] },
  { nome: 'Caldo de feijão com torrada', ingredientes: ['Bacon', 'Pão', 'Cebola', 'Cheiro-verde'], leve: true },
];

/** Embaralha de um jeito que se repete com a mesma semente (para "sugerir de novo" mudar e o teste ser fixo). */
function embaralhar<T>(lista: T[], semente: number): T[] {
  const a = [...lista];
  let s = (semente >>> 0) || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sugere a semana inteira sem repetir prato: almoço com os de panela, jantar com os leves.
 * O que a pessoa já escreveu fica como está; só os espaços vazios são preenchidos.
 */
export function sugerirSemana(atual: Cardapio, semente: number, pratos: Prato[] = PRATOS): Cardapio {
  const usados = new Set(Object.values(atual).map((v) => v.trim().toLowerCase()).filter(Boolean));
  const fila = (leve: boolean) => embaralhar(pratos.filter((p) => !!p.leve === leve && !usados.has(p.nome.toLowerCase())), semente + (leve ? 7 : 0));
  const filas: Record<RefeicaoId, Prato[]> = { almoco: fila(false), jantar: fila(true) };
  const novo: Cardapio = { ...atual };
  for (const dia of DIAS_DA_SEMANA) {
    for (const refeicao of REFEICOES) {
      const chave = chaveDoCardapio(dia.id, refeicao.id);
      if (novo[chave]?.trim()) continue;
      const prato = filas[refeicao.id].shift() ?? filas[refeicao.id === 'almoco' ? 'jantar' : 'almoco'].shift();
      if (prato) novo[chave] = prato.nome;
    }
  }
  return novo;
}

/** Quantas refeições da semana já têm prato. */
export const refeicoesPlanejadas = (c: Cardapio) => Object.values(c).filter((v) => v.trim()).length;

// ───────────────────────── Lista de mercado ─────────────────────────

export interface ItemDaLista {
  id: string;
  nome: string;
  marcado: boolean;
  /** Veio do cardápio (true) ou a pessoa escreveu (false). */
  doCardapio: boolean;
}

export const SECOES = ['Hortifrúti', 'Carnes e ovos', 'Laticínios e frios', 'Padaria', 'Mercearia', 'Outros'] as const;
export type Secao = typeof SECOES[number];

const PALAVRAS: [Secao, string[]][] = [
  ['Hortifrúti', ['cenoura', 'abobrinha', 'cebola', 'batata', 'tomate', 'alface', 'limao', 'chuchu', 'quiabo', 'mandioca', 'couve', 'brocolis', 'cheiro-verde', 'banana', 'maca', 'laranja', 'alho', 'fruta', 'verdura', 'legume', 'pepino', 'pimentao', 'abobora', 'mamao', 'uva', 'melancia', 'morango', 'salsa', 'coentro', 'repolho', 'beterraba']],
  ['Carnes e ovos', ['frango', 'carne', 'bife', 'peixe', 'linguica', 'bacon', 'ovo', 'atum', 'sardinha', 'costela', 'file', 'salsicha', 'hamburguer']],
  ['Laticínios e frios', ['queijo', 'leite', 'creme de leite', 'requeijao', 'presunto', 'iogurte', 'manteiga', 'margarina', 'mussarela']],
  ['Padaria', ['pao', 'torrada', 'bolo', 'biscoito', 'bolacha']],
  ['Mercearia', ['macarrao', 'molho', 'farinha', 'milho', 'ervilha', 'massa', 'flocao', 'goma', 'tapioca', 'arroz', 'feijao', 'oleo', 'azeite', 'acucar', 'sal', 'cafe', 'batata palha', 'tempero', 'vinagre', 'aveia', 'granola', 'extrato', 'lentilha', 'grao', 'suco', 'refrigerante', 'agua', 'cha', 'achocolatado', 'maionese', 'ketchup', 'mostarda']],
];

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Em que corredor do mercado o item costuma ficar. O que o Plim não conhece vai para "Outros".
 * Frases conhecidas ("batata palha", "creme de leite") decidem primeiro. Depois vale a palavra
 * que aparece antes no nome: em "molho de tomate" quem manda é o molho, não o tomate.
 */
export function secaoDoItem(nome: string): Secao {
  const n = semAcento(nome);
  let melhor: { secao: Secao; onde: number } | null = null;
  for (const [secao, palavras] of PALAVRAS) {
    for (const p of palavras) {
      if (p.includes(' ')) { if (n.includes(p)) return secao; continue; }
      const achou = new RegExp(`(^|[^a-z])${p}(s|es)?($|[^a-z])`).exec(n);
      if (achou && (!melhor || achou.index < melhor.onde)) melhor = { secao, onde: achou.index };
    }
  }
  return melhor?.secao ?? 'Outros';
}

/** Os ingredientes de tudo que está no cardápio, sem repetir. Prato que o Plim não conhece não entra. */
export function ingredientesDoCardapio(cardapio: Cardapio, pratos: Prato[] = PRATOS): string[] {
  const vistos = new Map<string, string>();
  for (const nomeDoPrato of Object.values(cardapio)) {
    const prato = pratos.find((p) => semAcento(p.nome) === semAcento(nomeDoPrato));
    for (const ing of prato?.ingredientes ?? []) if (!vistos.has(semAcento(ing))) vistos.set(semAcento(ing), ing);
  }
  return [...vistos.values()];
}

/**
 * Junta os ingredientes do cardápio na lista: o que a pessoa escreveu fica, o que já
 * estava marcado continua marcado, e o que saiu do cardápio (e não foi marcado) sai da lista.
 */
export function puxarDoCardapio(lista: ItemDaLista[], ingredientes: string[], novoId: () => string): ItemDaLista[] {
  const querer = new Map(ingredientes.map((i) => [semAcento(i), i]));
  const mantidos = lista.filter((i) => !i.doCardapio || i.marcado || querer.has(semAcento(i.nome)));
  const jaTem = new Set(mantidos.map((i) => semAcento(i.nome)));
  const novos = [...querer.entries()].filter(([chave]) => !jaTem.has(chave)).map(([, nome]) => ({ id: novoId(), nome, marcado: false, doCardapio: true }));
  return [...mantidos, ...novos];
}

/** A lista separada por corredor, com o que falta comprar antes do que já foi pego. */
export function listaPorSecao(lista: ItemDaLista[]): { secao: Secao; itens: ItemDaLista[] }[] {
  return SECOES
    .map((secao) => ({ secao, itens: lista.filter((i) => secaoDoItem(i.nome) === secao).sort((a, b) => Number(a.marcado) - Number(b.marcado) || a.nome.localeCompare(b.nome, 'pt-BR')) }))
    .filter((g) => g.itens.length > 0);
}

/** A semana a que um dia pertence, pela data da segunda-feira ('AAAA-MM-DD'). */
export function segundaDaSemana(hoje: string): string {
  const [a, m, d] = hoje.split('-').map(Number);
  const x = new Date(a, m - 1, d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${dois(x.getMonth() + 1)}-${dois(x.getDate())}`;
}

/** Qual dia do cardápio é hoje. */
export function diaDeHoje(hoje: string): DiaId {
  const [a, m, d] = hoje.split('-').map(Number);
  return DIAS_DA_SEMANA[(new Date(a, m - 1, d).getDay() + 6) % 7].id;
}
