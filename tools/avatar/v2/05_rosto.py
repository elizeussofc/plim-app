# -*- coding: utf-8 -*-
"""Boneco v2, etapa 5: o rosto em peças soltas (olhos, pálpebras, sobrancelhas e bocas).

    python 05_rosto.py <04_cabelo.blend> <05_rosto.blend> [--estilo m|f] [--expressao feliz]
        [--sobe-olhos 0.002] [--sobe-boca -0.002] [--so-medir]

--estilo f acrescenta cílios e afina a sobrancelha. O script acha o nariz, o queixo e a largura
do rosto por raio e ajusta o tamanho e a posição das peças à cabeça de cada boneco.

A cabeça gerada por IA é lisa (só nariz e orelhas). Cada peça do rosto é uma casca fina
moldada sobre a curva da cabeça (um raio de frente acha a superfície em cada ponto) e presa
ao osso Head. O app mostra e esconde peças pelo nome para trocar de expressão e piscar:

    eye__aberto__*      olho aberto (branco, íris, pupila, brilho, cílio)
    eye__fechado__*     olho fechado (piscada)
    eye__sorrindo__*    olho fechado de alegria
    lid__<expr>__*      pálpebra que cobre parte do olho (triste, cansado)
    brow__<expr>__*     sobrancelha de cada expressão
    mouth__<expr>__*    boca de cada expressão

Expressões: feliz, neutro, triste, animado, cansado, determinado, orgulhoso.
Medidas em metros; o boneco olha para -Y e o lado esquerdo dele é +X.
"""
import math
import sys

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
entrada, saida = args[0], args[1]
EXPR = args[args.index('--expressao') + 1] if '--expressao' in args else 'feliz'

ESTILO = args[args.index('--estilo') + 1] if '--estilo' in args else 'm'   # m = masculino, f = feminino (cílios, sobrancelha fina)
# Largura do rosto do boneco masculino na altura dos olhos, medida por medir_rosto(). As medidas
# do rosto foram desenhadas para essa largura; em outra cabeça tudo é multiplicado por K.
LARGURA_REF = 0.0861   # medido por raio em 28/11/2026 no masculino (nariz em z=1,310, queixo em z=1,224)

CORES = {  # cor de tela (hex) de cada material; o app troca pele, cabelo e íris
    'eye_white': 'F8F7F2', 'iris': '5A3220', 'dark': '1C1210', 'mouth': '4A1A16',
    'tongue': 'E8788A', 'teeth': 'FFFFFF', 'skin': 'C98A5E', 'brow': '2A1812',
}
BRILHO = {'eye_white': 0.22, 'iris': 0.25, 'dark': 0.3, 'teeth': 0.3, 'tongue': 0.45}

bpy.ops.wm.open_mainfile(filepath=entrada)
sc = bpy.context.scene
corpo = bpy.data.objects['corpo']
esq = bpy.data.objects['esqueleto']

for o in [o for o in sc.objects if o.name.split('__')[0] in ('eye', 'lid', 'brow', 'mouth')]:
    bpy.data.objects.remove(o, do_unlink=True)

bm = bmesh.new()
bm.from_mesh(corpo.data)
bm.transform(corpo.matrix_world)
bvh = BVHTree.FromBMesh(bm)


def pele_y(x, z):
    """Y da superfície do rosto no ponto (x, z), vista de frente."""
    loc, _n, _i, _d = bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    if loc is None:
        loc, _n, _i, _d = bvh.find_nearest(Vector((x, -0.12, z)))
    return loc.y


def medir_rosto():
    """Acha o nariz, o queixo e a largura do rosto na cabeça lisa, para pôr cada peça no lugar."""
    nomes = {g.index: g.name for g in corpo.vertex_groups}
    cab = []
    for v in corpo.data.vertices:
        if v.groups and nomes[max(v.groups, key=lambda g: g.weight).group] in ('Head', 'head_end', 'headfront'):
            cab.append(corpo.matrix_world @ v.co)
    z0, topo = min(p.z for p in cab), max(p.z for p in cab)
    alt = topo - z0
    nariz_z, nariz_y = None, 9.0
    z = z0 + 0.25 * alt
    while z < z0 + 0.60 * alt:                       # o nariz é o ponto mais à frente no meio da cabeça
        for x in (-0.004, 0.0, 0.004):
            y = pele_y(x, z)
            if y < nariz_y:
                nariz_z, nariz_y = z, y
        z += 0.0015
    ref = pele_y(0, nariz_z - 0.035)                 # altura da boca
    queixo_z = nariz_z - 0.035
    while queixo_z > z0 - 0.06 and pele_y(0, queixo_z) < ref + 0.02:
        queixo_z -= 0.0015                           # desce até a pele recuar 2 cm: passou do queixo
    # Largura do rosto: meia largura da cabeça na altura dos olhos, 4,5 cm atrás da testa (antes das
    # orelhas). Medida com raio vindo dos dois lados; contar vértices não serve, porque a cabeça lisa
    # fica com poucos depois da redução.
    zo = nariz_z + 0.043
    yq = pele_y(0.0, zo) + 0.045
    dir_, _n, _i, _d = bvh.ray_cast(Vector((1.0, yq, zo)), Vector((-1, 0, 0)))
    esq_, _n, _i, _d = bvh.ray_cast(Vector((-1.0, yq, zo)), Vector((1, 0, 0)))
    largura = (dir_.x - esq_.x) / 2
    return nariz_z, queixo_z, largura, topo


def opc_num(nome):
    return float(args[args.index(nome) + 1]) if nome in args else None


NARIZ_Z, QUEIXO_Z, LARGURA, TOPO = medir_rosto()
# O rosto é desenhado nas medidas do masculino (nariz em 1,310, queixo em 1,224) e levado para a
# cabeça de cada boneco por lugar(): a largura e a parte de cima acompanham a largura do rosto (K);
# do nariz para baixo acompanha a distância do nariz ao queixo (KQ).
NARIZ_REF, QUEIXO_REF = 1.310, 1.224
K = LARGURA / LARGURA_REF
KQ = min(1.25, max(0.80, (NARIZ_Z - QUEIXO_Z) / (NARIZ_REF - QUEIXO_REF)))
AJUSTE_OLHOS = opc_num('--sobe-olhos') or 0.0      # metros, para acertar à mão depois de ver o render
AJUSTE_BOCA = opc_num('--sobe-boca') or 0.0
OLHO_X, OLHO_Z = 0.047, 1.353
OLHO_RX, OLHO_RZ = 0.0255, 0.0300
IRIS_R, PUPILA_R = 0.0172, 0.0082
SOBR_Z = 1.399
BOCA_Z = 1.263


def lugar(x, z):
    """Das medidas do masculino para a cabeça deste boneco."""
    dz = z - NARIZ_REF
    return x * K, NARIZ_Z + (dz * K + AJUSTE_OLHOS if dz >= 0 else dz * KQ + AJUSTE_BOCA)


print(f'rosto medido: nariz z={NARIZ_Z:.4f} | queixo z={QUEIXO_Z:.4f} | largura {LARGURA:.4f} | K={K:.3f} KQ={KQ:.3f} | '
      f'olhos em z={lugar(0, OLHO_Z)[1]:.4f} | sobrancelha em z={lugar(0, SOBR_Z)[1]:.4f} | boca em z={lugar(0, BOCA_Z)[1]:.4f} | estilo {ESTILO}')
if '--so-medir' in args:
    raise SystemExit(0)


def material(nome):
    m = bpy.data.materials.get(nome)
    if m is None:
        m = bpy.data.materials.new(nome)
        m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        h = CORES[nome]
        b.inputs['Base Color'].default_value = (*[((int(h[i:i + 2], 16) / 255 + 0.055) / 1.055) ** 2.4 for i in (0, 2, 4)], 1)
        b.inputs['Roughness'].default_value = BRILHO.get(nome, 0.65)
        m.use_backface_culling = False
    return m


class Peca:
    """Junta várias cascas numa peça só (ex.: os dois olhos)."""

    def __init__(self, nome, mat):
        self.nome, self.mat, self.v, self.f = nome, mat, [], []

    def _ponto(self, x, z, levanta):
        x, z = lugar(x, z)
        self.v.append((x, pele_y(x, z) - levanta, z))
        return len(self.v) - 1

    def disco(self, cx, cz, contorno, levanta, aneis=6, n=36):
        """Forma cheia em volta de um centro. contorno(ang) -> (dx, dz); levanta(x, z, r) -> altura sobre a pele (r de 0 a 1)."""
        centro = self._ponto(cx, cz, levanta(cx, cz, 0.0))
        ant = None
        for k in range(1, aneis + 1):
            r = k / aneis
            anel = []
            for j in range(n):
                dx, dz = contorno(2 * math.pi * j / n)
                anel.append(self._ponto(cx + dx * r, cz + dz * r, levanta(cx + dx * r, cz + dz * r, r)))
            for j in range(n):
                a, b = anel[j], anel[(j + 1) % n]
                if ant is None:
                    self.f.append((centro, a, b))
                else:
                    self.f.append((ant[j], a, b, ant[(j + 1) % n]))
            ant = anel
        return self

    def fita(self, curva, largura, levanta, gordura=0.0015, seg=5):
        """Tira ao longo de uma curva de pontos (x, z). largura(t) e levanta: altura da base; a tira é abaulada."""
        n = len(curva)
        linhas = []
        for i, (x, z) in enumerate(curva):
            t = i / (n - 1)
            xa, za = curva[max(i - 1, 0)]
            xb, zb = curva[min(i + 1, n - 1)]
            tx, tz = xb - xa, zb - za
            c = math.hypot(tx, tz) or 1.0
            nx, nz = -tz / c, tx / c
            w = largura(t) / 2
            linha = []
            for j in range(seg + 1):
                s = -1 + 2 * j / seg
                px, pz = x + nx * w * s, z + nz * w * s
                linha.append(self._ponto(px, pz, levanta + gordura * (1 - s * s) * min(1.0, largura(t) / 0.004)))
            linhas.append(linha)
        for i in range(n - 1):
            for j in range(seg):
                self.f.append((linhas[i][j], linhas[i + 1][j], linhas[i + 1][j + 1], linhas[i][j + 1]))
        return self

    def criar(self):
        me = bpy.data.meshes.new(self.nome)
        me.from_pydata(self.v, [], self.f)
        me.update()
        o = bpy.data.objects.new(self.nome, me)
        sc.collection.objects.link(o)
        me.materials.append(material(self.mat))
        b = bmesh.new()
        b.from_mesh(me)
        bmesh.ops.recalc_face_normals(b, faces=b.faces)
        # normais para a frente (-Y): se a maioria olha para trás, vira tudo
        if sum(f.normal.y for f in b.faces) > 0:
            bmesh.ops.reverse_faces(b, faces=b.faces)
        b.to_mesh(me)
        b.free()
        for p in me.polygons:
            p.use_smooth = True
        mundo = o.matrix_world.copy()
        o.parent = esq
        o.parent_type = 'BONE'
        o.parent_bone = 'Head'
        o.matrix_world = mundo
        return o


def elipse(rx, rz):
    return lambda a: (rx * math.cos(a), rz * math.sin(a))


def arco(cx, cz, meia, flecha, n=17, incl=0.0):
    """Curva de boca ou sobrancelha: flecha > 0 = pontas para cima (sorriso). incl inclina (lado +X mais alto)."""
    return [(cx + meia * (2 * i / (n - 1) - 1),
             cz - flecha * (1 - (2 * i / (n - 1) - 1) ** 2) + incl * (2 * i / (n - 1) - 1)) for i in range(n)]


def afina(meio, ponta):
    return lambda t: ponta + (meio - ponta) * math.sin(math.pi * t) ** 0.6


LADOS = (+1, -1)  # +1 = olho esquerdo do boneco (à direita de quem olha)


def alt_branco(lado):
    cx = OLHO_X * lado
    return lambda x, z, r=None: 0.0007 + 0.0036 * max(0.0, 1 - ((x - cx) / OLHO_RX) ** 2 - ((z - OLHO_Z) / OLHO_RZ) ** 2)


# ───────── olhos ─────────
branco, iris, escuro, brilho = Peca('eye__aberto__branco', 'eye_white'), Peca('eye__aberto__iris', 'iris'), Peca('eye__aberto__escuro', 'dark'), Peca('eye__aberto__brilho', 'eye_white')
fechado, sorrindo = Peca('eye__fechado__escuro', 'dark'), Peca('eye__sorrindo__escuro', 'dark')
for lado in LADOS:
    cx = OLHO_X * lado
    ab = alt_branco(lado)
    branco.disco(cx, OLHO_Z, elipse(OLHO_RX, OLHO_RZ), ab)
    ix, iz = cx - 0.0025 * lado, OLHO_Z - 0.0015   # íris um pouco para dentro e para baixo: olhar atento
    iris.disco(ix, iz, elipse(IRIS_R, IRIS_R), lambda x, z, r, ab=ab: ab(x, z) + 0.0007 + 0.0010 * (1 - r * r), aneis=4)
    escuro.disco(ix, iz, elipse(PUPILA_R, PUPILA_R), lambda x, z, r, ab=ab: ab(x, z) + 0.0024, aneis=2, n=24)
    brilho.disco(ix - 0.0062, iz + 0.0068, elipse(0.0046, 0.0046), lambda x, z, r, ab=ab: ab(x, z) + 0.0031, aneis=2, n=16)
    brilho.disco(ix + 0.0055, iz - 0.0060, elipse(0.0021, 0.0021), lambda x, z, r, ab=ab: ab(x, z) + 0.0031, aneis=1, n=10)
    # cílio: contorno de cima do olho, mais grosso no meio, com uma pontinha para fora
    cima = [(cx + OLHO_RX * 1.04 * math.cos(a), OLHO_Z + OLHO_RZ * 1.03 * math.sin(a))
            for a in [math.radians(g) for g in range(8, 173, 9)]]
    if lado < 0:
        cima = cima[::-1]
    escuro.fita(cima, afina(0.0052, 0.0020), 0.0010, gordura=0.0016)
    if ESTILO == 'f':
        # cílios: três tracinhos no canto de fora do olho aberto e dois no olho fechado
        for graus, comp in ((24, 0.0100), (41, 0.0086), (58, 0.0068)):
            a = math.radians(graus if lado > 0 else 180 - graus)
            d = math.radians(graus - 16 if lado > 0 else 180 - graus + 16)
            x0, z0 = cx + OLHO_RX * 1.03 * math.cos(a), OLHO_Z + OLHO_RZ * 1.02 * math.sin(a)
            escuro.fita([(x0 + comp * math.cos(d) * i / 3, z0 + comp * math.sin(d) * i / 3) for i in range(4)],
                        lambda t: 0.0036 - 0.0027 * t, 0.0010, gordura=0.0010, seg=3)
        for dz_, comp in ((-0.0005, 0.0075), (-0.0040, 0.0062)):
            x0 = cx + lado * OLHO_RX * 0.99
            fechado.fita([(x0 + lado * comp * i / 3, OLHO_Z - 0.004 + dz_ * (1 + i / 3) - 0.0012 * i) for i in range(4)],
                         lambda t: 0.0032 - 0.0023 * t, 0.0008, gordura=0.0009, seg=3)
            sorrindo.fita([(x0 + lado * comp * i / 3, OLHO_Z + 0.008 + dz_ + 0.0016 * i) for i in range(4)],
                          lambda t: 0.0032 - 0.0023 * t, 0.0008, gordura=0.0009, seg=3)
    # olho fechado (piscada): risco curvo para baixo, na altura do meio do olho
    fechado.fita(arco(cx, OLHO_Z - 0.004, OLHO_RX * 1.02, 0.0075), afina(0.0048, 0.0022), 0.0008)
    # olho de alegria: arco para cima
    sorrindo.fita(arco(cx, OLHO_Z + 0.008, OLHO_RX * 1.05, -0.0125), afina(0.0056, 0.0024), 0.0008)


def palpebra(nome, corte, incl):
    """Pálpebra de pele cobrindo o olho acima de uma linha. corte = altura da linha (0 = meio do olho); incl = quanto o canto de fora desce."""
    pele, risco = Peca(f'lid__{nome}__pele', 'skin'), Peca(f'lid__{nome}__escuro', 'dark')
    for lado in LADOS:
        cx = OLHO_X * lado
        ab = alt_branco(lado)

        def linha(x, cx=cx, lado=lado):
            return OLHO_Z + corte - incl * ((x - cx) * lado / OLHO_RX)

        def contorno(a, cx=cx):
            dx, dz = OLHO_RX * 1.06 * math.cos(a), OLHO_RZ * 1.06 * math.sin(a)
            return dx, max(dz, linha(cx + dx) - OLHO_Z)   # o que ficaria abaixo da linha sobe até ela
        meio = (linha(cx) + OLHO_Z + OLHO_RZ) / 2
        pele.disco(cx, meio, lambda a, c=contorno, m=meio: (c(a)[0], c(a)[1] - (m - OLHO_Z)),
                   lambda x, z, r, ab=ab: ab(x, z) + 0.0040, aneis=4)
        xs = [cx + OLHO_RX * 1.03 * (2 * i / 12 - 1) for i in range(13)]
        risco.fita([(x, linha(x)) for x in xs], afina(0.0044, 0.0020), 0.0046, gordura=0.0012)
    return [pele, risco]


pecas = [branco, iris, escuro, brilho, fechado, sorrindo]
pecas += palpebra('triste', 0.010, 0.010)
pecas += palpebra('cansado', 0.004, 0.000)

# ───────── sobrancelhas ─────────
SOBR = {  # (sobe tudo, sobe o canto de dentro, sobe o canto de fora, curvatura)
    'feliz': (0.000, 0.000, 0.000, 0.0050),
    'neutro': (-0.001, 0.000, 0.000, 0.0022),
    'animado': (0.007, 0.000, 0.001, 0.0075),
    'triste': (0.001, 0.008, -0.005, 0.0030),
    'cansado': (-0.004, 0.001, -0.002, 0.0015),
    'determinado': (-0.003, -0.008, 0.005, 0.0020),
    'orgulhoso': (0.006, 0.000, 0.002, 0.0070),
}
for nome, (sobe, dentro, fora, curva) in SOBR.items():
    p = Peca(f'brow__{nome}__pelo', 'brow')
    for lado in LADOS:
        pts = []
        for i in range(15):
            t = i / 14                                # 0 = canto de dentro, 1 = canto de fora
            x = (0.021 + 0.058 * t) * lado
            z = SOBR_Z + sobe + dentro * (1 - t) + fora * t + curva * math.sin(math.pi * t)
            pts.append((x, z))
        # grossa perto do nariz, afinando para fora (como no conceito aprovado); no feminino, mais fina
        fino = 0.60 if ESTILO == 'f' else 1.0
        p.fita(pts, lambda t, fino=fino: fino * ((0.0150 - 0.0085 * t) if t > 0.10 else (0.0095 + 0.0055 * (t / 0.10))), 0.0010, gordura=0.0026 * fino, seg=6)
    pecas.append(p)

# ───────── bocas ─────────
risco_boca = afina(0.0050, 0.0022)
pecas.append(Peca('mouth__feliz__risco', 'mouth').fita(arco(0, BOCA_Z + 0.004, 0.025, 0.0090), risco_boca, 0.0009))
pecas.append(Peca('mouth__neutro__risco', 'mouth').fita(arco(0, BOCA_Z, 0.015, 0.0015), risco_boca, 0.0009))
pecas.append(Peca('mouth__triste__risco', 'mouth').fita(arco(0, BOCA_Z - 0.004, 0.017, -0.0065), risco_boca, 0.0009))
pecas.append(Peca('mouth__cansado__risco', 'mouth').fita(arco(0, BOCA_Z - 0.001, 0.013, -0.0015, incl=0.0012), risco_boca, 0.0009))
pecas.append(Peca('mouth__determinado__risco', 'mouth').fita(arco(0, BOCA_Z + 0.001, 0.019, 0.0035, incl=0.0030), risco_boca, 0.0009))
pecas.append(Peca('mouth__orgulhoso__risco', 'mouth').fita(arco(0, BOCA_Z + 0.006, 0.031, 0.0125), afina(0.0056, 0.0024), 0.0009))


def boca_aberta(a, meia=0.026, cima=0.0040, baixo=0.0200):
    return meia * math.cos(a), (cima if math.sin(a) > 0 else baixo) * math.sin(a)


cz = BOCA_Z + 0.006
pecas.append(Peca('mouth__animado__fundo', 'mouth').disco(0, cz - 0.004, lambda a: (boca_aberta(a)[0], boca_aberta(a)[1] + 0.004), lambda x, z, r: 0.0009, aneis=4))
pecas.append(Peca('mouth__animado__dentes', 'teeth').disco(0, cz - 0.0005, lambda a: (0.0215 * math.cos(a), 0.0034 * math.sin(a)), lambda x, z, r: 0.0017, aneis=2, n=24))
pecas.append(Peca('mouth__animado__lingua', 'tongue').disco(0, cz - 0.0135, lambda a: (0.0125 * math.cos(a), 0.0062 * math.sin(a)), lambda x, z, r: 0.0017 + 0.0008 * (1 - r * r), aneis=3, n=24))

objs = [p.criar() for p in pecas]
bm.free()

# Expressão que fica visível no arquivo (o app decide na hora; isto é só para render e conferência).
ROSTO = {
    'feliz': ('aberto', None), 'neutro': ('aberto', None), 'animado': ('aberto', None), 'determinado': ('aberto', None),
    'triste': ('aberto', 'triste'), 'cansado': ('aberto', 'cansado'), 'orgulhoso': ('sorrindo', None),
}
olho, lid = ROSTO[EXPR]
for o in objs:
    slot, item = o.name.split('__')[:2]
    ver = {'eye': item == olho, 'lid': item == lid, 'brow': item == EXPR, 'mouth': item == EXPR}[slot]
    o.hide_render = not ver
    o.hide_viewport = not ver

tri = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
print(f'rosto: {len(objs)} peças, {tri} triângulos | expressão visível: {EXPR}')
bpy.ops.wm.save_as_mainfile(filepath=saida)
print('salvo:', saida)
