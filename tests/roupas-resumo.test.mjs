// Guarda-roupa do avatar e Resumo da semana.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CHAPEUS, COBRE_O_TOPO, COSTAS, PESCOCOS, avatarConfigPadrao, chaveAvatar, normalizarAvatar } from '../lib/avatar.ts';
import { FALAS } from '../lib/falas.ts';
import { montarResumo, periodo, tendencia } from '../lib/resumo.ts';
import { LUGARES, PECAS, faltam, pecasDe, semPecasDoPro, situacaoDaPeca, vestir } from '../lib/roupas.ts';

const padrao = { ...avatarConfigPadrao };
const peca = (id) => PECAS.find((p) => p.id === id);

// ───────────────────────── Guarda-roupa ─────────────────────────

test('toda peça do catálogo existe no avatar e dentro do arquivo 3D', () => {
  const noAvatar = [...CHAPEUS, ...PESCOCOS, ...COSTAS];
  assert.deepEqual(PECAS.map((p) => p.id).sort(), [...noAvatar].sort(), 'catálogo e avatar têm as mesmas peças');
  assert.equal(new Set(PECAS.map((p) => p.id)).size, PECAS.length);

  // O .glb é um JSON seguido dos dados: os nomes das malhas ficam no JSON.
  const glb = readFileSync(new URL('../public/avatar/plim_avatar.glb', import.meta.url));
  const tamanho = glb.readUInt32LE(12);
  const nomes = JSON.parse(glb.subarray(20, 20 + tamanho).toString('utf8')).nodes.map((n) => n.name);
  const prefixo = { chapeu: 'hat', pescoco: 'neck', costas: 'back' };
  for (const p of PECAS) assert.ok(nomes.some((n) => n.startsWith(`${prefixo[p.lugar]}__${p.id}__`)), `a peça ${p.id} não está no arquivo 3D`);
  for (const cabelo of ['curto', 'coque']) assert.ok(nomes.some((n) => n.startsWith(`hairtop__${cabelo}__`)), `falta o alto do cabelo ${cabelo}`);
  assert.ok(COBRE_O_TOPO.every((c) => CHAPEUS.includes(c)));
});

test('o melhor fica no Pro, mas o grátis tem peça em todo lugar', () => {
  const doPro = PECAS.filter((p) => p.pro);
  assert.deepEqual(doPro.map((p) => p.id).sort(), ['capa', 'coroa', 'medalha']);
  for (const p of doPro) assert.equal(p.preco, 0, 'peça do Pro não se compra com moeda');
  for (const lugar of LUGARES) {
    const gratis = pecasDe(lugar.id).filter((p) => !p.pro);
    assert.ok(gratis.length >= 1, `o grátis não tem peça em ${lugar.nome}`);
    for (const p of gratis) assert.ok(p.preco >= 20 && p.preco <= 200, `preço estranho em ${p.id}`);
  }
  assert.ok(PECAS.filter((p) => !p.pro).length >= 2 * doPro.length, 'há bem mais peça para moeda do que para o Pro');
});

test('a situação de cada peça segue moedas, compra e plano', () => {
  const bone = peca('bone');
  const coroa = peca('coroa');
  assert.equal(situacaoDaPeca(bone, padrao, [], 0, false), 'faltam-moedas');
  assert.equal(situacaoDaPeca(bone, padrao, [], 60, false), 'comprar');
  assert.equal(situacaoDaPeca(bone, padrao, ['bone'], 0, false), 'minha');
  assert.equal(situacaoDaPeca(bone, { ...padrao, chapeu: 'bone' }, ['bone'], 0, false), 'vestida');
  assert.equal(situacaoDaPeca(bone, padrao, [], 0, true), 'faltam-moedas', 'ser Pro não zera a loja de moedas');
  assert.equal(situacaoDaPeca(coroa, padrao, [], 9999, false), 'pro', 'moeda não compra peça do Pro');
  assert.equal(situacaoDaPeca(coroa, padrao, [], 0, true), 'minha');
  assert.equal(faltam(bone, 45), 15);
  assert.equal(faltam(bone, 500), 0);
});

test('vestir troca só o lugar da peça; tocar de novo tira', () => {
  assert.deepEqual(vestir(peca('gorro'), padrao), { chapeu: 'gorro' });
  assert.deepEqual(vestir(peca('gorro'), { ...padrao, chapeu: 'gorro' }), { chapeu: '' });
  assert.deepEqual(vestir(peca('gorro'), { ...padrao, chapeu: 'bone' }), { chapeu: 'gorro' }, 'um chapéu substitui o outro');
  assert.deepEqual(vestir(peca('cachecol'), { ...padrao, chapeu: 'bone' }), { pescoco: 'cachecol' }, 'pescoço não mexe no chapéu');
  assert.deepEqual(vestir(peca('orelhas'), { ...padrao, fone: true }), { chapeu: 'orelhas', fone: false }, 'orelhas e fone não cabem juntos');
  assert.deepEqual(vestir(peca('bone'), { ...padrao, fone: true }), { chapeu: 'bone' }, 'boné com fone pode');
});

test('quem deixa de assinar perde só as peças do Pro', () => {
  const vestido = { ...padrao, chapeu: 'coroa', pescoco: 'cachecol', costas: 'capa' };
  assert.deepEqual(semPecasDoPro(vestido), { ...padrao, chapeu: '', pescoco: 'cachecol', costas: '' }, 'o cachecol, comprado com moedas, fica');
  assert.deepEqual(semPecasDoPro({ ...padrao, chapeu: 'bone', pescoco: 'medalha' }), { ...padrao, chapeu: 'bone', pescoco: '' });
  assert.deepEqual(semPecasDoPro(padrao), padrao);
  assert.equal(vestido.chapeu, 'coroa', 'não mexe no objeto que recebeu');
});

test('avatar salvo antes das roupas continua válido, e valor estranho é descartado', () => {
  const antigo = { cabelo: 'coque', pele: 'F6D7BD', corCabelo: '1F1410', corMoletom: 'EA580C', corCalca: '3A4250', oculos: true, fone: false, fundo: 'E7DBFF' };
  const n = normalizarAvatar(antigo);
  assert.equal(n.cabelo, 'coque');
  assert.equal(n.chapeu, '');
  assert.equal(n.pescoco, '');
  assert.equal(n.costas, '');
  assert.equal(n.corTenis, avatarConfigPadrao.corTenis);
  const ruim = normalizarAvatar({ ...antigo, chapeu: 'capacete', pescoco: 42, costas: 'capa', corChapeu: 'vermelho', corExtra: '0e9f6e' });
  assert.equal(ruim.chapeu, '');
  assert.equal(ruim.pescoco, '');
  assert.equal(ruim.costas, 'capa');
  assert.equal(ruim.corChapeu, avatarConfigPadrao.corChapeu);
  assert.equal(ruim.corExtra, '0E9F6E');
  assert.notEqual(chaveAvatar({ ...n, chapeu: 'bone' }, 'feliz'), chaveAvatar(n, 'feliz'), 'o retrato guardado muda quando a roupa muda');
  assert.notEqual(chaveAvatar({ ...n, corTenis: '2B1D4E' }, 'feliz'), chaveAvatar(n, 'feliz'));
});

// ───────────────────────── Resumo da semana ─────────────────────────

const HOJE = '2026-11-27';
const base = { hoje: HOJE, rotina: {}, atividade: {}, humor: [], treinos: [], noites: [], metaDeSonoMin: 480, estudos: [], casa: [], financas: [] };

test('semana sem registro não inventa número e manda começar por uma coisa só', () => {
  const r = montarResumo(base);
  assert.equal(r.areas.length, 0);
  assert.equal(r.destaque, null);
  assert.equal(r.atencao, null);
  assert.equal(r.movimentada, false);
  assert.equal(r.conselho.titulo, 'Uma tarefa só');
  assert.equal(r.de, '2026-11-21');
  assert.equal(periodo(r), '21/11 a 27/11');
  assert.ok(r.semRegistro.some((s) => s.id === 'sono') && r.semRegistro.some((s) => s.id === 'rotina'));
});

test('a semana cheia soma cada área e separa os 7 dias dos 7 anteriores', () => {
  const r = montarResumo({
    ...base,
    rotina: { '2026-11-27': 'completa', '2026-11-26': 'parcial', '2026-11-25': 'completa', '2026-11-24': 'vazia', '2026-11-23': 'parcial', '2026-11-22': 'parcial', '2026-11-20': 'completa', '2026-11-19': 'parcial' },
    atividade: { '2026-11-27': { foco: 25, missoes: 1 }, '2026-11-25': { foco: 50 }, '2026-11-21': { missoes: 2 }, '2026-11-20': { foco: 300 } },
    humor: [{ data: '2026-11-27', humor: 4 }, { data: '2026-11-26', humor: 5 }, { data: '2026-11-15', humor: 2 }],
    treinos: [{ data: '2026-11-26' }, { data: '2026-11-24' }, { data: '2026-11-18' }],
    noites: [{ data: '2026-11-27', minutos: 480, qualidade: 4 }, { data: '2026-11-26', minutos: 450, qualidade: 3 }, { data: '2026-11-25', minutos: 510, qualidade: 5 }],
    estudos: [{ data: '2026-11-27', minutos: 40 }, { data: '2026-11-22', minutos: 25 }],
    casa: ['2026-11-27', '2026-11-27', '2026-11-23', '2026-11-01'],
    financas: [
      { data: '2026-11-27', tipo: 'gasto', valor: 12000, categoria: 'mercado' },
      { data: '2026-11-26', tipo: 'gasto', valor: 30000, categoria: 'guardado' },
      { data: '2026-11-25', tipo: 'ganho', valor: 250000, categoria: 'salario' },
      { data: '2026-11-10', tipo: 'gasto', valor: 99900, categoria: 'compras' },
    ],
  });
  const area = (id) => r.areas.find((x) => x.id === id);
  assert.equal(area('rotina').medida, 5);
  assert.equal(area('rotina').antes, 2);
  assert.match(area('rotina').valor, /5 de 7 dias · 2 completos/);
  assert.equal(area('foco').medida, 75);
  assert.equal(area('foco').antes, 300);
  assert.equal(area('missoes').medida, 3);
  assert.equal(area('treino').medida, 2);
  assert.equal(area('treino').antes, 1);
  assert.equal(area('sono').medida, 480);
  assert.equal(area('sono').antes, null, 'sem noite anotada na semana anterior não há comparação');
  assert.equal(area('estudos').medida, 65);
  assert.equal(area('casa').medida, 3);
  assert.equal(area('humor').medida, 4.5);
  assert.equal(area('dinheiro').medida, 12000, 'dinheiro guardado não entra como gasto');
  assert.match(area('dinheiro').valor, /gastou R\$ 120 · entrou R\$ 2\.500 · guardou R\$ 300/);
  assert.equal(r.movimentada, true);
  assert.equal(r.semRegistro.length, 0);
  assert.ok(r.destaque);
  assert.match(r.atencao, /Foco caiu/, 'o foco foi de 300 para 75 minutos');
  assert.equal(r.conselho.titulo, 'Repita o que funcionou');
  assert.deepEqual(tendencia(area('foco')), { seta: '↓', boa: false });
  assert.deepEqual(tendencia(area('treino')), { seta: '↑', boa: true });
  assert.equal(tendencia(area('sono')), null);
});

test('o texto para a Plim IA nunca leva dinheiro', () => {
  const r = montarResumo({
    ...base,
    rotina: { '2026-11-27': 'completa' },
    financas: [{ data: '2026-11-27', tipo: 'gasto', valor: 4321000, categoria: 'compras' }, { data: '2026-11-26', tipo: 'ganho', valor: 100000, categoria: 'salario' }],
  });
  assert.doesNotMatch(r.paraAIA, /R\$|43\.210|43210|4321|dinheiro|gast|ganh|sal[aá]rio/i);
  assert.match(r.paraAIA, /Rotina: tarefa feita em 1 de 7 dias/);
  assert.match(r.atencao, /Saiu mais dinheiro do que entrou/, 'na tela, que fica no aparelho, o aviso aparece');
});

test('o conselho escolhe o que mais pesa: sono curto vem antes de tudo', () => {
  const noites = ['2026-11-27', '2026-11-26', '2026-11-25'].map((data) => ({ data, minutos: 330, qualidade: 2 }));
  const sonoCurto = montarResumo({ ...base, noites, rotina: { '2026-11-27': 'completa', '2026-11-26': 'completa', '2026-11-25': 'completa', '2026-11-24': 'completa' } });
  assert.equal(sonoCurto.conselho.rota, '/sono');
  assert.doesNotMatch(sonoCurto.destaque, /sono/, 'noite curta nunca é o melhor da semana');
  const soSonoCurto = montarResumo({ ...base, noites });
  assert.match(soSonoCurto.destaque, /Você anotou 3 noites/, 'só sono curto: o mérito é ter anotado');
  const sonoBom = montarResumo({ ...base, noites: noites.map((n) => ({ ...n, minutos: 480 })) });
  assert.match(sonoBom.destaque, /Média de 8h de sono/);
  assert.match(sonoCurto.atencao, /abaixo das 7 horas/);

  const semFoco = montarResumo({ ...base, rotina: { '2026-11-27': 'completa', '2026-11-26': 'completa', '2026-11-25': 'completa' }, noites: noites.map((n) => ({ ...n, minutos: 480 })) });
  assert.equal(semFoco.conselho.rota, '/sessao-foco');

  const semSono = montarResumo({ ...base, rotina: { '2026-11-27': 'completa', '2026-11-26': 'completa', '2026-11-25': 'completa' }, atividade: { '2026-11-27': { foco: 30 } } });
  assert.equal(semSono.conselho.titulo, 'Anote três noites');

  const gastouMais = montarResumo({
    ...base, rotina: { '2026-11-27': 'completa', '2026-11-26': 'completa', '2026-11-25': 'completa' },
    financas: [{ data: '2026-11-27', tipo: 'gasto', valor: 300000, categoria: 'compras' }, { data: '2026-11-26', tipo: 'ganho', valor: 100000, categoria: 'salario' }],
  });
  assert.equal(gastouMais.conselho.rota, '/financas');
  assert.deepEqual(tendencia({ id: 'dinheiro', medida: 300000, antes: 100000 }), { seta: '↑', boa: false }, 'gastar mais não é seta boa');

  const proibidas = /pregui|burr|fracass|vergonha|culpa|irrespons|descontrol/i;
  for (const r of [sonoCurto, semFoco, semSono, gastouMais]) assert.doesNotMatch([r.destaque, r.atencao, r.conselho.titulo, r.conselho.texto].join(' '), proibidas);
});

test('todo ícone usado no resumo existe', () => {
  const r = montarResumo({ ...base, rotina: { [HOJE]: 'parcial' }, atividade: { [HOJE]: { foco: 10, missoes: 1 } }, humor: [{ data: HOJE, humor: 3 }], treinos: [{ data: HOJE }], noites: [{ data: HOJE, minutos: 400, qualidade: 3 }], estudos: [{ data: HOJE, minutos: 5 }], casa: [HOJE], financas: [{ data: HOJE, tipo: 'gasto', valor: 100, categoria: 'outros' }] });
  assert.equal(r.areas.length, 9);
  for (const a of r.areas) assert.ok(existsSync(new URL(`../assets/icones/${a.icone}.webp`, import.meta.url)), `falta o ícone ${a.icone}`);
});

// ───────────────────────── Falas e sons dos módulos novos ─────────────────────────

test('cada módulo novo tem fala e som próprios', () => {
  const situacoes = ['sono_meta', 'sono_ritual', 'sono_boa', 'sono_curta', 'estudo_inicio', 'estudo_fim', 'estudo_parou', 'estudo_lembrei', 'estudo_esqueci',
    'estudo_topico', 'estudo_em_dia', 'casa_tarefa', 'casa_faxina', 'casa_cardapio', 'casa_compra', 'roupa_vestiu', 'roupa_comprou', 'roupa_sem_moedas', 'resumo_boa', 'resumo_fraca'];
  const proibidas = /pregui|burr|fracass|vergonha|inútil|inutil|incapaz|decepcion/i;
  for (const s of situacoes) {
    assert.ok(FALAS[s]?.length >= 2, `a situação ${s} precisa de pelo menos duas falas`);
    for (const f of FALAS[s]) { assert.doesNotMatch(f.texto, proibidas); assert.ok(f.texto.length <= 110, `fala longa demais em ${s}`); }
  }
  for (const som of ['sininho', 'pagina', 'esfrega', 'ziper']) assert.ok(existsSync(new URL(`../public/sons/${som}.mp3`, import.meta.url)), `falta o som ${som}`);
  const web = readFileSync(new URL('../lib/sons.web.ts', import.meta.url), 'utf8');
  const celular = readFileSync(new URL('../lib/sons.ts', import.meta.url), 'utf8');
  for (const fn of ['somPassoSono', 'somSono', 'somPagina', 'somLembrei', 'somEstudoFim', 'somLimpo', 'somFaxina', 'somItem', 'somCompra', 'somVestir', 'somPecaNova', 'somResumo']) {
    assert.ok(web.includes(`export function ${fn}(`), `falta ${fn} na web`);
    assert.ok(celular.includes(`export function ${fn}(`), `falta ${fn} no celular`);
  }
});
