// Testes das expressões do avatar: quais existem, como o boneco antigo as mostra e
// em que situações as caras triste e cansada podem aparecer (o Plim não dá bronca).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EXPRESSOES, expressaoDoBonecoAntigo } from '../lib/avatar.ts';
import { FALAS } from '../lib/falas.ts';

const ANTIGAS = ['feliz', 'neutro', 'triste', 'animado'];

test('são sete expressões, sem repetir', () => {
  assert.equal(EXPRESSOES.length, 7);
  assert.equal(new Set(EXPRESSOES).size, 7);
  for (const e of ANTIGAS) assert.ok(EXPRESSOES.includes(e), `falta ${e}`);
});

test('o boneco antigo mostra cada cara nova como a que já mostrava naquelas situações', () => {
  assert.equal(expressaoDoBonecoAntigo('cansado'), 'neutro');
  assert.equal(expressaoDoBonecoAntigo('determinado'), 'feliz');
  assert.equal(expressaoDoBonecoAntigo('orgulhoso'), 'animado');
  for (const e of ANTIGAS) assert.equal(expressaoDoBonecoAntigo(e), e);
  for (const e of EXPRESSOES) assert.ok(ANTIGAS.includes(expressaoDoBonecoAntigo(e)), `${e} virou uma cara que o boneco antigo não tem`);
});

test('toda fala usa uma expressão que existe', () => {
  for (const [situacao, falas] of Object.entries(FALAS)) {
    assert.ok(falas.length > 0, `${situacao} sem fala`);
    for (const f of falas) assert.ok(EXPRESSOES.includes(f.humor), `${situacao}: expressão desconhecida "${f.humor}"`);
  }
});

const situacoesCom = (humor) => Object.entries(FALAS).filter(([, falas]) => falas.some((f) => f.humor === humor)).map(([s]) => s).sort();

test('a cara triste só aparece em perda, e a cansada só em sono e cutucão', () => {
  assert.deepEqual(situacoesCom('triste'), ['missao_falhou', 'sequencia_quebrou']);
  assert.deepEqual(situacoesCom('cansado'), ['madrugada', 'sono_curta', 'toque_demais']);
});

test('quem pulou, parou ou estourou a conta nunca vê cara triste', () => {
  for (const s of ['pulou', 'pulou_varias', 'desfez', 'foco_parou', 'gym_parou', 'estudo_parou', 'estudo_esqueci', 'fin_estourou', 'resumo_fraca', 'noite_pendente', 'sem_rotina']) {
    assert.ok(FALAS[s], `situação ${s} não existe`);
    for (const f of FALAS[s]) assert.notEqual(f.humor, 'triste', `${s} não pode ter cara triste`);
  }
});

test('conquista grande deixa o avatar orgulhoso e começo deixa determinado', () => {
  for (const s of ['rotina_completa', 'sequencia_longa', 'nivel', 'conquista', 'missao_teto', 'gym_carga', 'fin_meta', 'estudo_em_dia', 'resumo_boa']) {
    for (const f of FALAS[s]) assert.equal(f.humor, 'orgulhoso', s);
  }
  for (const s of ['falta_uma', 'missao_inicio', 'gym_inicio', 'estudo_inicio']) {
    for (const f of FALAS[s]) assert.equal(f.humor, 'determinado', s);
  }
});
