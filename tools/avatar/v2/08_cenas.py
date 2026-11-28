# -*- coding: utf-8 -*-
"""Boneco v2, etapa 7: as cenas ilustradas do app (assets/cenas), feitas com os bonecos novos.

    python 07_cenas.py <m/05_rosto.blend> <f/05_rosto.blend> <pasta_saida> --cenas ola,vitoria
        [--amostras 40] [--quadros 0]

Para cada cena grava <pasta_saida>/<cena>.png, com fundo transparente, no tamanho que a tela
do app espera. Com --quadros N grava também N quadros de um ciclo de movimento em
<pasta_saida>/<cena>_quadros/ (o WebP animado é montado depois, por fora do Blender).

Convenções: o boneco olha para -Y; o lado esquerdo dele é +X. girar(..., 'Y') positivo
levanta o braço direito e abaixa o esquerdo; girar(..., 'X') negativo leva o braço para a frente.
"""
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
BLEND = {'m': args[0], 'f': args[1]}
SAIDA = args[2]


def opc(nome, padrao, tipo=str):
    return tipo(args[args.index(nome) + 1]) if nome in args else padrao


CENAS = opc('--cenas', 'ola').split(',')
AMOSTRAS = opc('--amostras', 40, int)
QUADROS = opc('--quadros', 0, int)
os.makedirs(SAIDA, exist_ok=True)

ROSTO = {'feliz': ('aberto', None), 'neutro': ('aberto', None), 'animado': ('aberto', None), 'determinado': ('aberto', None),
         'triste': ('aberto', 'triste'), 'cansado': ('aberto', 'cansado'), 'orgulhoso': ('sorrindo', None)}
TAMANHO = {'ola': (830, 868), 'vitoria': (746, 858), 'calma': (716, 862), 'foco': (705, 900),
           'ler': (777, 877), 'limpar': (719, 898), 'filhos': (826, 857), 'pet': (878, 862)}
TAMANHO_ANIMADO = {'ola': (360, 377), 'vitoria': (320, 368)}

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


class Boneco:
    """Uma cópia de um dos bonecos na cena."""

    def __init__(self, qual, nome, x=0.0, escala=1.0):
        antes = set(bpy.data.objects)
        with bpy.data.libraries.load(BLEND[qual], link=False) as (de, para):
            para.objects = list(de.objects)
        self.objs = [o for o in bpy.data.objects if o not in antes]
        self.nomes = {}
        for o in self.objs:
            sc.collection.objects.link(o)
            self.nomes[o] = o.name.split('.')[0]
            o.name = nome + '_' + self.nomes[o]
        self.esq = next(o for o in self.objs if o.type == 'ARMATURE')
        self.esq.location.x = x
        self.esq.scale = (escala,) * 3
        self.x, self.escala, self.qual, self.nome = x, escala, qual, nome
        bpy.context.view_layer.update()
        self.rosto('feliz')
        self.repouso()

    def rosto(self, expr, olho=None, boca=None, sobrancelha=None):
        o_, lid = ROSTO[expr]
        olho = olho or o_
        if olho != 'aberto':
            lid = None
        for o in self.objs:
            p = self.nomes[o].split('__')
            if p[0] == 'eye':
                o.hide_render = p[1] != olho
            elif p[0] == 'lid':
                o.hide_render = p[1] != lid
            elif p[0] == 'brow':
                o.hide_render = p[1] != (sobrancelha or expr)
            elif p[0] == 'mouth':
                o.hide_render = p[1] != (boca or expr)

    def soltar(self):
        for pb in self.esq.pose.bones:
            pb.matrix_basis.identity()
        bpy.context.view_layer.update()

    def girar(self, osso, graus, eixo='Y'):
        pb = self.esq.pose.bones[osso]
        c = pb.matrix.to_translation()
        pb.matrix = Matrix.Translation(c) @ Matrix.Rotation(math.radians(graus), 4, eixo) @ Matrix.Translation(-c) @ pb.matrix
        bpy.context.view_layer.update()

    def repouso(self):
        """Braços perto do corpo (o arquivo vem em pose A)."""
        self.soltar()
        self.girar('LeftArm', 12)
        self.girar('RightArm', -12)
        self.girar('LeftForeArm', 10)
        self.girar('RightForeArm', -10)

    def ponto(self, osso):
        """Onde começa um osso, no mundo (ex.: o punho). A ponta do osso não serve: fica a metros dali."""
        return self.esq.matrix_world @ self.esq.pose.bones[osso].head

    def palma(self, lado, adiante=0.075):
        """Meio da palma da mão: do punho, seguindo a direção do antebraço."""
        cot, pun = self.ponto(lado + 'ForeArm'), self.ponto(lado + 'Hand')
        return pun + (pun - cot).normalized() * adiante * self.escala

    def subir(self, dz):
        self.esq.location.z = dz
        bpy.context.view_layer.update()

    def cores(self, pele, moletom, raio, calca, tenis):
        """Outra combinação de cores para este boneco (a mesma conta que o app faz com o corpo_mapa.png)."""
        import numpy as np
        from PIL import Image
        m = np.array(Image.open(os.path.join(os.path.dirname(BLEND[self.qual]), 'textura2', 'corpo_mapa.png')).convert('RGB'))
        tab = np.zeros((7, 3), np.float32)
        for k, h in enumerate(('000000', pele, moletom, raio, calca, tenis, raio)):
            tab[k] = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
        reg = np.clip(np.round(m[..., 1] / 36).astype(int), 0, 6)
        caminho = os.path.join(SAIDA, f'_textura_{self.nome}.png')
        Image.fromarray((tab[reg] * (m[..., 0:1] / 255.0)).astype(np.uint8), 'RGB').save(caminho)
        corpo = next(o for o in self.objs if self.nomes[o] == 'corpo')
        mat = corpo.material_slots[0].material.copy()
        corpo.material_slots[0].material = mat
        next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE').image = bpy.data.images.load(caminho)


def material(nome, hexa, brilho=0.6, metal=0.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*[((int(hexa[i:i + 2], 16) / 255 + 0.055) / 1.055) ** 2.4 for i in (0, 2, 4)], 1)
    b.inputs['Roughness'].default_value = brilho
    b.inputs['Metallic'].default_value = metal
    return m


ACESSORIOS = []


def peca(prim, mat, loc, escala=(1, 1, 1), rot=(0, 0, 0), **kw):
    """Um objeto simples de cena (troféu, confete, livro...)."""
    getattr(bpy.ops.mesh, 'primitive_' + prim + '_add')(location=loc, rotation=[math.radians(r) for r in rot], **kw)
    o = bpy.context.active_object
    o.scale = escala
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = prim != 'cube'
    ACESSORIOS.append(o)
    return o


def limpar_acessorios():
    for o in ACESSORIOS:
        bpy.data.objects.remove(o, do_unlink=True)
    ACESSORIOS.clear()


def trofeu(base):
    """Taça dourada com o pé em `base` (ponto no mundo)."""
    ouro = material('ouro', 'F2B92E', 0.28, 0.75)
    escuro = material('ouro_pe', '8A5A1E', 0.5, 0.3)
    x, y, z = base
    peca('cylinder', escuro, (x, y, z + 0.012), (0.045, 0.045, 0.012), vertices=24)
    peca('cylinder', ouro, (x, y, z + 0.045), (0.012, 0.012, 0.030), vertices=16)
    peca('cone', ouro, (x, y, z + 0.115), (1, 1, 1), radius1=0.028, radius2=0.068, depth=0.095, vertices=32)
    for lado in (-1, 1):
        peca('torus', ouro, (x + lado * 0.068, y, z + 0.118), (1, 1, 1), (90, 0, 0), major_radius=0.028, minor_radius=0.007)


def confete(centro, largura, altura, n, semente, queda=0.0):
    r = random.Random(semente)
    cores = [material('conf_' + c, c, 0.5) for c in ('7C3AED', 'F97316', 'FFD23F', '2F7FE6', 'DB4F93', '0E9F6E')]
    for i in range(n):
        x = centro[0] + r.uniform(-largura / 2, largura / 2)
        z = centro[2] + r.uniform(-altura / 2, altura / 2)
        if abs(x - centro[0]) < 0.17 and z < centro[2] + altura * 0.25:
            x += 0.24 * (1 if x > centro[0] else -1)      # não cobre o boneco
        voltas = 1 + i % 2                               # cai uma ou duas alturas inteiras por ciclo: o laço fecha sem pulo
        z = centro[2] - altura / 2 + ((z - (centro[2] - altura / 2)) - queda * altura * voltas) % altura
        peca('cube', cores[i % len(cores)], (x, centro[1] + r.uniform(-0.05, 0.05), z), (0.020, 0.005, 0.011),
             (r.uniform(0, 180), r.uniform(0, 180), r.uniform(0, 180) + queda * 360 * voltas))


def barra(p0, p1, raio, mat):
    """Cilindro fino de um ponto a outro (cabo da vassoura, guia do cachorro)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bpy.ops.mesh.primitive_cylinder_add(location=(p0 + p1) / 2, radius=raio, depth=d.length, vertices=14)
    o = bpy.context.active_object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    ACESSORIOS.append(o)
    return o


def bola(mat, loc, raio):
    return peca('uv_sphere', mat, loc, raio if isinstance(raio, tuple) else (raio,) * 3, segments=24, ring_count=14, radius=1.0)


def nuvem(centro, tam=1.0):
    branco = material('nuvem', 'F3EEF7', 0.8)
    x, y, z = centro
    for dx, dz, r in ((-0.07, 0.0, 0.05), (0.0, 0.025, 0.07), (0.075, 0.0, 0.052), (0.0, -0.012, 0.055)):
        bola(branco, (x + dx * tam, y, z + dz * tam), (r * tam * 1.15, r * tam * 0.8, r * tam))


def relogio(centro, raio=0.085):
    roxo, claro, escuro, laranja = material('rel_roxo', '8B6FD6', 0.5), material('rel_claro', 'FBF8F2', 0.5), material('rel_escuro', '3A2A5E', 0.5), material('rel_laranja', 'F97316', 0.5)
    x, y, z = centro
    peca('cylinder', roxo, (x, y, z), (raio, raio, 0.03), (90, 0, 0), vertices=40)
    peca('cylinder', claro, (x, y - 0.031, z), (raio * 0.8, raio * 0.8, 0.004), (90, 0, 0), vertices=40)
    peca('cylinder', roxo, (x, y, z + raio + 0.012), (0.02, 0.02, 0.016), vertices=16)
    barra((x, y - 0.037, z), (x, y - 0.037, z + raio * 0.55), 0.006, escuro)
    barra((x, y - 0.037, z), (x + raio * 0.42, y - 0.037, z + raio * 0.12), 0.006, laranja)
    for lado in (-1, 1):
        bola(roxo, (x + lado * raio * 0.6, y, z - raio * 0.93), 0.018)


def livro_aberto(centro, larg=0.2, alt=0.14):
    capa, folha = material('livro_capa', 'F26B1D', 0.55), material('livro_folha', 'FBF6EC', 0.7)
    x, y, z = centro
    for lado in (-1, 1):   # quem olha de frente vê a capa; as folhas ficam viradas para quem lê
        peca('cube', capa, (x + lado * larg * 0.25, y - 0.008, z), (larg * 0.26, 0.007, alt / 2), (-22, 0, lado * 16))
        peca('cube', folha, (x + lado * larg * 0.24, y + 0.006, z + 0.006), (larg * 0.235, 0.008, alt / 2 - 0.006), (-22, 0, lado * 16))


def pilha_de_livros(base):
    x, y, z = base
    for i, (cor, larg) in enumerate((('7C5CD6', 0.085), ('0E9F6E', 0.078), ('3B7DDD', 0.082))):
        peca('cube', material('pilha_' + cor, cor, 0.6), (x + (0.006 if i % 2 else -0.004), y, z + 0.022 + i * 0.044), (larg, 0.06, 0.019))
        peca('cube', material('pilha_folha', 'FBF6EC', 0.7), (x + 0.012, y - 0.004, z + 0.022 + i * 0.044), (larg - 0.004, 0.058, 0.013))


def vassoura(mao, pe):
    """Cabo passando pela mão até o chão em `pe`, com as cerdas embaixo."""
    madeira, palha, faixa = material('vas_cabo', 'B9814A', 0.6), material('vas_palha', 'F2C230', 0.75), material('vas_faixa', '7C3AED', 0.6)
    mao, pe = Vector(mao), Vector(pe)
    d = (mao - pe).normalized()
    barra(pe + d * 0.12, mao + d * 0.42, 0.012, madeira)
    bpy.ops.mesh.primitive_cone_add(location=pe + d * 0.065, radius1=0.085, radius2=0.03, depth=0.13, vertices=24)
    o = bpy.context.active_object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    o.scale = (1.0, 0.45, 1.0)
    o.data.materials.append(palha)
    ACESSORIOS.append(o)
    barra(pe + d * 0.118, pe + d * 0.142, 0.033, faixa)


def balde(base):
    roxo, pano = material('balde', '8B6FD6', 0.5), material('pano', 'FBF6EC', 0.8)
    x, y, z = base
    peca('cone', roxo, (x, y, z + 0.075), (1, 1, 1), radius1=0.062, radius2=0.085, depth=0.15, vertices=32)
    bola(pano, (x + 0.05, y - 0.03, z + 0.15), (0.045, 0.03, 0.022))


def brilho(centro, tam=0.03):
    amarelo = material('brilho', 'FFD23F', 0.4)
    x, y, z = centro
    peca('cone', amarelo, (x, y, z + tam / 2), (1, 0.35, 1), radius1=tam * 0.42, radius2=0, depth=tam, vertices=4)
    peca('cone', amarelo, (x, y, z - tam / 2), (1, 0.35, 1), (180, 0, 0), radius1=tam * 0.42, radius2=0, depth=tam, vertices=4)
    peca('cone', amarelo, (x + tam / 2, y, z), (1, 0.35, 1), (0, 90, 0), radius1=tam * 0.42, radius2=0, depth=tam, vertices=4)
    peca('cone', amarelo, (x - tam / 2, y, z), (1, 0.35, 1), (0, -90, 0), radius1=tam * 0.42, radius2=0, depth=tam, vertices=4)


def blocos(base):
    x, y, z = base
    t = 0.042
    for i, cor in enumerate(('3B7DDD', '0E9F6E', 'FFD23F', 'E5484D')):
        peca('cube', material('bloco_' + cor, cor, 0.55), (x + (0.008 if i % 2 else -0.006), y, z + t + i * 2 * t), (t, t, t), (0, 0, 8 * (i % 3 - 1)))
    peca('cube', material('bloco_F97316', 'F97316', 0.55), (x + 0.16, y - 0.05, z + t), (t, t, t), (0, 0, 20))
    peca('cube', material('bloco_8B6FD6', '8B6FD6', 0.55), (x - 0.15, y - 0.06, z + t), (t, t, t), (0, 0, -15))


def cachorro(base, olha=-1):
    """Cachorrinho de formas simples, com as patas em `base`. olha = -1: cabeça virada para a esquerda de quem vê."""
    branco, marrom, preto, coleira = material('cao_branco', 'FBF5EA', 0.75), material('cao_marrom', 'B06A3B', 0.7), material('cao_preto', '2A1A14', 0.35), material('cao_coleira', '7C3AED', 0.5)
    x, y, z = base
    bola(branco, (x, y, z + 0.17), (0.15, 0.085, 0.085))                       # corpo
    bola(marrom, (x - olha * 0.05, y + 0.005, z + 0.215), (0.075, 0.07, 0.05))  # mancha nas costas
    for dx in (-0.09, 0.09):
        for dy in (-0.04, 0.04):
            peca('cylinder', branco, (x + dx, y + dy, z + 0.06), (0.026, 0.026, 0.06), vertices=14)
            bola(branco, (x + dx + olha * 0.008, y + dy - 0.006, z + 0.016), (0.032, 0.034, 0.018))
    cx, cz = x + olha * 0.17, z + 0.31
    bola(branco, (cx, y - 0.01, cz), 0.092)                                    # cabeça
    bola(branco, (cx + olha * 0.055, y - 0.07, cz - 0.022), (0.05, 0.045, 0.04))  # focinho
    bola(preto, (cx + olha * 0.075, y - 0.11, cz - 0.008), 0.016)              # nariz
    bola(marrom, (cx - olha * 0.02, y - 0.05, cz + 0.05), (0.045, 0.05, 0.04))  # mancha no olho
    for dx in (-0.03, 0.045):
        bola(preto, (cx + olha * dx, y - 0.083, cz + 0.02), 0.012)             # olhos
    for dx in (-0.075, 0.07):
        bola(marrom, (cx + dx, y + 0.0, cz + 0.02), (0.03, 0.022, 0.06))        # orelhas caídas
    barra((x - olha * 0.14, y, z + 0.22), (x - olha * 0.2, y, z + 0.33), 0.016, branco)  # rabo
    peca('torus', coleira, (x + olha * 0.105, y, z + 0.235), (1, 1, 1), (0, olha * 62, 0), major_radius=0.072, minor_radius=0.012)
    return Vector((x + olha * 0.10, y - 0.05, z + 0.25))                       # onde a guia prende


# ───────── luz e câmera ─────────
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
try:
    sc.cycles.use_denoising = True
except Exception:
    pass
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'
mundo = bpy.data.worlds.new('cena')
mundo.use_nodes = True
fundo = next(n for n in mundo.node_tree.nodes if n.type == 'BACKGROUND')
fundo.inputs[0].default_value = (0.85, 0.85, 0.85, 1)
fundo.inputs[1].default_value = 0.75
sc.world = mundo
for nome_luz, direcao, energia in (('principal', (-0.6, -1.0, 0.8), 230), ('preenchimento', (1.0, -0.6, 0.2), 75), ('contra', (0.3, 1.0, 0.9), 110)):
    d = bpy.data.lights.new(nome_luz, 'AREA')
    d.size = 3.0
    d.energy = energia
    o = bpy.data.objects.new(nome_luz, d)
    sc.collection.objects.link(o)
    o.location = Vector((0, 0, 0.8)) + Vector(direcao).normalized() * 5
    o.rotation_euler = (Vector((0, 0, 0.8)) - o.location).to_track_quat('-Z', 'Y').to_euler()
cam_d = bpy.data.cameras.new('cena')
cam_d.type = 'ORTHO'
cam_d.clip_end = 100
cam = bpy.data.objects.new('cena', cam_d)
sc.collection.objects.link(cam)
sc.camera = cam


def caixa_da_cena():
    dg = bpy.context.evaluated_depsgraph_get()
    mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in sc.objects:
        if o.type != 'MESH' or o.hide_render:
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        for i in range(0, len(me.vertices), 7):
            p = ev.matrix_world @ me.vertices[i].co
            mn = Vector(map(min, mn, p))
            mx = Vector(map(max, mx, p))
        ev.to_mesh_clear()
    return mn, mx


def enquadrar(tam, caixa=None, folga=1.05):
    """Câmera de frente, com tudo o que aparece dentro do quadro. `caixa` fixa o quadro (animação)."""
    mn, mx = caixa or caixa_da_cena()
    w, h = tam
    sc.render.resolution_x, sc.render.resolution_y = w, h
    larg, alt = (mx.x - mn.x) * folga, (mx.z - mn.z) * folga
    cam_d.ortho_scale = max(larg * max(w, h) / w, alt * max(w, h) / h)
    cam.location = (((mn.x + mx.x) / 2), -10, (mn.z + mx.z) / 2)
    cam.rotation_euler = (math.radians(90), 0, 0)
    return mn, mx


def render(caminho, amostras):
    sc.cycles.samples = amostras
    sc.render.filepath = caminho
    bpy.ops.render.render(write_still=True)


# ───────── as cenas ─────────
ELENCO = {}


def elenco(chave, qual, x, escala=1.0):
    if chave not in ELENCO:
        ELENCO[chave] = Boneco(qual, chave, x, escala)
    return ELENCO[chave]


def esconder_todos():
    for b in ELENCO.values():
        for o in b.objs:
            o.hide_render = True


def mostrar(b, x=None):
    """Põe o boneco na cena, em repouso e sorrindo. `x` muda o lugar dele só nesta cena."""
    for o in b.objs:
        o.hide_render = False
    b.esq.location.x = b.x if x is None else x
    b.rosto('feliz')
    b.subir(0.0)
    b.repouso()


def cena_ola(fase=0.0):
    """Os dois acenando. fase de 0 a 1 = um ciclo do aceno."""
    ele, ela = elenco('ele', 'm', -0.34), elenco('ela', 'f', 0.34)
    for b in (ele, ela):
        mostrar(b)
        b.rosto('animado')
    vai = math.sin(fase * 2 * math.pi)
    ele.girar('RightArm', 104)                       # ele acena com a mão direita (à esquerda de quem olha)
    ele.girar('RightForeArm', 42 + 20 * vai)
    ele.girar('Head', -4 + 2 * vai)
    ela.girar('LeftArm', -104)                       # ela acena com a esquerda
    ela.girar('LeftForeArm', -42 - 20 * math.sin(fase * 2 * math.pi + 1.2))
    ela.girar('Head', 4 - 2 * vai)
    for b, f in ((ele, 0.0), (ela, 0.5)):
        b.subir(0.006 * (1 + math.sin((fase + f) * 2 * math.pi)))


def cena_vitoria(fase=0.0):
    """Ele comemorando com o troféu no alto e confete. fase de 0 a 1 = um pulinho."""
    ele = elenco('ele', 'm', -0.34)
    mostrar(ele, 0.0)
    ele.rosto('orgulhoso')
    pulo = abs(math.sin(fase * math.pi))
    ele.girar('RightArm', 128 + 6 * pulo)            # braço do troféu
    ele.girar('RightForeArm', 18)
    ele.girar('LeftArm', -112 - 8 * pulo)            # o outro braço comemora
    ele.girar('LeftForeArm', -58)
    ele.girar('Head', -5)
    ele.girar('LeftUpLeg', -10 * pulo, 'Y')
    ele.girar('RightUpLeg', 8 * pulo, 'Y')
    ele.subir(0.05 * pulo)
    mao = ele.palma('Right')
    trofeu((mao.x, mao.y - 0.01, mao.z + 0.03))
    confete((0.0, 0.0, 1.0), 1.25, 1.55, 26, 7, queda=fase)


def cena_calma(fase=0.0):
    """Ela de olhos fechados, tranquila, com nuvens em volta."""
    ela = elenco('ela', 'f', 0.34)
    mostrar(ela, 0.0)
    ela.rosto('feliz', olho='fechado', sobrancelha='neutro')
    ela.girar('Head', 4)
    ela.girar('Head', 5, 'X')
    nuvem((-0.36, 0.05, 1.50))
    nuvem((0.40, 0.05, 1.20), 0.85)
    nuvem((-0.40, 0.05, 0.92), 0.7)


def cena_foco(fase=0.0):
    """Ela determinada, punho erguido, com o relógio da missão ao lado."""
    ela = elenco('ela', 'f', 0.34)
    mostrar(ela, -0.10)
    ela.rosto('determinado')
    ela.girar('RightArm', 30)
    ela.girar('RightArm', -20, 'X')
    ela.girar('RightForeArm', 100)
    relogio((0.34, -0.02, 0.98), 0.105)


def cena_ler(fase=0.0):
    """Ela lendo um livro aberto, com uma pilha de livros ao lado."""
    ela = elenco('ela', 'f', 0.34)
    mostrar(ela, -0.08)
    for lado, s in (('Left', 1), ('Right', -1)):
        ela.girar(lado + 'Arm', -32, 'X')
        ela.girar(lado + 'Arm', -24 * s, 'Z')
        ela.girar(lado + 'ForeArm', -62, 'X')
    ela.girar('Head', 12, 'X')
    a, b = ela.palma('Left'), ela.palma('Right')
    meio = (a + b) / 2
    livro_aberto((meio.x, meio.y - 0.02, meio.z + 0.035), larg=max(0.2, (a - b).length + 0.05))
    pilha_de_livros((0.34, 0.02, 0.0))


def cena_limpar(fase=0.0):
    """Ele varrendo, com o balde ao lado e uns brilhos de coisa limpa."""
    ele = elenco('ele', 'm', -0.34)
    mostrar(ele, -0.06)
    ele.girar('RightArm', -30, 'X')
    ele.girar('RightArm', 26, 'Z')
    ele.girar('RightForeArm', -38, 'X')
    ele.girar('LeftArm', -18, 'X')
    ele.girar('LeftArm', -34, 'Z')
    ele.girar('LeftForeArm', -30, 'X')
    ele.girar('Head', 5)
    a, b = ele.palma('Left'), ele.palma('Right')
    meio = (a + b) / 2
    pe = (0.36, meio.y - 0.06, 0.0)
    vassoura(meio, pe)
    balde((-0.48, 0.05, 0.0))
    brilho((0.56, -0.1, 0.30), 0.05)
    brilho((0.47, -0.1, 0.45), 0.03)


def cena_filhos(fase=0.0):
    """Ela com uma criança e uma torre de blocos."""
    ela = elenco('ela', 'f', 0.34)
    filho = elenco('filho', 'm', 0.42, 0.50)
    if not getattr(filho, 'pintado', False):
        filho.cores('C98A5E', 'F4EDE1', 'F97316', '3B7DDD', 'F4F4F5')
        filho.pintado = True
    mostrar(ela, -0.30)
    mostrar(filho)
    ela.rosto('feliz')
    ela.girar('Head', 9)
    ela.girar('Head', 9, 'X')
    ela.girar('LeftArm', -34)
    ela.girar('LeftArm', -22, 'X')
    filho.rosto('animado')
    filho.girar('RightArm', 96)
    filho.girar('RightForeArm', 30)
    filho.girar('LeftArm', -96)
    filho.girar('LeftForeArm', -30)
    filho.girar('Head', -6)
    blocos((0.10, -0.08, 0.0))


def cena_pet(fase=0.0):
    """Ele passeando com o cachorro na guia."""
    ele = elenco('ele', 'm', -0.34)
    mostrar(ele, -0.26)
    ele.girar('LeftArm', -16)
    ele.girar('LeftArm', -14, 'X')
    ele.girar('Head', 7)
    ele.girar('Head', 6, 'X')
    prende = cachorro((0.44, -0.04, 0.0), olha=-1)
    barra(ele.palma('Left'), prende, 0.007, material('guia', '7C3AED', 0.5))


def depois_da_cena():
    limpar_acessorios()


FEITAS = {'ola': cena_ola, 'vitoria': cena_vitoria, 'calma': cena_calma, 'foco': cena_foco,
          'ler': cena_ler, 'limpar': cena_limpar, 'filhos': cena_filhos, 'pet': cena_pet}

for nome in CENAS:
    monta = FEITAS[nome]
    fixa = None
    if nome in TAMANHO_ANIMADO:
        # Cena que se mexe: o quadro é a caixa que contém todos os momentos do movimento, e vale
        # também para a imagem parada. Assim a animada entra no lugar da parada sem mudar de tamanho.
        mn, mx = Vector((1e9,) * 3), Vector((-1e9,) * 3)
        for i in range(8):
            esconder_todos()
            monta(i / 8)
            a, b = caixa_da_cena()
            mn, mx = Vector(map(min, mn, a)), Vector(map(max, mx, b))
            depois_da_cena()
        fixa = (mn, mx)
    esconder_todos()
    monta(0.25 if nome == 'ola' else 0.5)
    enquadrar(TAMANHO[nome], fixa)
    render(os.path.join(SAIDA, nome + '.png'), AMOSTRAS)
    print('cena:', nome, TAMANHO[nome])
    depois_da_cena()
    if QUADROS and nome in TAMANHO_ANIMADO:
        mn, mx = fixa
        pasta = os.path.join(SAIDA, nome + '_quadros')
        os.makedirs(pasta, exist_ok=True)
        for i in range(QUADROS):
            esconder_todos()
            monta(i / QUADROS)
            enquadrar(TAMANHO_ANIMADO[nome], (mn, mx))
            render(os.path.join(pasta, f'{i:03d}.png'), max(12, AMOSTRAS // 3))
            depois_da_cena()
        print('quadros:', nome, QUADROS)
