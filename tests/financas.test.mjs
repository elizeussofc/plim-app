// Contas das Finanças do Plim. Valores sempre em centavos.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import {
  CATEGORIAS, alvoDaReserva, brl, comparar503020, contasDoMes, dicasDoMes, diasNoMes, lerValor, maioresGastos, mesVizinho, mesesAte,
  mesesDeReserva, mesesParaChegar, nomeDoMes, ordemDeQuitacao, patrimonioLiquido, plano503020, planoDaMeta, projetar, resumoDoMes,
  simularQuitacao, situacaoDoTeto, totalDasContas, vencimento,
} from '../lib/financas.ts';

const l = (tipo, reais, categoria, data) => ({ id: `${tipo}-${categoria}-${data}-${reais}`, tipo, valor: reais * 100, categoria, descricao: '', data });

test('dinheiro vira texto e texto vira dinheiro sem perder centavo', () => {
  assert.equal(brl(123456), 'R$ 1.234,56');
  assert.equal(brl(5), 'R$ 0,05');
  assert.equal(brl(-250000, true), '-R$ 2.500');
  assert.equal(brl(250050, true), 'R$ 2.500,50');
  assert.equal(brl(100000000), 'R$ 1.000.000,00');

  assert.equal(lerValor('12'), 1200);
  assert.equal(lerValor('12,5'), 1250);
  assert.equal(lerValor('12.5'), 1250);
  assert.equal(lerValor('1.234,56'), 123456);
  assert.equal(lerValor('1234.56'), 123456);
  assert.equal(lerValor('1.234'), 123400, 'ponto com três casas é milhar');
  assert.equal(lerValor('R$ 40'), 4000);
  assert.equal(lerValor('0,1'), 10);
  assert.equal(lerValor('19,99'), 1999);
  assert.equal(lerValor(''), 0);
  assert.equal(lerValor('abc'), 0);
  assert.equal(lerValor('-50'), 5000, 'sinal é ignorado: quem diz se é gasto ou ganho é o tipo');
  for (const reais of [0.07, 0.29, 1.15, 33.33, 1999.99]) assert.equal(lerValor(String(reais).replace('.', ',')), Math.round(reais * 100));
});

test('toda categoria tem ícone no app e os gastos têm balde', () => {
  const ids = new Set();
  for (const c of CATEGORIAS) {
    assert.ok(!ids.has(c.id), `categoria repetida: ${c.id}`);
    ids.add(c.id);
    assert.ok(existsSync(new URL(`../assets/icones/${c.icone}.webp`, import.meta.url)), `sem ícone: ${c.icone}`);
    if (c.tipo === 'gasto') assert.ok(c.balde, `gasto sem balde: ${c.id}`);
  }
});

test('meses: vizinho, nome, dias e contagem', () => {
  assert.equal(mesVizinho('2026-12', 1), '2027-01');
  assert.equal(mesVizinho('2026-01', -1), '2025-12');
  assert.equal(mesVizinho('2026-11', -14), '2025-09');
  assert.equal(nomeDoMes('2026-03'), 'março de 2026');
  assert.equal(diasNoMes('2026-02'), 28);
  assert.equal(diasNoMes('2028-02'), 29);
  assert.equal(mesesAte('2026-11', '2027-05'), 6);
  assert.equal(mesesAte('2026-11', '2026-11'), 1, 'prazo no mês atual ainda conta um mês');
  assert.equal(mesesAte('2026-11', '2026-01'), 1);
});

test('resumo do mês soma só o mês pedido e separa por categoria e por balde', () => {
  const tudo = [
    l('ganho', 3000, 'salario', '2026-11-05'), l('ganho', 400, 'extra', '2026-11-20'),
    l('gasto', 1200, 'moradia', '2026-11-06'), l('gasto', 600, 'mercado', '2026-11-10'), l('gasto', 250, 'mercado', '2026-11-22'),
    l('gasto', 300, 'lazer', '2026-11-15'), l('gasto', 200, 'guardado', '2026-11-06'),
    l('gasto', 999, 'lazer', '2026-10-31'), l('ganho', 999, 'salario', '2026-12-01'),
  ];
  const r = resumoDoMes(tudo, '2026-11');
  assert.equal(r.ganhos, 340000);
  assert.equal(r.gastos, 255000);
  assert.equal(r.saldo, 85000);
  assert.equal(r.quantos, 7);
  assert.equal(r.porCategoria.mercado, 85000);
  assert.deepEqual(r.porBalde, { necessidades: 205000, desejos: 30000, futuro: 20000 });
  const maiores = maioresGastos(r, 2);
  assert.deepEqual(maiores.map((m) => m.categoria), ['moradia', 'mercado']);
  assert.ok(Math.abs(maiores[0].parte - 120000 / 255000) < 1e-9);
  assert.deepEqual(resumoDoMes([], '2026-11').porBalde, { necessidades: 0, desejos: 0, futuro: 0 });
});

test('50-30-20 divide a renda inteira, sem sobrar nem faltar centavo', () => {
  assert.deepEqual(plano503020(300000), { necessidades: 150000, desejos: 90000, futuro: 60000 });
  for (const renda of [1, 99, 141200, 333333, 1234567]) {
    const p = plano503020(renda);
    assert.equal(p.necessidades + p.desejos + p.futuro, renda);
  }
  const linhas = comparar503020(resumoDoMes([l('ganho', 2000, 'salario', '2026-11-05'), l('gasto', 1300, 'moradia', '2026-11-06'), l('gasto', 200, 'lazer', '2026-11-07')], '2026-11'));
  assert.deepEqual(linhas.map((x) => [x.balde, x.ideal, x.real, x.diferenca]), [
    ['necessidades', 100000, 130000, 30000], ['desejos', 60000, 20000, -40000], ['futuro', 40000, 0, -40000],
  ]);
  assert.equal(comparar503020(resumoDoMes([], '2026-11'))[0].parte, 0, 'sem renda não divide por zero');
});

test('teto da categoria: livre, atenção a partir de 80% e estourou acima de 100%', () => {
  assert.equal(situacaoDoTeto(7900, 10000), 'livre');
  assert.equal(situacaoDoTeto(8000, 10000), 'atencao');
  assert.equal(situacaoDoTeto(10000, 10000), 'atencao');
  assert.equal(situacaoDoTeto(10001, 10000), 'estourou');
  assert.equal(situacaoDoTeto(500, 0), 'livre');
});

test('contas do mês: vencimento em mês curto, situação e ordem de urgência', () => {
  assert.equal(vencimento(31, '2026-02'), '2026-02-28');
  assert.equal(vencimento(5, '2026-11'), '2026-11-05');
  assert.equal(vencimento(0, '2026-11'), '2026-11-01');
  const c = (id, dia, pagas = {}) => ({ id, nome: id, valor: 10000, dia, categoria: 'contas', pagas });
  const lista = contasDoMes([c('depois', 28), c('paga', 2, { '2026-11': true }), c('atrasada', 10), c('hoje', 15), c('logo', 17)], '2026-11', '2026-11-15');
  assert.deepEqual(lista.map((x) => [x.conta.id, x.situacao, x.dias]), [
    ['atrasada', 'atrasada', -5], ['hoje', 'hoje', 0], ['logo', 'logo', 2], ['depois', 'depois', 13], ['paga', 'paga', -13],
  ]);
  assert.deepEqual(totalDasContas(lista), { total: 50000, pago: 10000, falta: 40000 });
  assert.equal(contasDoMes([c('x', 10, { '2026-10': true })], '2026-11', '2026-11-01')[0].situacao, 'depois', 'paga no mês passado não vale para este');
});

test('reserva de emergência: 3 meses com renda fixa, 6 com renda variável ou casa nas costas', () => {
  assert.equal(mesesDeReserva('fixa', false), 3);
  assert.equal(mesesDeReserva('fixa', true), 6);
  assert.equal(mesesDeReserva('variavel', false), 6);
  assert.equal(alvoDaReserva(250000, 'fixa', false), 750000);
  assert.equal(alvoDaReserva(-5, 'fixa', false), 0);
});

test('meta: quanto falta, quanto guardar por mês e quando fica pronta', () => {
  const meta = { id: 'm', nome: 'Viagem', alvo: 600000, guardado: 150000, prazo: '2027-05' };
  const p = planoDaMeta(meta, '2026-11');
  assert.equal(p.falta, 450000);
  assert.equal(p.meses, 6);
  assert.equal(p.porMes, 75000);
  assert.equal(p.parte, 0.25);
  assert.equal(planoDaMeta({ ...meta, prazo: undefined }, '2026-11').porMes, undefined);
  assert.equal(planoDaMeta({ ...meta, alvo: 100001, guardado: 1, prazo: '2027-02' }, '2026-11').porMes, 33334, 'arredonda para cima: nunca falta centavo no fim');
  assert.deepEqual(planoDaMeta({ ...meta, guardado: 700000 }, '2026-11'), { falta: 0, parte: 1, pronta: true });
  assert.equal(mesesParaChegar(450000, 75000), 6);
  assert.equal(mesesParaChegar(450000, 0), Infinity);
  assert.equal(mesesParaChegar(0, 0), 0);
});

test('juros compostos: sem taxa é só a soma; com taxa rende mais, e nunca menos', () => {
  assert.deepEqual(projetar(0, 10000, 0, 12), { total: 120000, guardado: 120000, rendimento: 0 });
  const dez = projetar(100000, 20000, 10, 24);
  assert.equal(dez.guardado, 580000);
  assert.ok(dez.rendimento > 0 && dez.total === dez.guardado + dez.rendimento);
  // R$ 1.000 parados a 12% ao ano viram R$ 1.120 em 12 meses.
  assert.equal(projetar(100000, 0, 12, 12).total, 112000);
  assert.ok(projetar(0, 20000, 12, 120).total > projetar(0, 20000, 6, 120).total);
  assert.equal(projetar(0, 100, 10, 9999).guardado, 60000, 'limite de 600 meses');
});

test('dívidas: avalanche ataca o juro maior, bola de neve a dívida menor', () => {
  const dividas = [
    { id: 'cartao', nome: 'Cartão', saldo: 300000, jurosMes: 12, minimo: 30000 },
    { id: 'loja', nome: 'Loja', saldo: 80000, jurosMes: 4, minimo: 10000 },
    { id: 'carro', nome: 'Carro', saldo: 900000, jurosMes: 1.8, minimo: 60000 },
  ];
  assert.deepEqual(ordemDeQuitacao(dividas, 'avalanche').map((d) => d.id), ['cartao', 'loja', 'carro']);
  assert.deepEqual(ordemDeQuitacao(dividas, 'bola-de-neve').map((d) => d.id), ['loja', 'cartao', 'carro']);

  const av = simularQuitacao(dividas, 40000, 'avalanche');
  const bn = simularQuitacao(dividas, 40000, 'bola-de-neve');
  assert.ok(Number.isFinite(av.meses) && Number.isFinite(bn.meses));
  assert.ok(av.juros <= bn.juros, 'avalanche nunca paga mais juros');
  assert.ok(bn.fim.loja <= av.fim.loja, 'bola de neve quita a primeira dívida antes');
  assert.equal(av.totalPago, 1280000 + av.juros, 'tudo o que foi pago é a dívida mais os juros');
  assert.ok(simularQuitacao(dividas, 100000, 'avalanche').meses < av.meses, 'pagar mais por mês acaba antes');
  assert.equal(dividas[0].saldo, 300000, 'a simulação não mexe nas dívidas de verdade');
});

test('dívida que cresce mais do que se paga nunca acaba, e o app diz isso', () => {
  const r = simularQuitacao([{ id: 'x', nome: 'Rotativo', saldo: 500000, jurosMes: 14, minimo: 20000 }], 0, 'avalanche');
  assert.equal(r.meses, Infinity);
  assert.deepEqual(simularQuitacao([], 50000, 'avalanche'), { meses: 0, juros: 0, totalPago: 0, fim: {} });
});

test('patrimônio é o que tem menos o que deve', () => {
  assert.deepEqual(patrimonioLiquido([{ id: 'a', nome: 'Carro', valor: 3000000 }], [{ saldo: 900000 }], 150000), { tem: 3150000, deve: 900000, liquido: 2250000 });
  assert.equal(patrimonioLiquido([], [{ saldo: 50000 }]).liquido, -50000);
});

test('dicas saem dos números da pessoa, o urgente primeiro, e nunca culpam ninguém', () => {
  const resumo = resumoDoMes([
    l('ganho', 3000, 'salario', '2026-11-05'), l('gasto', 1500, 'moradia', '2026-11-06'), l('gasto', 1200, 'lazer', '2026-11-08'),
    l('gasto', 150, 'assinaturas', '2026-11-09'), l('gasto', 600, 'mercado', '2026-11-10'),
  ], '2026-11');
  const contas = contasDoMes([{ id: 'luz', nome: 'Luz', valor: 18000, dia: 5, categoria: 'contas', pagas: {} }], '2026-11', '2026-11-20');
  const dicas = dicasDoMes({ resumo, tetos: { lazer: 50000, mercado: 70000 }, contas, metas: [], dividas: [{ id: 'c', nome: 'Cartão', saldo: 200000, jurosMes: 12, minimo: 20000 }] });
  const ids = dicas.map((d) => d.id);
  assert.deepEqual(ids.slice(0, 3), ['atrasadas', 'divida-cara', 'negativo']);
  for (const esperado of ['teto-lazer', 'teto-mercado', 'sem-reserva', 'desejos', 'assinaturas']) assert.ok(ids.includes(esperado), `faltou a dica ${esperado}`);
  assert.equal(dicas.find((d) => d.id === 'teto-lazer').tom, 'atencao');
  assert.equal(dicas.find((d) => d.id === 'teto-mercado').tom, 'ideia');
  assert.equal(new Set(ids).size, ids.length, 'dica repetida');
  const proibidas = /irrespons|burr|vergonha|culpa|gastador|descontrol|pregui/i;
  for (const d of dicas) assert.ok(!proibidas.test(d.titulo + d.texto), `dica com bronca: ${d.titulo}`);

  const emDia = resumoDoMes([l('ganho', 3000, 'salario', '2026-11-05'), l('gasto', 1400, 'moradia', '2026-11-06'), l('gasto', 600, 'guardado', '2026-11-06')], '2026-11');
  const boas = dicasDoMes({ resumo: emDia, tetos: {}, contas: [], metas: [{ id: 'r', nome: 'Reserva', alvo: 500000, guardado: 500000, reserva: true }], dividas: [] });
  assert.deepEqual(boas.map((d) => d.id), ['futuro-ok']);
  assert.deepEqual(dicasDoMes({ resumo: resumoDoMes([], '2026-11'), tetos: {}, contas: [], metas: [], dividas: [] }).map((d) => d.id), ['sem-reserva', 'comecar']);
});
