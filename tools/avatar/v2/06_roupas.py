# -*- coding: utf-8 -*-
"""Boneco v2, etapa 6: guarda-roupa, óculos e fone, reaproveitados do boneco antigo.

    python 06_roupas.py <05_rosto.blend> <plim_avatar.glb antigo> <06_roupas.blend> --estilo m|f

As peças foram modeladas para a cabeça grande e achatada do boneco antigo. Aqui cada uma é
levada para o boneco novo por medida: o crânio, o cabelo, o pescoço, as costas, os olhos e as
orelhas do boneco novo são medidos por raio, e cada grupo de peças tem a sua conta de encaixe.

    hat__bone / gorro / coroa / festa   assentam no crânio; o alto do cabelo some debaixo delas
    hat__laco / orelhas                 assentam por cima do cabelo
    neck__cachecol / gravata / medalha  no pescoço e no peito
    back__mochila / capa                nas costas (as alças da mochila são refeitas aqui)
    acc__oculos / fone                  nos olhos e nas orelhas

O cabelo é dividido em dois: hair__<nome> (o que sobra com chapéu) e hairtop__<nome> (o que o
chapéu cobre). Os números de AJUSTE são acertos à mão, feitos olhando o render de cada peça.
"""
import math
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
entrada, antigo, saida = args[0], args[1], args[2]
ESTILO = args[args.index('--estilo') + 1] if '--estilo' in args else 'm'

# Acertos à mão por boneco: {peça: (sobe, vai para trás, escala extra)}
AJUSTE = {
    'm': {},
    'f': {},
}[ESTILO]

bpy.ops.wm.open_mainfile(filepath=entrada)
sc = bpy.context.scene
corpo = bpy.data.objects['corpo']
esq = bpy.data.objects['esqueleto']
cabelo = next(o for o in sc.objects if o.name.startswith('hair__'))
NOME_CABELO = cabelo.name.split('__')[1]

for o in [o for o in sc.objects if o.name.split('__')[0] in ('hat', 'neck', 'back', 'acc', 'hairtop')]:
    bpy.data.objects.remove(o, do_unlink=True)


def arvore(objs):
    bm = bmesh.new()
    for o in objs:
        t = bmesh.new()
        t.from_mesh(o.data)
        t.transform(o.matrix_world)
        me = bpy.data.meshes.new('_tmp')
        t.to_mesh(me)
        t.free()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    return bm, BVHTree.FromBMesh(bm)


_bm1, PELE = arvore([corpo])
_bm2, TUDO = arvore([corpo, cabelo])


def bate(arv, origem, direcao):
    loc, _n, _i, _d = arv.ray_cast(Vector(origem), Vector(direcao))
    return loc


def osso(nome):
    return esq.matrix_world @ esq.data.bones[nome].head_local


# ───────── medidas do boneco novo ─────────
TOPO = max((corpo.matrix_world @ v.co).z for v in corpo.data.vertices)
Z_ABA = TOPO - 0.07                                     # onde a aba do boné encosta na testa
FRENTE_ABA, TRAS_ABA = bate(PELE, (0, -1, Z_ABA), (0, 1, 0)).y, bate(PELE, (0, 1, Z_ABA), (0, -1, 0)).y
YC = (FRENTE_ABA + TRAS_ABA) / 2
LARG_ABA = bate(PELE, (1, YC, Z_ABA), (-1, 0, 0)).x
vc = [cabelo.matrix_world @ v.co for v in cabelo.data.vertices]
CAB_LARG = max(abs(p.x) for p in vc)
CAB_FRENTE, CAB_TRAS = min(p.y for p in vc), max(p.y for p in vc)
CAB_TOPO = max(p.z for p in vc)
Z_ORELHA = osso('Head').z + 0.085
ORELHA = bate(PELE, (1, 0.02, Z_ORELHA), (-1, 0, 0))
PESCOCO = osso('neck') + Vector((0, 0, 0.035))
print(f'medidas: topo {TOPO:.3f} | aba z={Z_ABA:.3f} largura {LARG_ABA:.3f} frente {FRENTE_ABA:.3f} tras {TRAS_ABA:.3f} | '
      f'cabelo largura {CAB_LARG:.3f} topo {CAB_TOPO:.3f} y {CAB_FRENTE:.3f}..{CAB_TRAS:.3f} | '
      f'orelha x={ORELHA.x:.3f} z={Z_ORELHA:.3f} | pescoço {[round(v, 3) for v in PESCOCO]}')


def topo_do_cabelo(y):
    p = bate(TUDO, (0, y, 3), (0, 0, -1))
    return p.z if p else TOPO


# ───────── peças do boneco antigo ─────────
antes = set(sc.objects)
bpy.ops.import_scene.gltf(filepath=antigo)
PECAS = {}
for o in [o for o in sc.objects if o not in antes]:
    if o.type == 'MESH' and o.name.split('__')[0] in ('hat', 'neck', 'back', 'acc'):
        o.data.transform(o.matrix_world)
        PECAS[o.name] = o
for o in [o for o in sc.objects if o not in antes and o.name not in PECAS]:
    if o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
for o in PECAS.values():
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
for o in [o for o in sc.objects if o not in antes and o.name not in PECAS]:
    bpy.data.objects.remove(o, do_unlink=True)


def levar(item, conta):
    """Aplica a conta de encaixe a todas as partes de uma peça (ex.: hat__bone__*)."""
    sobe, tras, esc = AJUSTE.get(item.split('__')[1], (0.0, 0.0, 1.0))
    partes = [o for n, o in PECAS.items() if n.startswith(item + '__')]
    if not partes:
        print('PEÇA NÃO ENCONTRADA:', item)
        return []
    pts = [conta(v.co.copy()) for o in partes for v in o.data.vertices]
    centro = sum(pts, Vector()) / len(pts)
    for o in partes:
        for v in o.data.vertices:
            p = conta(v.co.copy())
            v.co = centro + (p - centro) * esc + Vector((0, tras, sobe))
        if 'custom_normal' in o.data.attributes:
            o.data.attributes.remove(o.data.attributes['custom_normal'])
        o.data.update()
    return partes


def encostar(partes, arv, folga=0.002):
    """Empurra a peça para a frente até o fundo dela encostar na superfície (peito, pescoço)."""
    pts = [v.co for o in partes for v in o.data.vertices]
    cx = sum(p.x for p in pts) / len(pts)
    cz = sum(p.z for p in pts) / len(pts)
    sup = bate(arv, (cx, -1, cz), (0, 1, 0))
    if sup is None:
        return
    d = (sup.y - folga) - max(p.y for p in pts)
    for o in partes:
        for v in o.data.vertices:
            v.co.y += d
        o.data.update()


def prender(partes, nome_osso):
    for o in partes:
        mundo = o.matrix_world.copy()
        o.parent = esq
        o.parent_type = 'BONE'
        o.parent_bone = nome_osso
        o.matrix_world = mundo
        for p in o.data.polygons:
            p.use_smooth = True


# Chapéus que assentam no crânio. No antigo: alto da cabeça em z=1,355, aba 0,11 abaixo,
# meia largura 0,282 e meia profundidade 0,267 em volta de y=0,012.
ESP = 0.010
SX, SY, SZ = (LARG_ABA + ESP) / 0.282, ((TRAS_ABA - FRENTE_ABA) / 2 + ESP) / 0.267, 0.07 / 0.11


def no_cranio(p, desce=0.0):
    return Vector((p.x * SX, (p.y - 0.012) * SY + YC, TOPO + (p.z - 1.355) * SZ - desce))


for item in ('hat__bone', 'hat__gorro'):
    prender(levar(item, no_cranio), 'Head')


def topo_medio(y, x=0.0):
    """Altura do cabelo em volta de um ponto, sem contar um fiapo isolado (a mediana de cinco raios)."""
    zs = sorted(bate(TUDO, (x + dx, y + dy, 3), (0, 0, -1)).z for dx, dy in ((0, 0), (0.03, 0), (-0.03, 0), (0, 0.03), (0, -0.03)))
    return zs[2]


# Coroa e chapéu de festa assentam por cima do cabelo (no feminino, em cima do coque).
mais_alto = max(vc, key=lambda p: p.z)
Y_COROA = YC if ESTILO == 'm' else mais_alto.y
S_COROA = 0.50 if ESTILO == 'm' else 0.40
Z_COROA = topo_medio(Y_COROA)
prender(levar('hat__coroa', lambda p: Vector((p.x * S_COROA, (p.y - 0.012) * S_COROA + Y_COROA, Z_COROA - 0.014 + (p.z - 1.369) * S_COROA))), 'Head')
X_FESTA = 0.035 if ESTILO == 'm' else 0.0
Z_FESTA = topo_medio(Y_COROA, X_FESTA)
prender(levar('hat__festa', lambda p: Vector(((p.x - 0.079) * 0.55 + X_FESTA, (p.y + 0.02) * 0.55 + Y_COROA, Z_FESTA - 0.012 + (p.z - 1.326) * 0.55))), 'Head')

def frente_do_coque():
    """Onde o coque começa, indo da testa para trás: o ponto em que o alto do cabelo sobe de repente."""
    ys = [CAB_FRENTE + 0.015 + 0.006 * i for i in range(30)]
    zs = [topo_do_cabelo(y) for y in ys]
    base = max(zs[:3])
    for y, z in zip(ys, zs):
        if z > base + 0.035:
            return y
    return None


COQUE = frente_do_coque() if ESTILO == 'f' else None
print('coque começa em y =', None if COQUE is None else round(COQUE, 3))

# Peças que ficam por cima do cabelo. No antigo o cabelo tinha meia largura 0,285 e topo em 1,44.
Y_FAIXA = (YC - 0.01) if COQUE is None else (COQUE - 0.022)           # com coque, a tiara passa na frente dele
TOPO_FAIXA = topo_do_cabelo(Y_FAIXA)
Z_BASE = Z_ORELHA + 0.06


def tiara(p):
    return Vector((p.x * (CAB_LARG + 0.004) / 0.282, p.y * 0.6 + Y_FAIXA,
                   Z_BASE + (p.z - 1.197) * (TOPO_FAIXA + 0.004 - Z_BASE) / (1.44 - 1.197)))


prender(levar('hat__orelhas', tiara), 'Head')

# Laço: no antigo ficava em (0,157; -0,09; 1,43). No novo, onde um raio vindo de cima e de lado encontra o cabelo.
alvo = bate(TUDO, (0.42, -0.28, TOPO + 0.30), Vector((-0.42 + 0.03, 0.28 + YC, -0.30 - 0.12)).normalized())
alvo = alvo or Vector((CAB_LARG * 0.6, CAB_FRENTE + 0.03, CAB_TOPO - 0.08))
prender(levar('hat__laco', lambda p: alvo + (p - Vector((0.157, -0.09, 1.43))) * 0.55 + Vector((0.0, -0.012, 0.012))), 'Head')

# Pescoço. No antigo o centro do pescoço ficava em z=0,94.
S_PESCOCO = 0.54


def no_pescoco(p):
    return Vector((p.x * S_PESCOCO, p.y * S_PESCOCO + PESCOCO.y - 0.01, (p.z - 0.94) * S_PESCOCO + PESCOCO.z))


prender(levar('neck__cachecol', no_pescoco), 'Spine')
for item in ('neck__gravata', 'neck__medalha'):
    partes = levar(item, no_pescoco)
    encostar(partes, PELE)
    prender(partes, 'Spine')

# Costas.
Z_COSTAS = osso('Spine01').z
COSTAS = bate(PELE, (0, 1, Z_COSTAS - 0.06), (0, -1, 0)).y
LARG_TRONCO = bate(PELE, (0, COSTAS - 0.05, Z_COSTAS - 0.06), (1, 0, 0)).x      # de dentro para fora: de fora o raio bate no braço
CAPUZ = max(bate(PELE, (0, 1, z), (0, -1, 0)).y for z in (Z_COSTAS + 0.06, Z_COSTAS + 0.10, Z_COSTAS + 0.14, Z_COSTAS + 0.18))
print(f'costas: y={COSTAS:.3f} em z={Z_COSTAS - 0.06:.3f} | meia largura do tronco {LARG_TRONCO:.3f} | capuz até y={CAPUZ:.3f}')
MOCHILA_BAIXO, MOCHILA_ALT = Z_COSTAS - 0.19, 0.25


def na_mochila(p):
    return Vector((p.x * (LARG_TRONCO * 0.78) / 0.136, (p.y - 0.11) * 0.70 + COSTAS - 0.004, MOCHILA_BAIXO + (p.z - 0.548) * MOCHILA_ALT / 0.332))


# As alças antigas abraçavam o tronco antigo: saem, e entram alças novas feitas sobre o tronco novo.
for n, o in PECAS.items():
    if n.startswith('back__mochila__') and 'detail' in n:
        b = bmesh.new()
        b.from_mesh(o.data)
        bmesh.ops.delete(b, geom=[f for f in b.faces if f.calc_center_median().y < 0.10], context='FACES')
        b.to_mesh(o.data)
        b.free()
mochila = levar('back__mochila', na_mochila)


def alca(x0):
    """Alça: tira que sai do alto da mochila, passa por cima do ombro e desce pelo peito."""
    centro = Vector((x0, (COSTAS + bate(PELE, (x0, -1, Z_COSTAS + 0.05), (0, 1, 0)).y) / 2, Z_COSTAS + 0.02))
    linha = []
    for g in range(200, -41, -12):                       # de trás (200°) por cima (90°) até a frente embaixo (-40°)
        d = Vector((0, -math.cos(math.radians(g)), math.sin(math.radians(g))))
        p = bate(PELE, centro + d * 0.21, -d)             # o raio sai de perto do ombro: de longe ele bate na cabeça
        if p is not None:
            linha.append(p + d * 0.007)
    verts, faces, meia = [], [], 0.016
    for p in linha:
        verts += [(p.x - meia, p.y, p.z), (p.x + meia, p.y, p.z)]
    for i in range(len(linha) - 1):
        faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    me = bpy.data.meshes.new('alca')
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(f"back__mochila__alca_{'L' if x0 > 0 else 'R'}", me)
    sc.collection.objects.link(o)
    mod = o.modifiers.new('grossura', 'SOLIDIFY')
    mod.thickness = 0.008
    mod.offset = 1
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.ops.object.modifier_apply(modifier='grossura')
    detalhe = next((s.material for n, pc in PECAS.items() if n.startswith('back__mochila__') and 'detail' in n for s in pc.material_slots if s.material), None)
    if detalhe:
        o.data.materials.append(detalhe)
    return o


ombro = abs(osso('LeftArm').x)
prender(mochila + [alca(ombro * 0.68), alca(-ombro * 0.68)], 'Spine')

# Capa: o pano cai por trás do capuz; a gola e o fecho vão no pescoço.
Z_OMBRO = osso('LeftShoulder').z + 0.05
CAPA_BAIXO = osso('LeftLeg').z + 0.02


def no_pano(p):
    return Vector((p.x * (LARG_TRONCO + 0.035) / 0.316, (p.y - 0.074) * 0.75 + CAPUZ + 0.004, Z_OMBRO + (p.z - 0.898) * (Z_OMBRO - CAPA_BAIXO) / 0.65))


pano = [o for n, o in PECAS.items() if n == 'back__capa__chest_extra']
resto = [o for n, o in PECAS.items() if n.startswith('back__capa__') and n != 'back__capa__chest_extra']
for o in pano:
    for v in o.data.vertices:
        v.co = no_pano(v.co.copy())
    if 'custom_normal' in o.data.attributes:
        o.data.attributes.remove(o.data.attributes['custom_normal'])
    o.data.update()
for o in resto:
    for v in o.data.vertices:
        p = v.co.copy()
        v.co = Vector((p.x * 0.60, p.y * 0.60 + PESCOCO.y - 0.005, (p.z - 0.92) * 0.60 + PESCOCO.z + 0.005))
    if 'custom_normal' in o.data.attributes:
        o.data.attributes.remove(o.data.attributes['custom_normal'])
    o.data.update()
encostar([o for o in resto if 'gold' in o.name], PELE, 0.001)
prender(pano + resto, 'Spine')

# Óculos: no antigo os olhos ficavam a 0,097 do meio, em z=1,085, com a lente em y=-0,244.
iris = bpy.data.objects.get('eye__aberto__iris')
pi = [iris.matrix_world @ v.co for v in iris.data.vertices]
OLHO_X = sum(abs(p.x) for p in pi) / len(pi)
OLHO_Z = sum(p.z for p in pi) / len(pi)
LENTE_Y = min(p.y for p in pi) - 0.013
S_OCULOS = OLHO_X / 0.097
print(f'olhos: x={OLHO_X:.3f} z={OLHO_Z:.3f} | lente em y={LENTE_Y:.3f} | escala dos óculos {S_OCULOS:.3f}')
prender(levar('acc__oculos', lambda p: Vector((p.x * S_OCULOS, LENTE_Y + (p.y + 0.244) * (ORELHA.y + 0.01 - LENTE_Y) / 0.267, OLHO_Z + (p.z - 1.085) * S_OCULOS))), 'Head')

# Fone: conchas nas orelhas (no antigo em z=1,085, x=0,331) e o arco por cima do cabelo.
Y_ARCO = ORELHA.y if COQUE is None else (COQUE - 0.022)
TOPO_ARCO = topo_do_cabelo(Y_ARCO) + 0.010
INCLINA = math.atan2(ORELHA.y - Y_ARCO, TOPO_ARCO - Z_ORELHA)             # no feminino o arco deita para a frente do coque
ALT_ARCO = math.hypot(TOPO_ARCO - Z_ORELHA, ORELHA.y - Y_ARCO)


S_ORELHA, S_CABELO = (abs(ORELHA.x) + 0.016) / 0.331, (CAB_LARG + 0.012) / 0.326


def no_fone(p):
    # Na altura das orelhas o fone encosta nelas; subindo, o arco abre para passar por fora do cabelo.
    t = min(1.0, max(0.0, (p.z - 1.14) / 0.18))
    t = t * t * (3 - 2 * t)
    x = p.x * (S_ORELHA + (max(S_CABELO, S_ORELHA) - S_ORELHA) * t)
    alto = (p.z - 1.085) * ALT_ARCO / (1.473 - 1.085)
    fundo = (p.y - 0.016) * 0.55
    return Vector((x, ORELHA.y + fundo * math.cos(INCLINA) - alto * math.sin(INCLINA), Z_ORELHA + alto * math.cos(INCLINA) + fundo * math.sin(INCLINA)))


prender(levar('acc__fone', no_fone), 'Head')

# ───────── o alto do cabelo, que some debaixo de boné, gorro, coroa e chapéu de festa ─────────
b = bmesh.new()
b.from_mesh(cabelo.data)
mw = cabelo.matrix_world
ra, rb = LARG_ABA + ESP - 0.004, (TRAS_ABA - FRENTE_ABA) / 2 + ESP - 0.004


def coberto(f):
    # Debaixo do boné e do gorro: tudo o que está dentro do contorno do chapéu, acima da aba.
    # Um pouco mais para fora, só o que passa da aba em mais de 4 cm (os fiapos que sobravam em volta).
    c = mw @ f.calc_center_median()
    r2 = (c.x / ra) ** 2 + ((c.y - YC) / rb) ** 2
    return (c.z > Z_ABA - 0.004 and r2 < 1.0) or (c.z > Z_ABA + 0.04 and r2 < 1.6)


cima = [f for f in b.faces if coberto(f)]
topo_bm = bmesh.new()
topo_bm.from_mesh(cabelo.data)
bmesh.ops.delete(topo_bm, geom=[f for f in topo_bm.faces if not coberto(f)], context='FACES')
bmesh.ops.delete(b, geom=cima, context='FACES')
me_topo = bpy.data.meshes.new(f'hairtop__{NOME_CABELO}__cabeca')
topo_bm.to_mesh(me_topo)
b.to_mesh(cabelo.data)
topo_bm.free()
b.free()
hairtop = bpy.data.objects.new(me_topo.name, me_topo)
sc.collection.objects.link(hairtop)
for s in cabelo.material_slots:
    me_topo.materials.append(s.material)
for p in me_topo.polygons:
    p.use_smooth = True
hairtop.matrix_world = cabelo.matrix_world.copy()
mundo = hairtop.matrix_world.copy()
hairtop.parent = esq
hairtop.parent_type = 'BONE'
hairtop.parent_bone = 'Head'
hairtop.matrix_world = mundo
print(f'cabelo: {len(cabelo.data.polygons)} faces ficam, {len(me_topo.polygons)} somem debaixo de chapéu')

# No arquivo, as peças ficam escondidas (o app mostra a que a pessoa escolheu).
for o in sc.objects:
    if o.name.split('__')[0] in ('hat', 'neck', 'back', 'acc'):
        o.hide_render = True
        o.hide_viewport = True
_bm1.free()
_bm2.free()
nomes = sorted({'__'.join(o.name.split('__')[:2]) for o in sc.objects if o.name.split('__')[0] in ('hat', 'neck', 'back', 'acc')})
print('peças no boneco:', ', '.join(nomes))
bpy.ops.wm.save_as_mainfile(filepath=saida)
print('salvo:', saida)
