// Regras do Grupo que não dependem de tela nem de servidor.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  CAMINHO_VALIDO, EMOJIS, LIMITE, agruparStories, caminhoDaImagem, contar, limparInstagram, limparLinha, limparTexto,
  podeComentar, primeiroNaoVisto, quandoSome, resumoReacoes, somarReacoes, storyAtivo, tempoRelativo, trocarReacao,
} from '../lib/grupo.ts';

const AGORA = Date.parse('2026-11-27T15:00:00.000Z');
const ha = (min) => new Date(AGORA - min * 60000).toISOString();
const daqui = (min) => new Date(AGORA + min * 60000).toISOString();

test('comentar: grátis só no próprio post; Pro em qualquer um', () => {
  assert.equal(podeComentar(false, false), false);
  assert.equal(podeComentar(false, true), true);
  assert.equal(podeComentar(true, false), true);
  assert.equal(podeComentar(true, true), true);
});

test('reação: uma por pessoa, tocar de novo tira, tocar em outra troca', () => {
  let r = trocarReacao({}, null, '🔥');
  assert.deepEqual(r, { reacoes: { '🔥': 1 }, minha: '🔥' });
  r = trocarReacao(r.reacoes, r.minha, '👏');
  assert.deepEqual(r, { reacoes: { '👏': 1 }, minha: '👏' });
  r = trocarReacao(r.reacoes, r.minha, '👏');
  assert.deepEqual(r, { reacoes: {}, minha: null });
  r = trocarReacao({ '🔥': 3, '👏': 1 }, '👏', '🔥');
  assert.deepEqual(r, { reacoes: { '🔥': 4 }, minha: '🔥' });
  const original = { '🔥': 2 };
  trocarReacao(original, null, '🔥');
  assert.deepEqual(original, { '🔥': 2 }, 'não mexe no objeto que recebeu');
});

test('resumo mostra os emojis mais usados e o total', () => {
  assert.deepEqual(resumoReacoes({}), { emojis: [], total: 0 });
  assert.deepEqual(resumoReacoes({ '👏': 2, '🔥': 9, '🎉': 5, '💜': 1 }, 3), { emojis: ['🔥', '🎉', '👏'], total: 17 });
  assert.deepEqual(resumoReacoes({ '👏': 1, '💜': 1 }, 3).emojis, ['💜', '👏'], 'empate segue a ordem da lista');
});

test('reações vindas do banco são somadas por post e acham a minha', () => {
  const soma = somarReacoes([
    { post_id: 'a', user_id: 'eu', emoji: '🔥' },
    { post_id: 'a', user_id: 'x', emoji: '🔥' },
    { post_id: 'a', user_id: 'y', emoji: '👏' },
    { post_id: 'b', user_id: 'x', emoji: '🎉' },
  ], 'eu');
  assert.deepEqual(soma.a, { reacoes: { '🔥': 2, '👏': 1 }, minha: '🔥' });
  assert.deepEqual(soma.b, { reacoes: { '🎉': 1 }, minha: null });
});

test('a lista de emojis do app é a mesma que o banco aceita', () => {
  const sql = readFileSync(new URL('../supabase/migrations/007_grupo.sql', import.meta.url), 'utf8');
  const bloco = sql.slice(sql.indexOf('check (emoji in ('), sql.indexOf(')),', sql.indexOf('check (emoji in (')));
  const doBanco = [...bloco.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(doBanco, [...EMOJIS]);
  assert.equal(new Set(EMOJIS).size, EMOJIS.length, 'emoji repetido');
});

const story = (id, autor, criadoMinAtras, extra = {}) => ({
  id, autor: { id: autor, apelido: autor, avatar: null }, imagem: null, texto: 'oi', local: null, cor: 'roxo',
  criadoEm: ha(criadoMinAtras), expiraEm: daqui(24 * 60 - criadoMinAtras), meu: autor === 'eu', ...extra,
});

test('story dura 24 horas', () => {
  assert.equal(storyAtivo(story('s', 'ana', 10), AGORA), true);
  assert.equal(storyAtivo(story('s', 'ana', 24 * 60 + 1), AGORA), false);
  assert.equal(quandoSome(daqui(5 * 60), AGORA), 'some em 5 h');
  assert.equal(quandoSome(daqui(20), AGORA), 'some em 20 min');
  assert.equal(quandoSome(daqui(0), AGORA), 'some em 1 min');
});

test('fileira de stories: os meus primeiro, depois quem tem novidade, depois os vistos', () => {
  const todos = [
    story('a1', 'ana', 300), story('a2', 'ana', 100),
    story('b1', 'bia', 50),
    story('c1', 'caio', 20),
    story('e1', 'eu', 600),
    story('velho', 'duda', 24 * 60 + 5),
  ];
  const filas = agruparStories(todos, new Set(['c1', 'a1']), AGORA);
  assert.deepEqual(filas.map((f) => f.autor.id), ['eu', 'bia', 'ana', 'caio']);
  assert.deepEqual(filas.map((f) => f.novo), [true, true, true, false]);
  const ana = filas.find((f) => f.autor.id === 'ana');
  assert.deepEqual(ana.stories.map((s) => s.id), ['a1', 'a2'], 'do mais antigo para o mais novo');
  assert.equal(primeiroNaoVisto(ana, new Set(['a1'])), 1, 'abre no primeiro que ainda não vi');
  assert.equal(primeiroNaoVisto(ana, new Set(['a1', 'a2'])), 0, 'tudo visto: começa do começo');
  assert.deepEqual(agruparStories([], new Set(), AGORA), []);
});

test('textos são limpos e cortados no limite', () => {
  assert.equal(limparTexto('  oi  \n\n\n\n tudo bem \r\n', 500), 'oi\n\n tudo bem');
  assert.equal(limparTexto('a'.repeat(900), LIMITE.texto).length, LIMITE.texto);
  assert.equal(limparLinha('  Praça   da\nSé  ', 60), 'Praça da Sé');
  assert.equal(limparLinha('x'.repeat(100), LIMITE.local).length, LIMITE.local);
});

test('Instagram aceita @nome, nome ou o endereço, e recusa o resto', () => {
  assert.equal(limparInstagram('@ana.foco'), 'ana.foco');
  assert.equal(limparInstagram('  ana_foco  '), 'ana_foco');
  assert.equal(limparInstagram('https://www.instagram.com/ana.foco/'), 'ana.foco');
  assert.equal(limparInstagram('instagram.com/ana.foco?igshid=123'), 'ana.foco');
  assert.equal(limparInstagram('ana foco'), null);
  assert.equal(limparInstagram('<script>'), null);
  assert.equal(limparInstagram('https://site-falso.example/ana'), null);
  assert.equal(limparInstagram(''), null);
  assert.equal(limparInstagram(null), null);
  assert.equal(limparInstagram('a'.repeat(31)), null);
});

test('tempo é escrito do jeito que a gente fala', () => {
  assert.equal(tempoRelativo(ha(0), AGORA), 'agora');
  assert.equal(tempoRelativo(ha(5), AGORA), 'há 5 min');
  assert.equal(tempoRelativo(ha(3 * 60), AGORA), 'há 3 h');
  assert.equal(tempoRelativo(ha(30 * 60), AGORA), 'ontem');
  assert.equal(tempoRelativo(ha(4 * 24 * 60), AGORA), 'há 4 dias');
  assert.match(tempoRelativo('2026-03-12T12:00:00.000Z', AGORA), /^12 de mar\.$/);
  assert.equal(tempoRelativo('data torta', AGORA), '');
  assert.equal(contar(1, 'comentário', 'comentários'), '1 comentário');
  assert.equal(contar(3, 'comentário', 'comentários'), '3 comentários');
});

test('a imagem vai sempre para a pasta de quem enviou, num caminho que o banco aceita', () => {
  const uid = '11111111-1111-4111-8111-111111111111';
  for (const sorteio of [0, 0.5, 0.999999]) {
    const caminho = caminhoDaImagem(uid, AGORA, sorteio);
    assert.ok(caminho.startsWith(`${uid}/`));
    assert.match(caminho, CAMINHO_VALIDO);
  }
  assert.notEqual(caminhoDaImagem(uid, AGORA, 0.1), caminhoDaImagem(uid, AGORA, 0.2));
  assert.doesNotMatch('../../etc/passwd', CAMINHO_VALIDO);
});
