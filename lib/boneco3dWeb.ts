/**
 * Motor 3D do boneco novo (v2) na web: personagem com esqueleto, cabelo em peça e rosto em peças.
 * Só é usado quando EXPO_PUBLIC_BONECO=v2 (quem decide é lib/avatar3d.web.ts); sem isso o app
 * continua com o boneco antigo.
 *
 * Há um arquivo por boneco em public/avatar/v2, gerados por tools/avatar/v2:
 *   plim_v2_m.glb / plim_v2_f.glb       corpo (uma malha, 24 ossos), cabelo e as peças do rosto
 *   corpo_mapa_m.png / corpo_mapa_f.png  R = sombra pintada, G = região * 36
 *                                         (1 pele, 2 moletom, 3 raio, 4 calça, 5 tênis, 6 sola)
 *
 * Quem escolhe o boneco é o campo `cabelo` do avatar: 'curto' = masculino, 'coque' = feminino.
 * A cor do corpo é montada aqui: cor escolhida de cada região vezes a sombra. O rosto troca de
 * expressão mostrando e escondendo peças pelo nome (eye__, lid__, brow__, mouth__).
 */
import { chaveAvatar, escurecer, type AvatarConfig, type Expressao } from '@/lib/avatar';

type Three = typeof import('three');
type Object3D = import('three').Object3D;
type Quaternion = import('three').Quaternion;
type Vector3 = import('three').Vector3;
type Mesh = import('three').Mesh;
type Material = import('three').MeshStandardMaterial;
type Textura = import('three').CanvasTexture;

export type Enquadramento = 'busto' | 'corpo';
export interface Palco {
  atualizar: (cfg: AvatarConfig, expressao: Expressao) => void;
  acenar: () => void;
  destruir: () => void;
}

type Modelo = 'm' | 'f';
/** Sobe quando um arquivo muda, para o navegador não usar o antigo guardado. */
const VERSAO = '2';
const ARQUIVOS: Record<Modelo, { glb: string; mapa: string }> = {
  m: { glb: '/avatar/v2/plim_v2_m.glb?v=' + VERSAO, mapa: '/avatar/v2/corpo_mapa_m.png?v=' + VERSAO },
  f: { glb: '/avatar/v2/plim_v2_f.glb?v=' + VERSAO, mapa: '/avatar/v2/corpo_mapa_f.png?v=' + VERSAO },
};
const modeloDe = (cfg: AvatarConfig): Modelo => (cfg.cabelo === 'coque' ? 'f' : 'm');

const GRAUS = Math.PI / 180;
/** O arquivo vem com os braços abertos (pose A). Em repouso eles descem este tanto. */
const DESCE_BRACO = 12 * GRAUS;
const DESCE_ANTEBRACO = 10 * GRAUS;

/** Que peças do rosto cada expressão mostra. */
const ROSTO: Record<Expressao, { olho: string; palpebra: string | null }> = {
  feliz: { olho: 'aberto', palpebra: null },
  neutro: { olho: 'aberto', palpebra: null },
  animado: { olho: 'aberto', palpebra: null },
  determinado: { olho: 'aberto', palpebra: null },
  triste: { olho: 'aberto', palpebra: 'triste' },
  cansado: { olho: 'aberto', palpebra: 'cansado' },
  orgulhoso: { olho: 'sorrindo', palpebra: null },
};

interface Mapa { lado: number; sombra: Uint8Array; regiao: Uint8Array }
interface Base {
  THREE: Three;
  modelo: Modelo;
  cena: Object3D;
  clonar: (o: Object3D) => Object3D;
  mapa: Mapa;
  /** Altura do ponto mais alto, contando o cabelo. */
  topo: number;
}

const bases: Partial<Record<Modelo, Promise<Base>>> = {};

async function lerMapa(url: string): Promise<Mapa> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const lado = img.naturalWidth;
  const tela = document.createElement('canvas');
  tela.width = tela.height = lado;
  const ctx = tela.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, lado, lado).data;
  const sombra = new Uint8Array(lado * lado);
  const regiao = new Uint8Array(lado * lado);
  for (let i = 0, j = 0; i < sombra.length; i++, j += 4) {
    sombra[i] = d[j];
    regiao[i] = Math.min(6, Math.round(d[j + 1] / 36));
  }
  return { lado, sombra, regiao };
}

function carregarBase(modelo: Modelo): Promise<Base> {
  let p = bases[modelo];
  if (!p) {
    p = (async () => {
      const [THREE, { GLTFLoader }, SkeletonUtils, mapa] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/utils/SkeletonUtils.js'),
        lerMapa(ARQUIVOS[modelo].mapa),
      ]);
      const gltf = await new GLTFLoader().loadAsync(ARQUIVOS[modelo].glb);
      gltf.scene.updateMatrixWorld(true);
      const topo = new THREE.Box3().setFromObject(gltf.scene).max.y;
      return { THREE, modelo, cena: gltf.scene, clonar: (o: Object3D) => SkeletonUtils.clone(o), mapa, topo };
    })();
    bases[modelo] = p;
    p.catch(() => { delete bases[modelo]; }); // falhou (sem rede?): tenta de novo na próxima vez
  }
  return p;
}

// ───────────────────────── cor do corpo ─────────────────────────────────────

const texturas = new Map<string, Textura>();
const hexRgb = (h: string) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

/** Monta (ou reaproveita) a textura do corpo com as cores escolhidas. A sola acompanha a cor do raio. */
function texturaDoCorpo({ THREE, mapa, modelo }: Base, cfg: AvatarConfig): Textura {
  const cores = ['000000', cfg.pele, cfg.corMoletom, cfg.corRaio, cfg.corCalca, cfg.corTenis, cfg.corRaio];
  const chave = modelo + '-' + cores.join('-');
  const pronta = texturas.get(chave);
  if (pronta) return pronta;
  const n = mapa.lado;
  const tela = document.createElement('canvas');
  tela.width = tela.height = n;
  const ctx = tela.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  const d = img.data;
  const rgb = cores.map(hexRgb);
  for (let i = 0, j = 0; i < n * n; i++, j += 4) {
    const c = rgb[mapa.regiao[i]];
    const s = mapa.sombra[i] / 255;
    d[j] = c[0] * s;
    d[j + 1] = c[1] * s;
    d[j + 2] = c[2] * s;
    d[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(tela);
  t.flipY = false; // o mapa do .glb conta as linhas de cima para baixo
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (texturas.size >= 12) {
    const velha = texturas.keys().next().value as string;
    texturas.get(velha)?.dispose();
    texturas.delete(velha);
  }
  texturas.set(chave, t);
  return t;
}

// ───────────────────────── boneco ───────────────────────────────────────────

interface Peca { slot: string; item: string; malha: Mesh }
interface Boneco {
  base: Base;
  raiz: Object3D;
  corpo: Mesh | null;
  ossos: Record<string, Object3D>;
  repouso: Record<string, Quaternion>;
  pai: Record<string, Quaternion>; // orientação do osso pai, em repouso, no espaço do boneco
  pecas: Peca[];
  mats: Record<string, Material>;
  girar: (osso: string, eixo: Vector3, angulo: number, eixo2?: Vector3, angulo2?: number) => void;
}

const ANIMADOS = ['Spine01', 'Head', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'];

/** Copia o molde com o esqueleto e dá a cada boneco os seus próprios materiais (cada um tem as suas cores). */
function criarBoneco(b: Base): Boneco {
  const { THREE } = b;
  const raiz = b.clonar(b.cena);
  raiz.updateMatrixWorld(true);
  const bo: Boneco = { base: b, raiz, corpo: null, ossos: {}, repouso: {}, pai: {}, pecas: [], mats: {}, girar: () => {} };
  raiz.traverse((o) => {
    if ((o as any).isBone) bo.ossos[o.name] = o;
    const malha = o as Mesh;
    if (!malha.isMesh) return;
    const original = malha.material as Material;
    const nome = original.name;
    if (!bo.mats[nome]) {
      const m = original.clone();
      m.metalness = 0;
      bo.mats[nome] = m;
    }
    malha.material = bo.mats[nome];
    malha.frustumCulled = false; // a caixa da malha com esqueleto não acompanha a pose
    if ((malha as any).isSkinnedMesh) bo.corpo = malha;
    else {
      const p = malha.name.split('__');
      if (p.length >= 3) bo.pecas.push({ slot: p[0], item: p[1], malha });
    }
  });
  for (const n of ANIMADOS) {
    const o = bo.ossos[n];
    if (!o || !o.parent) continue;
    bo.repouso[n] = o.quaternion.clone();
    bo.pai[n] = o.parent.getWorldQuaternion(new THREE.Quaternion());
  }
  // Gira um osso em torno de um eixo dado no espaço do boneco, a partir da pose de repouso.
  const r = new THREE.Quaternion();
  const q = new THREE.Quaternion();
  bo.girar = (osso, eixo, angulo, eixo2, angulo2 = 0) => {
    const o = bo.ossos[osso];
    const rep = bo.repouso[osso];
    const pai = bo.pai[osso];
    if (!o || !rep || !pai) return;
    r.setFromAxisAngle(eixo, angulo);
    if (eixo2) r.multiply(q.setFromAxisAngle(eixo2, angulo2));
    o.quaternion.copy(pai).invert().multiply(r).multiply(pai).multiply(rep);
  };
  return bo;
}

function descartar(bo: Boneco) {
  for (const m of Object.values(bo.mats)) m.dispose();
}

function aplicarRosto(bo: Boneco, expressao: Expressao, piscando: boolean) {
  const r = ROSTO[expressao] ?? ROSTO.feliz;
  const olho = piscando && r.olho === 'aberto' ? 'fechado' : r.olho;
  const palpebra = piscando ? null : r.palpebra;
  for (const p of bo.pecas) {
    if (p.slot === 'eye') p.malha.visible = p.item === olho;
    else if (p.slot === 'lid') p.malha.visible = p.item === palpebra;
    else if (p.slot === 'brow' || p.slot === 'mouth') p.malha.visible = p.item === expressao;
    else p.malha.visible = true; // cabelo: por enquanto cada boneco tem um só
  }
}

function aplicarVisual(bo: Boneco, cfg: AvatarConfig, expressao: Expressao, piscando = false) {
  if (bo.corpo) {
    const m = bo.corpo.material as Material;
    const t = texturaDoCorpo(bo.base, cfg);
    if (m.map !== t) { m.map = t; m.needsUpdate = true; }
    m.color.set(0xffffff);
    m.roughness = 0.72;
  }
  bo.mats.hair?.color.set('#' + cfg.corCabelo);
  bo.mats.brow?.color.set('#' + escurecer(cfg.corCabelo, 0.72));
  bo.mats.skin?.color.set('#' + cfg.pele);
  aplicarRosto(bo, expressao, piscando);
}

function iluminar(THREE: Three, cena: import('three').Scene) {
  cena.add(new THREE.HemisphereLight(0xffffff, 0xe9dccb, 1.25));
  const principal = new THREE.DirectionalLight(0xffffff, 1.9);
  principal.position.set(-1.6, 2.6, 3.2);
  cena.add(principal);
  const contra = new THREE.DirectionalLight(0xfff1e0, 0.7);
  contra.position.set(2.2, 1.6, -2.4);
  cena.add(contra);
}

/** Os dois bonecos têm 1,50 m até o alto da cabeça; `topo` conta o cabelo (o coque é mais alto). */
function enquadrar(cam: import('three').PerspectiveCamera, enq: Enquadramento, topo: number) {
  if (enq === 'busto') {
    const baixo = 1.06; // a gola do moletom
    const alto = topo + 0.06;
    cam.fov = 20;
    cam.position.set(0, (baixo + alto) / 2 + 0.02, (alto - baixo) / 2 / Math.tan(10 * GRAUS));
    cam.lookAt(0, (baixo + alto) / 2, 0);
  } else {
    cam.fov = 24;
    cam.position.set(0, topo / 2 + 0.12, (topo + 0.19) / 2 / Math.tan(12 * GRAUS));
    cam.lookAt(0, topo / 2 - 0.01, 0);
  }
  cam.updateProjectionMatrix();
}

function porEmRepouso(THREE: Three, bo: Boneco) {
  const frente = new THREE.Vector3(0, 0, 1);
  bo.girar('LeftArm', frente, -DESCE_BRACO);
  bo.girar('RightArm', frente, DESCE_BRACO);
  bo.girar('LeftForeArm', frente, -DESCE_ANTEBRACO);
  bo.girar('RightForeArm', frente, DESCE_ANTEBRACO);
}

// ───────────────────────── retratos (imagem pronta) ─────────────────────────

interface Estudio {
  renderer: import('three').WebGLRenderer;
  cena: import('three').Scene;
  cam: import('three').PerspectiveCamera;
  bonecos: Partial<Record<Modelo, Boneco>>;
}

let estudio: Promise<Estudio> | null = null;
const cacheRetrato = new Map<string, string>();
/** Os retratos são feitos um de cada vez: todos usam o mesmo estúdio. */
let fila: Promise<unknown> = Promise.resolve();

function montarEstudio(): Promise<Estudio> {
  if (!estudio) {
    estudio = import('three').then((THREE) => {
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(1);
      const cena = new THREE.Scene();
      iluminar(THREE, cena);
      const cam = new THREE.PerspectiveCamera(22, 1, 0.1, 30);
      return { renderer, cena, cam, bonecos: {} };
    });
    estudio.catch(() => { estudio = null; });
  }
  return estudio;
}

export function retratoEmCache(cfg: AvatarConfig, expressao: Expressao, enq: Enquadramento): string | undefined {
  return cacheRetrato.get(enq + '|' + chaveAvatar(cfg, expressao));
}

/** Devolve a imagem (data URL, fundo transparente) do boneco com este visual. */
export function retratoAvatar(cfg: AvatarConfig, expressao: Expressao, enq: Enquadramento = 'busto'): Promise<string> {
  const chave = enq + '|' + chaveAvatar(cfg, expressao);
  const pronto = cacheRetrato.get(chave);
  if (pronto) return Promise.resolve(pronto);
  const tarefa = fila.then(async () => {
    const ja = cacheRetrato.get(chave);
    if (ja) return ja;
    const modelo = modeloDe(cfg);
    const [e, b] = await Promise.all([montarEstudio(), carregarBase(modelo)]);
    let bo = e.bonecos[modelo];
    if (!bo) {
      bo = criarBoneco(b);
      porEmRepouso(b.THREE, bo);
      e.cena.add(bo.raiz);
      e.bonecos[modelo] = bo;
    }
    for (const [m, outro] of Object.entries(e.bonecos)) if (outro) outro.raiz.visible = m === modelo;
    const [l, a] = enq === 'busto' ? [320, 320] : [360, 480];
    e.renderer.setSize(l, a, false);
    e.cam.aspect = l / a;
    enquadrar(e.cam, enq, b.topo);
    aplicarVisual(bo, cfg, expressao);
    e.renderer.render(e.cena, e.cam);
    const url = e.renderer.domElement.toDataURL('image/png');
    if (cacheRetrato.size > 60) cacheRetrato.clear();
    cacheRetrato.set(chave, url);
    return url;
  });
  fila = tarefa.catch(() => {});
  return tarefa;
}

// ───────────────────────── palco vivo ───────────────────────────────────────

/**
 * Monta o boneco de corpo inteiro dentro de `caixa`. Arrastar gira; tocar faz ele acenar.
 * Sozinho ele respira, mexe a cabeça e pisca. Com `parado`, fica quieto (sem piscar).
 */
export async function criarPalco(caixa: HTMLElement, cfg: AvatarConfig, expressao: Expressao, parado = false, aoTocar?: () => void): Promise<Palco> {
  const b = await carregarBase(modeloDe(cfg));
  const { THREE } = b;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';
  caixa.appendChild(canvas);

  const cena = new THREE.Scene();
  iluminar(THREE, cena);
  let boneco = criarBoneco(b);
  cena.add(boneco.raiz);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 30);
  const FRENTE = new THREE.Vector3(0, 0, 1);
  const LADO = new THREE.Vector3(1, 0, 0);
  const CIMA = new THREE.Vector3(0, 1, 0);

  let atual = cfg;
  let expr = expressao;
  let giro = -0.18;
  let acenoInicio = -1;
  let vivo = true;
  let quadro = 0;
  let piscando = false;
  let proximaPiscada = performance.now() + 1800 + Math.random() * 2000;
  let fimPiscada = 0;

  function medir() {
    const l = Math.max(1, caixa.clientWidth);
    const a = Math.max(1, caixa.clientHeight);
    renderer.setSize(l, a, false);
    cam.aspect = l / a;
    enquadrar(cam, 'corpo', boneco.base.topo);
  }

  function desenhar(agora: number) {
    const t = agora / 1000;
    const mexe = parado ? 0 : 1;
    const girar = boneco.girar;
    boneco.raiz.rotation.y = giro + Math.sin(t * 0.7) * 0.05 * mexe;
    boneco.raiz.position.y = Math.sin(t * 2.1) * 0.004 * mexe;
    girar('Spine01', LADO, Math.sin(t * 2.1) * 0.012 * mexe);
    girar('Head', FRENTE, Math.sin(t * 1.3) * 0.035 * mexe, CIMA, Math.sin(t * 0.5) * 0.07 * mexe);

    // Braços: em repouso descem para perto do corpo. Ângulo positivo levanta o esquerdo e abaixa o direito.
    const esq = -DESCE_BRACO + Math.sin(t * 1.6) * 0.03 * mexe;
    let dir = DESCE_BRACO - Math.sin(t * 1.6 + 1.4) * 0.03 * mexe;
    let antDir = DESCE_ANTEBRACO;
    if (acenoInicio >= 0) {
      const p = (agora - acenoInicio) / 1700; // 0 → 1
      if (p >= 1) acenoInicio = -1;
      else {
        const sobe = Math.sin(Math.min(1, p * 2.6) * Math.PI / 2) * (p > 0.8 ? (1 - p) / 0.2 : 1);
        dir = DESCE_BRACO + sobe * (-105 * GRAUS - DESCE_BRACO);
        antDir = DESCE_ANTEBRACO + sobe * (-45 * GRAUS - DESCE_ANTEBRACO) + Math.sin(p * 28) * 0.3 * sobe;
      }
    }
    girar('LeftArm', FRENTE, esq);
    girar('RightArm', FRENTE, dir);
    girar('LeftForeArm', FRENTE, -DESCE_ANTEBRACO);
    girar('RightForeArm', FRENTE, antDir);

    if (!parado) {
      if (!piscando && agora >= proximaPiscada) {
        piscando = true;
        fimPiscada = agora + 130;
        aplicarRosto(boneco, expr, true);
      } else if (piscando && agora >= fimPiscada) {
        piscando = false;
        proximaPiscada = agora + 2400 + Math.random() * 2800;
        aplicarRosto(boneco, expr, false);
      }
    }
    renderer.render(cena, cam);
  }

  function laco(agora: number) {
    if (!vivo) return;
    if (!document.hidden) desenhar(agora);
    if (!parado || acenoInicio >= 0) quadro = requestAnimationFrame(laco);
    else quadro = 0;
  }
  const acordar = () => { if (vivo && !quadro) quadro = requestAnimationFrame(laco); };

  /** A pessoa trocou de masculino para feminino (ou o contrário): entra o outro boneco. */
  async function trocarBoneco(modelo: Modelo) {
    const outra = await carregarBase(modelo);
    if (!vivo || modeloDe(atual) !== modelo || boneco.base.modelo === modelo) return;
    const novo = criarBoneco(outra);
    cena.remove(boneco.raiz);
    descartar(boneco);
    boneco = novo;
    cena.add(boneco.raiz);
    aplicarVisual(boneco, atual, expr, piscando);
    enquadrar(cam, 'corpo', boneco.base.topo);
    acordar();
  }

  // arrastar gira; toque curto acena
  let arrastando = false;
  let xInicial = 0;
  let giroInicial = 0;
  let andou = 0;
  const baixo = (e: PointerEvent) => { arrastando = true; xInicial = e.clientX; giroInicial = giro; andou = 0; canvas.style.cursor = 'grabbing'; };
  const move = (e: PointerEvent) => {
    if (!arrastando) return;
    andou = Math.abs(e.clientX - xInicial);
    giro = giroInicial + (e.clientX - xInicial) * 0.012;
    acordar();
  };
  const cima = () => {
    if (arrastando && andou < 6) { acenoInicio = performance.now(); acordar(); aoTocar?.(); }
    arrastando = false;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerdown', baixo);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', cima);
  const observador = new ResizeObserver(() => { medir(); acordar(); });
  observador.observe(caixa);

  aplicarVisual(boneco, atual, expr);
  medir();
  quadro = requestAnimationFrame(laco);

  return {
    atualizar(novo, novaExpr) {
      atual = novo;
      expr = novaExpr;
      if (modeloDe(novo) !== boneco.base.modelo) void trocarBoneco(modeloDe(novo)).catch(() => {});
      else aplicarVisual(boneco, atual, expr, piscando);
      acordar();
    },
    acenar() { acenoInicio = performance.now(); acordar(); },
    destruir() {
      vivo = false;
      if (quadro) cancelAnimationFrame(quadro);
      observador.disconnect();
      canvas.removeEventListener('pointerdown', baixo);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', cima);
      descartar(boneco);
      renderer.dispose();
      canvas.remove();
    },
  };
}
