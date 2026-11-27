// Sono do Plim: a conta da hora de deitar, o diário e a leitura das noites.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AVISO_SONO, DICAS_SONO, GRATIS_SONO, RITUAL_PADRAO, barrasDaSemana, duracaoDoRitual, duracaoMin, horaDe, horaDeDeitar, horaDeDesligar,
  horasTexto, leituraDaNoite, leituraDoSono, lerHora, minutosDe, momentoDaNoite, noitesRecentes, resumoDoSono, variacaoDoHorario,
} from '../lib/sono.ts';

const perfil = { acordar: '07:00', horas: 8 };
const noite = (data, deitou, acordou, qualidade = 3) => ({ data, deitou, acordou, qualidade });

test('a hora é entendida do jeito que a pessoa digita', () => {
  assert.equal(lerHora('23'), '23:00');
  assert.equal(lerHora('23:30'), '23:30');
  assert.equal(lerHora('2330'), '23:30');
  assert.equal(lerHora('23h30'), '23:30');
  assert.equal(lerHora('7h'), '07:00');
  assert.equal(lerHora('730'), '07:30');
  assert.equal(lerHora(' 6:5 '), '06:50', 'um dígito de minuto é dezena');
  assert.equal(lerHora('24:00'), null);
  assert.equal(lerHora('12:60'), null);
  assert.equal(lerHora('abc'), null);
  assert.equal(lerHora(''), null);
});

test('a noite que cruza a meia-noite é contada inteira', () => {
  assert.equal(duracaoMin('23:30', '07:00'), 450);
  assert.equal(duracaoMin('01:00', '08:00'), 420);
  assert.equal(duracaoMin('22:00', '06:00'), 480);
  assert.equal(horasTexto(450), '7h30');
  assert.equal(horasTexto(480), '8h');
  assert.equal(horaDe(-30), '23:30', 'minutos negativos dão a volta no relógio');
  assert.equal(horaDe(minutosDe('23:45') + 30), '00:15');
});

test('a hora de deitar desconta o sono e o tempo de pegar no sono', () => {
  assert.equal(horaDeDeitar(perfil), '22:45', 'acordar 07:00 dormindo 8h, com 15 min para pegar no sono');
  assert.equal(horaDeDeitar({ acordar: '05:30', horas: 7 }), '22:15');
  assert.equal(horaDeDeitar({ acordar: '09:00', horas: 9 }), '23:45');
});

test('o ritual começa antes de deitar e nunca tem menos de meia hora sem tela', () => {
  const total = duracaoDoRitual(RITUAL_PADRAO);
  assert.equal(total, 25);
  assert.equal(horaDeDesligar(perfil, RITUAL_PADRAO), '22:15', 'ritual de 25 min vira 30');
  const longo = [...RITUAL_PADRAO, { id: 'ler', nome: 'Ler', minutos: 30 }];
  assert.equal(horaDeDesligar(perfil, longo), '21:50');
  assert.equal(horaDeDesligar(perfil, []), '22:15');
});

test('o momento da noite sabe quando é hora de desligar', () => {
  const m = (hhmm) => momentoDaNoite(minutosDe(hhmm), perfil, RITUAL_PADRAO);
  assert.deepEqual(m('15:00'), { fase: 'antes', minutos: 435 });
  assert.deepEqual(m('22:14'), { fase: 'antes', minutos: 1 });
  assert.deepEqual(m('22:15'), { fase: 'desligar', minutos: 30 });
  assert.deepEqual(m('22:44'), { fase: 'desligar', minutos: 1 });
  assert.deepEqual(m('22:45'), { fase: 'passou', minutos: 0 });
  assert.deepEqual(m('01:00'), { fase: 'passou', minutos: 135 });
  assert.equal(m('06:59').fase, 'passou');
  assert.equal(m('07:00').fase, 'antes', 'na hora de acordar começa um dia novo');
  // quem deita depois da meia-noite
  const coruja = { acordar: '10:00', horas: 8 };
  assert.equal(horaDeDeitar(coruja), '01:45');
  assert.equal(momentoDaNoite(minutosDe('01:30'), coruja, RITUAL_PADRAO).fase, 'desligar');
  assert.equal(momentoDaNoite(minutosDe('23:00'), coruja, RITUAL_PADRAO).fase, 'antes');
  assert.equal(momentoDaNoite(minutosDe('03:00'), coruja, RITUAL_PADRAO).fase, 'passou');
});

test('a leitura de uma noite usa a meta da pessoa e o mínimo de 7 horas', () => {
  assert.equal(leituraDaNoite(480, perfil), 'boa');
  assert.equal(leituraDaNoite(455, perfil), 'boa', 'até meia hora abaixo da meta ainda é boa');
  assert.equal(leituraDaNoite(430, perfil), 'quase', 'acima de 7h mas longe da meta');
  assert.equal(leituraDaNoite(360, perfil), 'curta');
  assert.equal(leituraDaNoite(600, perfil), 'longa');
  assert.equal(leituraDaNoite(410, { acordar: '07:00', horas: 7 }), 'boa', 'quem tem meta de 7h e dorme 6h50 está na meta');
});

test('o resumo da semana conta só os últimos 7 dias', () => {
  const noites = [
    noite('2026-11-27', '23:00', '07:00', 4), // 480
    noite('2026-11-26', '00:00', '06:00', 2), // 360
    noite('2026-11-21', '22:30', '07:00', 5), // 510, dentro (27-6 = 21)
    noite('2026-11-20', '22:00', '08:00', 5), // fora
  ];
  const r = resumoDoSono(noites, perfil, '2026-11-27');
  assert.equal(r.noites, 3);
  assert.equal(r.mediaMin, 450);
  assert.equal(r.naMeta, 2);
  assert.equal(r.dividaMin, 120, 'só a noite de 6h deve à meta de 8h');
  assert.equal(r.mediaQualidade, 3.7);
  assert.deepEqual(resumoDoSono([], perfil, '2026-11-27'), { noites: 0, mediaMin: 0, mediaQualidade: 0, naMeta: 0, dividaMin: 0 });
  assert.equal(noitesRecentes(noites, '2026-11-27', 7).length, 3);
  assert.equal(noitesRecentes(noites, '2026-11-27', 7)[0].data, '2026-11-27', 'a mais nova vem primeiro');

  const barras = barrasDaSemana(noites, '2026-11-27');
  assert.equal(barras.length, 7);
  assert.equal(barras[0].data, '2026-11-21');
  assert.equal(barras[6].minutos, 480);
  assert.equal(barras[1].minutos, null, 'dia sem anotação fica vazio');
});

test('a variação do horário trata 00:30 como mais tarde que 23:30', () => {
  assert.equal(variacaoDoHorario([noite('a', '23:30', '07:00'), noite('b', '00:30', '07:00')]), 30);
  assert.equal(variacaoDoHorario([noite('a', '23:00', '07:00'), noite('b', '23:00', '07:00')]), 0);
  assert.equal(variacaoDoHorario([noite('a', '23:00', '07:00')]), 0);
});

test('a leitura do sono só conclui com 3 noites e não usa palavra de bronca', () => {
  const pouco = leituraDoSono([noite('2026-11-27', '23:00', '07:00')], perfil, '2026-11-27');
  assert.equal(pouco.length, 1);
  assert.match(pouco[0].texto, /Faltam 2/);

  const curtas = ['2026-11-27', '2026-11-26', '2026-11-25', '2026-11-24'].map((d, i) => noite(d, i % 2 ? '03:00' : '00:00', '06:00', 2));
  const achados = leituraDoSono(curtas, perfil, '2026-11-27');
  assert.ok(achados.some((a) => a.tom === 'atencao' && /7 horas/.test(a.texto)), 'avisa que está abaixo de 7 horas');
  assert.ok(achados.some((a) => /muda muito/.test(a.titulo)), 'percebe o horário irregular');
  assert.ok(achados.some((a) => /a menos/.test(a.titulo)), 'mostra quanto sono faltou');

  const boas = ['2026-11-27', '2026-11-26', '2026-11-25'].map((d) => noite(d, '22:45', '07:00', 5));
  const bons = leituraDoSono(boas, perfil, '2026-11-27');
  assert.ok(bons.every((a) => a.tom === 'bom'));

  // noites boas começam mais cedo
  const mistas = [
    noite('2026-11-27', '22:30', '07:00', 5), noite('2026-11-26', '22:30', '07:00', 4),
    noite('2026-11-25', '00:30', '07:00', 1), noite('2026-11-24', '00:30', '07:00', 2),
  ];
  assert.ok(leituraDoSono(mistas, perfil, '2026-11-27').some((a) => /mais cedo/.test(a.titulo)));

  const proibidas = /pregui|burr|fracass|vergonha|culpa|irrespons|descontrol/i;
  for (const a of [...achados, ...bons, ...pouco]) assert.doesNotMatch(a.titulo + a.texto, proibidas);
  for (const d of DICAS_SONO) assert.doesNotMatch(d.titulo + d.texto, proibidas);
});

test('o grátis tem dicas e o aviso de procurar um médico existe', () => {
  assert.ok(DICAS_SONO.length > GRATIS_SONO.dicas, 'sobra dica para o Pro');
  assert.ok(GRATIS_SONO.dicas >= 2, 'o grátis não fica sem dica');
  assert.equal(new Set(DICAS_SONO.map((d) => d.id)).size, DICAS_SONO.length);
  assert.match(AVISO_SONO, /médico/);
  assert.equal(new Set(RITUAL_PADRAO.map((p) => p.id)).size, RITUAL_PADRAO.length);
});
