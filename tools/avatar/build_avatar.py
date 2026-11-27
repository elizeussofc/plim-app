"""
Avatar modular do Plim — gerado por script no Blender (bpy).

Uso:
    python build_avatar.py --out <pasta> [--render] [--blend] [--glb] [--abertura 38] [--so masculino,feminino]

    --glb     plim_avatar.glb: um arquivo só com todas as peças trocáveis (é o que o app abre)
    --blend   um .blend por variante, para os renders de revisão
    --render  renders de apresentação (Cycles na CPU)

Estrutura: o boneco é uma hierarquia de "juntas" (empties) com peças rígidas
penduradas em cada uma. Trocar roupa/cabelo/acessório = ligar e desligar peças;
trocar cor = mudar a cor do material pelo nome (skin, hair, top, bottom, ...).
Convenção de nomes das peças: <slot>__<item>__<parte>, ex.: hair__coque__cap.
"""
import argparse
import math
import os
import sys

import bpy  # precisa vir antes de bmesh/mathutils
import bmesh
from mathutils import Matrix, Vector

# ───────────────────────── cores padrão (o app sobrescreve) ─────────────────
CORES = {
    'skin': '#C98A5E',
    'hair': '#3B2219',
    'top': '#7C3AED',
    'top_detail': '#6D28D9',
    'bottom': '#3A4250',
    'shoe': '#F4F4F5',
    'sole': '#F97316',
    'accent': '#F97316',
    'eye_white': '#FFFFFF',
    'iris': '#6B3B22',
    'dark': '#1F1410',
    'mouth': '#3A1F18',
    'acc': '#1E293B',
    'acc2': '#F97316',
    'hat': '#EA580C',
    'hat_detail': '#C2410C',
    'extra': '#2F7FE6',
    'extra_detail': '#1E5FB8',
    'gold': '#F2B705',
    'white': '#F4EDE1',
    'pink': '#F59AB5',
}


def hex_rgb(h):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb] + [1.0]


_mats = {}


def mat(nome):
    if nome in _mats:
        return _mats[nome]
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = hex_rgb(CORES[nome])
    bsdf.inputs['Roughness'].default_value = 0.62 if nome not in ('eye_white', 'iris', 'dark') else 0.25
    _mats[nome] = m
    return m


# ───────────────────────── construção de malhas ─────────────────────────────
def _finish(nome, bm, material, parent, world=None, subsurf=0):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat(material))
    if world is not None:
        ob.matrix_world = world
    if subsurf:
        mod = ob.modifiers.new('subsurf', 'SUBSURF')
        mod.levels = subsurf
        mod.render_levels = subsurf
    if parent is not None:
        bpy.context.view_layer.update()
        mw = ob.matrix_world.copy()
        ob.parent = parent
        ob.matrix_parent_inverse = parent.matrix_world.inverted()
        ob.matrix_world = mw
    return ob


def esfera(nome, material, parent, loc, raio=1.0, escala=(1, 1, 1), rot=(0, 0, 0), seg=28):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=raio)
    m = Matrix.Translation(loc) @ _rot(rot) @ Matrix.Diagonal((*escala, 1))
    return _finish(nome, bm, material, parent, m)


def cone(nome, material, parent, p0, p1, r0, r1, seg=24, tampas=True):
    """Tronco de cone de p0 (raio r0) até p1 (raio r1), em coordenadas do mundo."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=tampas, cap_tris=False, segments=seg,
                          radius1=r0, radius2=r1, depth=d.length)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    m = Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4()
    return _finish(nome, bm, material, parent, m)


def capsula(nome, material, parent, p0, p1, r0, r1, seg=24):
    """Cone com esferas nas pontas (membro arredondado). Devolve lista de peças."""
    return [
        cone(nome, material, parent, p0, p1, r0, r1, seg, tampas=False),
        esfera(nome + '_a', material, parent, p0, r0, seg=seg),
        esfera(nome + '_b', material, parent, p1, r1, seg=seg),
    ]


def caixa(nome, material, parent, loc, tam, rot=(0, 0, 0), subsurf=3):
    """Caixa arredondada (cubo + subdivisão) — o 'look' de massinha."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    m = Matrix.Translation(loc) @ _rot(rot) @ Matrix.Diagonal((*tam, 1))
    return _finish(nome, bm, material, parent, m, subsurf=subsurf)


def toro(nome, material, parent, loc, raio, espessura, rot=(0, 0, 0), escala=(1, 1, 1), seg=28, tubo=12):
    bm = bmesh.new()
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for j in range(tubo):
            b = 2 * math.pi * j / tubo
            r = raio + espessura * math.cos(b)
            bm.verts.new((r * math.cos(a), r * math.sin(a), espessura * math.sin(b)))
    bm.verts.ensure_lookup_table()
    for i in range(seg):
        for j in range(tubo):
            v = lambda ii, jj: bm.verts[(ii % seg) * tubo + (jj % tubo)]
            bm.faces.new((v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)))
    m = Matrix.Translation(loc) @ _rot(rot) @ Matrix.Diagonal((*escala, 1))
    return _finish(nome, bm, material, parent, m)


def arco(nome, material, parent, centro, raio, ang0, ang1, esp, n=14, plano_y=0.0):
    """Tubo em arco no plano XZ (boca, sobrancelha). Ângulos em graus."""
    bm = bmesh.new()
    tubo = 8
    aneis = []
    for i in range(n + 1):
        a = math.radians(ang0 + (ang1 - ang0) * i / n)
        c = Vector((raio * math.cos(a), 0, raio * math.sin(a)))
        rad = Vector((math.cos(a), 0, math.sin(a)))
        t = min(i, n - i) / (n / 2)
        e = esp * (0.55 + 0.45 * min(1.0, t * 2))
        anel = []
        for j in range(tubo):
            b = 2 * math.pi * j / tubo
            anel.append(bm.verts.new(c + rad * (e * math.cos(b)) + Vector((0, e * math.sin(b), 0))))
        aneis.append(anel)
    for i in range(n):
        for j in range(tubo):
            bm.faces.new((aneis[i][j], aneis[i + 1][j], aneis[i + 1][(j + 1) % tubo], aneis[i][(j + 1) % tubo]))
    bm.faces.new(reversed(aneis[0]))
    bm.faces.new(aneis[-1])
    m = Matrix.Translation((centro[0], plano_y, centro[1]))
    return _finish(nome, bm, material, parent, m)


def chapa(nome, material, parent, pontos, loc, esp=0.012, escala=1.0):
    """Polígono 2D (no plano XZ) extrudado em Y — usado no raio do moletom."""
    bm = bmesh.new()
    frente = [bm.verts.new((x * escala, -esp / 2, z * escala)) for x, z in pontos]
    tras = [bm.verts.new((x * escala, esp / 2, z * escala)) for x, z in pontos]
    bm.faces.new(frente)
    bm.faces.new(reversed(tras))
    n = len(pontos)
    for i in range(n):
        bm.faces.new((frente[i], tras[i], tras[(i + 1) % n], frente[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = _finish(nome, bm, material, parent, Matrix.Translation(loc))
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob


def junta(nome, parent, loc):
    e = bpy.data.objects.new(nome, None)
    e.empty_display_size = 0.03
    bpy.context.scene.collection.objects.link(e)
    e.matrix_world = Matrix.Translation(loc)
    if parent is not None:
        bpy.context.view_layer.update()
        mw = e.matrix_world.copy()
        e.parent = parent
        e.matrix_parent_inverse = parent.matrix_world.inverted()
        e.matrix_world = mw
    bpy.context.view_layer.update()
    return e


def _rot(r):
    return (Matrix.Rotation(r[2], 4, 'Z') @ Matrix.Rotation(r[1], 4, 'Y') @ Matrix.Rotation(r[0], 4, 'X'))


# ───────────────────────── o boneco ─────────────────────────────────────────
# Medidas em unidades do Blender (1 u ≈ 1 m; altura ≈ 1,42 sem o coque), tiradas das duas
# imagens de referência (frente, feminino em pose A e masculino em pose T) com medir.py.
# O que a frente não mostra (profundidade, costas, sola) é inferido.
HEAD_C = Vector((0, 0, 1.15))            # centro do crânio
HEAD_R = Vector((0.235, 0.212, 0.205))   # queixo em z=0,945; orelha a orelha 0,57
HEAD_P = 0.75                            # < 1 deixa o perfil mais "quadrado" (bochecha cheia)
HAIR_R = Vector((0.258, 0.24, 0.27))     # volume do cabelo no topo: z=1,42
EYE_X, EYE_Z = 0.10, 1.085               # olhos bem abaixo do centro da cabeça
OMBRO = (0.155, 0.815)                   # x, z do pivô do braço
ABERTURA_PE = 0.31                       # pés abertos ~18° para fora


def frente_cabeca(x, z, extra=0.0):
    """Y da superfície da frente da cabeça no ponto (x, z)."""
    u = max(-1.0, min(1.0, (z - HEAD_C.z) / HEAD_R.z))
    zu = math.copysign(abs(u) ** (1 / HEAD_P), u)
    dx = x / HEAD_R.x
    return -HEAD_R.y * math.sqrt(max(0.0, 1 - dx * dx - zu * zu)) - extra


def cabeca(nome, material, parent, seg=32):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=1.0)
    for v in bm.verts:
        v.co.z = math.copysign(abs(v.co.z) ** HEAD_P, v.co.z)
    return _finish(nome, bm, material, parent, Matrix.Translation(HEAD_C) @ Matrix.Diagonal((*HEAD_R, 1)))


def colar(ob, folga=0.0):
    """Assenta no rosto uma peça modelada em torno do plano y=0, como um adesivo com espessura."""
    mw = ob.matrix_world
    inv = mw.inverted()
    for v in ob.data.vertices:
        w = mw @ v.co
        w.y = frente_cabeca(w.x, w.z) + w.y - folga
        v.co = inv @ w
    return ob


def loft(nome, material, parent, secoes, seg=20, expo=2.0, tampas=(True, True), world=None):
    """Tubo que sobe em Z passando por seções (x, y, z, raio_x, raio_y). expo > 2 deixa a
    seção mais quadrada. Para pontas arredondadas, comece e termine com seções pequenas.
    tampas=(baixo, cima): desligue a tampa da ponta que emenda com outra peça, para a
    luz não marcar a emenda. world: matriz para modelar reto e girar depois."""
    bm = bmesh.new()
    aneis = []
    for cx, cy, cz, rx, ry in secoes:
        anel = []
        for j in range(seg):
            a = 2 * math.pi * j / seg
            c, s = math.cos(a), math.sin(a)
            anel.append(bm.verts.new((cx + rx * math.copysign(abs(c) ** (2 / expo), c),
                                      cy + ry * math.copysign(abs(s) ** (2 / expo), s), cz)))
        aneis.append(anel)
    for i in range(len(aneis) - 1):
        for j in range(seg):
            bm.faces.new((aneis[i][j], aneis[i][(j + 1) % seg], aneis[i + 1][(j + 1) % seg], aneis[i + 1][j]))
    if tampas[0]:
        bm.faces.new(reversed(aneis[0]))
    if tampas[1]:
        bm.faces.new(aneis[-1])
    return _finish(nome, bm, material, parent, world)


def construir(cabelo='curto', pose_a=True, expressao='feliz', acessorios=(), abertura=38.0, tudo=False):
    """abertura: ângulo dos braços em graus (0 = junto ao corpo, 90 = pose T).
    tudo=True monta o arquivo mestre: todos os cabelos e acessórios entram, e só os
    escolhidos ficam visíveis no render (o app liga e desliga pelo nome)."""
    ox, oz = OMBRO
    J = {}
    J['root'] = junta('root', None, (0, 0, 0))
    J['hips'] = junta('hips', J['root'], (0, 0, 0.52))
    J['chest'] = junta('chest', J['hips'], (0, 0, 0.62))
    J['neck'] = junta('neck', J['chest'], (0, 0, 0.91))
    J['head'] = junta('head', J['neck'], (0, 0, 0.95))
    for s, sx in (('L', 1), ('R', -1)):
        J['shoulder_' + s] = junta('shoulder_' + s, J['chest'], (sx * ox, 0, oz))
        J['elbow_' + s] = junta('elbow_' + s, J['shoulder_' + s], (sx * ox, 0, 0.66))
        J['wrist_' + s] = junta('wrist_' + s, J['elbow_' + s], (sx * ox, 0, 0.505))
        J['leg_' + s] = junta('leg_' + s, J['hips'], (sx * 0.09, 0, 0.50))
        J['foot_' + s] = junta('foot_' + s, J['leg_' + s], (sx * 0.13, 0, 0.13))

    # ── cabeça (pele) ──
    cabeca('body__head', 'skin', J['head'])
    cone('body__neck', 'skin', J['neck'], (0, 0, 0.89), (0, 0, 0.99), 0.055, 0.055, seg=16)
    for s, sx in (('L', 1), ('R', -1)):
        esfera('body__ear_' + s, 'skin', J['head'], (sx * 0.238, 0.012, 1.08), 1.0, (0.05, 0.03, 0.066), seg=16)
    colar(esfera('body__nose', 'skin', J['head'], (0, 0, 1.04), 1.0, (0.03, 0.028, 0.026), seg=14), 0.004)

    # ── rosto: olhos (branco fino, íris grande, pupila, brilho e a linha da pálpebra) ──
    for s, sx in (('L', 1), ('R', -1)):
        x = sx * EYE_X
        colar(esfera('face__eye_white_' + s, 'eye_white', J['head'], (x, 0, EYE_Z), 1.0, (0.053, 0.010, 0.056), seg=18), 0.001)
        colar(esfera('face__iris_' + s, 'iris', J['head'], (x, 0, EYE_Z - 0.003), 1.0, (0.042, 0.008, 0.047), seg=16), 0.007)
        colar(esfera('face__pupil_' + s, 'dark', J['head'], (x, 0, EYE_Z - 0.003), 1.0, (0.024, 0.006, 0.028), seg=12), 0.012)
        colar(esfera('face__glint_' + s, 'eye_white', J['head'], (x + 0.015, 0, EYE_Z + 0.016), 1.0, (0.012, 0.004, 0.012), seg=8), 0.017)
        colar(arco('face__lid_' + s, 'dark', J['head'], (x, EYE_Z - 0.012), 0.066, 38, 142, 0.006, n=10), 0.008)

    # ── rosto: sobrancelhas e bocas (uma por expressão; o app mostra só uma) ──
    def sobrancelha(tag, giro, dz=0.0):
        for s, sx in (('L', 1), ('R', -1)):
            ob = caixa(f'brow__{tag}__{s}', 'hair', J['head'], (sx * (EYE_X + 0.004), 0, EYE_Z + 0.088 + dz),
                       (0.108, 0.024, 0.034), (0, sx * giro, 0), subsurf=2)
            colar(ob, 0.006)
            ob.hide_render = tag != expressao

    sobrancelha('neutro', 0.10)
    sobrancelha('feliz', 0.16, 0.008)
    sobrancelha('triste', -0.34, 0.004)
    sobrancelha('animado', 0.20, 0.022)

    bocas = {
        'feliz': arco('mouth__feliz__boca', 'mouth', J['head'], (0, 1.048), 0.060, 226, 314, 0.0058),
        'neutro': arco('mouth__neutro__boca', 'mouth', J['head'], (0, 1.105), 0.115, 252, 288, 0.007),
        'triste': arco('mouth__triste__boca', 'mouth', J['head'], (0, 0.935), 0.056, 56, 124, 0.0075),
        # boca aberta (animado): meia-lua preenchida
        'animado': esfera('mouth__animado__boca', 'mouth', J['head'], (0, 0, 1.012), 1.0, (0.05, 0.012, 0.034), seg=16),
    }
    cortar_plano_z(bocas['animado'], 1.018)
    for k, ob in bocas.items():
        colar(ob, 0.004)
        ob.hide_render = k != expressao

    # ── tronco: moletom (largura 0,27 no peito e 0,31 na barra, medida na referência) ──
    loft('top__moletom__torso', 'top', J['chest'], [
        (0, 0, 0.545, 0.150, 0.112), (0, 0, 0.60, 0.154, 0.117), (0, 0, 0.70, 0.144, 0.113),
        (0, 0, 0.78, 0.138, 0.108), (0, 0, 0.835, 0.128, 0.100), (0, 0, 0.875, 0.100, 0.086),
        (0, 0, 0.905, 0.060, 0.058), (0, 0, 0.912, 0.020, 0.020)], seg=24, expo=2.5)
    loft('top__moletom__barra', 'top_detail', J['hips'], [
        (0, 0, 0.495, 0.140, 0.104), (0, 0, 0.505, 0.158, 0.118), (0, 0, 0.545, 0.160, 0.120),
        (0, 0, 0.560, 0.150, 0.113)], seg=24, expo=2.5)
    toro('top__moletom__capuz', 'top', J['chest'], (0, 0.022, 0.925), 0.072, 0.042, rot=(0.30, 0, 0),
         escala=(1.18, 1.12, 1.0), seg=24, tubo=10)
    caixa('top__moletom__bolso', 'top_detail', J['chest'], (0, -0.110, 0.615), (0.20, 0.034, 0.10), subsurf=2)
    raio = [(0.2, 1.0), (-0.75, -0.1), (-0.12, -0.1), (-0.45, -1.0), (0.75, 0.25), (0.1, 0.25), (0.55, 1.0)]
    chapa('top__moletom__raio', 'accent', J['chest'], raio, (0, -0.116, 0.735), esp=0.012, escala=0.046)
    for sx in (1, -1):  # cordões do capuz
        cone(f'top__moletom__cordao_{"L" if sx > 0 else "R"}', 'dark', J['chest'],
             (sx * 0.03, -0.105, 0.875), (sx * 0.034, -0.116, 0.815), 0.007, 0.007, seg=8)

    # ── braços (modelados para baixo; a pose gira a junta do ombro) ──
    for s, sx in (('L', 1), ('R', -1)):
        x = sx * ox
        esfera('top__moletom__ombro_' + s, 'top', J['shoulder_' + s], (x, 0, oz), 0.062, seg=20)
        loft('top__moletom__braco_' + s, 'top', J['shoulder_' + s], [
            (x, 0, 0.66, 0.054, 0.054), (x, 0, 0.73, 0.056, 0.056), (x, 0, oz, 0.058, 0.058)],
            seg=16, tampas=(False, False))
        loft('top__moletom__antebraco_' + s, 'top', J['elbow_' + s], [
            (x, 0, 0.502, 0.038, 0.038), (x, 0, 0.515, 0.052, 0.052), (x, 0, 0.545, 0.060, 0.060),
            (x, 0, 0.61, 0.057, 0.057), (x, 0, 0.66, 0.054, 0.054)], seg=16, tampas=(True, False))
        esfera('top__moletom__cotovelo_' + s, 'top', J['elbow_' + s], (x, 0, 0.66), 0.0535, seg=12)
        toro('top__moletom__punho_' + s, 'top_detail', J['elbow_' + s], (x, 0, 0.498), 0.034, 0.02, seg=16, tubo=8)
        # mão chata, dedos juntos (luva com sulcos); palma para a frente, polegar para fora
        esfera('body__hand_' + s, 'skin', J['wrist_' + s], (x, 0, 0.452), 1.0, (0.043, 0.021, 0.042), seg=14)
        for i, d in enumerate((-0.0255, -0.0085, 0.0085, 0.0255)):
            esfera(f'body__finger_{i}_{s}', 'skin', J['wrist_' + s], (x + d * 1.05, 0, 0.408 - abs(d) * 0.3), 1.0,
                   (0.0125, 0.0125, 0.028), (0, -d * 3.0, 0), seg=8)
        esfera('body__thumb_' + s, 'skin', J['wrist_' + s], (x + sx * 0.043, -0.004, 0.447), 1.0,
               (0.013, 0.013, 0.027), (0, -sx * 0.6, 0), seg=8)

    # ── pernas: calça jogger (abrem um pouco para fora, como na referência) ──
    loft('bottom__jogger__quadril', 'bottom', J['hips'], [
        (0, 0, 0.462, 0.060, 0.050), (0, 0, 0.475, 0.120, 0.072), (0, 0, 0.51, 0.146, 0.076),
        (0, 0, 0.555, 0.146, 0.100)], seg=20, expo=2.2)
    for s, sx in (('L', 1), ('R', -1)):
        loft('bottom__jogger__perna_' + s, 'bottom', J['leg_' + s], [
            (sx * 0.130, 0, 0.135, 0.044, 0.048), (sx * 0.129, 0, 0.165, 0.052, 0.056),
            (sx * 0.127, 0, 0.19, 0.068, 0.072), (sx * 0.122, 0, 0.235, 0.067, 0.072),
            (sx * 0.110, 0, 0.32, 0.066, 0.072), (sx * 0.094, 0, 0.455, 0.073, 0.080),
            (sx * 0.088, 0, 0.52, 0.072, 0.080)], seg=16)
        # ── tênis: bico baixo e redondo que sobe até o cano; modelado reto e girado para fora ──
        m_pe = Matrix.Translation((sx * 0.13, 0, 0)) @ Matrix.Rotation(sx * ABERTURA_PE, 4, 'Z')
        loft('shoes__tenis__corpo_' + s, 'shoe', J['foot_' + s], [
            (0, -0.060, 0.026, 0.062, 0.126), (0, -0.060, 0.045, 0.066, 0.131), (0, -0.052, 0.062, 0.064, 0.121),
            (0, -0.035, 0.080, 0.060, 0.100), (0, -0.015, 0.100, 0.055, 0.078), (0, 0.000, 0.120, 0.050, 0.060),
            (0, 0.004, 0.140, 0.047, 0.052), (0, 0.004, 0.150, 0.040, 0.045)], seg=20, world=m_pe)
        loft('shoes__tenis__sola_' + s, 'sole', J['foot_' + s], [
            (0, -0.060, 0.0, 0.058, 0.124), (0, -0.060, 0.007, 0.068, 0.135), (0, -0.060, 0.024, 0.069, 0.136),
            (0, -0.060, 0.031, 0.064, 0.130)], seg=20, world=m_pe)

    # ── cabelo e acessórios ──
    cobre = any(a in COBRE_O_TOPO for a in acessorios)
    antes = set(bpy.data.objects)
    if tudo:
        for fn in list(CABELOS.values()) + list(ACESSORIOS.values()):
            fn(J)
    else:
        CABELOS[cabelo](J)
        for a in acessorios:
            ACESSORIOS[a](J)
    for ob in set(bpy.data.objects) - antes:
        slot, item = ob.name.split('__')[:2]
        if slot == 'hair':
            visivel = item == cabelo
        elif slot == 'hairtop':
            visivel = item == cabelo and not cobre
        else:
            visivel = item in acessorios
        if tudo:
            ob.hide_render = not visivel
        elif not visivel:
            bpy.data.objects.remove(ob, do_unlink=True)

    fundir()
    if pose_a:
        for s, sx in (('L', 1), ('R', -1)):
            J['shoulder_' + s].rotation_euler = (0, -sx * math.radians(abertura), 0)
    bpy.context.view_layer.update()
    return J


def fundir():
    """Junta numa malha só as peças da mesma junta, do mesmo slot/item e do mesmo material
    (menos objetos = menos chamadas de desenho no app) e aplica os modificadores.
    Nome final: <slot>__<item>__<junta>_<material>, ou <slot>__<junta>_<material> sem item."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    grupos = {}
    for ob in list(bpy.data.objects):
        if ob.type != 'MESH':
            continue
        p = ob.name.split('__')
        prefixo = '__'.join(p[:2]) if len(p) >= 3 else p[0]
        grupos.setdefault((ob.parent.name, prefixo, ob.data.materials[0].name), []).append(ob)
    for (nome_junta, prefixo, material), obs in grupos.items():
        pai = bpy.data.objects[nome_junta]
        inv = pai.matrix_world.inverted()
        bm = bmesh.new()
        for ob in obs:
            ev = ob.evaluated_get(dg)
            me = ev.to_mesh()
            me.transform(inv @ ob.matrix_world)
            bm.from_mesh(me)
            ev.to_mesh_clear()
        oculto = obs[0].hide_render
        for ob in obs:
            bpy.data.objects.remove(ob, do_unlink=True)
        nova = bpy.data.meshes.new(f'{prefixo}__{nome_junta}_{material}')
        bm.to_mesh(nova)
        bm.free()
        nova.materials.append(mat(material))
        ob = bpy.data.objects.new(nova.name, nova)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = pai
        ob.matrix_parent_inverse = Matrix.Identity(4)
        ob.hide_render = oculto
    bpy.context.view_layer.update()


def cortar_plano_z(ob, z):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    mw = ob.matrix_world
    inv = mw.inverted()
    for v in bm.verts:
        w = mw @ v.co
        if w.z > z:
            w.z = z
            v.co = inv @ w
    bm.to_mesh(ob.data)
    bm.free()


# ───────────────────────── cabelos ──────────────────────────────────────────
def _ss(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def _touca(nome, J, linha, folga=1.045, n_az=48, n_pol=12):
    """Casquete de cabelo sobre a cabeça. linha(t) devolve a altura Z da borda do
    cabelo para o ângulo t (0 = frente, pi/2 = lateral, pi = nuca). Na borda o cabelo
    encosta na cabeça; no topo ganha o volume de HAIR_R."""
    borda = HEAD_R * folga
    bm = bmesh.new()
    topo = bm.verts.new((0, 0, HAIR_R.z))
    aneis = []
    for i in range(n_az):
        th = 2 * math.pi * i / n_az
        t = abs(th if th <= math.pi else th - 2 * math.pi)
        u = max(-0.95, min(0.98, (linha(t) - HEAD_C.z) / borda.z))
        phi_max = math.acos(math.copysign(abs(u) ** (1 / HEAD_P), u))
        col = []
        for k in range(1, n_pol + 1):
            f = k / n_pol
            phi = phi_max * f
            R = HAIR_R.lerp(borda, f * f)
            c = math.cos(phi)
            col.append(bm.verts.new((R.x * math.sin(phi) * math.sin(th), -R.y * math.sin(phi) * math.cos(th),
                                     R.z * math.copysign(abs(c) ** HEAD_P, c))))
        aneis.append(col)
    for i in range(n_az):
        a, b = aneis[i], aneis[(i + 1) % n_az]
        bm.faces.new((topo, a[0], b[0]))
        for k in range(n_pol - 1):
            bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = _finish(nome, bm, 'hair', J['head'], Matrix.Translation(HEAD_C))
    mod = ob.modifiers.new('solid', 'SOLIDIFY')
    mod.thickness = 0.02
    mod.offset = 1.0
    return ob


def cabelo_coque(J):
    # risca no meio: a borda sobe no centro da testa, desce nas têmporas,
    # passa por cima da orelha e desce até a nuca.
    def linha(t):
        return 1.305 - 0.125 * _ss(t / 1.05) - 0.17 * _ss((t - 1.85) / 0.45)
    _touca('hair__coque__cap', J, linha)
    esfera('hairtop__coque__bun', 'hair', J['head'], (0, 0.03, 1.485), 1.0, (0.125, 0.12, 0.085), seg=20)
    toro('hairtop__coque__elastico', 'hair', J['head'], (0, 0.03, 1.415), 0.07, 0.022, seg=20, tubo=8)


def cabelo_curto(J):
    def linha(t):
        return 1.275 - 0.10 * _ss(t / 1.1) - 0.17 * _ss((t - 1.85) / 0.45)
    _touca('hair__curto__cap', J, linha, folga=1.05)
    # mechas bagunçadas: gomos alongados e inclinados, em vez de bolas
    mechas = [  # x, y, z, comprimento, giro em Y (cai para o lado), giro em X (< 0 cai para a frente)
        (-0.165, -0.150, 1.285, 0.085, 0.75, -0.40), (-0.085, -0.190, 1.300, 0.090, 0.35, -0.50),
        (0.000, -0.200, 1.292, 0.095, -0.10, -0.55), (0.090, -0.185, 1.300, 0.088, -0.45, -0.50),
        (0.170, -0.140, 1.280, 0.082, -0.80, -0.40), (-0.215, -0.060, 1.250, 0.080, 1.00, -0.10),
        (0.215, -0.050, 1.250, 0.080, -1.00, -0.10), (-0.120, -0.070, 1.395, 0.100, 0.55, -0.35),
        (0.090, -0.060, 1.400, 0.105, -0.50, -0.35), (-0.010, 0.030, 1.415, 0.105, 0.10, 0.00),
        (-0.180, 0.040, 1.345, 0.100, 0.80, 0.10), (0.180, 0.050, 1.345, 0.100, -0.80, 0.10),
        (0.000, 0.140, 1.355, 0.115, 0.00, 0.50), (-0.140, 0.160, 1.270, 0.110, 0.55, 0.70),
        (0.140, 0.160, 1.270, 0.110, -0.55, 0.70), (0.000, 0.205, 1.200, 0.110, 0.00, 0.90),
    ]
    for i, (x, y, z, r, gy, gx) in enumerate(mechas):
        esfera(f'hairtop__curto__mecha_{i}', 'hair', J['head'], (x, y, z), 1.0, (r * 0.62, r * 0.55, r), (gx, gy, 0), seg=10)
    esfera('hairtop__curto__topete', 'hair', J['head'], (-0.02, -0.03, 1.465), 1.0, (0.03, 0.03, 0.062), (0.2, 0.35, 0), seg=8)


# ───────────────────────── acessórios ───────────────────────────────────────
def acc_oculos(J):
    z = EYE_Z
    for s_, sx in (('L', 1), ('R', -1)):
        x = sx * EYE_X
        aro = toro('acc__oculos__aro_' + s_, 'acc', J['head'], (x, 0, z), 0.068, 0.008, rot=(math.pi / 2, 0, 0), seg=24, tubo=6)
        colar(aro, 0.026)
        cone('acc__oculos__haste_' + s_, 'acc', J['head'], (sx * 0.178, frente_cabeca(sx * 0.178, z) - 0.02, z + 0.004),
             (sx * 0.248, 0.02, z + 0.012), 0.007, 0.007, seg=8)
    cone('acc__oculos__ponte', 'acc', J['head'], (-0.034, frente_cabeca(0, z) - 0.03, z + 0.012),
         (0.034, frente_cabeca(0, z) - 0.03, z + 0.012), 0.007, 0.007, seg=8)


def acc_fone(J):
    arco('acc__fone__arco', 'acc', J['head'], (0, 1.14), 0.315, -8, 188, 0.018, n=24, plano_y=0.016)
    for s_, sx in (('L', 1), ('R', -1)):
        esfera('acc__fone__concha_' + s_, 'acc', J['head'], (sx * 0.282, 0.016, 1.085), 1.0, (0.042, 0.072, 0.086), seg=14)
        esfera('acc__fone__detalhe_' + s_, 'acc2', J['head'], (sx * 0.315, 0.016, 1.085), 1.0, (0.016, 0.044, 0.054), seg=12)


# ───────────────────────── chapéus ──────────────────────────────────────────
# O cabelo tem mais volume atrás, então o chapéu fica 1,2 cm para trás do centro da cabeça.
CHAPEU_C = (0.0, 0.012, 1.165)
CHAPEU_R = (0.292, 0.276, 0.310)


def _raio_do_domo(z, centro, raios):
    k = math.sqrt(max(0.0, 1 - ((z - centro[2]) / raios[2]) ** 2))
    return raios[0] * k, raios[1] * k


def domo(nome, material, parent, centro, raios, z0, n=10, seg=36):
    """Copa de chapéu: a parte de um elipsoide que fica acima de z0, fechada embaixo."""
    topo = centro[2] + raios[2]
    secoes = []
    for i in range(n + 1):
        z = z0 + (topo - z0) * math.sin((i / n) * math.pi / 2)
        rx, ry = _raio_do_domo(z, centro, raios)
        secoes.append((centro[0], centro[1], z, max(rx, 0.004), max(ry, 0.004)))
    return loft(nome, material, parent, secoes, seg=seg, tampas=(True, True))


def faixa(nome, material, parent, centro, raios, perfil, seg=36):
    """Faixa em volta da copa. perfil: lista de (z, folga), a folga multiplica o raio da copa."""
    secoes = []
    for z, folga in perfil:
        rx, ry = _raio_do_domo(z, centro, raios)
        secoes.append((centro[0], centro[1], z, rx * folga, ry * folga))
    return loft(nome, material, parent, secoes, seg=seg, tampas=(True, True))


def hat_bone(J):
    domo('hat__bone__copa', 'hat', J['head'], CHAPEU_C, CHAPEU_R, 1.245)
    faixa('hat__bone__faixa', 'hat_detail', J['head'], CHAPEU_C, CHAPEU_R,
          [(1.236, 0.985), (1.245, 1.016), (1.268, 1.018), (1.278, 0.99)])
    esfera('hat__bone__aba', 'hat_detail', J['head'], (0, -0.305, 1.247), 1.0, (0.190, 0.125, 0.016), (0.15, 0, 0), seg=24)
    esfera('hat__bone__botao', 'hat_detail', J['head'], (0, 0.012, 1.478), 0.022, seg=10)


GORRO_R = (0.296, 0.280, 0.360)


def hat_gorro(J):
    domo('hat__gorro__copa', 'hat', J['head'], CHAPEU_C, GORRO_R, 1.250)
    faixa('hat__gorro__dobra', 'hat_detail', J['head'], CHAPEU_C, GORRO_R,
          [(1.222, 0.99), (1.234, 1.042), (1.262, 1.056), (1.300, 1.052), (1.316, 1.0)])
    esfera('hat__gorro__pompom', 'white', J['head'], (0, 0.012, 1.572), 0.060, seg=16)


def hat_coroa(J):
    cx, cy = 0.0, 0.012
    toro('hat__coroa__aro', 'gold', J['head'], (cx, cy, 1.405), 0.136, 0.015, escala=(1.07, 1.0, 2.5), seg=32, tubo=10)
    for i in range(6):
        a = math.pi / 2 + i * math.pi / 3
        x, y = cx + 0.136 * 1.07 * math.cos(a), cy + 0.136 * math.sin(a)
        cone(f'hat__coroa__ponta_{i}', 'gold', J['head'], (x, y, 1.425), (x * 1.06, y * 1.06, 1.535), 0.036, 0.008, seg=12)
        esfera(f'hat__coroa__bola_{i}', 'gold', J['head'], (x * 1.06, y * 1.06, 1.540), 0.016, seg=8)
    for i in range(6):
        a = math.pi / 2 + (i + 0.5) * math.pi / 3
        x, y = cx + 0.150 * 1.07 * math.cos(a), cy + 0.150 * math.sin(a)
        esfera(f'hat__coroa__pedra_{i}', 'pink', J['head'], (x, y, 1.405), 0.017, seg=8)


def hat_festa(J):
    base, ponta = Vector((0.072, -0.020, 1.374)), Vector((0.157, -0.040, 1.609))
    cone('hat__festa__cone', 'hat', J['head'], base, ponta, 0.095, 0.007, seg=24)
    toro('hat__festa__borda', 'white', J['head'], base, 0.094, 0.016, rot=(0.08, 0.348, 0), seg=24, tubo=8)
    esfera('hat__festa__pompom', 'white', J['head'], ponta, 0.032, seg=12)
    for i, f in enumerate((0.32, 0.62)):  # duas listras
        c = base.lerp(ponta, f)
        toro(f'hat__festa__listra_{i}', 'hat_detail', J['head'], c, 0.095 * (1 - f) + 0.004, 0.010, rot=(0.08, 0.348, 0), seg=20, tubo=6)


def hat_orelhas(J):
    arco('hat__orelhas__arco', 'hat', J['head'], (0, 1.15), 0.279, 10, 170, 0.014, n=24, plano_y=0.0)
    for s_, sx in (('L', 1), ('R', -1)):
        a = math.radians(57)
        p = Vector((sx * 0.279 * math.cos(a), 0, 1.15 + 0.279 * math.sin(a)))
        m = Matrix.Translation(p) @ Matrix.Rotation(sx * 0.42, 4, 'Y')
        loft('hat__orelhas__orelha_' + s_, 'hat', J['head'],
             [(0, 0, -0.02, 0.070, 0.036), (0, 0, 0.03, 0.062, 0.034), (0, 0, 0.085, 0.036, 0.024),
              (0, 0, 0.125, 0.014, 0.012), (0, 0, 0.138, 0.004, 0.004)], seg=16, world=m)
        loft('hat__orelhas__dentro_' + s_, 'pink', J['head'],
             [(0, -0.022, 0.0, 0.040, 0.018), (0, -0.020, 0.04, 0.034, 0.016), (0, -0.014, 0.085, 0.016, 0.012),
              (0, -0.010, 0.105, 0.004, 0.004)], seg=12, world=m)


def hat_laco(J):
    # Fica no lado esquerdo do alto da cabeça, deitado sobre o cabelo (a normal ali aponta para fora e para a frente).
    c = Vector((0.155, -0.092, 1.420))
    deita = Matrix.Rotation(0.50, 4, 'Y') @ Matrix.Rotation(-0.30, 4, 'X')
    for s_, d in (('L', 1), ('R', -1)):
        asa = Matrix.Translation(c) @ deita @ Matrix.Rotation(d * math.radians(82), 4, 'Y')
        loft('hat__laco__asa_' + s_, 'hat', J['head'],
             [(0, 0, 0.004, 0.014, 0.012), (0, 0, 0.030, 0.034, 0.022), (0, 0, 0.066, 0.052, 0.026),
              (0, 0, 0.092, 0.050, 0.024), (0, 0, 0.104, 0.030, 0.016)], seg=16, world=asa)
        ponta = Matrix.Translation(c) @ deita @ Matrix.Rotation(d * math.radians(158), 4, 'Y')
        loft('hat__laco__fita_' + s_, 'hat_detail', J['head'],
             [(0, 0, 0.006, 0.012, 0.010), (0, 0, 0.040, 0.020, 0.010), (0, 0, 0.074, 0.024, 0.009),
              (0, 0, 0.080, 0.012, 0.006)], seg=12, world=ponta)
    esfera('hat__laco__no', 'hat_detail', J['head'], c, 1.0, (0.027, 0.024, 0.027), seg=12)


# ───────────────────────── pescoço ──────────────────────────────────────────
def neck_cachecol(J):
    toro('neck__cachecol__volta', 'extra', J['chest'], (0, 0.004, 0.930), 0.090, 0.042, rot=(0.10, 0, 0),
         escala=(1.20, 1.15, 1.0), seg=28, tubo=12)
    caixa('neck__cachecol__ponta', 'extra', J['chest'], (0.072, -0.132, 0.835), (0.092, 0.042, 0.200), (0.06, 0, -0.10), subsurf=3)
    caixa('neck__cachecol__franja', 'extra_detail', J['chest'], (0.083, -0.137, 0.742), (0.086, 0.034, 0.040), (0.06, 0, -0.10), subsurf=2)


def neck_gravata(J):
    for s_, sx in (('L', 1), ('R', -1)):
        esfera('neck__gravata__asa_' + s_, 'extra', J['chest'], (sx * 0.043, -0.130, 0.888), 1.0,
               (0.045, 0.020, 0.032), (0, 0, sx * 0.18), seg=14)
    esfera('neck__gravata__no', 'extra_detail', J['chest'], (0, -0.138, 0.888), 1.0, (0.020, 0.020, 0.023), seg=10)


def neck_medalha(J):
    for s_, sx in (('L', 1), ('R', -1)):
        cone('neck__medalha__fita_' + s_, 'extra', J['chest'], (sx * 0.064, -0.082, 0.905), (0, -0.117, 0.832), 0.012, 0.012, seg=8)
    esfera('neck__medalha__disco', 'gold', J['chest'], (0, -0.124, 0.800), 1.0, (0.038, 0.012, 0.038), seg=20)
    esfera('neck__medalha__miolo', 'white', J['chest'], (0, -0.134, 0.800), 1.0, (0.016, 0.006, 0.016), seg=10)


# ───────────────────────── costas ───────────────────────────────────────────
def back_mochila(J):
    loft('back__mochila__corpo', 'extra', J['chest'], [
        (0, 0.185, 0.548, 0.060, 0.030), (0, 0.188, 0.566, 0.118, 0.066), (0, 0.190, 0.610, 0.136, 0.080),
        (0, 0.190, 0.790, 0.132, 0.078), (0, 0.186, 0.850, 0.112, 0.064), (0, 0.182, 0.880, 0.050, 0.030)], seg=24, expo=3.4)
    loft('back__mochila__bolso', 'extra_detail', J['chest'], [
        (0, 0.262, 0.582, 0.040, 0.012), (0, 0.270, 0.598, 0.088, 0.030), (0, 0.270, 0.700, 0.088, 0.030),
        (0, 0.262, 0.718, 0.050, 0.014)], seg=20, expo=3.4)
    toro('back__mochila__alcinha', 'extra_detail', J['chest'], (0, 0.185, 0.885), 0.030, 0.010, rot=(0, math.pi / 2, 0), seg=16, tubo=6)
    for s_, sx in (('L', 1), ('R', -1)):
        pts = [(sx * 0.100, -0.102, 0.640), (sx * 0.098, -0.092, 0.800), (sx * 0.092, -0.050, 0.888),
               (sx * 0.090, 0.005, 0.898), (sx * 0.090, 0.070, 0.870), (sx * 0.090, 0.120, 0.800)]
        for i in range(len(pts) - 1):
            cone(f'back__mochila__alca_{s_}{i}', 'extra_detail', J['chest'], pts[i], pts[i + 1], 0.016, 0.016, seg=8, tampas=False)
            esfera(f'back__mochila__junta_{s_}{i}', 'extra_detail', J['chest'], pts[i], 0.016, seg=8)


def back_capa(J):
    n_ang, n_z = 18, 12
    z_topo, z_base = 0.895, 0.250
    bm = bmesh.new()
    grade = []
    for i in range(n_z + 1):
        f = i / n_z
        z = z_topo + (z_base - z_topo) * f
        raio = 0.118 + 0.170 * f ** 0.9          # abre para baixo
        meio = math.radians(62 + 26 * f)         # meia-abertura em volta das costas
        linha = []
        for j in range(n_ang + 1):
            g = -1 + 2 * j / n_ang
            th = g * meio
            onda = 1 + 0.050 * f * math.cos(g * math.pi * 3)   # pregas do pano
            linha.append(bm.verts.new((raio * onda * math.sin(th) * 1.12,
                                       0.030 + raio * onda * math.cos(th) * 0.88 + 0.050 * f, z)))
        grade.append(linha)
    for i in range(n_z):
        for j in range(n_ang):
            bm.faces.new((grade[i][j], grade[i + 1][j], grade[i + 1][j + 1], grade[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    pano = _finish('back__capa__pano', bm, 'extra', J['chest'])
    mod = pano.modifiers.new('solid', 'SOLIDIFY')
    mod.thickness = 0.016
    mod.offset = 0.0
    toro('back__capa__gola', 'extra_detail', J['chest'], (0, 0.010, 0.918), 0.086, 0.030, rot=(0.14, 0, 0),
         escala=(1.20, 1.14, 0.95), seg=28, tubo=10)
    esfera('back__capa__broche', 'gold', J['chest'], (0, -0.120, 0.893), 1.0, (0.026, 0.016, 0.026), seg=12)


ACESSORIOS = {
    'oculos': acc_oculos, 'fone': acc_fone,
    'bone': hat_bone, 'gorro': hat_gorro, 'coroa': hat_coroa, 'festa': hat_festa, 'orelhas': hat_orelhas, 'laco': hat_laco,
    'cachecol': neck_cachecol, 'gravata': neck_gravata, 'medalha': neck_medalha,
    'mochila': back_mochila, 'capa': back_capa,
}
# Chapéus que cobrem o alto da cabeça: com eles o coque e as mechas somem.
COBRE_O_TOPO = {'bone', 'gorro', 'coroa', 'festa'}

CABELOS = {'curto': cabelo_curto, 'coque': cabelo_coque}


# ───────────────────────── cena e render ────────────────────────────────────
def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()


def preparar_render(res=(760, 1000), amostras=48):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = amostras
    try:
        sc.cycles.use_denoising = True
    except Exception:
        pass
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.82, 0.83, 0.86, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.75
    sc.world = w

    def luz(nome, loc, energia, tam):
        d = bpy.data.lights.new(nome, 'AREA')
        d.energy, d.size = energia, tam
        o = bpy.data.objects.new(nome, d)
        sc.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 0.75)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

    luz('key', (-1.6, -2.6, 2.6), 95, 2.2)
    luz('fill', (2.2, -1.8, 1.4), 30, 2.5)
    luz('rim', (0.5, 2.4, 2.4), 45, 1.5)

    # chão que só recebe sombra suave
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=6)
    me = bpy.data.meshes.new('chao')
    bm.to_mesh(me)
    bm.free()
    ch = bpy.data.objects.new('chao', me)
    sc.collection.objects.link(ch)
    m = bpy.data.materials.new('chao')
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (0.42, 0.43, 0.46, 1)
    b.inputs['Roughness'].default_value = 0.9
    me.materials.append(m)


def camera(nome, ang_graus, dist=4.6, alvo=(0, 0, 0.76), lente=70):
    sc = bpy.context.scene
    c = bpy.data.cameras.new(nome)
    c.lens = lente
    o = bpy.data.objects.new(nome, c)
    sc.collection.objects.link(o)
    a = math.radians(ang_graus)
    o.location = (dist * math.sin(a), -dist * math.cos(a), alvo[2] + 0.25)
    o.rotation_euler = (Vector(alvo) - o.location).to_track_quat('-Z', 'Y').to_euler()
    return o


def renderizar(caminho, cam):
    sc = bpy.context.scene
    sc.camera = cam
    sc.render.filepath = caminho
    bpy.ops.render.render(write_still=True)


def exportar_glb(caminho):
    """Exporta a cena inteira para .glb. Todas as peças trocáveis saem visíveis:
    quem abre o arquivo (o app) esconde as que não usa, pelo prefixo do nome."""
    for o in bpy.context.scene.objects:
        o.hide_render = False
        o.hide_viewport = False
    bpy.ops.export_scene.gltf(filepath=caminho, export_format='GLB', export_apply=True, export_yup=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--render', action='store_true')
    ap.add_argument('--amostras', type=int, default=48)
    ap.add_argument('--abertura', type=float, default=38.0,
                    help='ângulo dos braços em graus (0 = junto ao corpo, 90 = pose T)')
    ap.add_argument('--blend', action='store_true',
                    help='salva um .blend por variante (entrada dos renders de revisão)')
    ap.add_argument('--so', help='monta só estas variantes (nomes separados por vírgula)')
    ap.add_argument('--pecas', help='renders de revisão das peças novas: nomes separados por vírgula, ou "todas"')
    ap.add_argument('--glb', action='store_true',
                    help='gera plim_avatar.glb e plim_avatar.blend com TODAS as peças trocáveis')
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else None)
    a.out = os.path.abspath(a.out)
    os.makedirs(a.out, exist_ok=True)

    variantes = [
        ('masculino', dict(cabelo='curto'), {}),
        ('feminino', dict(cabelo='coque'), {}),
        ('var_pele_clara_oculos', dict(cabelo='curto', expressao='animado', acessorios=('oculos',)),
         {'skin': '#F1C9A5', 'hair': '#B5651D', 'top': '#0EA5E9', 'top_detail': '#0284C7', 'bottom': '#1E293B'}),
        ('var_pele_escura_fone', dict(cabelo='coque', expressao='feliz', acessorios=('fone',)),
         {'skin': '#6B4226', 'hair': '#111111', 'top': '#F97316', 'top_detail': '#EA580C', 'accent': '#FFFFFF',
          'bottom': '#4C1D95', 'iris': '#2A1608'}),
        ('var_triste', dict(cabelo='curto', expressao='triste'),
         {'skin': '#E0A878', 'hair': '#1F1F1F', 'top': '#10B981', 'top_detail': '#059669'}),
        ('var_neutro_loiro', dict(cabelo='coque', expressao='neutro', acessorios=('oculos',)),
         {'skin': '#F6D2B8', 'hair': '#D9A441', 'top': '#EC4899', 'top_detail': '#DB2777', 'bottom': '#64748B',
          'iris': '#3B6E8F'}),
    ]
    padrao = dict(CORES)
    if a.pecas:
        nomes = [n for n in ACESSORIOS if n not in ('oculos', 'fone')] if a.pecas == 'todas' else [x.strip() for x in a.pecas.split(',')]
        for nome in nomes:
            de_costas = ACESSORIOS[nome].__name__.startswith('back_')
            na_cabeca = ACESSORIOS[nome].__name__.startswith('hat_')
            for cabelo in (('curto', 'coque') if na_cabeca else ('curto',)):
                limpar()
                construir(cabelo=cabelo, acessorios=(nome,), abertura=17.0)
                preparar_render(res=(420, 560), amostras=a.amostras)
                no_pescoco = ACESSORIOS[nome].__name__.startswith('neck_')
                alvo = (0, 0, 1.20) if na_cabeca else (0, 0, 0.80) if no_pescoco else (0, 0, 0.76)
                dist = 1.9 if na_cabeca else 1.9 if no_pescoco else 3.9
                vistas = [('frente', 0), ('34', 38)] + ([('costas', 180), ('lado', 90)] if de_costas else [('lado', 90)] if na_cabeca else [])
                for vista, ang in vistas:
                    renderizar(os.path.join(a.out, f'peca_{nome}_{cabelo}_{vista}.png'), camera(vista, ang, dist=dist, alvo=alvo))
    if a.glb:
        limpar()
        construir(abertura=a.abertura, tudo=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.out, 'plim_avatar.blend'))
        exportar_glb(os.path.join(a.out, 'plim_avatar.glb'))
    so = [x.strip() for x in a.so.split(',')] if a.so else None
    for nome, opcoes, cores in variantes:
        if (so is not None and nome not in so) or not (a.render or a.blend):
            continue
        limpar()
        CORES.clear()
        CORES.update(padrao)
        CORES.update(cores)
        construir(**opcoes, abertura=a.abertura)
        if a.blend:
            bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.out, f'{nome}.blend'))
        if a.render:
            preparar_render(amostras=a.amostras)
            renderizar(os.path.join(a.out, f'{nome}_frente.png'), camera('frente', 0))
            if not nome.startswith('var_'):
                renderizar(os.path.join(a.out, f'{nome}_34.png'), camera('tres_quartos', 38))


if __name__ == '__main__':
    main()
