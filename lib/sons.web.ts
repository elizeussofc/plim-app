/**
 * Sons do Plim na web (Web Audio).
 *
 * A família inteira nasce de uma nota só, o "plim" (um dó agudo):
 *  - tarefa feita: um plim, que sobe de tom a cada tarefa do dia (escala pentatônica);
 *  - desafio ou rotina completa: três plins em arpejo;
 *  - nível: fanfarra própria, afinada um semitom acima para combinar com o plim;
 *  - conquista, fim de foco e despejo guardado: um som próprio cada.
 * Os arquivos ficam em public/sons e só são baixados no primeiro toque na tela.
 */

type Nome = 'plim' | 'nivel' | 'conquista' | 'foco' | 'guardar';

const VOLUME: Record<Nome, number> = { plim: 0.5, nivel: 0.55, conquista: 0.4, foco: 0.65, guardar: 0.45 };
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
