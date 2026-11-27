/**
 * Grupo: as regras que não dependem de tela nem de servidor (por isso têm teste).
 * Quem pode comentar, como as reações somam, quanto tempo dura um story, como o tempo é escrito.
 *
 * As mesmas regras valem no servidor (supabase/migrations/007_grupo.sql): o app esconde o
 * botão, o banco recusa quem tentar por fora.
 */

/** Emojis de reação. A lista é a mesma da migração 007: mudar aqui pede mudar lá. */
export const EMOJIS = [
  '💜', '🔥', '👏', '💪', '🎉', '🫂', '😂', '😮', '😢', '🙏', '🌱', '⭐',
  '🚀', '🧠', '☕', '🤝', '💡', '🥹', '😍', '🤯', '✨', '🏆', '🍀', '👀',
] as const;

export const LIMITE = { texto: 500, comentario: 300, local: 60, story: 200, bio: 160, apelido: 30 } as const;

export const CORES_STORY = ['roxo', 'laranja', 'verde', 'azul', 'rosa', 'ouro'] as const;
export type CorStory = (typeof CORES_STORY)[number];

export interface Autor {
  id: string;
  apelido: string;
  /** Configuração do boneco (o componente do avatar aceita qualquer coisa e normaliza). */
  avatar: unknown;
}

export interface Post {
  id: string;
  autor: Autor;
  texto: string;
  /** Endereço da imagem (ou a própria imagem em base64, na prévia local). */
  imagem: string | null;
  local: string | null;
  criadoEm: string;
  /** Quantas pessoas reagiram com cada emoji. */
  reacoes: Record<string, number>;
  minhaReacao: string | null;
  comentarios: number;
  meu: boolean;
  /** Post de demonstração: ninguém de verdade escreveu. */
  exemplo?: boolean;
}

export interface Comentario {
  id: string;
  postId: string;
  autor: Autor;
  texto: string;
  criadoEm: string;
  meu: boolean;
}

export interface Story {
  id: string;
  autor: Autor;
  imagem: string | null;
  texto: string | null;
  local: string | null;
  cor: CorStory;
  criadoEm: string;
  expiraEm: string;
  meu: boolean;
}

export interface Visita {
  autor: Autor;
  vistoEm: string;
}

// ───────────────────────── quem pode o quê ─────────────────────────

/**
 * Comentário escrito: no grátis, só no próprio post (para responder quem comentou).
 * Em post de outra pessoa, comentar é do Pro. Reagir com emoji é de todo mundo.
 */
export function podeComentar(ehPro: boolean, postEhMeu: boolean): boolean {
  return ehPro || postEhMeu;
}

// ───────────────────────── reações ─────────────────────────

/** Uma reação por pessoa em cada post: tocar no mesmo emoji tira; tocar em outro troca. */
export function trocarReacao(reacoes: Record<string, number>, minha: string | null, emoji: string): { reacoes: Record<string, number>; minha: string | null } {
  const novo = { ...reacoes };
  const tirar = (e: string) => {
    const n = (novo[e] ?? 0) - 1;
    if (n > 0) novo[e] = n;
    else delete novo[e];
  };
  if (minha) tirar(minha);
  if (minha === emoji) return { reacoes: novo, minha: null };
  novo[emoji] = (novo[emoji] ?? 0) + 1;
  return { reacoes: novo, minha: emoji };
}

/** Os emojis mais usados no post (para mostrar em fila) e o total de reações. */
export function resumoReacoes(reacoes: Record<string, number>, quantos = 3): { emojis: string[]; total: number } {
  const validos = Object.entries(reacoes).filter(([, n]) => n > 0);
  const ordem = (EMOJIS as readonly string[]);
  const emojis = validos
    .sort((a, b) => b[1] - a[1] || ordem.indexOf(a[0]) - ordem.indexOf(b[0]))
    .slice(0, quantos)
    .map(([e]) => e);
  return { emojis, total: validos.reduce((s, [, n]) => s + n, 0) };
}

/** Soma as reações que vieram do banco (uma linha por pessoa) e acha a de quem está logado. */
export function somarReacoes(linhas: { post_id: string; user_id: string; emoji: string }[], eu: string | null): Record<string, { reacoes: Record<string, number>; minha: string | null }> {
  const porPost: Record<string, { reacoes: Record<string, number>; minha: string | null }> = {};
  for (const l of linhas) {
    const p = (porPost[l.post_id] ??= { reacoes: {}, minha: null });
    p.reacoes[l.emoji] = (p.reacoes[l.emoji] ?? 0) + 1;
    if (eu && l.user_id === eu) p.minha = l.emoji;
  }
  return porPost;
}

// ───────────────────────── stories ─────────────────────────

export const DURACAO_STORY_MS = 24 * 60 * 60 * 1000;

export function storyAtivo(s: Pick<Story, 'expiraEm'>, agora: number): boolean {
  return new Date(s.expiraEm).getTime() > agora;
}

/** "some em 5 h", "some em 20 min". */
export function quandoSome(expiraEm: string, agora: number): string {
  const min = Math.max(1, Math.round((new Date(expiraEm).getTime() - agora) / 60000));
  return min >= 60 ? `some em ${Math.round(min / 60)} h` : `some em ${min} min`;
}

export interface FilaDeStories {
  autor: Autor;
  /** Do mais antigo para o mais novo, como a pessoa postou. */
  stories: Story[];
  meu: boolean;
  /** Tem algum que a pessoa ainda não abriu. */
  novo: boolean;
}

/**
 * Junta os stories por pessoa para a fileira de bolinhas: primeiro os meus,
 * depois quem tem novidade, depois os já vistos; em cada faixa, o mais recente antes.
 */
export function agruparStories(stories: Story[], vistos: ReadonlySet<string>, agora: number): FilaDeStories[] {
  const filas = new Map<string, FilaDeStories>();
  for (const s of stories) {
    if (!storyAtivo(s, agora)) continue;
    let f = filas.get(s.autor.id);
    if (!f) { f = { autor: s.autor, stories: [], meu: s.meu, novo: false }; filas.set(s.autor.id, f); }
    f.stories.push(s);
    if (!vistos.has(s.id)) f.novo = true;
  }
  const lista = [...filas.values()];
  for (const f of lista) f.stories.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const ultimo = (f: FilaDeStories) => f.stories[f.stories.length - 1].criadoEm;
  const peso = (f: FilaDeStories) => (f.meu ? 0 : f.novo ? 1 : 2);
  return lista.sort((a, b) => peso(a) - peso(b) || ultimo(b).localeCompare(ultimo(a)));
}

/** Por onde começar ao abrir a fila de alguém: no primeiro story que a pessoa ainda não viu. */
export function primeiroNaoVisto(fila: FilaDeStories, vistos: ReadonlySet<string>): number {
  const i = fila.stories.findIndex((s) => !vistos.has(s.id));
  return i < 0 ? 0 : i;
}

// ───────────────────────── textos ─────────────────────────

/** Tira espaços das pontas, junta quebras de linha demais e corta no limite. */
export function limparTexto(bruto: string, max: number): string {
  return bruto.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

/** Uma linha só (lugar, apelido). */
export function limparLinha(bruto: string, max: number): string {
  return bruto.replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Aceita "@nome", "nome" ou o endereço do perfil e devolve só o nome de usuário,
 * ou null se não parecer um usuário do Instagram.
 */
export function limparInstagram(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  let t = bruto.trim();
  const doEndereco = t.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (doEndereco) t = doEndereco[1];
  t = t.replace(/^@+/, '').replace(/\/+$/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(t) ? t : null;
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias", "12 de mar." */
export function tempoRelativo(iso: string, agora: number): string {
  const quando = new Date(iso).getTime();
  if (Number.isNaN(quando)) return '';
  const min = Math.floor((agora - quando) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  const d = new Date(quando);
  const meses = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  return `${d.getDate()} de ${meses[d.getMonth()]}`;
}

/** "1 comentário", "3 comentários". */
export function contar(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

// ───────────────────────── imagens ─────────────────────────

/** Caminho da imagem no balde: a pasta é sempre o id de quem enviou (o banco confere). */
export function caminhoDaImagem(uid: string, agora: number, sorteio: number = Math.random()): string {
  const acaso = Math.floor(sorteio * 36 ** 6).toString(36).padStart(6, '0');
  return `${uid}/f_${agora.toString(36)}_${acaso}.jpg`;
}

export const CAMINHO_VALIDO = /^[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,64}\.(jpg|webp|png)$/;
