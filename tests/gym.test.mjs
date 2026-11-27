// Regras do Gym Plim: o plano, a evolução treino a treino e a parte de alimentação.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { arredondarCarga, comecoSuave, ehSemanaLeve, montarPlano, proximoPasso, semanaDoPrograma, sugerirNivel, validarPerfil } from '../lib/gym.ts';
import { EXERCICIO_POR_ID, EXERCICIOS } from '../lib/gymExercicios.ts';
import { ALIMENTOS, avaliarPrato, metasNutri, posTreino, preTreino, proteinaDoPrato } from '../lib/gymNutri.ts';

const base = { peso: 78, altura: 176, idade: 31, experiencia: 'iniciante', dias: 3, minutos: 45, local: 'academia', objetivo: 'massa', cuidados: [] };

test('todo exercício tem imagem, passo a passo e um id só seu', () => {
  const ids = new Set();
  for (const e of EXERCICIOS) {
    assert.ok(!ids.has(e.id), `id repetido: ${e.id}`);
    ids.add(e.id);
    assert.ok(existsSync(new URL(`../assets/gym/${e.id}.webp`, import.meta.url)), `sem imagem: ${e.id}`);
    assert.ok(e.preparo.length >= 1 && e.execucao.length >= 2, `passo a passo curto: ${e.id}`);
    assert.ok(e.erros.length >= 1 && e.respiracao && e.dica && e.musculos, `explicação incompleta: ${e.id}`);
  }
  assert.ok(EXERCICIOS.length >= 30);
});

test('o plano respeita lugar, cuidados, tempo e nunca fica vazio, em todas as combinações', () => {
  const serve = { corpo: ['corpo'], halteres: ['corpo', 'halteres'], academia: ['corpo', 'halteres', 'academia'] };
  let planos = 0;
  for (const experiencia of ['iniciante', 'intermediario', 'avancado'])
    for (const local of ['academia', 'halteres', 'corpo'])
      for (const dias of [2, 3, 4, 5, 6])
        for (const minutos of [30, 45, 60, 75])
          for (const cuidados of [[], ['joelho'], ['ombro'], ['coluna'], ['joelho', 'ombro', 'coluna']])
            for (const semana of [1, 5, 8]) {
              const p = { ...base, experiencia, local, dias, minutos, cuidados };
              const plano = montarPlano(p, semana);
              planos++;
              const rotulo = `${experiencia}/${local}/${dias}d/${minutos}min/${cuidados.join('+') || 'sem cuidado'}/sem${semana}`;
              assert.ok(plano.dias.length >= 2 && plano.dias.length <= 6, rotulo);
              if (experiencia === 'iniciante') assert.ok(plano.dias.length <= 4, `iniciante com mais de 4 dias: ${rotulo}`);
              for (const d of plano.dias) {
                assert.ok(d.itens.length >= 3, `treino com menos de 3 exercícios: ${rotulo} ${d.nome}`);
                assert.ok(d.minutos <= minutos + 6, `treino de ${d.minutos} min num pedido de ${minutos}: ${rotulo} ${d.nome}`);
                const vistos = new Set();
                for (const i of d.itens) {
                  const e = EXERCICIO_POR_ID[i.exercicioId];
                  assert.ok(e, `exercício que não existe: ${i.exercicioId}`);
                  assert.ok(!vistos.has(e.id), `exercício repetido no mesmo treino: ${rotulo} ${e.id}`);
                  vistos.add(e.id);
                  assert.ok(serve[local].includes(e.local), `${e.id} não dá para fazer em "${local}": ${rotulo}`);
                  assert.ok(!(e.evitar ?? []).some((c) => cuidados.includes(c)), `${e.id} entrou para quem tem cuidado com ${cuidados}: ${rotulo}`);
                  assert.ok(i.series >= 1 && i.series <= 5 && i.min < i.max && i.descanso >= 30, `receita estranha em ${e.id}: ${rotulo}`);
                }
              }
            }
  assert.ok(planos > 2000);
});

test('o mesmo perfil na mesma semana dá sempre o mesmo plano', () => {
  assert.deepEqual(montarPlano(base, 3), montarPlano(base, 3));
});

test('iniciante começa com 2 séries e ganha volume depois; a 8ª semana é leve', () => {
  const series = (semana) => montarPlano({ ...base, minutos: 75 }, semana).dias[0].itens.reduce((s, i) => s + i.series, 0);
  assert.ok(montarPlano(base, 1).dias[0].itens.every((i) => i.series === 2));
  assert.ok(series(5) > series(1), 'o volume não cresceu da semana 1 para a 5');
  assert.ok(ehSemanaLeve(8) && ehSemanaLeve(16) && !ehSemanaLeve(1) && !ehSemanaLeve(7));
  assert.ok(montarPlano(base, 8).semanaLeve);
  assert.ok(series(8) < series(7), 'a semana leve não aliviou');
});

test('começo cuidadoso para quem tem 60 anos ou mais, ou IMC a partir de 30', () => {
  assert.equal(comecoSuave(base), false);
  assert.equal(comecoSuave({ ...base, idade: 64 }), true);
  assert.equal(comecoSuave({ ...base, peso: 105, altura: 170 }), true);
});

test('semana do programa conta a partir do dia em que a pessoa começou', () => {
  assert.equal(semanaDoPrograma('2026-11-27', '2026-11-27'), 1);
  assert.equal(semanaDoPrograma('2026-11-27', '2026-12-03'), 1);
  assert.equal(semanaDoPrograma('2026-11-27', '2026-12-04'), 2);
  assert.equal(semanaDoPrograma('2026-11-27', '2027-01-15'), 8);
  assert.equal(semanaDoPrograma('2026-11-27', '2026-11-20'), 1);
});

test('progressão dupla: sobe quando bate o topo, mantém no meio, baixa depois de dois treinos ruins', () => {
  const alvo = { min: 8, max: 12 };
  const dia = (carga, ...reps) => ({ data: '2026-11-27', series: reps.map((r) => ({ carga, reps: r })), ...alvo });

  assert.equal(proximoPasso([], alvo).tipo, 'primeira');

  const sobe = proximoPasso([dia(20, 12, 12, 12)], alvo);
  assert.equal(sobe.tipo, 'subir');
  assert.equal(sobe.carga, 21);
  assert.ok(proximoPasso([dia(4, 12, 12)], alvo).carga > 4, 'carga pequena também precisa subir');

  const mantem = proximoPasso([dia(20, 12, 10, 9)], alvo);
  assert.equal(mantem.tipo, 'manter');
  assert.equal(mantem.carga, 20);

  assert.equal(proximoPasso([dia(20, 7, 6)], alvo).tipo, 'manter', 'um treino ruim só não baixa a carga');
  const baixa = proximoPasso([dia(20, 7, 6), dia(20, 7, 5)], alvo);
  assert.equal(baixa.tipo, 'baixar');
  assert.equal(baixa.carga, 18);

  const semPeso = proximoPasso([dia(0, 12, 12)], alvo, true);
  assert.equal(semPeso.tipo, 'subir');
  assert.equal(semPeso.carga, undefined);
});

test('cargas arredondam para pesos que existem', () => {
  assert.equal(arredondarCarga(10.3), 10.5);
  assert.equal(arredondarCarga(31.4), 31);
  assert.equal(arredondarCarga(0.1), 0.5);
});

test('subir de nível só é sugerido depois de meses de constância', () => {
  assert.equal(sugerirNivel('iniciante', 6, 18), null);
  assert.equal(sugerirNivel('iniciante', 13, 10), null);
  assert.equal(sugerirNivel('iniciante', 13, 30), 'intermediario');
  assert.equal(sugerirNivel('avancado', 80, 300), null);
});

test('o formulário recusa menor de idade e medidas impossíveis', () => {
  assert.deepEqual(validarPerfil(base), []);
  assert.equal(validarPerfil({ ...base, idade: 16 }).length, 1);
  assert.equal(validarPerfil({ ...base, peso: 0, altura: 20 }).length, 2);
  assert.ok(validarPerfil({}).length >= 5);
});

test('metas de proteína e água saem do peso', () => {
  const m = metasNutri(78, 45);
  assert.equal(m.proteinaMin, 120); // 1,6 g por kg
  assert.equal(m.proteinaMax, 170); // 2,2 g por kg
  assert.ok(m.refeicaoMin >= 20 && m.refeicaoMax <= 40 && m.refeicaoMin < m.refeicaoMax);
  assert.ok(m.aguaMin >= 2300 && m.aguaMax <= 2750);
  assert.equal(m.aguaTreino, 400);
  const leve = metasNutri(48, 30);
  assert.ok(leve.refeicaoMin >= 20, 'refeição nunca pede menos de 20 g');
  const pesado = metasNutri(130, 60);
  assert.ok(pesado.refeicaoMax <= 40, 'refeição nunca pede mais de 40 g');
});

test('monte seu prato soma a proteína e avalia contra a faixa da refeição', () => {
  const m = metasNutri(78, 45);
  assert.equal(proteinaDoPrato({}), 0);
  assert.equal(proteinaDoPrato({ frango: 1, arroz: 2, feijao: 1 }), 32 + 6 + 5);
  assert.equal(proteinaDoPrato({ nao_existe: 3 }), 0);
  assert.equal(avaliarPrato(0, m), 'vazio');
  assert.equal(avaliarPrato(10, m), 'pouco');
  assert.equal(avaliarPrato(28, m), 'bom');
  assert.equal(avaliarPrato(80, m), 'sobrou');
  assert.ok(ALIMENTOS.some((a) => a.vegetal && a.proteina >= 7), 'precisa ter opção vegetal com proteína');
});

test('pré e pós-treino mudam conforme o tempo', () => {
  const m = metasNutri(78, 45);
  const titulos = new Set([180, 90, 40, 5].map((min) => preTreino(min).titulo));
  assert.equal(titulos.size, 4);
  assert.notEqual(posTreino(2, m).titulo, posTreino(5, m).titulo);
  assert.ok(posTreino(5, m).texto.includes(`${m.refeicaoMin} a ${m.refeicaoMax} g`));
});
