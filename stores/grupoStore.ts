import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { DURACAO_STORY_MS, limparInstagram, limparLinha, limparTexto, LIMITE, podeComentar, storyAtivo, trocarReacao, type Autor, type Comentario, type CorStory, type Post, type Story } from '@/lib/grupo';
import * as api from '@/lib/grupoApi';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';

/**
 * O Grupo tem dois modos:
 *  - 'online': a pessoa está logada e o banco já tem o Grupo (migração 007). É o grupo de verdade.
 *  - 'local' : sem login ou sem o Grupo no banco. Tudo o que a pessoa publica fica só neste
 *              aparelho, junto de posts de exemplo, e a tela avisa isso com todas as letras.
 */
export type Modo = 'carregando' | 'online' | 'local';

export interface NovoPost { texto: string; local: string; imagem: { dataUri: string; base64: string } | null }
export interface NovoStory { texto: string; local: string; cor: CorStory; imagem: { dataUri: string; base64: string } | null }

interface GrupoState {
  modo: Modo;
  /** Online: a pessoa já aceitou aparecer no Grupo (tem cartão público)? */
  participa: boolean;
  discreto: boolean;
  posts: Post[];
  stories: Story[];
  /** Stories que já abri (ids). */
  vistos: string[];
  comentarios: Record<string, Comentario[]>;
  atualizando: boolean;
  /** Última falha de rede, em frase para a tela. */
  falha: string | null;

  carregar: () => Promise<void>;
  entrar: () => Promise<boolean>;
  sincronizarCartao: () => Promise<void>;
  definirDiscreto: (v: boolean) => Promise<void>;
  sair: () => Promise<boolean>;
  publicar: (p: NovoPost) => Promise<boolean>;
  apagarPost: (id: string) => Promise<void>;
  reagir: (postId: string, emoji: string) => void;
  abrirComentarios: (postId: string) => Promise<void>;
  comentar: (postId: string, texto: string) => Promise<boolean>;
  apagarComentario: (postId: string, id: string) => Promise<void>;
  publicarStory: (s: NovoStory) => Promise<boolean>;
  apagarStory: (id: string) => Promise<void>;
  marcarVisto: (id: string) => void;
  /** Troca um post na lista (quando a tela de uma pessoa ou de um post muda algo). */
  trocarPost: (p: Post) => void;
}

const eu = () => useAuthStore.getState().session?.user?.id ?? null;
const ehPro = () => useUserStore.getState().profile.plano === 'pro';

export function euComoAutor(): Autor {
  const p = useUserStore.getState().profile;
  return { id: eu() ?? 'eu', apelido: limparLinha(p.apelido ?? p.nome ?? '', LIMITE.apelido) || 'Você', avatar: p.avatar_config };
}

const idLocal = () => `local-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
const FALHA_REDE = 'Não deu para falar com o servidor. Confira a internet e tente de novo.';

const EXEMPLOS: Post[] = [
  { id: 'exemplo-1', autor: { id: 'exemplo-ana', apelido: 'Ana', avatar: { cabelo: 'coque', corMoletom: 'EA580C', fundo: 'FFE9D6' } }, texto: 'Completei minha rotina da manhã por 7 dias seguidos. Parece pequeno, mas para mim é enorme.', imagem: null, local: 'Curitiba, PR', criadoEm: new Date(Date.now() - 3 * 3600_000).toISOString(), reacoes: { '👏': 12, '🔥': 8, '🥹': 5 }, minhaReacao: null, comentarios: 0, meu: false, exemplo: true },
  { id: 'exemplo-2', autor: { id: 'exemplo-leo', apelido: 'Léo', avatar: { cabelo: 'curto', corMoletom: '0E9F6E', fundo: 'DDF6EA' } }, texto: 'Hoje foi difícil. Não consegui nem começar o que tinha planejado. Amanhã eu tento de novo, começando pela tarefa mais fácil.', imagem: null, local: null, criadoEm: new Date(Date.now() - 26 * 3600_000).toISOString(), reacoes: { '🫂': 24, '💪': 18 }, minhaReacao: null, comentarios: 0, meu: false, exemplo: true },
];

export const useGrupoStore = create<GrupoState>((set, get) => ({
  modo: 'carregando',
  participa: false,
  discreto: false,
  posts: [],
  stories: [],
  vistos: [],
  comentarios: {},
  atualizando: false,
  falha: null,

  carregar: async () => {
    if (get().atualizando) return;
    set({ atualizando: true, falha: null });
    await localPronto;
    const id = eu();
    if (!id) { set({ modo: 'local', atualizando: false, ...lerLocal() }); return; }
    try {
      const [cartao, posts, stories] = await Promise.all([api.lerMeuCartao(id), api.lerFeed(id), api.lerStories(id)]);
      set({ modo: 'online', participa: !!cartao, discreto: cartao?.discreto ?? false, posts, stories, atualizando: false });
      if (cartao) void get().sincronizarCartao();
    } catch (e) {
      if (e instanceof api.GrupoFora) set({ modo: 'local', atualizando: false, ...lerLocal() });
      else if (get().modo === 'carregando') set({ modo: 'local', atualizando: false, falha: FALHA_REDE, ...lerLocal() });
      else set({ atualizando: false, falha: FALHA_REDE });
    }
  },

  entrar: async () => {
    const id = eu();
    if (!id || get().modo !== 'online') return false;
    try {
      await enviarCartao(id, get().discreto);
      set({ participa: true });
      return true;
    } catch {
      set({ falha: FALHA_REDE });
      return false;
    }
  },

  sincronizarCartao: async () => {
    const id = eu();
    if (!id || get().modo !== 'online' || !get().participa) return;
    try { await enviarCartao(id, get().discreto); } catch { /* tenta de novo na próxima vez */ }
  },

  definirDiscreto: async (v) => {
    const antes = get().discreto;
    set({ discreto: v });
    const id = eu();
    if (!id || get().modo !== 'online' || !get().participa) return;
    try { await enviarCartao(id, v); } catch { set({ discreto: antes, falha: FALHA_REDE }); }
  },

  sair: async () => {
    const id = eu();
    if (get().modo !== 'online' || !id) {
      set({ posts: EXEMPLOS, stories: [], comentarios: {}, vistos: [] });
      return true;
    }
    try {
      await api.sairDoGrupo(id);
      set({ participa: false, discreto: false });
      await get().carregar();
      return true;
    } catch {
      set({ falha: FALHA_REDE });
      return false;
    }
  },

  publicar: async (p) => {
    const texto = limparTexto(p.texto, LIMITE.texto);
    const local = limparLinha(p.local, LIMITE.local) || null;
    if (!texto && !p.imagem) return false;
    const id = eu();
    if (get().modo === 'online' && id) {
      try {
        const novoId = await api.publicarPost(id, { texto, local, imagemBase64: p.imagem?.base64 ?? null });
        const novo = await api.lerPost(novoId, id);
        if (novo) set((s) => ({ posts: [novo, ...s.posts] }));
        return true;
      } catch {
        set({ falha: FALHA_REDE });
        return false;
      }
    }
    const novo: Post = { id: idLocal(), autor: euComoAutor(), texto, imagem: p.imagem?.dataUri ?? null, local, criadoEm: new Date().toISOString(), reacoes: {}, minhaReacao: null, comentarios: 0, meu: true };
    set((s) => ({ posts: [novo, ...s.posts] }));
    return true;
  },

  apagarPost: async (postId) => {
    const antes = get().posts;
    set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) }));
    if (get().modo !== 'online') return;
    try { await api.apagarPost(postId); } catch { set({ posts: antes, falha: FALHA_REDE }); }
  },

  reagir: (postId, emoji) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const antes = { reacoes: post.reacoes, minhaReacao: post.minhaReacao };
    const r = trocarReacao(post.reacoes, post.minhaReacao, emoji);
    const aplicar = (reacoes: Record<string, number>, minhaReacao: string | null) =>
      set((s) => ({ posts: s.posts.map((p) => (p.id === postId ? { ...p, reacoes, minhaReacao } : p)) }));
    aplicar(r.reacoes, r.minha);
    const id = eu();
    if (get().modo !== 'online' || !id || post.exemplo) return;
    api.reagir(id, postId, r.minha).catch(() => { aplicar(antes.reacoes, antes.minhaReacao); set({ falha: FALHA_REDE }); });
  },

  abrirComentarios: async (postId) => {
    const id = eu();
    if (get().modo !== 'online' || !id) return;
    try {
      const lista = await api.lerComentarios(postId, id);
      set((s) => ({ comentarios: { ...s.comentarios, [postId]: lista }, posts: s.posts.map((p) => (p.id === postId ? { ...p, comentarios: lista.length } : p)) }));
    } catch {
      set({ falha: FALHA_REDE });
    }
  },

  comentar: async (postId, bruto) => {
    const texto = limparTexto(bruto, LIMITE.comentario);
    const post = get().posts.find((p) => p.id === postId);
    // Sem o post na lista (tela de outra pessoa), quem decide é o servidor.
    if (!texto || (post && !podeComentar(ehPro(), post.meu))) return false;
    const somar = (c: Comentario) => set((s) => ({
      comentarios: { ...s.comentarios, [postId]: [...(s.comentarios[postId] ?? []), c] },
      posts: s.posts.map((p) => (p.id === postId ? { ...p, comentarios: p.comentarios + 1 } : p)),
    }));
    const id = eu();
    if (get().modo === 'online' && id) {
      try {
        const novoId = await api.comentar(id, postId, texto);
        somar({ id: novoId, postId, autor: euComoAutor(), texto, criadoEm: new Date().toISOString(), meu: true });
        return true;
      } catch {
        set({ falha: 'O comentário não foi enviado. Tente de novo.' });
        return false;
      }
    }
    somar({ id: idLocal(), postId, autor: euComoAutor(), texto, criadoEm: new Date().toISOString(), meu: true });
    return true;
  },

  apagarComentario: async (postId, comentarioId) => {
    const antes = get().comentarios[postId] ?? [];
    set((s) => ({
      comentarios: { ...s.comentarios, [postId]: antes.filter((c) => c.id !== comentarioId) },
      posts: s.posts.map((p) => (p.id === postId ? { ...p, comentarios: Math.max(0, p.comentarios - 1) } : p)),
    }));
    if (get().modo !== 'online') return;
    try { await api.apagarComentario(comentarioId); } catch {
      set((s) => ({ comentarios: { ...s.comentarios, [postId]: antes }, posts: s.posts.map((p) => (p.id === postId ? { ...p, comentarios: antes.length } : p)), falha: FALHA_REDE }));
    }
  },

  publicarStory: async (n) => {
    const texto = limparTexto(n.texto, LIMITE.story) || null;
    const local = limparLinha(n.local, LIMITE.local) || null;
    if (!texto && !n.imagem) return false;
    const id = eu();
    if (get().modo === 'online' && id) {
      try {
        await api.publicarStory(id, { texto, local, cor: n.cor, imagemBase64: n.imagem?.base64 ?? null });
        const stories = await api.lerStories(id);
        set({ stories });
        return true;
      } catch {
        set({ falha: FALHA_REDE });
        return false;
      }
    }
    const agora = Date.now();
    const novo: Story = { id: idLocal(), autor: euComoAutor(), imagem: n.imagem?.dataUri ?? null, texto, local, cor: n.cor, criadoEm: new Date(agora).toISOString(), expiraEm: new Date(agora + DURACAO_STORY_MS).toISOString(), meu: true };
    set((s) => ({ stories: [...s.stories, novo] }));
    return true;
  },

  apagarStory: async (storyId) => {
    const antes = get().stories;
    set((s) => ({ stories: s.stories.filter((x) => x.id !== storyId) }));
    if (get().modo !== 'online') return;
    try { await api.apagarStory(storyId); } catch { set({ stories: antes, falha: FALHA_REDE }); }
  },

  marcarVisto: (storyId) => {
    if (get().vistos.includes(storyId)) return;
    set((s) => ({ vistos: [...s.vistos, storyId].slice(-400) }));
  },

  trocarPost: (p) => set((s) => ({ posts: s.posts.map((x) => (x.id === p.id ? p : x)) })),
}));

async function enviarCartao(id: string, discreto: boolean) {
  const p = useUserStore.getState().profile;
  await api.salvarMeuCartao(id, {
    apelido: euComoAutor().apelido,
    bio: p.bio ? limparTexto(p.bio, LIMITE.bio) : null,
    avatar: p.avatar_config,
    discreto,
    instagram: limparInstagram(p.instagram),
  });
}

// ───────────────────────── o que fica guardado no aparelho ─────────────────────────

const CHAVE = 'plim-grupo-local';
/** Quantas imagens a prévia local guarda (cada uma pesa no armazenamento do navegador). */
const MAX_IMAGENS_LOCAIS = 4;

interface Guardado { posts: Post[]; stories: Story[]; comentarios: Record<string, Comentario[]>; vistos: string[]; reacoesExemplo: Record<string, string> }
let guardado: Guardado = { posts: [], stories: [], comentarios: {}, vistos: [], reacoesExemplo: {} };

function lerLocal(): Pick<GrupoState, 'posts' | 'stories' | 'comentarios' | 'vistos'> {
  const agora = Date.now();
  const exemplos = EXEMPLOS.map((e) => {
    const minha = guardado.reacoesExemplo[e.id];
    return minha ? { ...e, ...(() => { const r = trocarReacao(e.reacoes, null, minha); return { reacoes: r.reacoes, minhaReacao: r.minha }; })(), comentarios: guardado.comentarios[e.id]?.length ?? 0 } : { ...e, comentarios: guardado.comentarios[e.id]?.length ?? 0 };
  });
  return {
    posts: [...guardado.posts, ...exemplos],
    stories: guardado.stories.filter((s) => storyAtivo(s, agora)),
    comentarios: guardado.comentarios,
    vistos: guardado.vistos,
  };
}

const localPronto: Promise<void> = AsyncStorage.getItem(CHAVE).then((bruto) => {
  if (!bruto) return;
  try {
    const g = JSON.parse(bruto);
    if (g && typeof g === 'object') {
      guardado = {
        posts: Array.isArray(g.posts) ? g.posts : [],
        stories: Array.isArray(g.stories) ? g.stories : [],
        comentarios: g.comentarios && typeof g.comentarios === 'object' ? g.comentarios : {},
        vistos: Array.isArray(g.vistos) ? g.vistos : [],
        reacoesExemplo: g.reacoesExemplo && typeof g.reacoesExemplo === 'object' ? g.reacoesExemplo : {},
      };
    }
  } catch {}
  useGrupoStore.setState({ vistos: guardado.vistos });
}).catch(() => {});

let _timer: ReturnType<typeof setTimeout> | null = null;
useGrupoStore.subscribe((s) => {
  if (s.modo === 'carregando') return;
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    if (s.modo === 'local') {
      let imagens = 0;
      const semPeso = <T extends { imagem: string | null }>(x: T): T => (x.imagem && ++imagens > MAX_IMAGENS_LOCAIS ? { ...x, imagem: null } : x);
      const agora = Date.now();
      const stories = s.stories.filter((x) => storyAtivo(x, agora)).slice(-10).reverse().map(semPeso).reverse();
      const posts = s.posts.filter((p) => !p.exemplo).slice(0, 30).map(semPeso);
      const ids = new Set([...posts.map((p) => p.id), ...EXEMPLOS.map((e) => e.id)]);
      guardado = {
        posts,
        stories,
        comentarios: Object.fromEntries(Object.entries(s.comentarios).filter(([id]) => ids.has(id))),
        vistos: s.vistos,
        reacoesExemplo: Object.fromEntries(s.posts.filter((p) => p.exemplo && p.minhaReacao).map((p) => [p.id, p.minhaReacao as string])),
      };
    } else {
      guardado = { ...guardado, vistos: s.vistos };
    }
    AsyncStorage.setItem(CHAVE, JSON.stringify(guardado)).catch(() => {
      // Armazenamento cheio: guarda sem as imagens em vez de perder tudo.
      const leve = { ...guardado, posts: guardado.posts.map((p) => ({ ...p, imagem: null })), stories: guardado.stories.filter((x) => x.texto).map((x) => ({ ...x, imagem: null })) };
      AsyncStorage.setItem(CHAVE, JSON.stringify(leve)).catch(() => {});
    });
  }, 400);
});

// Entrou ou saiu da conta: o Grupo muda de modo.
// Começa em "sem conta", como a loja de login. Ao abrir o app direto no Grupo, a sessão guardada
// chega depois da primeira carga: sem contar essa chegada como troca, o Grupo ficava na prévia
// local mesmo com a pessoa logada.
let ultimoUsuario: string | null = null;
useAuthStore.subscribe((a) => {
  const id = a.session?.user?.id ?? null;
  if (id !== ultimoUsuario && useGrupoStore.getState().modo !== 'carregando') {
    useGrupoStore.setState({ modo: 'carregando', participa: false, posts: [], stories: [], comentarios: {} });
    void useGrupoStore.getState().carregar();
  }
  ultimoUsuario = id;
});
