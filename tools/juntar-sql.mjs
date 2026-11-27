// Junta as migrations que ainda precisam ser coladas no Supabase num arquivo só:
// supabase/ATUALIZAR-BANCO.sql. As três podem rodar mais de uma vez sem quebrar nada.
//   node tools/juntar-sql.mjs
import { readFileSync, writeFileSync } from 'node:fs';

export const PARTES = ['005_profiles_extra_columns', '006_seguranca_plano_ia', '007_grupo'];

export function juntar(ler = (nome) => readFileSync(new URL(`../supabase/migrations/${nome}.sql`, import.meta.url), 'utf8')) {
  const cabecalho = [
    '-- ============================================================',
    '-- PLIM — atualizar o banco (cole este arquivo inteiro no SQL Editor do Supabase)',
    '-- Junta as migrations 005, 006 e 007. Pode rodar mais de uma vez.',
    '-- Arquivo gerado por tools/juntar-sql.mjs: não edite aqui, edite as migrations.',
    '-- ============================================================',
    '',
  ].join('\n');
  return cabecalho + PARTES.map((nome) => `\n-- >>>>>>>>>> ${nome}.sql\n\n${ler(nome).replace(/\r\n/g, '\n').trimEnd()}\n`).join('');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  writeFileSync(new URL('../supabase/ATUALIZAR-BANCO.sql', import.meta.url), juntar());
  console.log('gravado supabase/ATUALIZAR-BANCO.sql');
}
