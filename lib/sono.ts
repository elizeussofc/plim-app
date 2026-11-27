/**
 * Sono do Plim: a conta da hora de deitar, o ritual de desligar e o diário das noites.
 * Só lógica, sem tela, para ter teste (tests/sono.test.mjs).
 *
 * De onde vêm os números: docs/sono/PESQUISA.md. O app ajuda a criar hábito e a enxergar
 * o próprio padrão; não diagnostica nem trata distúrbio do sono.
 */

/** Uma noite dormida. `data` é o dia em que a pessoa acordou ('AAAA-MM-DD'). */
export interface Noite {
  data: string;
  deitou: string;   // 'HH:MM'
  acordou: string;  // 'HH:MM'
  qualidade: 1 | 2 | 3 | 4 | 5;
}

export interface PassoRitual {
  id: string;
  nome: string;
  minutos: number;
  /** Tela do Plim que ajuda neste passo. */
  rota?: string;
}

export interface PerfilSono {
  /** Hora em que a pessoa precisa acordar. */
  acordar: string;
  /** Quantas horas quer dormir (7 a 9). */
  horas: number;
}

export const PERFIL_PADRAO: PerfilSono = { acordar: '07:00', horas: 8 };
export const HORAS_POSSIVEIS = [7, 7.5, 8, 8.5, 9];
/** Mínimo recomendado para adultos (AASM e Sleep Research Society, 2015). */
export const MINIMO_ADULTO_MIN = 7 * 60;
/** Tempo que se leva para pegar no sono, usado na conta da hora de deitar. Regra prática. */
export const PEGAR_NO_SONO_MIN = 15;

export const RITUAL_PADRAO: PassoRitual[] = [
  { id: 'telas', nome: 'Guardar o celular longe da cama', minutos: 2 },
  { id: 'luz', nome: 'Baixar a luz da casa', minutos: 1 },
  { id: 'amanha', nome: 'Separar a roupa e as coisas de amanhã', minutos: 5 },
  { id: 'despejo', nome: 'Tirar da cabeça o que ficou pendente', minutos: 5, rota: '/despejo-mental' },
  { id: 'banho', nome: 'Banho morno ou lavar o rosto', minutos: 10 },
  { id: 'respirar', nome: 'Respirar devagar por dois minutos', minutos: 2, rota: '/modo-calma' },
];

export const GRATIS_SONO = { diasDeHistorico: 7, dicas: 2, passos: RITUAL_PADRAO.length };

const dois = (n: number) => String(n).padStart(2, '0');

/** Minutos desde a meia-noite. */
export function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** 'HH:MM' de uma quantidade de minutos (dá a volta no relógio). */
export function horaDe(minutos: number): string {
  const m = ((Math.round(minutos) % 1440) + 1440) % 1440;
  return `${dois(Math.floor(m / 60))}:${dois(m % 60)}`;
}

/**
 * Entende a hora do jeito que a pessoa digita: "23", "23:30", "2330", "23h30", "7h".
 * Devolve 'HH:MM' ou null se não der para entender.
 */
export function lerHora(texto: string): string | null {
  const t = texto.trim().toLowerCase().replace(/\s/g, '');
  if (!t) return null;
  let h: number;
  let m: number;
  const partes = t.match(/^(\d{1,2})[:h.](\d{0,2})$/);
  if (partes) { h = Number(partes[1]); m = partes[2] ? Number(partes[2].padEnd(2, '0')) : 0; }
  else if (/^\d{1,2}$/.test(t)) { h = Number(t); m = 0; }
  else if (/^\d{3,4}$/.test(t)) { h = Number(t.slice(0, -2)); m = Number(t.slice(-2)); }
  else return null;
  if (h > 23 || m > 59) return null;
  return `${dois(h)}:${dois(m)}`;
}

/** Quanto durou a noite, em minutos. Quem deita 23:30 e acorda 07:00 dormiu 450. */
export function duracaoMin(deitou: string, acordou: string): number {
  const d = minutosDe(acordou) - minutosDe(deitou);
  return d > 0 ? d : d + 1440;
}

/** "7h30" ou "8h". */
export function horasTexto(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${dois(r)}` : `${h}h`;
}

/** A que horas deitar para dormir `horas` e acordar na hora certa. */
export function horaDeDeitar(perfil: PerfilSono): string {
  return horaDe(minutosDe(perfil.acordar) - perfil.horas * 60 - PEGAR_NO_SONO_MIN);
}

export const duracaoDoRitual = (ritual: PassoRitual[]) => ritual.reduce((s, p) => s + Math.max(0, p.minutos), 0);

/** A que horas começar o ritual para estar na cama na hora. Nunca menos de 30 min antes: é o tempo sem tela. */
export function horaDeDesligar(perfil: PerfilSono, ritual: PassoRitual[]): string {
  return horaDe(minutosDe(horaDeDeitar(perfil)) - Math.max(30, duracaoDoRitual(ritual)));
}

/**
 * Em que ponto da noite a pessoa está: 'antes' (faltam `minutos` para começar a desligar),
 * 'desligar' (está na janela do ritual; faltam `minutos` para deitar) ou 'passou'
 * (já passou `minutos` da hora de deitar). De manhã e de tarde é sempre 'antes'.
 */
export function momentoDaNoite(agoraMin: number, perfil: PerfilSono, ritual: PassoRitual[]): { fase: 'antes' | 'desligar' | 'passou'; minutos: number } {
  const deitar = minutosDe(horaDeDeitar(perfil));
  const desligar = minutosDe(horaDeDesligar(perfil, ritual));
  const volta = (m: number) => ((m % 1440) + 1440) % 1440;
  const janela = volta(deitar - desligar);
  const desdeDesligar = volta(agoraMin - desligar);
  if (desdeDesligar < janela) return { fase: 'desligar', minutos: janela - desdeDesligar };
  const desdeDeitar = volta(agoraMin - deitar);
  // Até a hora de acordar, a pessoa "passou da hora"; depois disso é um dia novo.
  if (desdeDeitar < volta(minutosDe(perfil.acordar) - deitar)) return { fase: 'passou', minutos: desdeDeitar };
  return { fase: 'antes', minutos: volta(desligar - agoraMin) };
}

/** Como foi a noite perto da meta: 'curta' (abaixo de 7 h), 'quase', 'boa' ou 'longa'. */
export function leituraDaNoite(minutos: number, perfil: PerfilSono): 'curta' | 'quase' | 'boa' | 'longa' {
  const alvo = perfil.horas * 60;
  if (minutos < MINIMO_ADULTO_MIN && minutos < alvo - 30) return 'curta';
  if (minutos < alvo - 30) return 'quase';
  if (minutos > alvo + 90) return 'longa';
  return 'boa';
}

function diasAntes(base: string, dias: number): string {
  const [a, m, d] = base.split('-').map(Number);
  const x = new Date(a, m - 1, d - dias);
  return `${x.getFullYear()}-${dois(x.getMonth() + 1)}-${dois(x.getDate())}`;
}

/** As noites dos últimos `dias` dias (contando hoje), da mais nova para a mais antiga. */
export function noitesRecentes(noites: Noite[], hoje: string, dias = 7): Noite[] {
  const desde = diasAntes(hoje, dias - 1);
  return noites.filter((n) => n.data >= desde && n.data <= hoje).sort((a, b) => (a.data < b.data ? 1 : -1));
}

/** Uma barra por dia da semana que passou (do mais antigo para hoje); null = noite não anotada. */
export function barrasDaSemana(noites: Noite[], hoje: string): { data: string; minutos: number | null }[] {
  const porDia = new Map(noites.map((n) => [n.data, duracaoMin(n.deitou, n.acordou)]));
  return Array.from({ length: 7 }, (_, i) => {
    const data = diasAntes(hoje, 6 - i);
    return { data, minutos: porDia.get(data) ?? null };
  });
}

export interface ResumoSono {
  noites: number;
  mediaMin: number;
  mediaQualidade: number;
  /** Noites que chegaram perto da meta (boa ou longa). */
  naMeta: number;
  /** Minutos que faltaram para a meta, somando as noites anotadas. */
  dividaMin: number;
}

export function resumoDoSono(noites: Noite[], perfil: PerfilSono, hoje: string, dias = 7): ResumoSono {
  const lista = noitesRecentes(noites, hoje, dias);
  if (!lista.length) return { noites: 0, mediaMin: 0, mediaQualidade: 0, naMeta: 0, dividaMin: 0 };
  const duracoes = lista.map((n) => duracaoMin(n.deitou, n.acordou));
  const alvo = perfil.horas * 60;
  return {
    noites: lista.length,
    mediaMin: Math.round(duracoes.reduce((s, d) => s + d, 0) / lista.length),
    mediaQualidade: Math.round((lista.reduce((s, n) => s + n.qualidade, 0) / lista.length) * 10) / 10,
    naMeta: duracoes.filter((d) => d >= alvo - 30).length,
    dividaMin: duracoes.reduce((s, d) => s + Math.max(0, alvo - d), 0),
  };
}

/**
 * Quanto a hora de deitar varia de uma noite para outra, em minutos (desvio médio).
 * Horas depois da meia-noite contam como "mais tarde", não como "bem cedo".
 */
export function variacaoDoHorario(noites: Noite[]): number {
  if (noites.length < 2) return 0;
  const pontos = noites.map((n) => { const m = minutosDe(n.deitou); return m < 12 * 60 ? m + 1440 : m; });
  const media = pontos.reduce((s, p) => s + p, 0) / pontos.length;
  return Math.round(pontos.reduce((s, p) => s + Math.abs(p - media), 0) / pontos.length);
}

export interface Achado { titulo: string; texto: string; tom: 'bom' | 'atencao' | 'neutro' }

/** O que as noites anotadas mostram (Pro). Precisa de pelo menos 3 noites para dizer alguma coisa. */
export function leituraDoSono(noites: Noite[], perfil: PerfilSono, hoje: string): Achado[] {
  const lista = noitesRecentes(noites, hoje, 14);
  if (lista.length < 3) return [{ titulo: 'Ainda é cedo para concluir', texto: `Anote pelo menos 3 noites. Faltam ${3 - lista.length}.`, tom: 'neutro' }];
  const achados: Achado[] = [];
  const r = resumoDoSono(noites, perfil, hoje, 14);
  const alvo = perfil.horas * 60;

  if (r.mediaMin >= alvo - 30) achados.push({ titulo: `Média de ${horasTexto(r.mediaMin)} por noite`, texto: 'Você está dormindo perto da sua meta. O trabalho agora é manter.', tom: 'bom' });
  else if (r.mediaMin < MINIMO_ADULTO_MIN) achados.push({ titulo: `Média de ${horasTexto(r.mediaMin)} por noite`, texto: `Abaixo das 7 horas recomendadas para adultos. Deitar ${Math.min(60, Math.ceil((alvo - r.mediaMin) / 15) * 15)} minutos mais cedo já muda a semana.`, tom: 'atencao' });
  else achados.push({ titulo: `Média de ${horasTexto(r.mediaMin)} por noite`, texto: `Faltam cerca de ${horasTexto(alvo - r.mediaMin)} por noite para a sua meta de ${horasTexto(alvo)}.`, tom: 'neutro' });

  const variacao = variacaoDoHorario(lista);
  if (variacao <= 30) achados.push({ titulo: 'Horário de deitar bem regular', texto: `Varia só uns ${variacao} minutos de uma noite para outra. O corpo agradece essa previsibilidade.`, tom: 'bom' });
  else if (variacao > 60) achados.push({ titulo: 'A hora de deitar muda muito', texto: `Varia cerca de ${horasTexto(variacao)} entre as noites. Escolher uma hora fixa, inclusive no fim de semana, costuma ajudar mais do que dormir mais.`, tom: 'atencao' });

  // As noites boas têm algo em comum? Compara a hora de deitar das noites de nota 4-5 com as de nota 1-2.
  const boas = lista.filter((n) => n.qualidade >= 4);
  const ruins = lista.filter((n) => n.qualidade <= 2);
  if (boas.length >= 2 && ruins.length >= 2) {
    const mediaDe = (ns: Noite[]) => ns.map((n) => { const m = minutosDe(n.deitou); return m < 720 ? m + 1440 : m; }).reduce((s, p) => s + p, 0) / ns.length;
    const diferenca = Math.round(mediaDe(ruins) - mediaDe(boas));
    if (diferenca >= 30) achados.push({ titulo: 'Suas noites boas começam mais cedo', texto: `Nas noites que você avaliou bem, deitou em média ${horasTexto(diferenca)} antes das noites ruins (por volta de ${horaDe(mediaDe(boas))}).`, tom: 'neutro' });
  }

  if (r.dividaMin >= 180) achados.push({ titulo: `${horasTexto(r.dividaMin)} de sono a menos em ${r.noites} noites`, texto: 'Não precisa "pagar" tudo de uma vez. Meia hora mais cedo por alguns dias resolve melhor do que uma manhã inteira na cama.', tom: 'atencao' });
  return achados;
}

export interface DicaSono { id: string; titulo: string; texto: string }

/** Hábitos de sono recomendados pelo CDC e pela AASM, em linguagem do Plim. */
export const DICAS_SONO: DicaSono[] = [
  { id: 'horario', titulo: 'Mesma hora todo dia', texto: 'Deitar e acordar no mesmo horário, inclusive no fim de semana, é o hábito que mais organiza o sono.' },
  { id: 'telas', titulo: 'Tela desligada 30 minutos antes', texto: 'Celular, TV e computador ficam fora da última meia hora. Deixe o carregador longe da cama.' },
  { id: 'cafe', titulo: 'Café só até o começo da tarde', texto: 'Cafeína à tarde ou à noite atrapalha pegar no sono. Vale para café, energético, mate e refrigerante de cola.' },
  { id: 'quarto', titulo: 'Quarto escuro, quieto e fresco', texto: 'Cortina fechada, pouca luz e temperatura agradável. Se dá para ler sem acender nada, ainda está claro demais.' },
  { id: 'jantar', titulo: 'Jantar leve e sem álcool perto de deitar', texto: 'Refeição pesada e bebida alcoólica perto da hora de dormir pioram a noite, mesmo quando dão sono.' },
  { id: 'corpo', titulo: 'Mexer o corpo durante o dia', texto: 'Atividade física regular ajuda a dormir melhor. Uma caminhada já conta.' },
  { id: 'cama', titulo: 'Sem sono? Saia da cama', texto: 'Se passou uns 20 minutos e o sono não veio, levante, faça algo calmo com pouca luz e volte quando o sono aparecer.' },
];

/** Quando o padrão anotado pede olhar de um profissional. O Plim avisa, não diagnostica. */
export const AVISO_SONO = 'O Plim ajuda a criar hábito, não trata problema de sono. Se você dorme mal há semanas, ronca alto, acorda sufocado ou vive com sono de dia mesmo dormindo bastante, converse com um médico.';
