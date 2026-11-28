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
        self.x, self.escala = x, escala
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


def mostrar(b):
    for o in b.objs:
        o.hide_render = False
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
    mostrar(ele)
    ele.esq.location.x = 0.0
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
    ele.esq.location.x = 0.0


def depois_da_cena():
    limpar_acessorios()
    if 'ele' in ELENCO:
        ELENCO['ele'].esq.location.x = ELENCO['ele'].x
        bpy.context.view_layer.update()


FEITAS = {'ola': cena_ola, 'vitoria': cena_vitoria}

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
