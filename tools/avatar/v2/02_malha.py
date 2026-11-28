# -*- coding: utf-8 -*-
"""Boneco v2, etapa 2: malha leve para a web e textura refeita, sem as emendas do modelo de IA.

    python 02_malha.py <01_base.blend> <02_malha.blend> <pasta_textura> [--tris 48000] [--tam 1024]

O modelo de IA vem com ~100 mil triângulos, uma textura picada em milhares de pedaços e a
malha DESCOSTURADA: cada pedaço da textura é um retalho solto, só encostado nos vizinhos.
Reduzir ou reabrir a textura nesse estado abre frestas e deixa pontinhos no boneco. Aqui:

  1. guarda a malha original, que serve de fonte da cor;
  2. costura os retalhos (une os vértices que coincidem);
  3. reduz o corpo para --tris triângulos (os pesos do esqueleto acompanham);
  4. abre um mapa de textura novo, com poucos pedaços e margem;
  5. calcula a posição no corpo de cada ponto do mapa novo (todo triângulo ganha ao menos um ponto);
  6. pinta o mapa novo: cada ponto recebe a cor do ponto mais próximo do corpo original.

Saídas em <pasta_textura>: corpo_cor.png, corpo_pos.npy (X, Y, Z em metros, já com margem),
corpo_dentro.png (onde há triângulo).
"""
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc
from PIL import Image

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
entrada, saida, pasta = args[0], args[1], args[2]


def opc(nome, padrao):
    return int(args[args.index(nome) + 1]) if nome in args else padrao


TRIS, TAM = opc('--tris', 48000), opc('--tam', 1024)
os.makedirs(pasta, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=entrada)
corpo = bpy.data.objects['corpo']
img0 = next(n.image for n in corpo.material_slots[0].material.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image)


def so(*objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[-1]


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def ilhas(me):
    """Quantos retalhos soltos a malha tem."""
    pai = list(range(len(me.vertices)))

    def raiz(i):
        while pai[i] != i:
            pai[i] = pai[pai[i]]
            i = pai[i]
        return i
    for e in me.edges:
        a, b = raiz(e.vertices[0]), raiz(e.vertices[1])
        if a != b:
            pai[a] = b
    return len({raiz(i) for i in range(len(me.vertices))})


def espalhar(valor, cheio, voltas):
    """Repete os valores de dentro para fora (a margem entre os pedaços do mapa)."""
    valor = valor.copy()
    cheio = cheio.astype(np.float32)
    for _ in range(voltas):
        soma = np.zeros_like(valor)
        cont = np.zeros_like(cheio)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx or dy:
                    soma += np.roll(np.roll(valor * cheio[..., None], dy, 0), dx, 1)
                    cont += np.roll(np.roll(cheio, dy, 0), dx, 1)
        novo = (cheio == 0) & (cont > 0)
        valor[novo] = soma[novo] / cont[novo][:, None]
        cheio[novo] = 1.0
    return valor


# 1) fonte da cor: a malha original, com o mapa de textura original
mundo = corpo.matrix_world.copy()
me0 = corpo.data.copy()
me0.calc_loop_triangles()
v0 = [mundo @ v.co for v in me0.vertices]
tri_v = [tuple(t.vertices) for t in me0.loop_triangles]
tri_l = [tuple(t.loops) for t in me0.loop_triangles]
uv0 = [(d.uv.x, d.uv.y) for d in me0.uv_layers.active.data]
bvh = BVHTree.FromPolygons(v0, tri_v)
w0, h0 = img0.size
# Image.pixels de imagem de 8 bits já vem na cor da tela (sRGB): não converter de novo.
px0 = (np.clip(np.array(img0.pixels[:], dtype=np.float32).reshape(h0, w0, 4)[::-1, :, :3], 0, 1) * 255).astype(np.uint8)

# 2) costura
so(corpo)
print('retalhos antes de costurar:', ilhas(corpo.data), '| vértices:', len(corpo.data.vertices))
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.00002)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
print('retalhos depois de costurar:', ilhas(corpo.data), '| vértices:', len(corpo.data.vertices))

# 3) redução
antes = tris(corpo)
mod = corpo.modifiers.new('reduz', 'DECIMATE')
mod.ratio = min(1.0, TRIS / antes)
bpy.ops.object.modifier_move_to_index(modifier='reduz', index=0)
bpy.ops.object.modifier_apply(modifier='reduz')
print('triângulos:', antes, '->', tris(corpo), '| vértices:', len(corpo.data.vertices), '| retalhos:', ilhas(corpo.data))

# 4) mapa de textura novo
while corpo.data.uv_layers:
    corpo.data.uv_layers.remove(corpo.data.uv_layers[0])
corpo.data.uv_layers.new(name='uv')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(82), island_margin=0.004, area_weight=0.0)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.shade_smooth()

# 5) posição de cada ponto do mapa novo, triângulo por triângulo
me = corpo.data
me.calc_loop_triangles()
co = np.array([mundo @ v.co for v in me.vertices], np.float32)
uvn = np.array([(d.uv.x * TAM, (1 - d.uv.y) * TAM) for d in me.uv_layers.active.data], np.float32)
P = np.zeros((TAM, TAM, 3), np.float32)
M = np.zeros((TAM, TAM), bool)
minusculos = 0
for t in me.loop_triangles:
    (ax, ay), (bx, by), (cx, cy) = uvn[list(t.loops)]
    A, B, C = co[list(t.vertices)]
    x0, x1 = max(int(math.floor(min(ax, bx, cx))), 0), min(int(math.ceil(max(ax, bx, cx))), TAM - 1)
    y0, y1 = max(int(math.floor(min(ay, by, cy))), 0), min(int(math.ceil(max(ay, by, cy))), TAM - 1)
    den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    pintou = False
    if abs(den) > 1e-9 and x1 >= x0 and y1 >= y0:
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        wa = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
        wb = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
        wc = 1 - wa - wb
        den_ = (wa >= 0) & (wb >= 0) & (wc >= 0)
        if den_.any():
            pos = wa[..., None] * A + wb[..., None] * B + wc[..., None] * C
            P[y0:y1 + 1, x0:x1 + 1][den_] = pos[den_]
            M[y0:y1 + 1, x0:x1 + 1][den_] = True
            pintou = True
    if not pintou:  # triângulo menor que um ponto do mapa: fica com o ponto onde cai o centro dele
        px, py = min(max(int((ax + bx + cx) / 3), 0), TAM - 1), min(max(int((ay + by + cy) / 3), 0), TAM - 1)
        if not M[py, px]:
            P[py, px] = (A + B + C) / 3
            M[py, px] = True
        minusculos += 1
Image.fromarray((M * 255).astype(np.uint8), 'L').save(os.path.join(pasta, 'corpo_dentro.png'))
np.save(os.path.join(pasta, 'corpo_pos.npy'), espalhar(P, M, 12))

# 6) cor: ponto mais próximo no corpo original
ys, xs = np.where(M)
us = np.zeros(len(ys), np.float32)
vs = np.zeros(len(ys), np.float32)
dist = np.zeros(len(ys), np.float32)
for k in range(len(ys)):
    loc, _n, idx, dd = bvh.find_nearest(Vector(P[ys[k], xs[k]]))
    a, b, c = tri_v[idx]
    w = poly_3d_calc((v0[a], v0[b], v0[c]), loc)
    la, lb, lc = tri_l[idx]
    us[k] = w[0] * uv0[la][0] + w[1] * uv0[lb][0] + w[2] * uv0[lc][0]
    vs[k] = w[0] * uv0[la][1] + w[1] * uv0[lb][1] + w[2] * uv0[lc][1]
    dist[k] = dd
ix = np.clip((us * w0).astype(np.int32), 0, w0 - 1)
iy = np.clip(((1 - vs) * h0).astype(np.int32), 0, h0 - 1)
img = np.zeros((TAM, TAM, 3), np.float32)
img[ys, xs] = px0[iy, ix]
img = espalhar(img, M, 12)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').save(os.path.join(pasta, 'corpo_cor.png'))

mat = bpy.data.materials.new('corpo_v2')
mat.use_nodes = True
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
n_cor = nt.nodes.new('ShaderNodeTexImage')
n_cor.image = bpy.data.images.load(os.path.join(pasta, 'corpo_cor.png'))
nt.links.new(n_cor.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.7
corpo.data.materials.clear()
corpo.data.materials.append(mat)
mat.name = 'corpo'

print(f'mapa novo: {M.mean() * 100:.1f}% ocupado | pontos pintados: {len(ys)} | triângulos menores que um ponto: {minusculos}')
print(f'distância ao original: mediana {np.median(dist) * 1000:.3f} mm | 99% abaixo de {np.percentile(dist, 99) * 1000:.3f} mm | maior {dist.max() * 1000:.2f} mm')
bpy.ops.wm.save_as_mainfile(filepath=saida)
print('salvo:', saida)
