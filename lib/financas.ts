/**
 * Finanças do Plim: as contas que não dependem de tela (por isso têm teste).
 * Todo valor é guardado em centavos, em número inteiro, para a soma nunca errar por vírgula.
 * Fontes e limites do que o app ensina: docs/financas/PESQUISA.md.
 */

export type Tipo = 'gasto' | 'ganho';
/** Os três baldes do 50-30-20. */
export type Balde = 'necessidades' | 'desejos' | 'futuro';

export interface Categoria {
  id: string;
  nome: string;
  tipo: Tipo;
  icone: string;
  /** Só os gastos têm balde. */
  balde?: Balde;
}

export const CATEGORIAS: Categoria[] = [
  { id: 'moradia', nome: 'Moradia', tipo: 'gasto', icone: 'fin-casa', balde: 'necessidades' },
  { id: 'mercado', nome: 'Mercado', tipo: 'gasto', icone: 'fin-mercado', balde: 'necessidades' },
  { id: 'contas', nome: 'Luz, água e internet', tipo: 'gasto', icone: 'fin-luz', balde: 'necessidades' },
  { id: 'transporte', nome: 'Transporte', tipo: 'gasto', icone: 'fin-transporte', balde: 'necessidades' },
  { id: 'saude', nome: 'Saúde', tipo: 'gasto', icone: 'fin-saude', balde: 'necessidades' },
  { id: 'educacao', nome: 'Educação', tipo: 'gasto', icone: 'fin-educacao', balde: 'necessidades' },
  { id: 'lazer', nome: 'Lazer e comer fora', tipo: 'gasto', icone: 'fin-lazer', balde: 'desejos' },
  { id: 'assinaturas', nome: 'Assinaturas', tipo: 'gasto', icone: 'fin-assinatura', balde: 'desejos' },
  { id: 'compras', nome: 'Compras', tipo: 'gasto', icone: 'fin-cartao', balde: 'desejos' },
  { id: 'dividas', nome: 'Dívidas', tipo: 'gasto', icone: 'fin-divida', balde: 'futuro' },
  { id: 'guardado', nome: 'Guardei', tipo: 'gasto', icone: 'fin-cofre', balde: 'futuro' },
  { id: 'outros', nome: 'Outros', tipo: 'gasto', icone: 'fin-carteira', balde: 'desejos' },
  { id: 'salario', nome: 'Salário', tipo: 'ganho', icone: 'fin-carteira' },
  { id: 'extra', nome: 'Renda extra', tipo: 'ganho', icone: 'fin-extra' },
  { id: 'outros-ganhos', nome: 'Outros', tipo: 'ganho', icone: 'fin-cofre' },
];

export const CATEGORIA_POR_ID: Record<string, Categoria> = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));
export const categoriasDe = (tipo: Tipo) => CATEGORIAS.filter((c) => c.tipo === tipo);

export interface Lancamento {
  id: string;
  tipo: Tipo;
  /** Centavos, sempre positivo. */
  valor: number;
  categoria: string;
  descricao: string;
  /** AAAA-MM-DD. */
  data: string;
}

/** Conta que volta todo mês (aluguel, luz, fatura). */
export interface Conta {
  id: string;
  nome: string;
  valor: number;
  /** Dia do vencimento, de 1 a 31. Em mês curto vale o último dia. */
  dia: number;
  categoria: string;
  /** Meses em que foi paga: { '2026-11': true }. */
  pagas: Record<string, boolean>;
}

export interface Meta {
  id: string;
  nome: string;
  alvo: number;
  guardado: number;
  /** Mês em que a pessoa quer chegar lá (AAAA-MM). Sem prazo, o app só acompanha. */
  prazo?: string;
  /** A reserva de emergência é uma meta especial: vem antes das outras. */
  reserva?: boolean;
}

export interface Divida {
  id: string;
  nome: string;
  saldo: number;
  /** Juros ao mês, em % (ex.: 12.5). */
  jurosMes: number;
  /** Parcela mínima do mês, em centavos. */
  minimo: number;
}

export interface Bem {
  id: string;
  nome: string;
  valor: number;
}

// ───────────────────────── dinheiro em texto ─────────────────────────

/** "R$ 1.234,56". Com `curto`, some os centavos quando são zero. */
export function brl(centavos: number, curto = false): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const inteiro = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = String(abs % 100).padStart(2, '0');
  const corpo = curto && abs % 100 === 0 ? inteiro : `${inteiro},${cents}`;
  return `${negativo ? '-' : ''}R$ ${corpo}`;
}

/**
 * Lê o que a pessoa digitou e devolve centavos. Aceita "12", "12,5", "1.234,56", "1234.56", "R$ 40".
 * Devolve 0 quando não dá para entender.
 */
export function lerValor(texto: string): number {
  let t = texto.replace(/[^\d.,]/g, '');
  if (!t) return 0;
  const virgula = t.lastIndexOf(',');
  const ponto = t.lastIndexOf('.');
  if (virgula >= 0) {
    t = `${t.slice(0, virgula).replace(/[.,]/g, '')}.${t.slice(virgula + 1).replace(/[.,]/g, '')}`;
  } else if (ponto >= 0) {
    // Só ponto: é decimal se tem 1 ou 2 casas depois dele ("12.5"); senão é milhar ("1.234").
    const depois = t.length - ponto - 1;
    t = depois === 1 || depois === 2 ? `${t.slice(0, ponto).replace(/\./g, '')}.${t.slice(ponto + 1)}` : t.replace(/\./g, '');
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100), 99_999_999_99) : 0;
}

// ───────────────────────── meses e datas ─────────────────────────

export const mesDe = (data: string) => data.slice(0, 7);

export function mesVizinho(mes: string, passo: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + passo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export const diasNoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(a, m, 0).getDate();
};

/** Quantos meses de `de` até `ate` (AAAA-MM), contando o mês de chegada. Nunca menos que 1. */
export function mesesAte(de: string, ate: string): number {
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  return Math.max(1, (a2 - a1) * 12 + (m2 - m1));
}

// ───────────────────────── resumo do mês ─────────────────────────

export interface Resumo {
  ganhos: number;
  gastos: number;
  saldo: number;
  porCategoria: Record<string, number>;
  porBalde: Record<Balde, number>;
  quantos: number;
}

export function resumoDoMes(lancamentos: Lancamento[], mes: string): Resumo {
  const r: Resumo = { ganhos: 0, gastos: 0, saldo: 0, porCategoria: {}, porBalde: { necessidades: 0, desejos: 0, futuro: 0 }, quantos: 0 };
  for (const l of lancamentos) {
    if (mesDe(l.data) !== mes) continue;
    r.quantos++;
    if (l.tipo === 'ganho') { r.ganhos += l.valor; continue; }
    r.gastos += l.valor;
    r.porCategoria[l.categoria] = (r.porCategoria[l.categoria] ?? 0) + l.valor;
    r.porBalde[CATEGORIA_POR_ID[l.categoria]?.balde ?? 'desejos'] += l.valor;
  }
  r.saldo = r.ganhos - r.gastos;
  return r;
}

/** As categorias em que mais saiu dinheiro, da maior para a menor. */
export function maioresGastos(r: Resumo, quantas = 5): { categoria: string; valor: number; parte: number }[] {
  return Object.entries(r.porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, quantas)
    .map(([categoria, valor]) => ({ categoria, valor, parte: r.gastos > 0 ? valor / r.gastos : 0 }));
}

// ───────────────────────── 50-30-20 ─────────────────────────

export const PARTE_DO_BALDE: Record<Balde, number> = { necessidades: 0.5, desejos: 0.3, futuro: 0.2 };
export const NOME_DO_BALDE: Record<Balde, string> = { necessidades: 'Necessidades', desejos: 'Desejos', futuro: 'Futuro' };

/** Divide a renda do mês em necessidades (50%), desejos (30%) e futuro (20%). */
export function plano503020(renda: number): Record<Balde, number> {
  const necessidades = Math.round(renda * 0.5);
  const desejos = Math.round(renda * 0.3);
  return { necessidades, desejos, futuro: Math.max(0, renda - necessidades - desejos) };
}

export interface LinhaDoPlano { balde: Balde; ideal: number; real: number; diferenca: number; parte: number }

/** Compara o que a pessoa gastou com a divisão 50-30-20 da renda dela. */
export function comparar503020(r: Resumo): LinhaDoPlano[] {
  const ideal = plano503020(r.ganhos);
  return (['necessidades', 'desejos', 'futuro'] as Balde[]).map((balde) => ({
    balde,
    ideal: ideal[balde],
    real: r.porBalde[balde],
    diferenca: r.porBalde[balde] - ideal[balde],
    parte: r.ganhos > 0 ? r.porBalde[balde] / r.ganhos : 0,
  }));
}

// ───────────────────────── orçamento por categoria ─────────────────────────

export type SituacaoTeto = 'livre' | 'atencao' | 'estourou';

/** Abaixo de 80% do teto está livre; de 80% a 100%, atenção; acima, estourou. */
export function situacaoDoTeto(gasto: number, teto: number): SituacaoTeto {
  if (teto <= 0) return 'livre';
  if (gasto > teto) return 'estourou';
  return gasto >= teto * 0.8 ? 'atencao' : 'livre';
}

// ───────────────────────── contas do mês ─────────────────────────

export type SituacaoConta = 'paga' | 'atrasada' | 'hoje' | 'logo' | 'depois';

export interface ContaDoMes { conta: Conta; vencimento: string; situacao: SituacaoConta; dias: number }

/** A data de vencimento da conta num mês (dia 31 em fevereiro vira o último dia). */
export function vencimento(dia: number, mes: string): string {
  const d = Math.min(Math.max(1, Math.round(dia)), diasNoMes(mes));
  return `${mes}-${String(d).padStart(2, '0')}`;
}

function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86_400_000);
}

/** As contas de um mês com a situação de cada uma, as mais urgentes primeiro. `hoje` em AAAA-MM-DD. */
export function contasDoMes(contas: Conta[], mes: string, hoje: string): ContaDoMes[] {
  const peso: Record<SituacaoConta, number> = { atrasada: 0, hoje: 1, logo: 2, depois: 3, paga: 4 };
  return contas
    .map((conta) => {
      const venc = vencimento(conta.dia, mes);
      const dias = diasEntre(hoje, venc);
      const situacao: SituacaoConta = conta.pagas[mes] ? 'paga' : dias < 0 ? 'atrasada' : dias === 0 ? 'hoje' : dias <= 3 ? 'logo' : 'depois';
      return { conta, vencimento: venc, situacao, dias };
    })
    .sort((a, b) => peso[a.situacao] - peso[b.situacao] || a.dias - b.dias);
}

export function totalDasContas(lista: ContaDoMes[]): { total: number; pago: number; falta: number } {
  const total = lista.reduce((s, c) => s + c.conta.valor, 0);
  const pago = lista.filter((c) => c.situacao === 'paga').reduce((s, c) => s + c.conta.valor, 0);
  return { total, pago, falta: total - pago };
}

// ───────────────────────── reserva de emergência e metas ─────────────────────────

export type Renda = 'fixa' | 'variavel';

/**
 * Tamanho da reserva: meses de gasto essencial. Regra prática comum (não é norma oficial):
 * 3 meses para quem tem renda fixa, 6 para quem tem renda variável ou sustenta a casa sozinho.
 */
export function mesesDeReserva(renda: Renda, sustentaSozinho: boolean): number {
  return renda === 'variavel' || sustentaSozinho ? 6 : 3;
}

export function alvoDaReserva(gastoEssencialMes: number, renda: Renda, sustentaSozinho: boolean): number {
  return Math.max(0, Math.round(gastoEssencialMes)) * mesesDeReserva(renda, sustentaSozinho);
}

export interface PlanoDaMeta {
  falta: number;
  parte: number;
  /** Quanto guardar por mês para chegar no prazo (só quando há prazo). */
  porMes?: number;
  meses?: number;
  pronta: boolean;
}

export function planoDaMeta(m: Meta, mesAtual: string): PlanoDaMeta {
  const falta = Math.max(0, m.alvo - m.guardado);
  const parte = m.alvo > 0 ? Math.min(1, m.guardado / m.alvo) : 0;
  if (falta === 0) return { falta, parte: 1, pronta: m.alvo > 0 };
  if (!m.prazo) return { falta, parte, pronta: false };
  const meses = mesesAte(mesAtual, m.prazo);
  return { falta, parte, pronta: false, meses, porMes: Math.ceil(falta / meses) };
}

/** Em quantos meses a pessoa chega lá guardando `porMes`. Infinity se não guarda nada. */
export function mesesParaChegar(falta: number, porMes: number): number {
  if (falta <= 0) return 0;
  return porMes > 0 ? Math.ceil(falta / porMes) : Infinity;
}

// ───────────────────────── juros compostos (simulação) ─────────────────────────

export interface Projecao { total: number; guardado: number; rendimento: number }

/**
 * Quanto vira guardar `aporteMes` todo mês por `meses`, com rendimento de `taxaAnual` % ao ano.
 * É conta de exemplo: rendimento passado ou combinado não é promessa de rendimento futuro.
 */
export function projetar(inicial: number, aporteMes: number, taxaAnual: number, meses: number): Projecao {
  const i = Math.pow(1 + Math.max(0, taxaAnual) / 100, 1 / 12) - 1;
  let total = Math.max(0, inicial);
  const n = Math.max(0, Math.min(600, Math.round(meses)));
  for (let k = 0; k < n; k++) total = total * (1 + i) + Math.max(0, aporteMes);
  const guardado = Math.max(0, inicial) + Math.max(0, aporteMes) * n;
  return { total: Math.round(total), guardado, rendimento: Math.round(total) - guardado };
}

// ───────────────────────── dívidas ─────────────────────────

export type Metodo = 'avalanche' | 'bola-de-neve';

/** Avalanche: o juro mais alto primeiro (paga menos juros). Bola de neve: a menor dívida primeiro (dá ânimo). */
export function ordemDeQuitacao(dividas: Divida[], metodo: Metodo): Divida[] {
  return [...dividas].sort((a, b) => (metodo === 'avalanche' ? b.jurosMes - a.jurosMes || a.saldo - b.saldo : a.saldo - b.saldo || b.jurosMes - a.jurosMes));
}

export interface Quitacao {
  /** Meses até zerar tudo. Infinity quando o pagamento não cobre nem os juros. */
  meses: number;
  juros: number;
  totalPago: number;
  /** Em que mês cada dívida acaba. */
  fim: Record<string, number>;
}

/**
 * Simula a quitação: todo mês paga o mínimo de cada dívida e joga o `extra` (mais o que sobrou
 * das já quitadas) na primeira da ordem. Limite de 600 meses.
 */
export function simularQuitacao(dividas: Divida[], extraMes: number, metodo: Metodo): Quitacao {
  const ordem = ordemDeQuitacao(dividas.filter((d) => d.saldo > 0), metodo).map((d) => ({ ...d }));
  const fim: Record<string, number> = {};
  let juros = 0;
  let totalPago = 0;
  let mes = 0;
  const orcamento = ordem.reduce((s, d) => s + Math.max(0, d.minimo), 0) + Math.max(0, extraMes);
  if (!ordem.length) return { meses: 0, juros: 0, totalPago: 0, fim };
  while (ordem.some((d) => d.saldo > 0) && mes < 600) {
    mes++;
    let antes = 0;
    for (const d of ordem) {
      if (d.saldo <= 0) continue;
      antes += d.saldo;
      const j = Math.round(d.saldo * (d.jurosMes / 100));
      d.saldo += j;
      juros += j;
    }
    let disponivel = orcamento;
    // Primeiro o mínimo de cada uma; depois, o que sobrar vai para a primeira da fila.
    for (const d of ordem) {
      if (d.saldo <= 0) continue;
      const paga = Math.min(d.saldo, Math.max(0, d.minimo), disponivel);
      d.saldo -= paga; disponivel -= paga; totalPago += paga;
    }
    for (const d of ordem) {
      if (d.saldo <= 0 || disponivel <= 0) continue;
      const paga = Math.min(d.saldo, disponivel);
      d.saldo -= paga; disponivel -= paga; totalPago += paga;
    }
    let depois = 0;
    for (const d of ordem) {
      if (d.saldo <= 0 && fim[d.id] === undefined) fim[d.id] = mes;
      if (d.saldo > 0) depois += d.saldo;
    }
    if (depois >= antes) return { meses: Infinity, juros, totalPago, fim }; // a dívida não está diminuindo
  }
  return { meses: ordem.some((d) => d.saldo > 0) ? Infinity : mes, juros, totalPago, fim };
}

// ───────────────────────── patrimônio ─────────────────────────

/** O que a pessoa tem menos o que ela deve. */
export function patrimonioLiquido(bens: Bem[], dividas: Pick<Divida, 'saldo'>[], guardadoEmMetas = 0): { tem: number; deve: number; liquido: number } {
  const tem = bens.reduce((s, b) => s + Math.max(0, b.valor), 0) + Math.max(0, guardadoEmMetas);
  const deve = dividas.reduce((s, d) => s + Math.max(0, d.saldo), 0);
  return { tem, deve, liquido: tem - deve };
}

// ───────────────────────── dicas do mês ─────────────────────────

export interface Dica { id: string; titulo: string; texto: string; tom: 'bom' | 'atencao' | 'ideia' }

export interface Retrato {
  resumo: Resumo;
  /** Teto por categoria (centavos). */
  tetos: Record<string, number>;
  contas: ContaDoMes[];
  metas: Meta[];
  dividas: Divida[];
}

/**
 * Dicas escolhidas pelos números da pessoa, das mais urgentes para as menos.
 * Tom: fala do dinheiro, nunca da pessoa. Nada de bronca.
 */
export function dicasDoMes(x: Retrato): Dica[] {
  const d: Dica[] = [];
  const { resumo: r } = x;
  const reserva = x.metas.find((m) => m.reserva);
  const caras = x.dividas.filter((v) => v.saldo > 0 && v.jurosMes >= 5);
  const atrasadas = x.contas.filter((c) => c.situacao === 'atrasada');
  const assinaturas = r.porCategoria.assinaturas ?? 0;

  if (atrasadas.length) d.push({ id: 'atrasadas', tom: 'atencao', titulo: atrasadas.length === 1 ? 'Uma conta passou do dia' : `${atrasadas.length} contas passaram do dia`, texto: `Comece por ${atrasadas[0].conta.nome}. Conta atrasada costuma cobrar multa e juros por dia, então cada dia a menos conta.` });
  if (caras.length) {
    const pior = [...caras].sort((a, b) => b.jurosMes - a.jurosMes)[0];
    d.push({ id: 'divida-cara', tom: 'atencao', titulo: 'Antes de investir, a dívida cara', texto: `${pior.nome} cobra ${String(pior.jurosMes).replace('.', ',')}% ao mês. Nenhum investimento seguro rende isso: cada real a mais nessa dívida é o melhor "rendimento" que você tem hoje.` });
  }
  if (r.ganhos > 0 && r.saldo < 0) d.push({ id: 'negativo', tom: 'atencao', titulo: 'Este mês saiu mais do que entrou', texto: `A diferença é de ${brl(-r.saldo, true)}. Olhe a maior categoria de gasto: é nela que um corte pequeno aparece mais.` });
  for (const [cat, teto] of Object.entries(x.tetos)) {
    const gasto = r.porCategoria[cat] ?? 0;
    const s = situacaoDoTeto(gasto, teto);
    const nome = CATEGORIA_POR_ID[cat]?.nome ?? cat;
    if (s === 'estourou') d.push({ id: `teto-${cat}`, tom: 'atencao', titulo: `${nome} passou do teto`, texto: `Foram ${brl(gasto, true)} de ${brl(teto, true)}. Dá para compensar segurando outra categoria até o fim do mês.` });
    else if (s === 'atencao') d.push({ id: `teto-${cat}`, tom: 'ideia', titulo: `${nome} está quase no teto`, texto: `Restam ${brl(teto - gasto, true)} nessa categoria este mês.` });
  }
  if (!reserva) d.push({ id: 'sem-reserva', tom: 'ideia', titulo: 'Comece a reserva de emergência', texto: 'É o dinheiro para o imprevisto (geladeira que quebra, mês sem renda). Com ela você não precisa de cartão nem de empréstimo na hora do aperto. Comece com qualquer valor.' });
  else if (reserva.guardado < reserva.alvo) d.push({ id: 'reserva', tom: 'ideia', titulo: 'A reserva vem antes das outras metas', texto: `Faltam ${brl(reserva.alvo - reserva.guardado, true)}. Uma transferência automática no dia do pagamento faz isso sem depender de lembrar.` });
  if (r.ganhos > 0 && r.porBalde.desejos > r.ganhos * 0.3) d.push({ id: 'desejos', tom: 'ideia', titulo: 'Desejos passaram de 30% da renda', texto: `Foram ${Math.round((r.porBalde.desejos / r.ganhos) * 100)}%. Não precisa cortar tudo: escolha um gasto que você nem sentiria falta.` });
  if (assinaturas > 0) d.push({ id: 'assinaturas', tom: 'ideia', titulo: 'Reveja as assinaturas', texto: `Somam ${brl(assinaturas, true)} por mês, ou ${brl(assinaturas * 12, true)} por ano. Cancele a que você não abriu no último mês.` });
  if (r.ganhos > 0 && r.porBalde.futuro >= r.ganhos * 0.2) d.push({ id: 'futuro-ok', tom: 'bom', titulo: 'Você separou 20% para o futuro', texto: 'Guardar ou abater dívida com um quinto da renda é a parte mais difícil do plano. Está feito.' });
  if (r.ganhos > 0 && r.saldo > 0 && r.porBalde.futuro < r.ganhos * 0.2) d.push({ id: 'sobrou', tom: 'ideia', titulo: `Sobraram ${brl(r.saldo, true)}`, texto: 'Dinheiro parado na conta some sem a gente ver. Mande para a reserva ou para uma meta antes que ele ache outro destino.' });
  if (r.quantos === 0) d.push({ id: 'comecar', tom: 'ideia', titulo: 'Anote o primeiro gasto', texto: 'Não precisa ser tudo de uma vez. Anotar o que saiu hoje já mostra para onde o dinheiro está indo.' });
  return d;
}

// ───────────────────────── grátis e Pro ─────────────────────────

/**
 * O grátis anota e acompanha o mês de verdade: lançamentos sem limite, resumo, 3 contas
 * a pagar, a reserva de emergência e a dica principal do mês.
 * O Pro planeja: orçamento por categoria, 50-30-20, metas e contas sem limite, meses
 * anteriores, quitação de dívidas, patrimônio, simulador e todas as dicas.
 */
export const GRATIS = { contas: 3, metas: 1, dicas: 1 } as const;
