/**
 * Sons do Plim na web (Web Audio).
 *
 * A família inteira nasce de uma nota só, o "plim" (um dó agudo):
 *  - tarefa feita: um plim, que sobe de tom a cada tarefa do dia (escala pentatônica);
 *  - desafio ou rotina completa: três plins em arpejo;
 *  - nível: fanfarra própria, afinada um semitom acima para combinar com o plim;
 *  - conquista, fim de foco e despejo guardado: um som próprio cada;
 *  - Gym: o haltere pousando no chão ("ferro"); Finanças: a moeda no cofrinho; Grupo: a bolha ("pop");
 *  - Sono: a caixinha de música ("sininho"); Estudos: a página virando; Casa: o pano no vidro
 *    ("esfrega"); Guarda-roupa: o zíper.
 * Os arquivos ficam em public/sons e só são baixados no primeiro toque na tela.
 */

type Nome = 'plim' | 'nivel' | 'conquista' | 'foco' | 'guardar' | 'moeda' | 'ferro' | 'pop' | 'sininho' | 'pagina' | 'esfrega' | 'ziper';

const VOLUME: Record<Nome, number> = { plim: 0.5, nivel: 0.55, conquista: 0.4, foco: 0.65, guardar: 0.45, moeda: 0.4, ferro: 0.6, pop: 0.5, sininho: 0.5, pagina: 0.6, esfrega: 0.4, ziper: 0.55 };
/** Degraus da escala pentatônica maior, em semitons: dó ré mi sol lá dó. */
const PENTA = [0, 2, 4, 7, 9, 12];
const semitons = (n: number) => Math.pow(2, n / 12);

let ctx: AudioContext | null = null;
const buffers = new Map<Nome, Promise<AudioBuffer | null>>();
let ligado = true;
let emSilencio = false;
/** Até quando (relógio do AudioContext) já há um som principal tocando. */
let ocupadoAte = 0;

function contexto(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Classe = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Classe) return null;
    try { ctx = new Classe(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function carregar(nome: Nome): Promise<AudioBuffer | null> {
  let p = buffers.get(nome);
  if (!p) {
    p = (async () => {
      const c = contexto();
      if (!c) return null;
      try {
        const resposta = await fetch(`/sons/${nome}.mp3`);
        if (!resposta.ok) return null;
        return await c.decodeAudioData(await resposta.arrayBuffer());
      } catch {
        return null;
      }
    })();
    buffers.set(nome, p);
    p.then((b) => { if (!b) buffers.delete(nome); }); // falhou: tenta de novo na próxima
  }
  return p;
}

interface Opcoes {
  /** Semitons acima do tom original. */
  tom?: number;
  /** Segundos de espera antes de tocar. */
  atraso?: number;
  volume?: number;
  /** Espera o som principal em andamento terminar (para não embolar). */
  depoisDoAtual?: boolean;
}

function tocar(nome: Nome, { tom = 0, atraso = 0, volume = 1, depoisDoAtual = false }: Opcoes = {}) {
  if (!ligado || emSilencio) return;
  const c = contexto();
  if (!c) return;
  const pedidoEm = c.currentTime;
  carregar(nome).then((buffer) => {
    if (!buffer || !ligado || emSilencio) return;
    const fonte = c.createBufferSource();
    fonte.buffer = buffer;
    fonte.playbackRate.value = semitons(tom);
    const ganho = c.createGain();
    ganho.gain.value = VOLUME[nome] * volume;
    fonte.connect(ganho).connect(c.destination);
    let quando = Math.max(c.currentTime, pedidoEm + atraso);
    if (depoisDoAtual) quando = Math.max(quando, ocupadoAte);
    fonte.start(quando);
    ocupadoAte = Math.max(ocupadoAte, quando + (buffer.duration / semitons(tom)) * 0.7);
  });
}

function vibrar(padrao: number | number[]) {
  if (!ligado || emSilencio) return;
  try { navigator.vibrate?.(padrao); } catch { /* sem vibração neste aparelho */ }
}

// ───────────────────────── o que o app chama ────────────────────────────────

/** Liga ou desliga todos os sons (preferência da pessoa). */
export function configurarSons(opcoes: { ligado: boolean }) {
  ligado = opcoes.ligado;
}

/** Silêncio temporário (Modo Calma): nada toca enquanto estiver ativo. */
export function silenciarSons(silencio: boolean) {
  emSilencio = silencio;
}

/** Tarefa feita. `degrau` = quantas já estavam feitas hoje: cada uma sobe um tom. */
export function somTarefa(degrau = 0) {
  tocar('plim', { tom: PENTA[Math.max(0, Math.min(degrau, PENTA.length - 1))] });
  vibrar(12);
}

/** Desafio ou rotina completa: três plins subindo (dó, mi, sol). */
export function somArpejo() {
  [0, 4, 7].forEach((tom, i) => tocar('plim', { tom: tom + 12, atraso: 0.28 + i * 0.11, volume: 0.9, depoisDoAtual: i === 0 }));
  vibrar([14, 50, 14, 50, 22]);
}

export function somNivel() {
  tocar('nivel', { tom: 1, atraso: 0.3, depoisDoAtual: true });
  vibrar([18, 60, 18, 60, 40]);
}

export function somConquista() {
  tocar('conquista', { atraso: 0.28, depoisDoAtual: true });
  vibrar([14, 40, 24]);
}

/** Fim da sessão de foco: toca mesmo com a aba em segundo plano. */
export function somFoco() {
  tocar('foco');
  vibrar([60, 80, 60]);
}

export function somGuardar() {
  tocar('guardar');
}

/** Missão começou: duas notas subindo (sol, dó), como um "valendo!". */
export function somInicio() {
  tocar('plim', { tom: -5, volume: 0.8 });
  tocar('plim', { tom: 0, atraso: 0.13, volume: 0.9 });
  vibrar(16);
}

/** Missão cumprida e trilha subiu de nível: quatro plins subindo até a oitava. */
export function somSubiu() {
  [0, 4, 7, 12].forEach((tom, i) => tocar('plim', { tom, atraso: i * 0.1, volume: 0.9 }));
  vibrar([14, 40, 14, 40, 30]);
}

/** Não deu tempo e a trilha desceu um nível: duas notas descendo, baixinho. Sem buzina. */
export function somDesceu() {
  tocar('plim', { tom: -5, volume: 0.55 });
  tocar('plim', { tom: -9, atraso: 0.2, volume: 0.5 });
  vibrar(30);
}

/** Falta pouco tempo: dois toques curtos e iguais. */
export function somAviso() {
  tocar('plim', { tom: 7, volume: 0.45 });
  tocar('plim', { tom: 7, atraso: 0.16, volume: 0.45 });
}

/** O avatar abriu um balão: um "pop" discreto, só se nada mais estiver tocando. */
export function somBalao() {
  const c = contexto();
  if (!c || c.currentTime < ocupadoAte + 0.25) return;
  tocar('guardar', { tom: 7, volume: 0.45 });
}

/** Confirmação curta (ligar uma opção, escolher uma trilha). */
export function somToque() {
  tocar('plim', { tom: 4, volume: 0.5 });
}

// ───────────────────────── Gym ─────────────────────────

/** Série feita: o haltere pousa no chão. */
export function somSerie() {
  tocar('ferro');
  vibrar(14);
}

/** Acabou o descanso: duas notas subindo, "volta!". Toca mesmo com a tela em segundo plano. */
export function somDescanso() {
  tocar('plim', { tom: 0, volume: 0.8 });
  tocar('plim', { tom: 7, atraso: 0.14, volume: 0.9 });
  vibrar([40, 60, 40]);
}

/** O Plim mandou subir a carga: haltere e uma nota aguda logo depois. */
export function somCarga() {
  tocar('ferro', { tom: 2 });
  tocar('plim', { tom: 12, atraso: 0.16, volume: 0.7 });
}

/** Treino terminado: haltere no chão e a fanfarra de nível. */
export function somTreino() {
  tocar('ferro');
  tocar('nivel', { tom: 1, atraso: 0.3 });
  vibrar([18, 60, 18, 60, 40]);
}

// ───────────────────────── Finanças ─────────────────────────

/** Entrou dinheiro ou a pessoa guardou: moeda no cofrinho. */
export function somMoeda() {
  tocar('moeda');
  vibrar(12);
}

/** Gasto anotado: um toque grave e discreto. Anotar gasto não é para dar susto. */
export function somGasto() {
  tocar('guardar', { tom: -3, volume: 0.9 });
}

/** Conta paga: moeda e um plim de "resolvido". */
export function somConta() {
  tocar('moeda', { tom: -2 });
  tocar('plim', { tom: 4, atraso: 0.18, volume: 0.7 });
  vibrar(14);
}

/** Meta de dinheiro batida: duas moedas e o som de conquista. */
export function somMeta() {
  tocar('moeda');
  tocar('moeda', { tom: 4, atraso: 0.14 });
  tocar('conquista', { atraso: 0.4 });
  vibrar([14, 40, 14, 40, 30]);
}

/** Passou do teto de uma categoria: duas notas descendo, baixinho. */
export function somEstourou() {
  tocar('plim', { tom: 2, volume: 0.5 });
  tocar('plim', { tom: -2, atraso: 0.18, volume: 0.45 });
}

// ───────────────────────── Grupo ─────────────────────────

/** Reagiu com um emoji: uma bolha. */
export function somReagir() {
  tocar('pop', { tom: 3 });
  vibrar(8);
}

/** Publicou no grupo: bolha e duas notas subindo. */
export function somPostar() {
  tocar('pop');
  tocar('plim', { tom: 7, atraso: 0.12, volume: 0.7 });
  tocar('plim', { tom: 12, atraso: 0.24, volume: 0.8 });
  vibrar(16);
}

/** Comentou: duas bolhas, a segunda mais grave. */
export function somComentar() {
  tocar('pop', { tom: 2 });
  tocar('pop', { tom: -3, atraso: 0.11 });
}

/** Story no ar: três bolhas subindo. */
export function somStory() {
  [0, 4, 9].forEach((tom, i) => tocar('pop', { tom, atraso: i * 0.09 }));
  vibrar(14);
}

// ───────────────────────── Sono ─────────────────────────

/** Passo do ritual marcado: uma nota grave e baixinha, para não acordar ninguém. */
export function somPassoSono() {
  tocar('plim', { tom: -7, volume: 0.4 });
}

/** Ritual completo ou noite anotada: a caixinha de música. */
export function somSono() {
  tocar('sininho');
  vibrar(10);
}

// ───────────────────────── Estudos ─────────────────────────

/** Tópico novo ou revisão respondida: a página vira. */
export function somPagina() {
  tocar('pagina');
}

/** Lembrou na revisão: página e uma nota aguda. */
export function somLembrei() {
  tocar('pagina');
  tocar('plim', { tom: 9, atraso: 0.12, volume: 0.6 });
  vibrar(10);
}

/** Fim do tempo de estudo: página e o som do fim de foco. Toca mesmo com a tela em segundo plano. */
export function somEstudoFim() {
  tocar('pagina');
  tocar('foco', { atraso: 0.25 });
  vibrar([60, 80, 60]);
}

// ───────────────────────── Casa ─────────────────────────

/** Tarefa de casa feita: o pano no vidro. */
export function somLimpo() {
  tocar('esfrega');
  vibrar(12);
}

/** Faxina relâmpago completa: o pano e três plins subindo. */
export function somFaxina() {
  tocar('esfrega');
  [0, 4, 7].forEach((tom, i) => tocar('plim', { tom: tom + 12, atraso: 0.7 + i * 0.11, volume: 0.85 }));
  vibrar([14, 50, 14, 50, 22]);
}

/** Item da lista de mercado riscado: uma bolha grave. */
export function somItem() {
  tocar('pop', { tom: -4, volume: 0.8 });
}

/** Compra fechada: a moeda sai e um plim de "resolvido". */
export function somCompra() {
  tocar('moeda', { tom: -3 });
  tocar('plim', { tom: 7, atraso: 0.2, volume: 0.7 });
  vibrar(14);
}

// ───────────────────────── Guarda-roupa ─────────────────────────

/** Vestiu ou tirou uma peça: o zíper. */
export function somVestir() {
  tocar('ziper');
  vibrar(8);
}

/** Comprou uma peça com moedas: a moeda e o zíper. */
export function somPecaNova() {
  tocar('moeda');
  tocar('ziper', { atraso: 0.2 });
  tocar('plim', { tom: 12, atraso: 0.75, volume: 0.7 });
  vibrar([14, 40, 20]);
}

// ───────────────────────── Resumo da semana ─────────────────────────

/** O resumo da semana abriu: a carta desdobra e três plins subindo. */
export function somResumo() {
  tocar('pagina');
  [0, 4, 7].forEach((tom, i) => tocar('plim', { tom, atraso: 0.3 + i * 0.12, volume: 0.8 }));
}

// O navegador só deixa tocar depois de um toque na página: o primeiro toque
// acorda o áudio e já baixa o plim, para a primeira tarefa não sair muda.
if (typeof window !== 'undefined') {
  const aquecer = () => {
    if (contexto()) carregar('plim');
    window.removeEventListener('pointerdown', aquecer);
    window.removeEventListener('keydown', aquecer);
  };
  window.addEventListener('pointerdown', aquecer);
  window.addEventListener('keydown', aquecer);
}
