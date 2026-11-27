// Testes das falas do avatar e das trilhas (missões com relógio).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diasDesdeUltimoAtivo } from '../lib/dia.ts';
import { FALAS, escolherFala, situacaoAoAbrir, situacaoAoConcluir, situacaoDaSequencia } from '../lib/falas.ts';
import {
  AREAS, NIVEL_MAX, NIVEL_MAX_GRATIS, fatorDeTempo, missoesDoNivel, opcoesDeTempo, resultadoDaMissao, sugerirAreas,
} from '../lib/trilhas.ts';

// ── quanto tempo parado ────────────────────────────────────────────────────

test('diasDesdeUltimoAtivo: hoje, ontem, faz tempo e nunca', () => {
  assert.equal(diasDesdeUltimoAtivo({ '2026-11-27': 'parcial' }, '2026-11-27'), 0);
  assert.equal(diasDesdeUltimoAtivo({ '2026-11-26': 'completa', '2026-11-27': 'vazia' }, '2026-11-27'), 1);
  assert.equal(diasDesdeUltimoAtivo({ '2026-10-28': 'completa' }, '2026-11-27'), 30);
  assert.equal(diasDesdeUltimoAtivo({ '2026-11-27': 'vazia' }, '2026-11-27'), -1);
  assert.equal(diasDesdeUltimoAtivo({}, '2026-11-27'), -1);
});

// ── falas do avatar ────────────────────────────────────────────────────────

test('toda situação tem pelo menos duas falas, curtas, e nenhuma humilha a pessoa', () => {
  const proibidas = /pregui|burr|fracass|vergonha|inútil|inutil|incapaz|decepcion/i;
  for (const [situacao, falas] of Object.entries(FALAS)) {
    assert.ok(falas.length >= 2, `${situacao} tem só ${falas.length} fala`);
    for (const f of falas) {
      assert.ok(f.texto.length <= 110, `fala longa demais em ${situacao}: ${f.texto.length} letras`);
      assert.ok(!proibidas.test(f.texto), `fala que humilha em ${situacao}: ${f.texto}`);
    }
  }
});

test('escolherFala não repete a última e respeita o sorteio', () => {
  const todas = FALAS.tarefa.map((f) => f.texto);
  for (const ultima of todas) {
    for (const sorteio of [0, 0.34, 0.67, 0.999]) assert.notEqual(escolherFala('tarefa', ultima, sorteio).texto, ultima);
  }
  assert.equal(escolherFala('tarefa', undefined, 0).texto, todas[0]);
  assert.equal(escolherFala('tarefa', undefined, 0.999).texto, todas[todas.length - 1]);
});

test('situacaoAoAbrir lê o dia da pessoa', () => {
  const base = { hora: 9, feitas: 0, puladas: 0, total: 4, sequencia: 0, diasParado: 1 };
  assert.equal(situacaoAoAbrir({ ...base, total: 0 }), 'sem_rotina');
  assert.equal(situacaoAoAbrir({ ...base, feitas: 4 }), 'rotina_completa');
  assert.equal(situacaoAoAbrir({ ...base, feitas: 2 }), 'em_andamento');
  assert.equal(situacaoAoAbrir({ ...base, feitas: 2, hora: 22 }), 'noite_pendente');
  assert.equal(situacaoAoAbrir(base), 'manha_zero');
  assert.equal(situacaoAoAbrir({ ...base, hora: 15 }), 'tarde_zero');
  assert.equal(situacaoAoAbrir({ ...base, hora: 20 }), 'noite_zero');
  assert.equal(situacaoAoAbrir({ ...base, hora: 3 }), 'madrugada');
  assert.equal(situacaoAoAbrir({ ...base, diasParado: 2 }), 'sequencia_quebrou');
  assert.equal(situacaoAoAbrir({ ...base, diasParado: 6 }), 'voltou');
  assert.equal(situacaoAoAbrir({ ...base, diasParado: -1 }), 'manha_zero');
});

test('situacaoAoConcluir e marcos de sequência', () => {
  assert.equal(situacaoAoConcluir(1, 4), 'primeira_tarefa');
  assert.equal(situacaoAoConcluir(2, 4), 'tarefa');
  assert.equal(situacaoAoConcluir(3, 4), 'falta_uma');
  assert.equal(situacaoAoConcluir(4, 4), 'rotina_completa');
  assert.equal(situacaoAoConcluir(1, 1), 'rotina_completa');
  assert.equal(situacaoDaSequencia(3), 'sequencia_3');
  assert.equal(situacaoDaSequencia(7), 'sequencia_7');
  assert.equal(situacaoDaSequencia(30), 'sequencia_longa');
  assert.equal(situacaoDaSequencia(4), null);
});

// ── trilhas ────────────────────────────────────────────────────────────────

test('toda trilha tem missões em todos os níveis, com tempo válido', () => {
  assert.equal(AREAS.length, 8);
  for (const a of AREAS) {
    for (let n = 1; n <= NIVEL_MAX; n++) {
      const ms = missoesDoNivel(a.id, n);
      assert.ok(ms.length >= 2 && ms.length <= 3, `${a.id} nível ${n}: ${ms.length} missões`);
      assert.equal(new Set(ms.map((m) => m.id)).size, ms.length, `${a.id} nível ${n}: missão repetida`);
      for (const m of ms) {
        assert.ok(Number.isInteger(m.minutos) && m.minutos >= 1 && m.minutos <= 90, `${m.id} nível ${n}: ${m.minutos} min`);
        assert.ok(m.titulo.length > 5 && !/undefined|NaN/.test(m.titulo), `${m.id} nível ${n}: título ruim`);
      }
    }
  }
});

test('a missão cresce com o nível e encolhe para quem trava para começar', () => {
  const leituras = Array.from({ length: NIVEL_MAX }, (_, i) => missoesDoNivel('estudo', i + 1).find((m) => m.id === 'estudo:ler')).filter(Boolean);
  assert.ok(leituras.length >= 2);
  for (let i = 1; i < leituras.length; i++) assert.ok(leituras[i].minutos > leituras[i - 1].minutos);

  const nivel = Array.from({ length: NIVEL_MAX }, (_, i) => i + 1).find((n) => missoesDoNivel('estudo', n).some((m) => m.id === 'estudo:ler'));
  const normal = missoesDoNivel('estudo', nivel, [], 1).find((m) => m.id === 'estudo:ler');
  const curto = missoesDoNivel('estudo', nivel, [], 0.8).find((m) => m.id === 'estudo:ler');
  assert.ok(curto.minutos < normal.minutos);
  assert.equal(fatorDeTempo(['procrastinacao']), 0.8);
  assert.equal(fatorDeTempo(['hiperfoco']), 1);
});

test('as missões da própria pessoa vêm primeiro', () => {
  const ms = missoesDoNivel('casa', 2, [{ id: 'propria:1', titulo: 'Regar as plantas', minutos: 6 }]);
  assert.equal(ms[0].titulo, 'Regar as plantas');
  assert.equal(ms[0].propria, true);
  assert.equal(ms.length, 4);
});

test('cumpriu sobe um nível, falhou desce um, sem passar dos limites', () => {
  assert.deepEqual(resultadoDaMissao(3, true), { sucesso: true, nivelAntes: 3, nivelDepois: 4, xp: 30, moedas: 11, bateuNoTeto: false });
  assert.deepEqual(resultadoDaMissao(3, false), { sucesso: false, nivelAntes: 3, nivelDepois: 2, xp: 3, moedas: 0, bateuNoTeto: false });
  assert.equal(resultadoDaMissao(1, false).nivelDepois, 1);
  assert.equal(resultadoDaMissao(NIVEL_MAX, true).nivelDepois, NIVEL_MAX);
  assert.equal(resultadoDaMissao(NIVEL_MAX, true).bateuNoTeto, false);
});

test('no plano grátis a trilha para no nível 5 e avisa; quem já estava acima não é rebaixado', () => {
  const noTeto = resultadoDaMissao(NIVEL_MAX_GRATIS, true, NIVEL_MAX_GRATIS);
  assert.equal(noTeto.nivelDepois, NIVEL_MAX_GRATIS);
  assert.equal(noTeto.bateuNoTeto, true);
  assert.ok(noTeto.xp > 0);
  assert.equal(resultadoDaMissao(4, true, NIVEL_MAX_GRATIS).nivelDepois, 5);
  assert.equal(resultadoDaMissao(4, true, NIVEL_MAX_GRATIS).bateuNoTeto, false);
  // deixou de ser Pro com a trilha no nível 8: cumprir não rebaixa, só não sobe
  assert.equal(resultadoDaMissao(8, true, NIVEL_MAX_GRATIS).nivelDepois, 8);
  assert.equal(resultadoDaMissao(8, false, NIVEL_MAX_GRATIS).nivelDepois, 7);
});

test('opções de tempo e áreas sugeridas', () => {
  assert.deepEqual(opcoesDeTempo(10), [6, 10, 15]);
  assert.deepEqual(opcoesDeTempo(1), [1, 2]);
  assert.equal(sugerirAreas({ objetivo: 'Passar no concurso', desafios: [] })[0], 'estudo');
  assert.ok(sugerirAreas({ objetivo: 'cuidar melhor do meu filho', desafios: [] }).includes('filhos'));
  assert.ok(sugerirAreas({ objetivo: 'passear mais com meu cachorro', desafios: [] }).includes('pet'));
  assert.ok(sugerirAreas({ objetivo: null, desafios: ['ansiedade'] }).includes('mente'));
  assert.equal(sugerirAreas({}).length, 2);
});
