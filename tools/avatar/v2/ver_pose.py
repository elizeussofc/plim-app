# -*- coding: utf-8 -*-
"""Boneco v2: põe o esqueleto numa pose de teste e grava uma cópia, para ver se a malha dobra bem.

    python ver_pose.py <05_rosto.blend> <saida.blend> repouso|aceno

Os giros são em torno do eixo de frente do boneco (Y do Blender), como o app faz:
ângulo positivo levanta o braço direito do boneco e abaixa o esquerdo.
"""
import math
import sys

import bpy
from mathutils import Matrix

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
entrada, saida, pose = args[0], args[1], args[2]

bpy.ops.wm.open_mainfile(filepath=entrada)
esq = bpy.data.objects['esqueleto']


def girar(osso, graus, eixo='Y'):
    pb = esq.pose.bones[osso]
    c = pb.matrix.to_translation()
    pb.matrix = Matrix.Translation(c) @ Matrix.Rotation(math.radians(graus), 4, eixo) @ Matrix.Translation(-c) @ pb.matrix
    bpy.context.view_layer.update()


if pose == 'repouso':      # braços mais perto do corpo
    girar('LeftArm', 12)
    girar('RightArm', -12)
    girar('LeftForeArm', 10)
    girar('RightForeArm', -10)
elif pose == 'aceno':      # braço direito para o alto, mão acenando; esquerdo em repouso
    girar('LeftArm', 12)
    girar('LeftForeArm', 10)
    girar('RightArm', 105)
    girar('RightForeArm', 45)
    girar('Head', -5)
bpy.ops.wm.save_as_mainfile(filepath=saida, copy=True)
print('pose', pose, 'salva em', saida)
