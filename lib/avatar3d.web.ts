/**
 * Motor 3D do avatar na web (three.js). Carrega public/avatar/plim_avatar.glb uma vez,
 * aplica o visual (peças e cores) e entrega:
 *   - retratoAvatar(): uma imagem pronta (busto ou corpo), com cache;
 *   - criarPalco(): um palco vivo num <canvas>, que gira ao arrastar e acena ao toque.
 * three.js só é baixado quando o primeiro avatar aparece (import dinâmico).
 */
import { COBRE_O_TOPO, chaveAvatar, escurecer, expressaoDoBonecoAntigo, type AvatarConfig, type Expressao } from '@/lib/avatar';
import * as novo from '@/lib/boneco3dWeb';

/**
 * Boneco novo (v2): personagem com esqueleto e rosto em peças. Fica desligado até a variável
 * EXPO_PUBLIC_BONECO=v2 existir (hoje só no .env.local de quem está testando). Sem ela, tudo
 * neste arquivo continua igual.
 */
const BONECO_NOVO = process.env.EXPO_PUBLIC_BONECO === 'v2';

type Three = typeof import('three');
type Object3D = import('three').Object3D;
type Quaternion = import('three').Quaternion;

/** O número muda quando o arquivo ganha peças novas, para o navegador não usar o antigo guardado. */
const URL_GLB = '/avatar/plim_avatar.glb?v=2';
const GRAUS = Math.PI / 180;
/** Ângulo dos braços com que o .glb foi exportado (pose A). */
const ABERTURA_EXPORTADA = 49 * GRAUS;
const ABERTURA_REPOUSO = 17 * GRAUS;

interface Base {
  THREE: Three;
  cena: Object3D; // cena original do .glb (não é mostrada; serve de molde)
}

let base: Promise<Base> | null = null;

function carregarBase(): Promise<Base> {
  if (!base) {
    base = (async () => {
      const [THREE, { GLTFLoader }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
      ]);
      const gltf = await new GLTFLoader().loadAsync(URL_GLB);
      return { THREE, cena: gltf.scene };
    })();
    base.catch(() => { base = null; }); // falhou (sem rede?): tenta de novo na próxima vez
  }
  return base;
}

interface Boneco {
  raiz: Object3D;
  juntas: Record<string, Object3D>;
  repouso: Record<string, Quaternion>;
}

/** Copia o molde. As peças são copiadas; os materiais continuam os mesmos do molde. */
function clonar({ cena }: Base): Boneco {
  const raiz = cena.clone(true);
  const juntas: Record<string, Object3D> = {};
  const repouso: Record<string, Quaternion> = {};
  raiz.traverse((o) => {
    if (!(o as any).isMesh && o.name) {
      juntas[o.name] = o;
      repouso[o.name] = o.quaternion.clone();
    }
  });
  return { raiz, juntas, repouso };
}

/** Abre ou fecha um braço: 0 = junto ao corpo, 90° = pose T, 150° = mão para o alto. */
function abrirBraco(THREE: Three, b: Boneco, lado: 'L' | 'R', angulo: number) {
  const junta = b.juntas['shoulder_' + lado];
  const q0 = b.repouso['shoulder_' + lado];
  if (!junta || !q0) return;
  const eixo = new THREE.Vector3(q0.x, q0.y, q0.z);
  if (eixo.lengthSq() < 1e-8) return;
  eixo.normalize();
  junta.quaternion.setFromAxisAngle(eixo, 2 * Math.acos(Math.min(1, Math.abs(q0.w))) * (angulo / ABERTURA_EXPORTADA) * Math.sign(q0.w || 1));
}

function aplicarVisual(THREE: Three, raiz: Object3D, cfg: AvatarConfig, expressaoPedida: Expressao) {
  const expressao = expressaoDoBonecoAntigo(expressaoPedida);
  const cores: Record<string, string> = {
    skin: cfg.pele,
    hair: cfg.corCabelo,
    top: cfg.corMoletom,
    top_detail: escurecer(cfg.corMoletom),
    bottom: cfg.corCalca,
    shoe: cfg.corTenis,
    accent: cfg.corRaio,
    hat: cfg.corChapeu,
    hat_detail: escurecer(cfg.corChapeu),
    extra: cfg.corExtra,
    extra_detail: escurecer(cfg.corExtra),
  };
  const topoCoberto = COBRE_O_TOPO.includes(cfg.chapeu);
  raiz.traverse((o) => {
    const malha = o as import('three').Mesh;
    if (!malha.isMesh) return;
    const p = malha.name.split('__');
    const slot = p[0];
    const item = p.length >= 3 ? p[1] : null;
    if (slot === 'hair') malha.visible = item === cfg.cabelo;
    else if (slot === 'hairtop') malha.visible = item === cfg.cabelo && !topoCoberto;
    else if (slot === 'hat') malha.visible = item === cfg.chapeu;
    else if (slot === 'neck') malha.visible = item === cfg.pescoco;
    else if (slot === 'back') malha.visible = item === cfg.costas;
    else if (slot === 'acc') malha.visible = item === 'oculos' ? cfg.oculos : item === 'fone' ? cfg.fone : false;
    else if (slot === 'brow' || slot === 'mouth') malha.visible = item === expressao;
    else malha.visible = true;

    const mat = malha.material as import('three').MeshStandardMaterial;
    if (mat && mat.name && cores[mat.name]) mat.color.set('#' + cores[mat.name]);
    if (mat && !mat.userData.plim) {
      mat.userData.plim = true;
      mat.roughness = mat.name === 'iris' || mat.name === 'dark' || mat.name === 'eye_white' ? 0.3 : mat.name === 'gold' ? 0.42 : 0.7;
      mat.metalness = 0;
    }
  });
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

export type Enquadramento = 'busto' | 'corpo';

/** Altura do ponto mais alto do boneco, contando o cabelo e o chapéu. */
function alturaDoTopo(cfg: AvatarConfig): number {
  const chapeu: Record<string, number> = { gorro: 1.66, festa: 1.67, coroa: 1.58, orelhas: 1.58, bone: 1.52 };
  const cabelo = cfg.cabelo === 'coque' && !COBRE_O_TOPO.includes(cfg.chapeu) ? 1.6 : 1.5;
  return Math.max(cabelo, chapeu[cfg.chapeu] ?? 0);
}

function enquadrar(cam: import('three').PerspectiveCamera, enq: Enquadramento, cfg: AvatarConfig) {
  const topo = alturaDoTopo(cfg);
  if (enq === 'busto') {
    // Chapéu alto: a câmera recua e sobe um pouco, para a ponta não sair do retrato.
    const alto = topo > 1.6;
    cam.fov = 20;
    cam.position.set(0, alto ? 1.25 : 1.2, alto ? 3.05 : 2.75);
    cam.lookAt(0, alto ? 1.18 : 1.13, 0);
  } else {
    cam.fov = 24;
    cam.position.set(0, topo / 2 + 0.12, 4.05);
    cam.lookAt(0, topo / 2 - 0.01, 0);
  }
  cam.updateProjectionMatrix();
}

// ───────────────────────── retratos (imagem pronta) ─────────────────────────

interface Estudio {
  THREE: Three;
  renderer: import('three').WebGLRenderer;
  cena: import('three').Scene;
  cam: import('three').PerspectiveCamera;
  boneco: Boneco;
}

let estudio: Promise<Estudio> | null = null;
const cacheRetrato = new Map<string, string>();

function montarEstudio(): Promise<Estudio> {
  if (!estudio) {
    estudio = carregarBase().then((b) => {
      const { THREE } = b;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(1);
      const cena = new THREE.Scene();
      iluminar(THREE, cena);
      const boneco = clonar(b);
      cena.add(boneco.raiz);
      abrirBraco(THREE, boneco, 'L', ABERTURA_REPOUSO);
      abrirBraco(THREE, boneco, 'R', ABERTURA_REPOUSO);
      const cam = new THREE.PerspectiveCamera(22, 1, 0.1, 30);
      return { THREE, renderer, cena, cam, boneco };
    });
    estudio.catch(() => { estudio = null; });
  }
  return estudio;
}

export function retratoEmCache(cfg: AvatarConfig, expressao: Expressao, enq: Enquadramento): string | undefined {
  if (BONECO_NOVO) return novo.retratoEmCache(cfg, expressao, enq);
  return cacheRetrato.get(enq + '|' + chaveAvatar(cfg, expressao));
}

/** Devolve a imagem (data URL, fundo transparente) do avatar com este visual. */
export async function retratoAvatar(cfg: AvatarConfig, expressao: Expressao, enq: Enquadramento = 'busto'): Promise<string> {
  if (BONECO_NOVO) return novo.retratoAvatar(cfg, expressao, enq);
  const chave = enq + '|' + chaveAvatar(cfg, expressao);
  const pronto = cacheRetrato.get(chave);
  if (pronto) return pronto;
  const e = await montarEstudio();
  const [l, a] = enq === 'busto' ? [320, 320] : [360, 480];
  e.renderer.setSize(l, a, false);
  e.cam.aspect = l / a;
  enquadrar(e.cam, enq, cfg);
  aplicarVisual(e.THREE, e.boneco.raiz, cfg, expressao);
  e.renderer.render(e.cena, e.cam);
  const url = e.renderer.domElement.toDataURL('image/png');
  if (cacheRetrato.size > 60) cacheRetrato.clear();
  cacheRetrato.set(chave, url);
  return url;
}

// ───────────────────────── palco vivo ───────────────────────────────────────

export interface Palco {
  atualizar: (cfg: AvatarConfig, expressao: Expressao) => void;
  acenar: () => void;
  destruir: () => void;
}

/**
 * Monta o avatar de corpo inteiro dentro de `caixa` (um elemento da página).
 * Arrastar gira o boneco; tocar faz ele acenar. Com `parado`, não há movimento sozinho.
 */
export async function criarPalco(caixa: HTMLElement, cfg: AvatarConfig, expressao: Expressao, parado = false, aoTocar?: () => void): Promise<Palco> {
  if (BONECO_NOVO) return novo.criarPalco(caixa, cfg, expressao, parado, aoTocar);
  const b = await carregarBase();
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
  const boneco = clonar(b);
  cena.add(boneco.raiz);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 30);

  let atual = cfg;
  let expr = expressao;
  let giro = -0.22;
  let acenoInicio = -1;
  let vivo = true;
  let quadro = 0;

  function medir() {
    const l = Math.max(1, caixa.clientWidth);
    const a = Math.max(1, caixa.clientHeight);
    renderer.setSize(l, a, false);
    cam.aspect = l / a;
    enquadrar(cam, 'corpo', atual);
  }

  function desenhar(agora: number) {
    const t = agora / 1000;
    const mexe = parado ? 0 : 1;
    boneco.raiz.rotation.y = giro + Math.sin(t * 0.7) * 0.05 * mexe;
    boneco.raiz.position.y = Math.sin(t * 2.1) * 0.006 * mexe;
    const cabeca = boneco.juntas.head;
    if (cabeca) cabeca.rotation.z = Math.sin(t * 1.3) * 0.03 * mexe;
    let esq = ABERTURA_REPOUSO + Math.sin(t * 1.6) * 0.035 * mexe;
    let dir = ABERTURA_REPOUSO + Math.sin(t * 1.6 + 1.4) * 0.035 * mexe;
    if (acenoInicio >= 0) {
      const p = (agora - acenoInicio) / 1500; // 0 → 1
      if (p >= 1) acenoInicio = -1;
      else {
        const sobe = Math.sin(Math.min(1, p * 2.4) * Math.PI / 2) * (p > 0.8 ? (1 - p) / 0.2 : 1);
        dir = ABERTURA_REPOUSO + sobe * (148 * GRAUS - ABERTURA_REPOUSO) + Math.sin(p * 26) * 0.16 * sobe;
      }
    }
    abrirBraco(THREE, boneco, 'L', esq);
    abrirBraco(THREE, boneco, 'R', dir);
    renderer.render(cena, cam);
  }

  function laco(agora: number) {
    if (!vivo) return;
    if (!document.hidden) desenhar(agora);
    if (!parado || acenoInicio >= 0) quadro = requestAnimationFrame(laco);
    else quadro = 0;
  }
  const acordar = () => { if (vivo && !quadro) quadro = requestAnimationFrame(laco); };

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

  aplicarVisual(THREE, boneco.raiz, atual, expr);
  medir();
  quadro = requestAnimationFrame(laco);

  return {
    atualizar(novo, novaExpr) {
      atual = novo;
      expr = novaExpr;
      aplicarVisual(THREE, boneco.raiz, atual, expr);
      enquadrar(cam, 'corpo', atual);
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
      renderer.dispose();
      canvas.remove();
    },
  };
}
