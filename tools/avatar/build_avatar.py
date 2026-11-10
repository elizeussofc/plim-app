"""
Avatar modular do Plim — gerado por script no Blender (bpy).

Uso:
    python build_avatar.py --out <pasta> [--render] [--glb]

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
    'iris': '#4A2A1A',
    'dark': '#1F1410',
    'mouth': '#3A1F18',
    'acc': '#1E293B',
    'acc2': '#F97316',
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
# Medidas (unidades do Blender; altura total ≈ 1.4 sem cabelo alto).
HEAD_C = Vector((0, 0, 1.15))
HEAD_R = Vector((0.255, 0.225, 0.25))


def frente_cabeca(x, z, extra=0.0):
    """Y da superfície da frente da cabeça no ponto (x, z)."""
    dx, dz = x / HEAD_R.x, (z - HEAD_C.z) / HEAD_R.z
    return -HEAD_R.y * math.sqrt(max(0.0, 1 - dx * dx - dz * dz)) - extra


def construir(cabelo='curto', pose_a=True, expressao='feliz', acessorios=()):
    J = {}
    J['root'] = junta('root', None, (0, 0, 0))
    J['hips'] = junta('hips', J['root'], (0, 0, 0.52))
    J['chest'] = junta('chest', J['hips'], (0, 0, 0.60))
    J['neck'] = junta('neck', J['chest'], (0, 0, 0.89))
    J['head'] = junta('head', J['neck'], (0, 0, 0.93))
    for s, sx in (('L', 1), ('R', -1)):
        J['shoulder_' + s] = junta('shoulder_' + s, J['chest'], (sx * 0.19, 0, 0.82))
        J['elbow_' + s] = junta('elbow_' + s, J['shoulder_' + s], (sx * 0.19, 0, 0.66))
        J['wrist_' + s] = junta('wrist_' + s, J['elbow_' + s], (sx * 0.19, 0, 0.51))
        J['leg_' + s] = junta('leg_' + s, J['hips'], (sx * 0.095, 0, 0.50))
        J['foot_' + s] = junta('foot_' + s, J['leg_' + s], (sx * 0.095, 0, 0.10))

    # ── cabeça (pele) ──
    esfera('body__head', 'skin', J['head'], HEAD_C, 1.0, tuple(HEAD_R), seg=36)
    cone('body__neck', 'skin', J['neck'], (0, 0, 0.86), (0, 0, 0.95), 0.05, 0.05)
    for s, sx in (('L', 1), ('R', -1)):
        esfera('body__ear_' + s, 'skin', J['head'], (sx * 0.25, 0.01, 1.105), 1.0, (0.035, 0.05, 0.062))
    esfera('body__nose', 'skin', J['head'], (0, frente_cabeca(0, 1.075) - 0.012, 1.075), 0.03, seg=16)

    # ── rosto: olhos ──
    for s, sx in (('L', 1), ('R', -1)):
        x, z = sx * 0.105, 1.135
        y = frente_cabeca(x, z)
        inclin = (0, 0, sx * 0.42)  # acompanha a curva da cabeça
        esfera('face__eye_white_' + s, 'eye_white', J['head'], (x, y + 0.012, z), 1.0, (0.06, 0.02, 0.064), inclin, seg=20)
        esfera('face__iris_' + s, 'iris', J['head'], (x, y - 0.001, z), 1.0, (0.046, 0.014, 0.05), inclin, seg=20)
        esfera('face__pupil_' + s, 'dark', J['head'], (x, y - 0.009, z), 1.0, (0.027, 0.008, 0.03), inclin, seg=16)
        esfera('face__glint_' + s, 'eye_white', J['head'], (x + 0.016, y - 0.016, z + 0.02), 1.0, (0.011, 0.005, 0.011), inclin, seg=10)

    # ── rosto: sobrancelhas e bocas (uma por expressão; o app mostra só uma) ──
    def sobrancelha(tag, giro, dz=0.0):
        for s, sx in (('L', 1), ('R', -1)):
            x, z = sx * 0.105, 1.225 + dz
            ob = caixa(f'brow__{tag}__{s}', 'hair', J['head'], (x, frente_cabeca(x, z) - 0.004, z),
                       (0.085, 0.02, 0.024), (0, sx * giro, sx * 0.42), subsurf=2)
            ob.hide_render = tag != expressao

    sobrancelha('neutro', 0.10)
    sobrancelha('feliz', 0.16, 0.012)
    sobrancelha('triste', -0.34, 0.004)
    sobrancelha('animado', 0.20, 0.024)

    by = frente_cabeca(0, 1.0) - 0.004
    bocas = {
        'feliz': arco('mouth__feliz', 'mouth', J['head'], (0, 1.045), 0.062, 215, 325, 0.0075, plano_y=by),
        'neutro': arco('mouth__neutro', 'mouth', J['head'], (0, 1.105), 0.115, 250, 290, 0.007, plano_y=by),
        'triste': arco('mouth__triste', 'mouth', J['head'], (0, 0.935), 0.062, 55, 125, 0.0075, plano_y=by),
    }
    # boca aberta (animado): meia-lua preenchida
    bocas['animado'] = esfera('mouth__animado', 'mouth', J['head'], (0, by + 0.012, 1.005), 1.0, (0.06, 0.02, 0.042), seg=20)
    cortar_plano_z(bocas['animado'], 1.012)
    for k, ob in bocas.items():
        ob.hide_render = k != expressao

    # ── tronco: moletom ──
    caixa('top__moletom__torso', 'top', J['chest'], (0, 0, 0.70), (0.44, 0.29, 0.43))
    caixa('top__moletom__barra', 'top_detail', J['hips'], (0, 0, 0.545), (0.39, 0.265, 0.09), subsurf=3)
    toro('top__moletom__capuz', 'top', J['chest'], (0, 0.02, 0.885), 0.085, 0.042, rot=(-0.28, 0, 0), escala=(1.25, 1.1, 1.0))
    raio = [(0.2, 1.0), (-0.75, -0.1), (-0.12, -0.1), (-0.45, -1.0), (0.75, 0.25), (0.1, 0.25), (0.55, 1.0)]
    chapa('top__moletom__raio', 'accent', J['chest'], raio, (0, -0.147, 0.735), esp=0.014, escala=0.052)

    # ── braços ──
    for s, sx in (('L', 1), ('R', -1)):
        x = sx * 0.19
        for p in capsula('top__moletom__braco_' + s, 'top', J['shoulder_' + s], (x, 0, 0.82), (x, 0, 0.665), 0.068, 0.062):
            pass
        for p in capsula('top__moletom__antebraco_' + s, 'top', J['elbow_' + s], (x, 0, 0.66), (x, 0, 0.535), 0.062, 0.058):
            pass
        toro('top__moletom__punho_' + s, 'top_detail', J['elbow_' + s], (x, 0, 0.525), 0.04, 0.026)
        esfera('body__hand_' + s, 'skin', J['wrist_' + s], (x, 0, 0.465), 1.0, (0.048, 0.034, 0.062), seg=20)
        esfera('body__thumb_' + s, 'skin', J['wrist_' + s], (x, -0.03, 0.478), 1.0, (0.018, 0.018, 0.032), (0.5, 0, 0), seg=12)

    # ── pernas: calça jogger ──
    caixa('bottom__jogger__quadril', 'bottom', J['hips'], (0, 0.005, 0.47), (0.34, 0.17, 0.12), subsurf=3)
    for s, sx in (('L', 1), ('R', -1)):
        x = sx * 0.095
        capsula('bottom__jogger__perna_' + s, 'bottom', J['leg_' + s], (x, 0, 0.47), (x, 0, 0.16), 0.088, 0.074)
        toro('bottom__jogger__tornozelo_' + s, 'bottom', J['leg_' + s], (x, 0, 0.135), 0.045, 0.03)
        # ── tênis ──
        caixa('shoes__tenis__corpo_' + s, 'shoe', J['foot_' + s], (x, -0.04, 0.075), (0.155, 0.27, 0.125), subsurf=3)
        caixa('shoes__tenis__sola_' + s, 'sole', J['foot_' + s], (x, -0.04, 0.02), (0.16, 0.275, 0.05), subsurf=2)

    # ── cabelo e acessórios ──
    CABELOS[cabelo](J)
    for a in acessorios:
        ACESSORIOS[a](J)

    if pose_a:
        for s, sx in (('L', 1), ('R', -1)):
            J['shoulder_' + s].rotation_euler = (0, -sx * math.radians(38), 0)
    bpy.context.view_layer.update()
    return J


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


def _touca(nome, J, linha, folga=1.06, n_az=72, n_pol=18):
    """Casquete de cabelo sobre a cabeça. linha(t) devolve a altura Z da borda do
    cabelo para o ângulo t (0 = frente, pi/2 = lateral, pi = nuca)."""
    R = HEAD_R * folga
    bm = bmesh.new()
    topo = bm.verts.new((0, 0, R.z))
    aneis = []
    for i in range(n_az):
        th = 2 * math.pi * i / n_az
        t = abs(th if th <= math.pi else th - 2 * math.pi)
        cos_max = max(-0.95, min(0.98, (linha(t) - HEAD_C.z) / R.z))
        phi_max = math.acos(cos_max)
        col = []
        for k in range(1, n_pol + 1):
            phi = phi_max * k / n_pol
            col.append(bm.verts.new((R.x * math.sin(phi) * math.sin(th), -R.y * math.sin(phi) * math.cos(th), R.z * math.cos(phi))))
        aneis.append(col)
    for i in range(n_az):
        a, b = aneis[i], aneis[(i + 1) % n_az]
        bm.faces.new((topo, a[0], b[0]))
        for k in range(n_pol - 1):
            bm.faces.new((a[k], a[k + 1], b[k + 1], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = _finish(nome, bm, 'hair', J['head'], Matrix.Translation(HEAD_C))
    mod = ob.modifiers.new('solid', 'SOLIDIFY')
    mod.thickness = 0.022
    mod.offset = 1.0
    return ob


def cabelo_coque(J):
    # risca no meio: a borda sobe no centro da testa, desce nas têmporas,
    # passa por cima da orelha e desce até a nuca.
    def linha(t):
        return 1.315 - 0.135 * _ss(t / 1.05) - 0.17 * _ss((t - 1.85) / 0.45)
    _touca('hair__coque__cap', J, linha)
    esfera('hair__coque__bun', 'hair', J['head'], (0, 0.03, 1.465), 1.0, (0.13, 0.125, 0.10), seg=28)
    toro('hair__coque__elastico', 'hair', J['head'], (0, 0.03, 1.39), 0.075, 0.024)


def cabelo_curto(J):
    def linha(t):
        return 1.285 - 0.10 * _ss(t / 1.1) - 0.17 * _ss((t - 1.85) / 0.45)
    _touca('hair__curto__cap', J, linha, folga=1.07)
    # tufos bagunçados: franja + topo
    tufos = [
        (-0.15, -0.165, 1.285, 0.075, 0.5), (-0.07, -0.20, 1.30, 0.08, 0.2), (0.02, -0.205, 1.295, 0.085, -0.1),
        (0.11, -0.185, 1.29, 0.078, -0.4), (0.185, -0.12, 1.265, 0.07, -0.7), (-0.205, -0.09, 1.255, 0.07, 0.8),
        (-0.10, -0.08, 1.385, 0.10, 0.3), (0.08, -0.07, 1.39, 0.105, -0.3), (0.0, 0.03, 1.405, 0.11, 0.0),
        (-0.17, 0.02, 1.34, 0.10, 0.6), (0.17, 0.03, 1.34, 0.10, -0.6), (0.0, 0.13, 1.35, 0.12, 0.0),
        (-0.13, 0.15, 1.27, 0.11, 0.4), (0.13, 0.15, 1.27, 0.11, -0.4), (0.0, 0.2, 1.2, 0.11, 0.0),
    ]
    for i, (x, y, z, r, giro) in enumerate(tufos):
        esfera(f'hair__curto__tufo_{i}', 'hair', J['head'], (x, y, z), 1.0, (r, r * 0.9, r * 0.72), (0.25, giro, 0), seg=16)
    esfera('hair__curto__topete', 'hair', J['head'], (0.01, -0.02, 1.47), 1.0, (0.035, 0.035, 0.06), (0.2, 0.25, 0), seg=12)


# ───────────────────────── acessórios ───────────────────────────────────────
def acc_oculos(J):
    z = 1.135
    for s_, sx in (('L', 1), ('R', -1)):
        x = sx * 0.105
        toro('acc__oculos__aro_' + s_, 'acc', J['head'], (x, frente_cabeca(x, z) - 0.02, z), 0.072, 0.009,
             rot=(math.pi / 2, 0, sx * 0.42), seg=28, tubo=8)
        cone('acc__oculos__haste_' + s_, 'acc', J['head'], (sx * 0.185, frente_cabeca(sx * 0.185, z) - 0.012, z),
             (sx * 0.262, 0.02, z + 0.005), 0.008, 0.008, seg=8)
    cone('acc__oculos__ponte', 'acc', J['head'], (-0.036, frente_cabeca(0, z) - 0.03, z + 0.012),
         (0.036, frente_cabeca(0, z) - 0.03, z + 0.012), 0.008, 0.008, seg=8)


def acc_fone(J):
    toro('acc__fone__arco', 'acc', J['head'], HEAD_C + Vector((0, 0.02, 0.0)), 0.292, 0.02, rot=(math.pi / 2, 0, 0),
         escala=(1.0, 1.0, 1.06), seg=40, tubo=10)
    for s_, sx in (('L', 1), ('R', -1)):
        esfera('acc__fone__concha_' + s_, 'acc', J['head'], (sx * 0.275, 0.02, 1.105), 1.0, (0.045, 0.075, 0.09), seg=20)
        esfera('acc__fone__detalhe_' + s_, 'acc2', J['head'], (sx * 0.31, 0.02, 1.105), 1.0, (0.018, 0.045, 0.055), seg=16)


ACESSORIOS = {'oculos': acc_oculos, 'fone': acc_fone}

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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--render', action='store_true')
    ap.add_argument('--amostras', type=int, default=48)
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else None)
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
    for nome, opcoes, cores in variantes:
        limpar()
        CORES.clear()
        CORES.update(padrao)
        CORES.update(cores)
        construir(**opcoes)
        if a.render:
            preparar_render(amostras=a.amostras)
            renderizar(os.path.join(a.out, f'{nome}_frente.png'), camera('frente', 0))
            if not nome.startswith('var_'):
                renderizar(os.path.join(a.out, f'{nome}_34.png'), camera('tres_quartos', 38))


if __name__ == '__main__':
    main()
