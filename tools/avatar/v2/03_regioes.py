# -*- coding: utf-8 -*-
"""Boneco v2, etapa 3: separa a textura do corpo em regiões, para o app trocar as cores.

    python 03_regioes.py <02_malha.blend> <pasta_textura> [01_medidas.json]

Lê o que a etapa 2 gravou em <pasta_textura> (corpo_cor.png, corpo_pos.npy, corpo_dentro.png)
e classifica cada ponto da textura pela cor e pelo lugar no corpo. Com o 01_medidas.json do
boneco (gravado pela etapa 1), as alturas de cabeça, mãos, pés e quadril saem dos ossos dele:

    1 pele   2 moletom   3 raio   4 calça   5 tênis   6 sola

Saídas em <pasta_textura>:
    corpo_mapa.png     R = sombra (a luz e as dobras pintadas), G = região * 36. É o que o app usa.
    regioes.json       quanto de cada região e a cor média original
    prova_padrao.png   o mapa pintado com as cores padrão do app
    prova_troca.png    o mapa pintado com outra combinação, para provar a troca
    prova_padrao.blend / prova_troca.blend   o boneco com essas texturas, para renderizar
"""
import json
import os
import sys

import bpy
import numpy as np
from PIL import Image, ImageFilter

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
entrada, pasta = args[0], args[1]

rgb = np.array(Image.open(os.path.join(pasta, 'corpo_cor.png')).convert('RGB')).astype(np.float32) / 255
P = np.load(os.path.join(pasta, 'corpo_pos.npy'))
dentro = np.array(Image.open(os.path.join(pasta, 'corpo_dentro.png'))) > 0
G = rgb.shape[0]
X, Y, Z = P[..., 0], P[..., 1], P[..., 2]
tem = (np.abs(P).sum(-1) > 1e-6) | dentro  # ponto com posição conhecida (dentro ou na margem)

mx, mn = rgb.max(-1), rgb.min(-1)
V = mx
S = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
d = np.maximum(mx - mn, 1e-6)
H = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60

roxo = (H > 235) & (H < 305) & (S > 0.22)
laranja = ((H < 50) | (H > 345)) & (S > 0.28)
claro = (S < 0.22) & (V > 0.55)
escuro = (S < 0.35) & (V <= 0.55) & ~roxo

# Lugares do corpo (metros; o boneco tem 1,50 m, olha para -Y, o lado esquerdo dele é +X).
# As alturas saem dos ossos de cada boneco (01_medidas.json); sem o arquivo valem as do masculino.
if len(args) > 2:
    _oss = json.load(open(args[2], encoding='utf-8'))['ossos']

    def osso(nome, eixo):
        return _oss[nome]['cabeca'][eixo]
    Z_CABECA = osso('Head', 2) - 0.05                     # daqui para cima: cabeça (e a ponta do capuz)
    Z_CAPUZ = osso('Head', 2) + 0.04                      # até aqui o capuz ainda pode aparecer
    X_MAO = (abs(osso('LeftHand', 0)) + abs(osso('RightHand', 0))) / 2 - 0.018
    Z_MAO = max(osso('LeftHand', 2), osso('RightHand', 2)) + 0.04
    Z_BOCA_TENIS = (osso('LeftFoot', 2) + osso('RightFoot', 2)) / 2 - 0.03
    Z_PEITO = (osso('Spine01', 2) - 0.12, osso('Spine', 2) + 0.043)
    Z_QUADRIL = osso('Hips', 2)
else:
    Z_CABECA, Z_CAPUZ, X_MAO, Z_MAO, Z_BOCA_TENIS, Z_PEITO, Z_QUADRIL = 1.20, 1.29, 0.335, 0.84, 0.115, (0.88, 1.14), 0.81
print(f'lugares: cabeça acima de {Z_CABECA:.3f} | capuz até {Z_CAPUZ:.3f} | mãos além de x={X_MAO:.3f} e abaixo de {Z_MAO:.3f} | '
      f'boca do tênis {Z_BOCA_TENIS:.3f} | peito {Z_PEITO[0]:.3f} a {Z_PEITO[1]:.3f} | quadril {Z_QUADRIL:.3f}')

cabeca = Z > Z_CABECA
maos = (np.abs(X) > X_MAO) & (Z < Z_MAO)
calcado = Z < Z_BOCA_TENIS     # do chão até a boca do tênis
tornozelo = (Z >= Z_BOCA_TENIS) & (Z < Z_BOCA_TENIS + 0.085)
peito = (Z > Z_PEITO[0]) & (Z < Z_PEITO[1]) & (np.abs(X) < 0.11) & (Y < 0.0)

reg = np.zeros((G, G), np.uint8)
reg[roxo] = 2
reg[escuro] = 4
reg[claro] = 5
reg[laranja] = 1
reg[laranja & peito & (S > 0.55)] = 3
# Cabeça: acima de 1,29 m só existe pele. Entre 1,20 e 1,29 m o capuz sobe atrás do pescoço,
# então ali vale a cor: alaranjado é pele, o resto é moletom.
faixa_capuz = cabeca & (Z < Z_CAPUZ)
reg[cabeca & ~faixa_capuz] = 1
reg[faixa_capuz & laranja] = 1
reg[faixa_capuz & ~laranja] = 2
# Mãos: o punho da manga chega até perto do pulso, então também vale a cor.
reg[maos & laranja] = 1
reg[maos & roxo] = 2
resto_mao = maos & ~laranja & ~roxo
reg[resto_mao] = np.where(np.abs(X) > X_MAO + 0.037, 1, 2)[resto_mao]
# Calçado: branco é tênis; laranja até 6 cm do chão é sola; o resto de laranja ali é respingo do tênis.
reg[calcado & (laranja & (Z < 0.06))] = 6
reg[calcado & (laranja & (Z >= 0.06))] = 5
reg[calcado & (reg == 1)] = 5
reg[calcado & (reg == 2)] = 5
reg[calcado & escuro & (Z < 0.03)] = 6          # sombra debaixo da sola
# Tornozelo: pele ou a barra da calça, nunca moletom nem tênis.
reg[tornozelo & (reg == 2)] = 4
reg[tornozelo & claro] = 5
# Tronco e braços: escuro acima do quadril é dobra (ou cordão) do moletom; roxo 21 cm abaixo do quadril não existe.
reg[(Z > Z_QUADRIL - 0.01) & ~maos & ~cabeca & (reg == 4)] = 2
reg[(Z < Z_QUADRIL - 0.21) & (Z >= 0.20) & (reg == 2)] = 4
solto = (Z > 0.20) & ~cabeca & ~maos & (reg == 5)
reg[solto] = np.where(Z > Z_QUADRIL - 0.09, 2, 4)[solto]
reg[~tem] = 0

# Sobras sem classe e ruído: vale a classe mais comum da vizinhança.
im = Image.fromarray(reg * 36, 'L')
for _ in range(5):
    atual = np.array(im)
    moda = np.array(im.filter(ImageFilter.ModeFilter(5)))
    falta = (atual == 0) & tem & (moda > 0)
    if not falta.any():
        break
    atual[falta] = moda[falta]
    im = Image.fromarray(atual, 'L')
limpo = np.array(im.filter(ImageFilter.ModeFilter(3)))
# O raio é pequeno: o filtro de moda não pode comer as pontas dele.
antes = np.array(im)
limpo[(antes == 3 * 36)] = 3 * 36
reg = (limpo // 36).astype(np.uint8)
reg[tem & (reg == 0)] = 1
for _ in range(10):  # além da margem conhecida, repete a região vizinha
    atual = reg * 36
    cresc = np.array(Image.fromarray(atual, 'L').filter(ImageFilter.MaxFilter(3)))
    atual[atual == 0] = cresc[atual == 0]
    reg = (atual // 36).astype(np.uint8)

def alisar(a, sigma=1.6, raio=4):
    """Desfoque gaussiano simples (o filtro do Pillow não aceita imagem de ponto flutuante)."""
    pesos = np.exp(-np.arange(-raio, raio + 1) ** 2 / (2 * sigma * sigma))
    pesos /= pesos.sum()
    for eixo in (0, 1):
        soma = np.zeros_like(a)
        for i, w in enumerate(pesos):
            soma += w * np.roll(a, i - raio, eixo)
        a = soma
    return a


# Sombra: claridade de cada ponto sobre a claridade "de luz cheia" da região dele, alisada dentro da região.
lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
sombra = np.ones((G, G), np.float32)
info = {}
NOMES = {1: 'pele', 2: 'moletom', 3: 'raio', 4: 'calca', 5: 'tenis', 6: 'sola'}
PISO = {1: 0.45, 2: 0.30, 3: 0.75, 4: 0.30, 5: 0.55, 6: 0.55}  # quanto a dobra mais funda pode escurecer
for k, nome in NOMES.items():
    m = (reg == k)
    md = m & dentro
    if not md.any():
        info[nome] = {'pontos': 0}
        continue
    topo = float(np.percentile(lum[md], 85))
    bruto = np.where(m, np.clip(lum / max(topo, 1e-3), 0, 1), 0).astype(np.float32)
    peso = m.astype(np.float32)
    sig = 3.2 if k == 1 else 1.6  # a pele é lisa: alisa mais, para tirar riscas da pintura original
    fb = alisar(bruto, sig, 8 if k == 1 else 4)
    fp = alisar(peso, sig, 8 if k == 1 else 4)
    liso = np.where(fp > 1e-4, fb / np.maximum(fp, 1e-4), 1.0)
    sombra[m] = np.clip(liso[m], PISO[k], 1.0)
    info[nome] = {'pontos': int(md.sum()), 'parte': round(float(md.sum() / dentro.sum()), 4),
                  'cor_media': '%02X%02X%02X' % tuple(int(v * 255) for v in rgb[md].mean(0)), 'luz_cheia': round(topo, 3)}
    print(f'{nome:8s}', info[nome])

mapa = np.zeros((G, G, 3), np.uint8)
mapa[..., 0] = (sombra * 255).astype(np.uint8)
mapa[..., 1] = reg * 36
Image.fromarray(mapa, 'RGB').save(os.path.join(pasta, 'corpo_mapa.png'), optimize=True)
json.dump(info, open(os.path.join(pasta, 'regioes.json'), 'w', encoding='utf-8'), indent=1)
print('corpo_mapa.png:', round(os.path.getsize(os.path.join(pasta, 'corpo_mapa.png')) / 1024), 'KB')


def pintar(nome, cores):
    """Faz o que o app faz: cor escolhida de cada região vezes a sombra."""
    tab = np.zeros((7, 3), np.float32)
    for k, h in cores.items():
        tab[k] = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    img = (tab[reg] * sombra[..., None]).astype(np.uint8)
    caminho = os.path.join(pasta, nome + '.png')
    Image.fromarray(img, 'RGB').save(caminho)
    bpy.ops.wm.open_mainfile(filepath=entrada)
    corpo = bpy.data.objects['corpo']
    no = next(n for n in corpo.material_slots[0].material.node_tree.nodes if n.type == 'TEX_IMAGE')
    no.image = bpy.data.images.load(caminho)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(pasta, nome + '.blend'), copy=True)


pintar('prova_padrao', {1: 'C98A5E', 2: '7C3AED', 3: 'F97316', 4: '3A4250', 5: 'F4F4F5', 6: 'F97316'})
pintar('prova_troca', {1: '7B4A2E', 2: '0E9F6E', 3: 'FFD23F', 4: '1E5FB8', 5: '2B1D4E', 6: 'DB4F93'})
print('provas gravadas')
