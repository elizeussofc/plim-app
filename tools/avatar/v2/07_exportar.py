# -*- coding: utf-8 -*-
"""Boneco v2, etapa 6: exporta o .glb do app e confere o que chegou do outro lado.

    python 06_exportar.py <05_rosto.blend> <plim_v2.glb> [--max-mb 3.5]

Todas as peças vão visíveis no arquivo (o app esconde as que não usa). A textura embutida é
só a aparência padrão: no app, a cor do corpo é montada na hora a partir do corpo_mapa.png.
"""
import os
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
entrada, saida = args[0], args[1]
MAX_MB = float(args[args.index('--max-mb') + 1]) if '--max-mb' in args else 3.5

bpy.ops.wm.open_mainfile(filepath=entrada)
for o in bpy.context.scene.objects:
    o.hide_render = False
    o.hide_viewport = False
    o.hide_set(False)
nomes = sorted(o.name for o in bpy.context.scene.objects if o.type == 'MESH')
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')

bpy.ops.export_scene.gltf(filepath=saida, export_format='GLB', export_apply=True, export_yup=True,
                          export_skins=True, export_animations=False, export_image_format='JPEG',
                          export_jpeg_quality=82, export_materials='EXPORT')

mb = os.path.getsize(saida) / 1e6
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=saida)
volta = sorted(o.name for o in bpy.context.scene.objects if o.type == 'MESH')
esq = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
tris2 = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
print(f'exportado: {mb:.2f} MB | peças {len(nomes)} -> {len(volta)} | triângulos {tris} -> {tris2} | esqueletos {len(esq)} | ossos {len(esq[0].data.bones) if esq else 0}')
faltam = [n for n in nomes if n not in volta]
if faltam:
    print('PEÇAS QUE NÃO VOLTARAM:', faltam)
mats = sorted({s.material.name for o in bpy.context.scene.objects if o.type == 'MESH' for s in o.material_slots if s.material})
print('materiais:', ', '.join(mats))
for prefixo in ('hair__', 'eye__', 'lid__', 'brow__', 'mouth__'):
    print(f'  {prefixo:8s}', ', '.join(n[len(prefixo):] for n in volta if n.startswith(prefixo)))
if mb > MAX_MB or faltam:
    raise SystemExit(f'FORA DO COMBINADO: {mb:.2f} MB (teto {MAX_MB}) ou peças faltando.')
