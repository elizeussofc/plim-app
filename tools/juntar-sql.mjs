// Junta as migrations em arquivos de colar no SQL Editor do Supabase:
//   supabase/BANCO-NOVO.sql        todas, para um projeto recém-criado (roda uma vez)
//   supabase/ATUALIZAR-BANCO.sql   da 005 em diante, para um banco que já existe (pode rodar de novo)
//   node tools/juntar-sql.mjs
import { readFileSync, writeFileSync } from 'node:fs';

/** As que criam o banco do zero e não podem rodar duas vezes. */
export const BASE = ['001_initial_schema', '003_ranking', '004_features'];
/** As que podem rodar mais de uma vez. Migration nova entra aqui. */
export const PARTES = ['005_profiles_extra_columns', '006_seguranca_plano_ia', '007_grupo', '008_liberacoes_do_app'];

const lerDoDisco = (nome) => readFileSync(new URL(`../supabase/migrations/${nome}.sql`, import.meta.url), 'utf8');
const numeros = (nomes) => nomes.map((n) => n.slice(0, 3)).join(', ');

function montar(titulo, aviso, nomes, ler) {
  const cabecalho = [
    '-- ============================================================',
    `-- PLIM — ${titulo} (cole este arquivo inteiro no SQL Editor do Supabase)`,
    `-- Junta as migrations ${numeros(nomes)}. ${aviso}`,
    '-- Arquivo gerado por tools/juntar-sql.mjs: não edite aqui, edite as migrations.',
    '-- ============================================================',
    '',
  ].join('\n');
  return cabecalho + nomes.map((nome) => `\n-- >>>>>>>>>> ${nome}.sql\n\n${ler(nome).replace(/\r\n/g, '\n').trimEnd()}\n`).join('');
}

/** Para um banco que já tem as três primeiras. */
export function juntar(ler = lerDoDisco) {
  return montar('atualizar o banco', 'Pode rodar mais de uma vez.', PARTES, ler);
}

/** Para um projeto recém-criado, vazio. */
export function juntarNovo(ler = lerDoDisco) {
  return montar('banco novo', 'Rode UMA vez, num projeto vazio. Depois use ATUALIZAR-BANCO.sql.', [...BASE, ...PARTES], ler);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  writeFileSync(new URL('../supabase/ATUALIZAR-BANCO.sql', import.meta.url), juntar());
  writeFileSync(new URL('../supabase/BANCO-NOVO.sql', import.meta.url), juntarNovo());
  console.log('gravados supabase/ATUALIZAR-BANCO.sql e supabase/BANCO-NOVO.sql');
}
