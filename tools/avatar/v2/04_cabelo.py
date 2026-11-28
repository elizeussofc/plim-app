# -*- coding: utf-8 -*-
"""Boneco v2, etapa 4: encaixa um cabelo (peça gerada à parte, só a forma) na cabeça do boneco.

    python 04_cabelo.py <entrada.blend> <cabelo.glb> <saida.blend> --nome curto
        [--tris 9000] [--folga 1.03] [--dx 0] [--dy 0] [--dz 0] [--escala 0] [--so-medir]

Mede o crânio (vértices presos ao osso da cabeça) e o oco de dentro do cabelo (por raios a
partir do centro do oco). A escala sai de: largura do oco = largura do crânio * folga. A posição:
o teto do oco encosta no alto da cabeça e o fundo do oco encosta na nuca. --dx/--dy/--dz (metros)
e --escala (0 = automática) corrigem à mão, depois de olhar o render.

A peça sai com o nome hair__<nome>__cabeca, material 'hair', presa ao osso Head.
"""
import sys

import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
entrada, glb, saida = args[0], args[1], args[2]


def opc(nome, padrao, tipo=float):
    return tipo(args[args.index(nome) + 1]) if nome in args else padrao


NOME = opc('--nome', 'curto', str)
TRIS = opc('--tris', 9000, int)
FOLGA = opc('--folga', 1.03)
DX, DY, DZ = opc('--dx', 0.0), opc('--dy', 0.0), opc('--dz', 0.0)
ESCALA = opc('--escala', 0.0)

bpy.ops.wm.open_mainfile(filepath=entrada)
sc = bpy.context.scene
corpo = bpy.data.objects['corpo']
esq = bpy.data.objects['esqueleto']

# ── crânio ──
nomes = {g.index: g.name for g in corpo.vertex_groups}
cab = []
for v in corpo.data.vertices:
    if v.groups:
        g = max(v.groups, key=lambda x: x.weight)
        if nomes[g.group] in ('Head', 'head_end', 'headfront'):
            cab.append(corpo.matrix_world @ v.co)
topo = max(p.z for p in cab)


def fatia(z, esp=0.008):
    return [p for p in cab if abs(p.z - z) < esp]


print(f'crânio: alto da cabeça em z={topo:.3f}')
for z in (topo - 0.03, topo - 0.06, topo - 0.09, topo - 0.12, topo - 0.15, topo - 0.19):
    f = fatia(z)
    if f:
        print(f'  z={z:.3f}  meia largura {max(abs(p.x) for p in f):.3f}  testa y={min(p.y for p in f):.3f}  nuca y={max(p.y for p in f):.3f}')

# ── cabelo ──
antes = set(sc.objects)
bpy.ops.import_scene.gltf(filepath=glb)
novos = [o for o in sc.objects if o not in antes]
cabelo = max((o for o in novos if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
for o in novos:
    if o is not cabelo:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
cabelo.select_set(True)
bpy.context.view_layer.objects.active = cabelo
cabelo.parent = None
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.00002)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')

vs = [v.co.copy() for v in cabelo.data.vertices]
mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
print('cabelo bruto: min', [round(v, 3) for v in mn], 'max', [round(v, 3) for v in mx])

bm = bmesh.new()
bm.from_mesh(cabelo.data)
bvh = BVHTree.FromBMesh(bm)


def raio(origem, direcao):
    loc, nor, _i, dist = bvh.ray_cast(origem, direcao)
    if loc is None:
        return None
    return loc, nor.dot(direcao) < 0  # True = bateu numa parede de frente (estou no oco)


# Procura um ponto no oco: no meio em X, e varrendo Y e Z, o ponto de onde os quatro raios batem em parede de frente.
melhor = None
cx = (mn.x + mx.x) / 2
for fz in (0.30, 0.36, 0.42, 0.48, 0.54):
    for fy in (0.35, 0.42, 0.50, 0.58):
        o = Vector((cx, mn.y + (mx.y - mn.y) * fy, mn.z + (mx.z - mn.z) * fz))
        r = [raio(o, Vector(d)) for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, 0, 1))]
        if all(x is not None and x[1] for x in r):
            larg = (r[0][0].x - r[1][0].x) / 2
            if melhor is None or larg > melhor['larg']:
                melhor = {'o': o, 'larg': larg, 'meio_x': (r[0][0].x + r[1][0].x) / 2, 'fundo': r[2][0].y, 'teto': r[3][0].z}
bm.free()
if melhor is None:
    raise SystemExit('Não achei o oco do cabelo: confira o render da peça.')
print(f"oco: centro {[round(v, 3) for v in melhor['o']]}  meia largura {melhor['larg']:.3f}  fundo y={melhor['fundo']:.3f}  teto z={melhor['teto']:.3f}")
if '--so-medir' in args:
    raise SystemExit(0)

# ── encaixe ──
nivel = melhor['teto'] - melhor['o'].z          # distância do ponto medido até o teto do oco, no cabelo bruto
larg_cranio = None
s = ESCALA or 0.25
for _ in range(6):                               # a altura medida no crânio depende da escala: aproxima em voltas
    f = fatia(topo - nivel * s, 0.012)
    larg_cranio = max(abs(p.x) for p in f)
    if ESCALA:
        break
    s = larg_cranio * FOLGA / melhor['larg']
f = fatia(topo - nivel * s, 0.012)
nuca = max(p.y for p in f)
print(f'encaixe: escala {s:.4f} | crânio na altura medida: meia largura {larg_cranio:.3f}, nuca y={nuca:.3f}')

for v in cabelo.data.vertices:
    v.co = Vector(((v.co.x - melhor['meio_x']) * s + DX,
                   (v.co.y - melhor['fundo']) * s + nuca + 0.004 + DY,
                   (v.co.z - melhor['teto']) * s + topo + 0.004 + DZ))
cabelo.data.update()

# ── peça final ──
t0 = sum(len(p.vertices) - 2 for p in cabelo.data.polygons)
mod = cabelo.modifiers.new('reduz', 'DECIMATE')
mod.ratio = min(1.0, TRIS / t0)
bpy.ops.object.modifier_apply(modifier='reduz')
bpy.ops.object.shade_smooth()
mat = bpy.data.materials.get('hair') or bpy.data.materials.new('hair')
mat.use_nodes = True
b = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
b.inputs['Base Color'].default_value = (*[((c / 255 + 0.055) / 1.055) ** 2.4 for c in (0x3B, 0x22, 0x19)], 1)  # 3B2219, da tela para linear
b.inputs['Roughness'].default_value = 0.6
cabelo.data.materials.clear()
cabelo.data.materials.append(mat)
cabelo.name = f'hair__{NOME}__cabeca'
cabelo.data.name = cabelo.name
mundo = cabelo.matrix_world.copy()
cabelo.parent = esq
cabelo.parent_type = 'BONE'
cabelo.parent_bone = 'Head'
cabelo.matrix_world = mundo
vs = [cabelo.matrix_world @ v.co for v in cabelo.data.vertices]
print('cabelo encaixado: z de', round(min(v.z for v in vs), 3), 'a', round(max(v.z for v in vs), 3),
      '| y de', round(min(v.y for v in vs), 3), 'a', round(max(v.y for v in vs), 3),
      '| meia largura', round(max(abs(v.x) for v in vs), 3),
      '| triângulos', sum(len(p.vertices) - 2 for p in cabelo.data.polygons))
bpy.ops.wm.save_as_mainfile(filepath=saida)
print('salvo:', saida)
