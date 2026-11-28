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

med['triangulos'] = sum(len(p.vertices) - 2 for p in corpo.data.polygons)
print('triângulos:', med['triangulos'], '| vértices sem peso:', sum(1 for v in corpo.data.vertices if not v.groups))

bpy.ops.wm.save_as_mainfile(filepath=saida)
if medidas_json:
    json.dump(med, open(medidas_json, 'w', encoding='utf-8'), indent=1)
print('salvo:', saida)
