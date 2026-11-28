# -*- coding: utf-8 -*-
"""Boneco v2, etapa 1: recebe a base gerada por IA (Meshy 7, com esqueleto) e deixa pronta para o resto.

    python 01_base.py <base_original.glb> <boneco.blend> [medidas.json]

O que faz: apaga o que não é o corpo nem o esqueleto, põe os pés em Z=0, centra em X,
ajusta a altura (careca) para ALTURA e aplica as transformações. Imprime as medidas que as
etapas seguintes usam (cabeça, mãos, ossos).
"""
import json
import sys

import bpy
from mathutils import Vector

ALTURA = 1.50  # metros, do chão ao alto da cabeça careca (o boneco antigo tinha 1,50 com cabelo curto)

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
entrada, saida = args[0], args[1]
medidas_json = args[2] if len(args) > 2 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=entrada)
cena = bpy.context.scene

esq = next(o for o in cena.objects if o.type == 'ARMATURE')
corpo = max((o for o in cena.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
for o in list(cena.objects):
    if o not in (esq, corpo):
        print('apagado:', o.name, o.type)
        bpy.data.objects.remove(o, do_unlink=True)
for o in (esq, corpo):
    o.animation_data_clear()
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)


def caixa(verts=None):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = corpo.evaluated_get(dg)
    me = ev.to_mesh()
    idx = range(len(me.vertices)) if verts is None else verts
    pts = [ev.matrix_world @ me.vertices[i].co for i in idx]
    ev.to_mesh_clear()
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


mn, mx = caixa()
print('antes  : min', [round(v, 3) for v in mn], 'max', [round(v, 3) for v in mx])
f = ALTURA / (mx.z - mn.z)
raiz = esq if corpo.parent == esq else None
alvo = raiz or corpo
alvo.scale = alvo.scale * f
bpy.context.view_layer.update()
mn, mx = caixa()
alvo.location.x -= (mn.x + mx.x) / 2
alvo.location.z -= mn.z
bpy.context.view_layer.update()

bpy.ops.object.select_all(action='DESELECT')
for o in (esq, corpo):
    o.select_set(True)
bpy.context.view_layer.objects.active = esq
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.context.view_layer.update()

corpo.name = 'corpo'
corpo.data.name = 'corpo'
esq.name = 'esqueleto'
for s in corpo.material_slots:
    if s.material:
        s.material.name = 'corpo'

mn, mx = caixa()
print('depois : min', [round(v, 3) for v in mn], 'max', [round(v, 3) for v in mx])

# Regiões pelo peso dos ossos (cada vértice vai para o osso de maior peso).
nomes = {g.index: g.name for g in corpo.vertex_groups}
dono = {}
for v in corpo.data.vertices:
    if v.groups:
        g = max(v.groups, key=lambda x: x.weight)
        dono.setdefault(nomes[g.group], []).append(v.index)

med = {'altura': ALTURA, 'caixa': [list(mn), list(mx)], 'regioes': {}, 'ossos': {}}
for grupo in (('Head', 'head_end', 'headfront'), ('LeftHand',), ('RightHand',), ('neck',), ('LeftFoot', 'LeftToeBase'), ('RightFoot', 'RightToeBase')):
    idx = [i for n in grupo for i in dono.get(n, [])]
    if not idx:
        print('região vazia:', grupo)
        continue
    a, b = caixa(idx)
    med['regioes'][grupo[0]] = {'min': [round(v, 4) for v in a], 'max': [round(v, 4) for v in b], 'vertices': len(idx)}
    print(f'{grupo[0]:10s} verts {len(idx):6d}  min {[round(v, 3) for v in a]}  max {[round(v, 3) for v in b]}')
for b in esq.data.bones:
    c, p = esq.matrix_world @ b.head_local, esq.matrix_world @ b.tail_local
    med['ossos'][b.name] = {'cabeca': [round(v, 4) for v in c], 'ponta': [round(v, 4) for v in p], 'pai': b.parent.name if b.parent else None}
    print(f'osso {b.name:14s} pai {str(b.parent.name if b.parent else "-"):14s} início {[round(v, 3) for v in c]}')



# ── Pesos do esqueleto: o antebraço e a mão só podem puxar o que está perto deles ──
# No modelo de IA a mão fica perto do quadril, e o peso do antebraço "vaza" para a lateral do
# tronco. Ao erguer o braço, esses pontos do tronco vão junto e o moletom rasga em pontas.
def dist_ao_braco(p, a, b, c):
    """Distância de p à linha quebrada a-b-c (cotovelo, punho, ponta dos dedos)."""
    def ao_trecho(u, v):
        d = v - u
        t = max(0.0, min(1.0, (p - u).dot(d) / max(d.length_squared, 1e-12)))
        return (p - (u + d * t)).length
    return min(ao_trecho(a, b), ao_trecho(b, c))


grupo = {g.name: g.index for g in corpo.vertex_groups}
soltos = {}
for lado in ('Left', 'Right'):
    cot = esq.matrix_world @ esq.data.bones[lado + 'ForeArm'].head_local
    pun = esq.matrix_world @ esq.data.bones[lado + 'Hand'].head_local
    dedos = pun + (pun - cot).normalized() * 0.14
    alvos = {grupo[lado + 'ForeArm'], grupo[lado + 'Hand']}
    for v in corpo.data.vertices:
        if not any(g.group in alvos and g.weight > 0 for g in v.groups):
            continue
        if dist_ao_braco(corpo.matrix_world @ v.co, cot, pun, dedos) <= 0.09:
            continue
        resto = [(g.group, g.weight) for g in v.groups if g.group not in alvos and g.weight > 0]
        if not resto:
            continue                                   # só tinha esse peso: melhor deixar
        total = sum(w for _g, w in resto)
        for gi in alvos:
            corpo.vertex_groups[gi].remove([v.index])
        for gi, w in resto:
            corpo.vertex_groups[gi].add([v.index], w / total, 'REPLACE')
        soltos[lado] = soltos.get(lado, 0) + 1
print('pontos soltos do antebraço e da mão por estarem longe deles:', soltos or 'nenhum')

med['triangulos'] = sum(len(p.vertices) - 2 for p in corpo.data.polygons)
print('triângulos:', med['triangulos'], '| vértices sem peso:', sum(1 for v in corpo.data.vertices if not v.groups))

bpy.ops.wm.save_as_mainfile(filepath=saida)
if medidas_json:
    json.dump(med, open(medidas_json, 'w', encoding='utf-8'), indent=1)
print('salvo:', saida)
