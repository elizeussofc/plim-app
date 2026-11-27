// Estudos do Plim: revisão espaçada, datas e o plano até a prova.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEGRAUS, GRATIS_ESTUDOS, dataBr, diasEntre, fases, firme, lerData, minutosDaSemana, minutosPorMateria, novoTopico, paraHoje,
  planoDaProva, previsao, proximosDias, revisar, sequenciaDeEstudo, somarDias, xpDaSessao,
} from '../lib/estudos.ts';

const HOJE = '2026-11-27';

test('as datas somam dias sem errar na virada de mês e de ano', () => {
  assert.equal(somarDias('2026-11-27', 1), '2026-11-28');
  assert.equal(somarDias('2026-11-27', 7), '2026-12-04');
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(somarDias('2028-02-28', 1), '2028-02-29', 'ano bissexto');
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(diasEntre('2026-11-27', '2026-12-04'), 7);
  assert.equal(diasEntre('2026-11-27', '2026-11-20'), -7);
  assert.equal(dataBr('2026-12-25'), '25/12/2026');
});

test('a data da prova é entendida do jeito que a pessoa digita', () => {
  assert.equal(lerData('25/12/2026', HOJE), '2026-12-25');
  assert.equal(lerData('25/12', HOJE), '2026-12-25');
  assert.equal(lerData('5/1', HOJE), '2027-01-05', 'sem ano, um dia que já passou vai para o ano que vem');
  assert.equal(lerData('25-12-26', HOJE), '2026-12-25');
  assert.equal(lerData('27/11', HOJE), '2026-11-27', 'hoje vale');
  assert.equal(lerData('31/02/2027', HOJE), null, 'dia que não existe');
  assert.equal(lerData('10/13/2026', HOJE), null);
  assert.equal(lerData('amanhã', HOJE), null);
});

test('tópico novo é revisado amanhã e o intervalo cresce a cada vez que a pessoa lembra', () => {
  let t = novoTopico('t1', '  O que é mitose?  ', 'm1', HOJE);
  assert.equal(t.nome, 'O que é mitose?');
  assert.equal(t.proxima, '2026-11-28');
  let dia = t.proxima;
  const intervalos = [];
  for (let i = 0; i < 7; i++) {
    t = revisar(t, 'lembrei', dia);
    intervalos.push(diasEntre(dia, t.proxima));
    dia = t.proxima;
  }
  assert.deepEqual(intervalos, [3, 7, 14, 30, 60, 60, 60], 'sobe os degraus e para no último');
  assert.equal(t.revisoes, 7);
  assert.ok(firme(t));
  assert.equal(DEGRAUS[0], 1);
});

test('esquecer volta ao começo; quase repete o mesmo intervalo', () => {
  let t = novoTopico('t1', 'Fórmula de Bhaskara', 'm1', HOJE);
  t = revisar(revisar(t, 'lembrei', '2026-11-28'), 'lembrei', '2026-12-01'); // degrau 2: 7 dias
  assert.equal(t.proxima, '2026-12-08');
  const quase = revisar(t, 'quase', '2026-12-08');
  assert.equal(quase.degrau, 2);
  assert.equal(diasEntre('2026-12-08', quase.proxima), 7);
  const esqueci = revisar(t, 'esqueci', '2026-12-08');
  assert.equal(esqueci.degrau, 0);
  assert.equal(esqueci.proxima, '2026-12-09');
  assert.ok(!firme(esqueci));
  assert.deepEqual(previsao(t, '2026-12-08'), { lembrei: 14, quase: 7, esqueci: 1 });
});

test('com prova marcada, nenhuma revisão cai depois da véspera', () => {
  let t = novoTopico('t1', 'Revolução Francesa', 'm1', HOJE);
  t = { ...t, degrau: 3 }; // lembrar agora daria 30 dias
  const comProva = revisar(t, 'lembrei', HOJE, '2026-12-05');
  assert.equal(comProva.proxima, '2026-12-04', 'a última revisão fica para a véspera');
  const naVespera = revisar(t, 'lembrei', '2026-12-04', '2026-12-05');
  assert.equal(naVespera.proxima, '2026-12-05', 'na véspera, a próxima é no dia');
  const provaPassou = revisar(t, 'lembrei', HOJE, '2026-11-20');
  assert.equal(provaPassou.proxima, somarDias(HOJE, 30), 'prova que já passou não muda nada');
  const semMudar = revisar(t, 'esqueci', HOJE, '2026-12-25');
  assert.equal(semMudar.proxima, '2026-11-28');
});

test('a lista de hoje traz o mais atrasado primeiro e os próximos dias contam certo', () => {
  const base = novoTopico('x', 'x', 'm1', HOJE);
  const topicos = [
    { ...base, id: 'a', proxima: '2026-11-27' },
    { ...base, id: 'b', proxima: '2026-11-20' },
    { ...base, id: 'c', proxima: '2026-11-28' },
    { ...base, id: 'd', proxima: '2026-11-25' },
    { ...base, id: 'e', proxima: '2026-11-28' },
  ];
  assert.deepEqual(paraHoje(topicos, HOJE).map((t) => t.id), ['b', 'd', 'a']);
  const prox = proximosDias(topicos, HOJE, 3);
  assert.deepEqual(prox, [{ data: '2026-11-28', quantos: 2 }, { data: '2026-11-29', quantos: 0 }, { data: '2026-11-30', quantos: 0 }]);
});

test('minutos da semana, por matéria e sequência de dias', () => {
  const materias = [{ id: 'm1', nome: 'Matemática', tinta: 'roxo' }, { id: 'm2', nome: 'História', tinta: 'azul' }];
  const sessoes = [
    { id: '1', materiaId: 'm1', data: '2026-11-27', minutos: 25 },
    { id: '2', materiaId: 'm2', data: '2026-11-27', minutos: 15 },
    { id: '3', materiaId: 'm1', data: '2026-11-26', minutos: 40 },
    { id: '4', materiaId: null, data: '2026-11-25', minutos: 10 },
    { id: '5', materiaId: 'm2', data: '2026-11-10', minutos: 50 }, // fora da semana
    { id: '6', materiaId: 'apagada', data: '2026-11-25', minutos: 5 },
  ];
  const semana = minutosDaSemana(sessoes, HOJE);
  assert.equal(semana.length, 7);
  assert.equal(semana[6].minutos, 40);
  assert.equal(semana[5].minutos, 40);
  assert.equal(semana[4].minutos, 15);
  assert.equal(semana[0].data, '2026-11-21');
  const por = minutosPorMateria(sessoes, materias, HOJE);
  assert.equal(por[0].materia.id, 'm1');
  assert.equal(por[0].minutos, 65);
  assert.equal(por.reduce((s, p) => s + p.minutos, 0), 95);
  assert.ok(por.some((p) => p.materia === null), 'estudo sem matéria (ou de matéria apagada) aparece como "sem matéria"');
  assert.equal(sequenciaDeEstudo(sessoes, HOJE), 3);
  assert.equal(sequenciaDeEstudo(sessoes, '2026-11-28'), 3, 'hoje sem estudo ainda não quebra a sequência');
  assert.equal(sequenciaDeEstudo(sessoes, '2026-11-29'), 0);
  assert.equal(xpDaSessao(25), 25);
  assert.equal(xpDaSessao(120), 50, 'XP de uma sessão tem teto');
});

test('o plano até a prova diz quantas revisões por dia', () => {
  const base = novoTopico('x', 'x', 'm1', HOJE);
  const materia = { id: 'm1', nome: 'Biologia', tinta: 'verde', prova: '2026-12-07' };
  const topicos = Array.from({ length: 12 }, (_, i) => ({ ...base, id: `t${i}` })).concat([{ ...base, id: 'firme', degrau: 6 }, { ...base, id: 'outra', materiaId: 'm2' }]);
  const plano = planoDaProva(materia, topicos, HOJE);
  assert.equal(plano.dias, 10);
  assert.equal(plano.abertos, 12, 'tópico firme e tópico de outra matéria não entram');
  assert.equal(plano.porDia, 3, '12 tópicos duas vezes em 10 dias');
  assert.match(plano.texto, /Faltam 10 dias/);
  assert.equal(planoDaProva({ ...materia, prova: undefined }, topicos, HOJE), null);
  assert.equal(planoDaProva({ ...materia, prova: '2026-11-20' }, topicos, HOJE), null, 'prova que já passou');
  assert.match(planoDaProva({ ...materia, prova: HOJE }, topicos, HOJE).texto, /hoje/);
  assert.equal(planoDaProva(materia, [], HOJE).porDia, 0);
  assert.deepEqual(fases(topicos), { novos: 13, firmando: 0, firmes: 1 });
});

test('o grátis dá para usar de verdade', () => {
  assert.ok(GRATIS_ESTUDOS.materias >= 2);
  assert.ok(GRATIS_ESTUDOS.topicos >= 10);
});
