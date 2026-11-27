// Casa do Plim: tarefas por frequência, faxina relâmpago, cardápio e lista de mercado.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import {
  COMODOS_PRONTOS, DIAS_DA_SEMANA, GRATIS_CASA, PRATOS, REFEICOES, casaEmDia, chaveDoCardapio, diaDeHoje, estadoDaTarefa, faxinaRelampago,
  frequenciaTexto, ingredientesDoCardapio, listaPorSecao, puxarDoCardapio, refeicoesPlanejadas, secaoDoItem, segundaDaSemana, sugerirSemana,
  urgencia, xpDaTarefa,
} from '../lib/casa.ts';

const HOJE = '2026-11-27'; // sexta-feira
const t = (id, cadaDias, minutos, ultima) => ({ id, comodoId: 'c', nome: id, cadaDias, minutos, ultima });

test('cada tarefa sabe se está em dia, para hoje ou esperando', () => {
  assert.deepEqual(estadoDaTarefa(t('a', 7, 10, '2026-11-25'), HOJE), { estado: 'em-dia', dias: 5 });
  assert.deepEqual(estadoDaTarefa(t('a', 7, 10, '2026-11-20'), HOJE), { estado: 'hoje', dias: 0 });
  assert.deepEqual(estadoDaTarefa(t('a', 7, 10, '2026-11-10'), HOJE), { estado: 'passou', dias: -10 });
  assert.deepEqual(estadoDaTarefa(t('a', 1, 10, HOJE), HOJE), { estado: 'em-dia', dias: 1 }, 'feita hoje, volta amanhã');
  assert.deepEqual(estadoDaTarefa(t('a', 7, 10), HOJE), { estado: 'hoje', dias: 0 }, 'nunca feita conta como para hoje');
  assert.equal(urgencia(t('a', 7, 10, '2026-11-13'), HOJE), 2);
  assert.equal(urgencia(t('a', 7, 10), HOJE), 1);
  assert.equal(frequenciaTexto(1), 'todo dia');
  assert.equal(frequenciaTexto(7), 'toda semana');
  assert.equal(frequenciaTexto(3), 'a cada 3 dias');
  assert.equal(frequenciaTexto(30), 'todo mês');
});

test('casa em dia é a parte das tarefas que não está pedindo atenção', () => {
  assert.equal(casaEmDia([], HOJE), 1);
  assert.equal(casaEmDia([t('a', 7, 5, '2026-11-26'), t('b', 7, 5, '2026-11-01')], HOJE), 0.5);
});

test('a faxina relâmpago pega o mais atrasado que cabe no tempo', () => {
  const tarefas = [
    t('louca', 1, 10, '2026-11-24'),      // 3 ciclos atrasada
    t('box', 14, 15, '2026-11-01'),       // 26/14 = 1,86
    t('geladeira', 30, 20, '2026-09-01'), // 87/30 = 2,9
    t('cama', 1, 2, HOJE),                // feita hoje: fora
    t('po', 7, 10, '2026-11-25'),         // em dia: fora
  ];
  assert.deepEqual(faxinaRelampago(tarefas, HOJE, 30).map((x) => x.id), ['louca', 'geladeira'], 'louça (10) + geladeira (20) = 30');
  assert.deepEqual(faxinaRelampago(tarefas, HOJE, 10).map((x) => x.id), ['louca']);
  assert.deepEqual(faxinaRelampago(tarefas, HOJE, 5).map((x) => x.id), ['louca'], 'nada cabe em 5 min: entra a mais urgente mesmo assim');
  assert.deepEqual(faxinaRelampago([t('po', 7, 10, '2026-11-25')], HOJE, 30), [], 'casa em dia: faxina vazia');
  for (const minutos of [10, 20, 30]) {
    const escolhidas = faxinaRelampago(tarefas, HOJE, minutos);
    assert.ok(escolhidas.length === 1 || escolhidas.reduce((s, x) => s + x.minutos, 0) <= minutos);
  }
  assert.equal(xpDaTarefa(2), 2);
  assert.equal(xpDaTarefa(10), 5);
  assert.equal(xpDaTarefa(60), 10);
});

test('os cômodos prontos têm ícone que existe e tarefas com números válidos', () => {
  assert.ok(COMODOS_PRONTOS.length > GRATIS_CASA.comodos, 'sobra cômodo para o Pro');
  assert.ok(GRATIS_CASA.comodos >= 3, 'o grátis cuida de três cômodos');
  for (const c of COMODOS_PRONTOS) {
    assert.ok(existsSync(new URL(`../assets/icones/${c.icone}.webp`, import.meta.url)), `falta o ícone ${c.icone}`);
    assert.ok(c.tarefas.length >= 2);
    for (const x of c.tarefas) assert.ok(x.cadaDias >= 1 && x.minutos >= 1 && x.nome.length > 3);
  }
  assert.equal(new Set(COMODOS_PRONTOS.map((c) => c.id)).size, COMODOS_PRONTOS.length);
});

test('a sugestão da semana preenche tudo sem repetir e respeita o que a pessoa já escreveu', () => {
  const vazio = sugerirSemana({}, 1);
  const total = DIAS_DA_SEMANA.length * REFEICOES.length;
  assert.equal(refeicoesPlanejadas(vazio), total);
  assert.equal(new Set(Object.values(vazio)).size, total, 'nenhum prato repetido');
  for (const d of DIAS_DA_SEMANA) {
    const jantar = PRATOS.find((p) => p.nome === vazio[chaveDoCardapio(d.id, 'jantar')]);
    const almoco = PRATOS.find((p) => p.nome === vazio[chaveDoCardapio(d.id, 'almoco')]);
    assert.ok(jantar.leve, `jantar de ${d.id} devia ser leve: ${jantar.nome}`);
    assert.ok(!almoco.leve, `almoço de ${d.id} devia ser de panela: ${almoco.nome}`);
  }
  assert.notDeepEqual(sugerirSemana({}, 1), sugerirSemana({}, 2), 'pedir de novo muda a sugestão');
  assert.deepEqual(sugerirSemana({}, 5), sugerirSemana({}, 5), 'a mesma semente dá a mesma semana');

  const meu = { 'seg-almoco': 'Feijoada da vó', 'ter-jantar': 'Sopa de legumes' };
  const completo = sugerirSemana(meu, 3);
  assert.equal(completo['seg-almoco'], 'Feijoada da vó');
  assert.equal(completo['ter-jantar'], 'Sopa de legumes');
  assert.equal(Object.values(completo).filter((v) => v === 'Sopa de legumes').length, 1, 'não repete o que a pessoa já pôs');
  assert.equal(refeicoesPlanejadas(completo), total);
  assert.equal(refeicoesPlanejadas({ a: 'x', b: '  ' }), 1);
});

test('todo prato tem ingrediente, e todo ingrediente tem corredor', () => {
  assert.ok(PRATOS.filter((p) => p.leve).length >= 7 && PRATOS.filter((p) => !p.leve).length >= 7);
  assert.equal(new Set(PRATOS.map((p) => p.nome)).size, PRATOS.length);
  for (const p of PRATOS) {
    assert.ok(p.ingredientes.length >= 3, p.nome);
    for (const ing of p.ingredientes) assert.notEqual(secaoDoItem(ing), 'Outros', `${ing} (de ${p.nome}) caiu em Outros`);
  }
});

test('o item vai para o corredor certo, com ou sem acento e plural', () => {
  assert.equal(secaoDoItem('Tomates'), 'Hortifrúti');
  assert.equal(secaoDoItem('limão'), 'Hortifrúti');
  assert.equal(secaoDoItem('Peito de frango'), 'Carnes e ovos');
  assert.equal(secaoDoItem('ovos'), 'Carnes e ovos');
  assert.equal(secaoDoItem('Pão integral'), 'Padaria');
  assert.equal(secaoDoItem('Leite'), 'Laticínios e frios');
  assert.equal(secaoDoItem('Creme de leite'), 'Laticínios e frios');
  assert.equal(secaoDoItem('Batata palha'), 'Mercearia', 'batata palha não é hortifrúti');
  assert.equal(secaoDoItem('Batata'), 'Hortifrúti');
  assert.equal(secaoDoItem('Molho de tomate'), 'Mercearia', 'molho de tomate não é tomate');
  assert.equal(secaoDoItem('Farinha de mandioca'), 'Mercearia');
  assert.equal(secaoDoItem('Suco de laranja'), 'Mercearia', 'vale a primeira palavra conhecida');
  assert.equal(secaoDoItem('Papel higiênico'), 'Outros');
  assert.equal(secaoDoItem('Sabão'), 'Outros', '"sal" dentro de outra palavra não conta');
});

test('a lista puxa o cardápio sem duplicar nem apagar o que é da pessoa', () => {
  let n = 0;
  const id = () => `i${++n}`;
  const cardapio = { 'seg-almoco': 'Bife acebolado', 'seg-jantar': 'Omelete com salada', 'ter-almoco': 'Prato que o Plim não conhece' };
  const ingredientes = ingredientesDoCardapio(cardapio);
  assert.deepEqual(ingredientes, ['Bife', 'Cebola', 'Alface', 'Tomate', 'Ovos', 'Queijo'], 'alface e tomate aparecem uma vez só');

  const minha = [{ id: 'm1', nome: 'Detergente', marcado: false, doCardapio: false }, { id: 'm2', nome: 'cebola', marcado: false, doCardapio: false }];
  const lista = puxarDoCardapio(minha, ingredientes, id);
  assert.equal(lista.length, 7, 'cebola já estava: não duplica');
  assert.ok(lista.find((i) => i.nome === 'Detergente'));

  // trocou o cardápio: o que veio dele e não foi marcado sai; o marcado e o manual ficam
  const marcada = lista.map((i) => (i.nome === 'Bife' ? { ...i, marcado: true } : i));
  const depois = puxarDoCardapio(marcada, ingredientesDoCardapio({ 'seg-almoco': 'Sopa de legumes' }), id);
  assert.ok(depois.find((i) => i.nome === 'Bife'), 'o que já está no carrinho fica');
  assert.ok(depois.find((i) => i.nome === 'Detergente'));
  assert.ok(depois.find((i) => i.nome === 'cebola'), 'item escrito pela pessoa fica');
  assert.ok(!depois.find((i) => i.nome === 'Alface'), 'ingrediente de prato que saiu do cardápio sai da lista');
  assert.ok(depois.find((i) => i.nome === 'Chuchu'));
  assert.equal(depois.filter((i) => i.nome.toLowerCase() === 'cebola').length, 1);

  const grupos = listaPorSecao(marcada);
  assert.deepEqual(grupos.map((g) => g.secao), ['Hortifrúti', 'Carnes e ovos', 'Laticínios e frios', 'Outros']);
  const carnes = grupos.find((g) => g.secao === 'Carnes e ovos').itens;
  assert.equal(carnes[carnes.length - 1].nome, 'Bife', 'o que já foi pego vai para o fim do corredor');
});

test('a semana começa na segunda', () => {
  assert.equal(segundaDaSemana('2026-11-27'), '2026-11-23');
  assert.equal(segundaDaSemana('2026-11-23'), '2026-11-23');
  assert.equal(segundaDaSemana('2026-11-29'), '2026-11-23', 'domingo ainda é da mesma semana');
  assert.equal(segundaDaSemana('2026-11-30'), '2026-11-30');
  assert.equal(diaDeHoje('2026-11-27'), 'sex');
  assert.equal(diaDeHoje('2026-11-29'), 'dom');
  assert.equal(diaDeHoje('2026-11-30'), 'seg');
});
