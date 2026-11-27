/**
 * Gym Plim: monta o plano de treino da pessoa e diz como evoluir a cada treino.
 * As regras e as fontes estão em docs/gym/PESQUISA.md. Arquivo sem tela, para ter teste.
 */
import { EXERCICIOS, EXERCICIO_POR_ID, type Cuidado, type Exercicio, type Grupo, type Local, type Movimento } from './gymExercicios.ts';

export type Experiencia = 'iniciante' | 'intermediario' | 'avancado';
export type Objetivo = 'massa' | 'forca' | 'saude';

export interface PerfilGym {
  peso: number;      // kg
  altura: number;    // cm
  idade: number;
  experiencia: Experiencia;
  /** Dias de treino por semana (2 a 6). */
  dias: number;
  /** Minutos disponíveis por treino. */
  minutos: number;
  local: Local;
  objetivo: Objetivo;
  cuidados: Cuidado[];
}

export interface ItemTreino {
  exercicioId: string;
  series: number;
  /** Repetições por série; nos exercícios por tempo, segundos. */
  min: number;
  max: number;
  porTempo: boolean;
  /** Descanso entre séries, em segundos. */
  descanso: number;
}

export interface DiaTreino {
  id: string;
  nome: string;
  foco: string;
  aquecimento: string;
  itens: ItemTreino[];
  minutos: number;
}

export interface Plano {
  divisao: string;
  dias: DiaTreino[];
  /** Séries por grupo muscular somadas na semana. */
  seriesPorGrupo: Partial<Record<Grupo, number>>;
  /** Avisos em linguagem simples sobre como o plano foi montado. */
  notas: string[];
  semanaLeve: boolean;
}

// ───────────────────────── moldes de treino ─────────────────────────

interface Molde { id: string; nome: string; foco: string; movimentos: Movimento[] }

const CORPO_A: Molde = { id: 'corpo-a', nome: 'Corpo inteiro A', foco: 'Agachar, empurrar e puxar', movimentos: ['agachar', 'empurrar-horizontal', 'puxar-horizontal', 'gluteo', 'empurrar-vertical', 'core-frente'] };
const CORPO_B: Molde = { id: 'corpo-b', nome: 'Corpo inteiro B', foco: 'Pernas, costas e ombros', movimentos: ['empurrar-pernas', 'puxar-vertical', 'empurrar-horizontal', 'dobrar-quadril', 'ombro-lateral', 'core-lado'] };
const CORPO_C: Molde = { id: 'corpo-c', nome: 'Corpo inteiro C', foco: 'Posterior, peito e braços', movimentos: ['dobrar-quadril', 'empurrar-horizontal', 'puxar-horizontal', 'agachar', 'biceps', 'triceps', 'core-costas'] };
const SUPERIOR_A: Molde = { id: 'superior-a', nome: 'Superior A', foco: 'Peito, costas e braços', movimentos: ['empurrar-horizontal', 'puxar-horizontal', 'empurrar-vertical', 'puxar-vertical', 'biceps', 'triceps'] };
const INFERIOR_A: Molde = { id: 'inferior-a', nome: 'Inferior A', foco: 'Coxas, glúteos e abdômen', movimentos: ['agachar', 'dobrar-quadril', 'empurrar-pernas', 'joelho-flexionar', 'panturrilha', 'core-frente'] };
const SUPERIOR_B: Molde = { id: 'superior-b', nome: 'Superior B', foco: 'Costas, ombros e braços', movimentos: ['puxar-vertical', 'empurrar-horizontal', 'puxar-horizontal', 'ombro-lateral', 'ombro-posterior', 'triceps', 'biceps'] };
const INFERIOR_B: Molde = { id: 'inferior-b', nome: 'Inferior B', foco: 'Glúteos, coxas e panturrilha', movimentos: ['empurrar-pernas', 'gluteo', 'agachar', 'joelho-estender', 'panturrilha', 'core-lado'] };
const EMPURRAR: Molde = { id: 'empurrar', nome: 'Empurrar', foco: 'Peito, ombros e tríceps', movimentos: ['empurrar-horizontal', 'empurrar-vertical', 'empurrar-horizontal', 'ombro-lateral', 'peito-isolado', 'triceps'] };
const PUXAR: Molde = { id: 'puxar', nome: 'Puxar', foco: 'Costas e bíceps', movimentos: ['puxar-vertical', 'puxar-horizontal', 'puxar-horizontal', 'ombro-posterior', 'biceps', 'biceps'] };
const PERNAS: Molde = { id: 'pernas', nome: 'Pernas', foco: 'Coxas, glúteos e panturrilha', movimentos: ['agachar', 'dobrar-quadril', 'empurrar-pernas', 'joelho-estender', 'joelho-flexionar', 'panturrilha', 'core-frente'] };

const DIVISOES: Record<number, { nome: string; moldes: Molde[] }> = {
  2: { nome: 'Corpo inteiro, 2 dias', moldes: [CORPO_A, CORPO_B] },
  3: { nome: 'Corpo inteiro, 3 dias', moldes: [CORPO_A, CORPO_B, CORPO_C] },
  4: { nome: 'Superior e inferior, 4 dias', moldes: [SUPERIOR_A, INFERIOR_A, SUPERIOR_B, INFERIOR_B] },
  5: { nome: 'Empurrar, puxar, pernas + superior e inferior', moldes: [EMPURRAR, PUXAR, PERNAS, SUPERIOR_B, INFERIOR_B] },
  6: { nome: 'Empurrar, puxar e pernas, 2 vezes', moldes: [EMPURRAR, PUXAR, PERNAS, EMPURRAR, PUXAR, PERNAS] },
};

/**
 * Sem equipamento não existe exercício suficiente para um dia só de braços e costas:
 * o treino é sempre de corpo inteiro, revezando os três moldes.
 */
function divisaoSemEquipamento(dias: number): { nome: string; moldes: Molde[] } {
  const roda = [CORPO_A, CORPO_B, CORPO_C];
  return { nome: `Corpo inteiro em casa, ${dias} dias`, moldes: Array.from({ length: dias }, (_, i) => roda[i % roda.length]) };
}

/** Se um treino ficar curto (faltou equipamento ou há muito cuidado a tomar), completa com estes movimentos. */
const RESERVA: Movimento[] = ['core-frente', 'gluteo', 'core-lado', 'core-costas', 'agachar', 'cardio', 'empurrar-horizontal'];
const MINIMO_POR_TREINO = 4;

/** Quando o lugar não tem o equipamento do movimento, qual movimento parecido entra no lugar. */
const SUBSTITUTO: Partial<Record<Movimento, Movimento>> = {
  'puxar-vertical': 'puxar-horizontal',
  'empurrar-pernas': 'agachar',
  'joelho-estender': 'agachar',
  'joelho-flexionar': 'gluteo',
  'dobrar-quadril': 'gluteo',
  'peito-isolado': 'empurrar-horizontal',
  'ombro-posterior': 'puxar-horizontal',
  'empurrar-vertical': 'empurrar-horizontal',
};

const NIVEL_MAX: Record<Experiencia, number> = { iniciante: 1, intermediario: 2, avancado: 3 };
const ORDEM_LOCAL: Record<Local, Local[]> = { academia: ['academia', 'halteres', 'corpo'], halteres: ['halteres', 'corpo'], corpo: ['corpo'] };

export const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** IMC só para escolher variações de menor impacto. Não é mostrado nem comentado no app. */
export function imc(peso: number, alturaCm: number): number {
  const m = alturaCm / 100;
  return m > 0 ? peso / (m * m) : 0;
}

/** Pessoa que pede um começo mais cuidadoso: 60 anos ou mais, ou IMC a partir de 30. */
export function comecoSuave(p: Pick<PerfilGym, 'peso' | 'altura' | 'idade'>): boolean {
  return p.idade >= 60 || imc(p.peso, p.altura) >= 30;
}

function candidatos(mov: Movimento, p: PerfilGym, suave: boolean): Exercicio[] {
  const nivelMax = suave ? Math.min(2, NIVEL_MAX[p.experiencia] + (p.experiencia === 'iniciante' ? 0 : 0)) : NIVEL_MAX[p.experiencia];
  const locais = ORDEM_LOCAL[p.local];
  return EXERCICIOS
    .filter((e) => e.movimento === mov && locais.includes(e.local) && e.nivel <= Math.max(1, nivelMax))
    .filter((e) => !(e.evitar ?? []).some((c) => p.cuidados.includes(c)))
    .sort((a, b) => locais.indexOf(a.local) - locais.indexOf(b.local) || b.nivel - a.nivel);
}

function escolher(mov: Movimento, p: PerfilGym, suave: boolean, usados: Set<string>, giro: number): Exercicio | null {
  for (const m of [mov, SUBSTITUTO[mov]]) {
    if (!m) continue;
    const livres = candidatos(m, p, suave).filter((e) => !usados.has(e.id));
    if (livres.length) return livres[giro % livres.length];
  }
  return null;
}

function receita(e: Exercicio, p: PerfilGym, semana: number, suave: boolean, leve: boolean): ItemTreino {
  let series = p.experiencia === 'iniciante' ? (semana <= 2 ? 2 : 3) : p.experiencia === 'avancado' && e.composto ? 4 : 3;
  if (leve) series = Math.max(2, series - 1);

  if (e.porTempo) {
    const base = p.experiencia === 'iniciante' ? [20, 30] : p.experiencia === 'intermediario' ? [30, 45] : [40, 60];
    return { exercicioId: e.id, series, min: base[0], max: base[1], porTempo: true, descanso: 45 };
  }

  let faixa: [number, number];
  if (p.objetivo === 'forca' && p.experiencia !== 'iniciante') faixa = e.composto ? [4, 6] : [8, 12];
  else if (p.objetivo === 'saude') faixa = e.composto ? [10, 15] : [12, 15];
  else faixa = e.composto ? [8, 12] : [10, 15];
  if (suave && e.composto) faixa = [Math.max(faixa[0], 10), Math.max(faixa[1], 15)];

  let descanso = e.composto ? (p.objetivo === 'forca' && p.experiencia !== 'iniciante' ? 180 : 120) : p.objetivo === 'saude' ? 60 : 75;
  if (suave) descanso += 30;
  return { exercicioId: e.id, series, min: faixa[0], max: faixa[1], porTempo: false, descanso };
}

/** Tempo que um item ocupa no treino, em segundos (cerca de 40 s por série, mais o descanso). */
export function segundosDoItem(i: ItemTreino): number {
  const trabalho = i.porTempo ? i.max : 40;
  return i.series * (trabalho + i.descanso);
}

const AQUECIMENTO_MIN = 5;

function aquecimento(p: PerfilGym, suave: boolean): string {
  if (p.local === 'academia') return '5 minutos de caminhada na esteira, num passo firme.';
  if (suave || p.cuidados.includes('joelho')) return '5 minutos de caminhada no lugar, levantando bem os joelhos.';
  return '5 minutos alternando polichinelo e caminhada no lugar.';
}

/** Em qual semana do programa a pessoa está, contando da data em que começou (AAAA-MM-DD). */
export function semanaDoPrograma(inicio: string, hoje: string): number {
  const [a1, m1, d1] = inicio.split('-').map(Number);
  const [a2, m2, d2] = hoje.split('-').map(Number);
  const dias = Math.round((new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86_400_000);
  return Math.max(1, Math.floor(dias / 7) + 1);
}

/** A cada 8 semanas vem uma semana leve: uma série a menos em tudo, para o corpo recuperar. */
export const ehSemanaLeve = (semana: number) => semana > 1 && semana % 8 === 0;

/** Monta o plano da semana para este perfil. O mesmo perfil e a mesma semana dão sempre o mesmo plano. */
export function montarPlano(p: PerfilGym, semana = 1): Plano {
  const suave = comecoSuave(p);
  const leve = ehSemanaLeve(semana);
  const pedidos = limitar(Math.round(p.dias), 2, 6);
  // Iniciante rende mais com descanso entre os treinos: no máximo 4 dias de força.
  const dias = p.experiencia === 'iniciante' ? Math.min(pedidos, 4) : pedidos;
  const divisao = p.local === 'corpo' ? divisaoSemEquipamento(dias) : DIVISOES[dias];
  const limite = Math.max(20, p.minutos) * 60;
  const seriesPorGrupo: Partial<Record<Grupo, number>> = {};
  const vistos: Record<string, number> = {};

  const planoDias = divisao.moldes.map((molde, indice) => {
    const repeticao = vistos[molde.id] ?? 0; // segunda vez do mesmo molde na semana troca os exercícios
    vistos[molde.id] = repeticao + 1;
    const usados = new Set<string>();
    const itens: ItemTreino[] = [];
    molde.movimentos.forEach((mov, k) => {
      const repetidoNoDia = molde.movimentos.slice(0, k).filter((m) => m === mov).length;
      const e = escolher(mov, p, suave, usados, repeticao + repetidoNoDia);
      if (!e) return;
      usados.add(e.id);
      itens.push(receita(e, p, semana, suave, leve));
    });
    for (const mov of RESERVA) {
      if (itens.length >= MINIMO_POR_TREINO) break;
      const e = escolher(mov, p, suave, usados, repeticao);
      if (!e) continue;
      usados.add(e.id);
      itens.push(receita(e, p, semana, suave, leve));
    }

    // Cabe no tempo? Tira do fim (os exercícios menores), sem deixar o treino com menos de 3.
    const total = () => AQUECIMENTO_MIN * 60 + itens.reduce((s, i) => s + segundosDoItem(i), 0);
    while (total() > limite && itens.length > 3) itens.pop();
    while (total() > limite && itens.some((i) => i.series > 2)) {
      const maior = itens.reduce((a, b) => (b.series > a.series ? b : a));
      maior.series -= 1;
    }

    for (const i of itens) {
      const g = EXERCICIO_POR_ID[i.exercicioId].grupo;
      seriesPorGrupo[g] = (seriesPorGrupo[g] ?? 0) + i.series;
    }
    return {
      id: `${molde.id}-${indice + 1}`,
      nome: molde.nome,
      foco: molde.foco,
      aquecimento: aquecimento(p, suave),
      itens,
      minutos: Math.round(total() / 60),
    };
  });

  const notas: string[] = [];
  if (dias < pedidos) notas.push(`Você pediu ${pedidos} dias. No começo, 4 dias de força rendem mais: nos outros, faça uma caminhada de 20 a 30 minutos.`);
  if (p.experiencia === 'iniciante' && semana <= 2) notas.push('Semanas 1 e 2 são de adaptação: 2 séries por exercício e carga leve, para aprender o movimento.');
  if (leve) notas.push('Esta é uma semana leve: uma série a menos em tudo. Mantenha as cargas e deixe o corpo recuperar.');
  if (suave) notas.push('Montei um começo mais cuidadoso: mais repetições com carga menor e descanso maior.');
  if (p.cuidados.length) notas.push(`Tirei os exercícios que costumam incomodar ${p.cuidados.map((c) => ({ joelho: 'o joelho', ombro: 'o ombro', coluna: 'a coluna' }[c])).join(' e ')}. Dor diferente de cansaço muscular: pare e procure um profissional.`);
  if (p.local === 'corpo') notas.push('Sem equipamento, o treino é sempre de corpo inteiro e quase não há exercício de puxar. Uma mochila com livros já serve de halter: quando tiver, mude para "Casa, com halteres".');
  notas.push('Em toda série, pare quando ainda desse para fazer 2 ou 3 repetições. Não precisa ir até não aguentar.');

  return { divisao: divisao.nome, dias: planoDias, seriesPorGrupo, notas, semanaLeve: leve };
}

// ───────────────────────── evolução treino a treino ─────────────────────────

export interface SerieFeita { carga: number; reps: number }
export interface Registro { data: string; series: SerieFeita[]; min: number; max: number }

export interface Conselho {
  tipo: 'primeira' | 'subir' | 'manter' | 'baixar';
  texto: string;
  /** Carga sugerida para o próximo treino, quando faz sentido. */
  carga?: number;
}

/** Arredonda para um peso que existe: de 0,5 em 0,5 kg até 20 kg, de 1 em 1 acima disso. */
export function arredondarCarga(kg: number): number {
  const passo = kg < 20 ? 0.5 : 1;
  return Math.max(passo, Math.round(kg / passo) * passo);
}

/**
 * O que fazer no próximo treino deste exercício (progressão dupla):
 *  - bateu o topo da faixa em todas as séries: sobe a carga uns 5% e volta para a base;
 *  - ficou abaixo da base em dois treinos seguidos: baixa uns 10%;
 *  - no meio: mesma carga, uma repetição a mais.
 * `historico` em ordem de data, o mais recente por último.
 */
export function proximoPasso(historico: Registro[], alvo: { min: number; max: number }, semCarga = false, porTempo = false): Conselho {
  const unidade = porTempo ? 'segundos' : 'repetições';
  const ultimo = historico[historico.length - 1];
  if (!ultimo || ultimo.series.length === 0) {
    return {
      tipo: 'primeira',
      texto: semCarga
        ? `Primeira vez: faça de ${alvo.min} a ${alvo.max} ${unidade} por série, parando com folga.`
        : `Primeira vez: escolha uma carga com que você faça ${alvo.max} repetições sentindo que ainda daria para mais 2 ou 3.`,
    };
  }
  const carga = Math.max(...ultimo.series.map((s) => s.carga));
  const bateuTopo = ultimo.series.every((s) => s.reps >= alvo.max);
  const abaixo = (r: Registro) => r.series.some((s) => s.reps < alvo.min);
  const anterior = historico[historico.length - 2];

  if (bateuTopo) {
    if (semCarga || carga <= 0) {
      return { tipo: 'subir', texto: porTempo ? `Você segurou ${alvo.max} segundos em todas as séries. Hoje tente 5 segundos a mais.` : `Você fez ${alvo.max} em todas as séries. Hoje tente 2 repetições a mais ou uma variação mais difícil.` };
    }
    const nova = Math.max(arredondarCarga(carga * 1.05), arredondarCarga(carga + (carga < 20 ? 0.5 : 1)));
    return { tipo: 'subir', carga: nova, texto: `Você fez ${alvo.max} repetições em todas as séries com ${fmt(carga)} kg. Hoje suba para perto de ${fmt(nova)} kg (o próximo peso que tiver) e volte para ${alvo.min} repetições.` };
  }
  if (abaixo(ultimo) && anterior && abaixo(anterior)) {
    if (semCarga || carga <= 0) return { tipo: 'baixar', texto: 'Dois treinos abaixo da meta. Use uma variação mais fácil hoje e capriche na execução.' };
    const nova = arredondarCarga(carga * 0.9);
    return { tipo: 'baixar', carga: nova, texto: `Dois treinos seguidos abaixo de ${alvo.min} repetições com ${fmt(carga)} kg. Hoje baixe para ${fmt(nova)} kg e faça com capricho.` };
  }
  return {
    tipo: 'manter',
    carga: carga > 0 ? carga : undefined,
    texto: carga > 0 && !semCarga
      ? `Mantenha ${fmt(carga)} kg e tente uma repetição a mais em cada série.`
      : `Mesma variação de antes. Tente ${porTempo ? 'alguns segundos' : 'uma repetição'} a mais em cada série.`,
  };
}

const fmt = (n: number) => String(n).replace('.', ',');

/** Hora de mudar de nível? Só sugere; quem decide é a pessoa. */
export function sugerirNivel(experiencia: Experiencia, semana: number, treinosFeitos: number): Experiencia | null {
  if (experiencia === 'iniciante' && semana > 12 && treinosFeitos >= 24) return 'intermediario';
  if (experiencia === 'intermediario' && semana > 40 && treinosFeitos >= 100) return 'avancado';
  return null;
}

/** Confere os dados do formulário e devolve o que está fora do esperado, em frases para a tela. */
export function validarPerfil(p: Partial<PerfilGym>): string[] {
  const erros: string[] = [];
  if (!(p.peso! >= 30 && p.peso! <= 300)) erros.push('Peso entre 30 e 300 kg.');
  if (!(p.altura! >= 120 && p.altura! <= 230)) erros.push('Altura entre 120 e 230 cm.');
  if (!(p.idade! >= 18 && p.idade! <= 100)) erros.push('O Gym Plim é para maiores de 18 anos.');
  if (!(p.dias! >= 2 && p.dias! <= 6)) erros.push('De 2 a 6 dias por semana.');
  if (!(p.minutos! >= 20 && p.minutos! <= 120)) erros.push('De 20 a 120 minutos por treino.');
  return erros;
}
