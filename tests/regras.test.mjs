// Testes das regras puras do Plim: datas, sequência de dias, virada do dia e conversão do avatar.
// Rodar: npm test   (usa o executor de testes do próprio Node, sem dependência extra)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { avatarConfigPadrao, chaveAvatar, escurecer, normalizarAvatar } from '../lib/avatar.ts';
import { dataLocal, diasAntes, sequenciaDeDias } from '../lib/dia.ts';
import { calcularStatusDia, virarDia } from '../lib/rotinaDia.ts';

const tarefa = (id, status) => ({ id, icone: '✅', titulo: `t${id}`, categoria: 'Geral', horario: '08:00', status, lembreteAgendado: false, calendarioAdicionado: false });

// ── datas ──────────────────────────────────────────────────────────────────

test('dataLocal usa o dia do aparelho, não o de UTC', () => {
  // 22h30 no aparelho: em UTC-3 isso já é o dia seguinte em UTC, e o bug antigo trocava o dia.
  assert.equal(dataLocal(new Date(2026, 10, 27, 22, 30)), '2026-11-27');
  assert.equal(dataLocal(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('diasAntes atravessa mês e ano', () => {
  assert.equal(diasAntes('2026-11-27', 1), '2026-11-26');
  assert.equal(diasAntes('2026-03-01', 1), '2026-02-28');
  assert.equal(diasAntes('2026-01-01', 1), '2025-12-31');
  assert.equal(diasAntes('2026-11-27', 0), '2026-11-27');
});

// ── sequência de dias ──────────────────────────────────────────────────────

test('sequência conta dias seguidos com pelo menos uma tarefa feita', () => {
  const h = { '2026-11-25': 'parcial', '2026-11-26': 'completa', '2026-11-27': 'parcial' };
  assert.equal(sequenciaDeDias(h, '2026-11-27'), 3);
});

test('hoje ainda sem nada não quebra a sequência: ela vale até ontem', () => {
  const h = { '2026-11-25': 'parcial', '2026-11-26': 'completa' };
  assert.equal(sequenciaDeDias(h, '2026-11-27'), 2);
  assert.equal(sequenciaDeDias({ ...h, '2026-11-27': 'vazia' }, '2026-11-27'), 2);
});

test('um dia vazio no meio quebra a sequência', () => {
  const h = { '2026-11-24': 'completa', '2026-11-25': 'vazia', '2026-11-26': 'parcial', '2026-11-27': 'parcial' };
  assert.equal(sequenciaDeDias(h, '2026-11-27'), 2);
  const furo = { '2026-11-24': 'completa', '2026-11-26': 'parcial' };
  assert.equal(sequenciaDeDias(furo, '2026-11-26'), 1);
});

test('sem histórico, ou parado há dois dias, a sequência é zero', () => {
  assert.equal(sequenciaDeDias({}, '2026-11-27'), 0);
  assert.equal(sequenciaDeDias({ '2026-11-25': 'completa' }, '2026-11-27'), 0);
});

// ── estado do dia e virada ─────────────────────────────────────────────────

test('calcularStatusDia: vazia, parcial e completa', () => {
  assert.equal(calcularStatusDia([]), 'vazia');
  assert.equal(calcularStatusDia([tarefa('1', 'pendente'), tarefa('2', 'pulada')]), 'vazia');
  assert.equal(calcularStatusDia([tarefa('1', 'feita'), tarefa('2', 'pendente')]), 'parcial');
  assert.equal(calcularStatusDia([tarefa('1', 'feita'), tarefa('2', 'feita')]), 'completa');
});

test('virarDia guarda o dia anterior e zera as tarefas', () => {
  const antes = { tarefas: [tarefa('1', 'feita'), tarefa('2', 'pulada')], historicoDias: {}, diaAtual: '2026-11-26' };
  const depois = virarDia(antes, '2026-11-27');
  assert.equal(depois.diaAtual, '2026-11-27');
  assert.equal(depois.historicoDias['2026-11-26'], 'parcial');
  assert.deepEqual(depois.tarefas.map((t) => t.status), ['pendente', 'pendente']);
  assert.deepEqual(depois.premiadasHoje, []);
  // o que não é status continua igual
  assert.equal(depois.tarefas[0].titulo, 't1');
  // não mexe no estado recebido
  assert.equal(antes.tarefas[0].status, 'feita');
  assert.deepEqual(antes.historicoDias, {});
});

test('virarDia não rebaixa um dia que já estava registrado', () => {
  // As tarefas foram desmarcadas depois de o dia já ter sido registrado como completo.
  const antes = { tarefas: [tarefa('1', 'pendente')], historicoDias: { '2026-11-26': 'completa' }, diaAtual: '2026-11-26' };
  assert.equal(virarDia(antes, '2026-11-27').historicoDias['2026-11-26'], 'completa');
});

test('virarDia registra dia vazio quando não havia registro, e ignora dia sem data', () => {
  const vazio = virarDia({ tarefas: [tarefa('1', 'pendente')], historicoDias: {}, diaAtual: '2026-11-26' }, '2026-11-27');
  assert.equal(vazio.historicoDias['2026-11-26'], 'vazia');
  const semData = virarDia({ tarefas: [tarefa('1', 'feita')], historicoDias: {}, diaAtual: '' }, '2026-11-27');
  assert.deepEqual(semData.historicoDias, {});
  assert.equal(semData.tarefas[0].status, 'pendente');
});

// ── avatar ─────────────────────────────────────────────────────────────────

test('normalizarAvatar devolve o padrão para lixo', () => {
  assert.deepEqual(normalizarAvatar(null), avatarConfigPadrao);
  assert.deepEqual(normalizarAvatar('x'), avatarConfigPadrao);
  assert.deepEqual(normalizarAvatar({}), avatarConfigPadrao);
});

test('normalizarAvatar converte o avatar 2D antigo aproveitando pele, cabelo, óculos e fundo', () => {
  const antigo = { genero: 'feminino', skinColor: 'f2d3b1', hairStyle: 'long05', hairColor: '1a1a2e', eyebrowsStyle: 'variant01', features: [], earrings: true, glassesStyle: 'variant02', backgroundColor: 'ede9fe' };
  assert.deepEqual(normalizarAvatar(antigo), { ...avatarConfigPadrao, cabelo: 'coque', pele: 'F2D3B1', corCabelo: '1A1A2E', oculos: true, fundo: 'EDE9FE' });
  assert.equal(normalizarAvatar({ genero: 'masculino', hairStyle: 'short05', glassesStyle: '' }).cabelo, 'curto');
  assert.equal(normalizarAvatar({ genero: 'masculino', glassesStyle: '' }).oculos, false);
});

test('normalizarAvatar mantém o avatar 3D e conserta campo inválido', () => {
  const novo = { cabelo: 'coque', pele: 'A66A43', corCabelo: 'DB4F93', corMoletom: 'EA580C', corCalca: '2B1D4E', oculos: true, fone: true, fundo: 'DDF6EA' };
  assert.deepEqual(normalizarAvatar(novo), novo);
  assert.equal(normalizarAvatar({ ...novo, pele: 'não é cor' }).pele, avatarConfigPadrao.pele);
  assert.equal(normalizarAvatar({ ...novo, oculos: 'sim' }).oculos, false);
});

test('escurecer e chaveAvatar', () => {
  assert.equal(escurecer('FFFFFF', 0.5), '808080');
  assert.equal(escurecer('000000'), '000000');
  const a = chaveAvatar(avatarConfigPadrao, 'feliz');
  assert.notEqual(a, chaveAvatar({ ...avatarConfigPadrao, oculos: true }, 'feliz'));
  assert.notEqual(a, chaveAvatar(avatarConfigPadrao, 'triste'));
  // o fundo não muda a imagem do boneco, então não entra na chave
  assert.equal(a, chaveAvatar({ ...avatarConfigPadrao, fundo: '000000' }, 'feliz'));
});
