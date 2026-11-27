/**
 * Grupo: as conversas com o servidor (Supabase).
 * Todas as funções lançam erro quando algo falha; quem decide o que mostrar é a loja (grupoStore).
 * `GrupoFora` quer dizer "o Grupo online ainda não existe neste banco" (migração 007 não rodou):
 * a loja cai para a prévia local em vez de mostrar erro.
 */
import { caminhoDaImagem, somarReacoes, type Autor, type Comentario, type CorStory, type Post, type Story, type Visita } from '@/lib/grupo';
import { bytesDoBase64 } from '@/lib/grupoImagem';
import { supabase } from '@/lib/supabase';

export class GrupoFora extends Error {}

const CODIGOS_FORA = new Set(['PGRST205', 'PGRST204', 'PGRST202', 'PGRST200', '42P01', '42703', '42501', '42883']);

function conferir<T>(resposta: { data: T; error: { code?: string; message: string } | null }): T {
  const { data, error } = resposta;
  if (!error) return data;
  if ((error.code && CODIGOS_FORA.has(error.code)) || /schema cache/i.test(error.message)) throw new GrupoFora(error.message);
  throw new Error(error.message);
}

const BALDE = 'grupo';
const enderecoDaImagem = (caminho: string | null): string | null => (caminho ? supabase.storage.from(BALDE).getPublicUrl(caminho).data.publicUrl : null);
const DESCONHECIDO = (id: string): Autor => ({ id, apelido: 'Alguém do Plim', avatar: null });

async function autores(ids: string[]): Promise<Record<string, Autor>> {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return {};
  const linhas = conferir(await supabase.from('grupo_perfis').select('user_id, apelido, avatar').in('user_id', unicos)) ?? [];
  return Object.fromEntries(linhas.map((l) => [l.user_id as string, { id: l.user_id as string, apelido: l.apelido as string, avatar: l.avatar }]));
}

/** O Grupo online existe e responde? */
export async function sondar(): Promise<void> {
  conferir(await supabase.from('grupo_perfis').select('user_id').limit(1));
}

// ───────────────────────── cartão da pessoa ─────────────────────────

export interface MeuCartao { apelido: string; bio: string | null; avatar: unknown; discreto: boolean; instagram: string | null }

/** Grava o cartão público de quem está logado (apelido, bio, boneco) e o Instagram. */
export async function salvarMeuCartao(eu: string, c: MeuCartao): Promise<void> {
  conferir(await supabase.from('grupo_perfis').upsert({ user_id: eu, apelido: c.apelido, bio: c.bio, avatar: c.avatar ?? {}, discreto: c.discreto, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' }));
  if (c.instagram) conferir(await supabase.from('grupo_instagram').upsert({ user_id: eu, usuario: c.instagram }, { onConflict: 'user_id' }));
  else conferir(await supabase.from('grupo_instagram').delete().eq('user_id', eu));
}

export async function lerMeuCartao(eu: string): Promise<{ discreto: boolean } | null> {
  const linha = conferir(await supabase.from('grupo_perfis').select('discreto').eq('user_id', eu).maybeSingle());
  return linha ? { discreto: !!linha.discreto } : null;
}

// ───────────────────────── feed ─────────────────────────

interface LinhaPost { id: string; user_id: string; conteudo: string; imagem_path: string | null; local: string | null; created_at: string }

async function montarPosts(linhas: LinhaPost[], eu: string): Promise<Post[]> {
  if (!linhas.length) return [];
  const ids = linhas.map((l) => l.id);
  const [reacoes, comentarios, quem] = await Promise.all([
    supabase.from('grupo_reacoes').select('post_id, user_id, emoji').in('post_id', ids).then(conferir),
    supabase.from('grupo_comentarios').select('post_id').in('post_id', ids).then(conferir),
    autores(linhas.map((l) => l.user_id)),
  ]);
  const soma = somarReacoes((reacoes ?? []) as { post_id: string; user_id: string; emoji: string }[], eu);
  const total: Record<string, number> = {};
  for (const c of comentarios ?? []) total[c.post_id as string] = (total[c.post_id as string] ?? 0) + 1;
  return linhas.map((l) => ({
    id: l.id,
    autor: quem[l.user_id] ?? DESCONHECIDO(l.user_id),
    texto: l.conteudo,
    imagem: enderecoDaImagem(l.imagem_path),
    local: l.local,
    criadoEm: l.created_at,
    reacoes: soma[l.id]?.reacoes ?? {},
    minhaReacao: soma[l.id]?.minha ?? null,
    comentarios: total[l.id] ?? 0,
    meu: l.user_id === eu,
  }));
}

const CAMPOS_POST = 'id, user_id, conteudo, imagem_path, local, created_at';

export async function lerFeed(eu: string, quantos = 40): Promise<Post[]> {
  const linhas = conferir(await supabase.from('posts_comunidade').select(CAMPOS_POST).order('created_at', { ascending: false }).limit(quantos));
  return montarPosts((linhas ?? []) as LinhaPost[], eu);
}

export async function lerPostsDe(pessoa: string, eu: string, quantos = 30): Promise<Post[]> {
  const linhas = conferir(await supabase.from('posts_comunidade').select(CAMPOS_POST).eq('user_id', pessoa).order('created_at', { ascending: false }).limit(quantos));
  return montarPosts((linhas ?? []) as LinhaPost[], eu);
}

export async function lerPost(id: string, eu: string): Promise<Post | null> {
  const linha = conferir(await supabase.from('posts_comunidade').select(CAMPOS_POST).eq('id', id).maybeSingle());
  return linha ? (await montarPosts([linha as LinhaPost], eu))[0] : null;
}

/** Envia a imagem para a pasta da pessoa e devolve o caminho. */
export async function enviarImagem(eu: string, base64: string): Promise<string> {
  const caminho = caminhoDaImagem(eu, Date.now());
  const { error } = await supabase.storage.from(BALDE).upload(caminho, bytesDoBase64(base64), { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new GrupoFora(error.message);
    throw new Error(error.message);
  }
  return caminho;
}

async function apagarImagem(caminho: string | null) {
  if (caminho) await supabase.storage.from(BALDE).remove([caminho]).catch(() => {});
}

export async function publicarPost(eu: string, p: { texto: string; local: string | null; imagemBase64: string | null }): Promise<string> {
  const imagem_path = p.imagemBase64 ? await enviarImagem(eu, p.imagemBase64) : null;
  try {
    const linha = conferir(await supabase.from('posts_comunidade').insert({ user_id: eu, tipo: 'texto', conteudo: p.texto, local: p.local, imagem_path }).select('id').single());
    return linha!.id as string;
  } catch (e) {
    await apagarImagem(imagem_path); // o post não entrou: a imagem não fica órfã
    throw e;
  }
}

export async function apagarPost(id: string): Promise<void> {
  const linha = conferir(await supabase.from('posts_comunidade').delete().eq('id', id).select('imagem_path').maybeSingle());
  await apagarImagem((linha?.imagem_path as string | null) ?? null);
}

/** `emoji` null tira a reação. */
export async function reagir(eu: string, postId: string, emoji: string | null): Promise<void> {
  if (emoji) conferir(await supabase.from('grupo_reacoes').upsert({ post_id: postId, user_id: eu, emoji }, { onConflict: 'post_id,user_id' }));
  else conferir(await supabase.from('grupo_reacoes').delete().eq('post_id', postId).eq('user_id', eu));
}

// ───────────────────────── comentários ─────────────────────────

export async function lerComentarios(postId: string, eu: string): Promise<Comentario[]> {
  const linhas = conferir(await supabase.from('grupo_comentarios').select('id, post_id, user_id, texto, criado_em').eq('post_id', postId).order('criado_em', { ascending: true }).limit(200)) ?? [];
  const quem = await autores(linhas.map((l) => l.user_id as string));
  return linhas.map((l) => ({ id: l.id as string, postId: l.post_id as string, autor: quem[l.user_id as string] ?? DESCONHECIDO(l.user_id as string), texto: l.texto as string, criadoEm: l.criado_em as string, meu: l.user_id === eu }));
}

export async function comentar(eu: string, postId: string, texto: string): Promise<string> {
  const linha = conferir(await supabase.from('grupo_comentarios').insert({ post_id: postId, user_id: eu, texto }).select('id').single());
  return linha!.id as string;
}

export async function apagarComentario(id: string): Promise<void> {
  conferir(await supabase.from('grupo_comentarios').delete().eq('id', id));
}

// ───────────────────────── stories ─────────────────────────

interface LinhaStory { id: string; user_id: string; imagem_path: string | null; texto: string | null; local: string | null; cor: CorStory; criado_em: string; expira_em: string }
const CAMPOS_STORY = 'id, user_id, imagem_path, texto, local, cor, criado_em, expira_em';

async function montarStories(linhas: LinhaStory[], eu: string): Promise<Story[]> {
  const quem = await autores(linhas.map((l) => l.user_id));
  return linhas.map((l) => ({ id: l.id, autor: quem[l.user_id] ?? DESCONHECIDO(l.user_id), imagem: enderecoDaImagem(l.imagem_path), texto: l.texto, local: l.local, cor: l.cor, criadoEm: l.criado_em, expiraEm: l.expira_em, meu: l.user_id === eu }));
}

/** Stories de hoje de todo mundo. De passagem, limpa os vencidos de quem está logado. */
export async function lerStories(eu: string): Promise<Story[]> {
  const agora = new Date().toISOString();
  const linhas = (conferir(await supabase.from('grupo_stories').select(CAMPOS_STORY).order('criado_em', { ascending: true }).limit(300)) ?? []) as LinhaStory[];
  const vencidos = linhas.filter((l) => l.expira_em <= agora && l.user_id === eu);
  if (vencidos.length) {
    void supabase.from('grupo_stories').delete().in('id', vencidos.map((l) => l.id)).then(() => {});
    void supabase.storage.from(BALDE).remove(vencidos.map((l) => l.imagem_path).filter((c): c is string => !!c)).then(() => {}, () => {});
  }
  return montarStories(linhas.filter((l) => l.expira_em > agora), eu);
}

export async function lerStoriesDe(pessoa: string, eu: string): Promise<Story[]> {
  const agora = new Date().toISOString();
  const linhas = (conferir(await supabase.from('grupo_stories').select(CAMPOS_STORY).eq('user_id', pessoa).gt('expira_em', agora).order('criado_em', { ascending: true })) ?? []) as LinhaStory[];
  return montarStories(linhas, eu);
}

export async function publicarStory(eu: string, s: { texto: string | null; local: string | null; cor: CorStory; imagemBase64: string | null }): Promise<string> {
  const imagem_path = s.imagemBase64 ? await enviarImagem(eu, s.imagemBase64) : null;
  try {
    const linha = conferir(await supabase.from('grupo_stories').insert({ user_id: eu, texto: s.texto, local: s.local, cor: s.cor, imagem_path }).select('id').single());
    return linha!.id as string;
  } catch (e) {
    await apagarImagem(imagem_path);
    throw e;
  }
}

export async function apagarStory(id: string): Promise<void> {
  const linha = conferir(await supabase.from('grupo_stories').delete().eq('id', id).select('imagem_path').maybeSingle());
  await apagarImagem((linha?.imagem_path as string | null) ?? null);
}

// ───────────────────────── perfil dos outros e visitas ─────────────────────────

export interface Pessoa {
  autor: Autor;
  bio: string | null;
  /** Só chega para quem assina o Pro (o banco não entrega para o grátis). */
  instagram: string | null;
  posts: Post[];
  stories: Story[];
}

export async function lerPessoa(pessoa: string, eu: string): Promise<Pessoa | null> {
  const cartao = conferir(await supabase.from('grupo_perfis').select('user_id, apelido, bio, avatar').eq('user_id', pessoa).maybeSingle());
  if (!cartao) return null;
  const [insta, posts, stories] = await Promise.all([
    supabase.from('grupo_instagram').select('usuario').eq('user_id', pessoa).maybeSingle().then(conferir),
    lerPostsDe(pessoa, eu),
    lerStoriesDe(pessoa, eu),
  ]);
  return {
    autor: { id: cartao.user_id as string, apelido: cartao.apelido as string, avatar: cartao.avatar },
    bio: (cartao.bio as string | null) ?? null,
    instagram: (insta?.usuario as string | undefined) ?? null,
    posts,
    stories,
  };
}

/** Deixa registrado que passei no perfil de alguém (uma vez por dia). Em modo discreto o banco recusa, e tudo bem. */
export async function registrarVisita(eu: string, pessoa: string): Promise<void> {
  if (eu === pessoa) return;
  await supabase.from('grupo_visitas').upsert({ perfil_id: pessoa, visitante_id: eu }, { onConflict: 'perfil_id,visitante_id,dia', ignoreDuplicates: true });
}

/** Quantas pessoas diferentes visitaram meu perfil em 30 dias (todo mundo vê o número). */
export async function totalDeVisitas(): Promise<number> {
  return Number(conferir(await supabase.rpc('grupo_total_visitas')) ?? 0);
}

/** Quem visitou (só volta alguma coisa para quem assina o Pro). */
export async function quemVisitou(eu: string): Promise<Visita[]> {
  const linhas = conferir(await supabase.from('grupo_visitas').select('visitante_id, visto_em').eq('perfil_id', eu).order('visto_em', { ascending: false }).limit(60)) ?? [];
  const quem = await autores(linhas.map((l) => l.visitante_id as string));
  const vistos = new Set<string>();
  const lista: Visita[] = [];
  for (const l of linhas) {
    const id = l.visitante_id as string;
    if (vistos.has(id)) continue;
    vistos.add(id);
    lista.push({ autor: quem[id] ?? DESCONHECIDO(id), vistoEm: l.visto_em as string });
  }
  return lista;
}

// ───────────────────────── denúncia ─────────────────────────

export async function denunciar(eu: string, tipo: 'post' | 'comentario' | 'story' | 'perfil', id: string, motivo: string | null): Promise<void> {
  conferir(await supabase.from('grupo_denuncias').insert({ autor_id: eu, alvo_tipo: tipo, alvo_id: id, motivo }));
}

// ───────────────────────── sair do Grupo ─────────────────────────

/** Apaga tudo o que a pessoa publicou no Grupo: posts, stories, comentários, reações, visitas, Instagram e o cartão. */
export async function sairDoGrupo(eu: string): Promise<void> {
  const [posts, stories] = await Promise.all([
    supabase.from('posts_comunidade').select('imagem_path').eq('user_id', eu).then(conferir),
    supabase.from('grupo_stories').select('imagem_path').eq('user_id', eu).then(conferir),
  ]);
  const imagens = [...(posts ?? []), ...(stories ?? [])].map((l) => l.imagem_path as string | null).filter((c): c is string => !!c);
  conferir(await supabase.from('posts_comunidade').delete().eq('user_id', eu));
  conferir(await supabase.from('grupo_stories').delete().eq('user_id', eu));
  conferir(await supabase.from('grupo_comentarios').delete().eq('user_id', eu));
  conferir(await supabase.from('grupo_reacoes').delete().eq('user_id', eu));
  conferir(await supabase.from('grupo_visitas').delete().or(`visitante_id.eq.${eu},perfil_id.eq.${eu}`));
  conferir(await supabase.from('grupo_instagram').delete().eq('user_id', eu));
  conferir(await supabase.from('grupo_perfis').delete().eq('user_id', eu));
  if (imagens.length) await supabase.storage.from(BALDE).remove(imagens).catch(() => {});
}
