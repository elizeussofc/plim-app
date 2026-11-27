// As migrations do Plim rodadas em ordem, do zero, num Postgres de verdade (PGlite).
// Existe porque a 005 ficou meses com um comando que o Postgres recusa e ninguém viu:
// o arquivo inteiro falhava e as colunas que o app grava no perfil nunca eram criadas.
//   npm run test:sql
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { PARTES, juntar } from '../../tools/juntar-sql.mjs';

// O que o Supabase traz pronto e as migrations usam.
const SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to authenticated;
  grant usage on schema public to anon, authenticated;
  create publication supabase_realtime;
`;

const pasta = new URL('../../supabase/migrations/', import.meta.url);
const ler = (nome) => readFileSync(new URL(`${nome}.sql`, pasta), 'utf8');
const TODAS = readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort().map((f) => f.replace(/\.sql$/, ''));
/** Como o SQL Editor do Supabase: o arquivo inteiro numa transação. */
const colar = (db, sql) => db.exec(`begin;\n${sql}\ncommit;`);

let db;
before(async () => {
  db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(SUPABASE);
});
after(async () => { await db?.close(); });

test('todas as migrations rodam em ordem num banco novo', async () => {
  for (const nome of TODAS) {
    await assert.doesNotReject(colar(db, ler(nome)), `a migration ${nome} falhou`);
  }
});

test('o perfil tem todas as colunas que o app grava', async () => {
  const { rows } = await db.query(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles'`);
  const colunas = rows.map((r) => r.column_name);
  // As mesmas do upsert em stores/userStore.ts.
  for (const c of ['id', 'nome', 'apelido', 'bio', 'instagram', 'email', 'xp_total', 'nivel', 'moedas', 'streak', 'avatar_emoji', 'avatar_config', 'conquistas', 'preferencias', 'plano']) {
    assert.ok(colunas.includes(c), `falta a coluna ${c} em profiles`);
  }
});

test('toda tabela do app tem a tranca por linha ligada (RLS)', async () => {
  const { rows } = await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
  assert.deepEqual(rows.map((r) => r.relname), []);
});

test('o arquivo de colar é a junção das migrations que faltam, e pode rodar de novo', async () => {
  const noDisco = readFileSync(new URL('../../supabase/ATUALIZAR-BANCO.sql', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(noDisco, juntar(), 'rode: node tools/juntar-sql.mjs');
  assert.deepEqual(PARTES, TODAS.filter((n) => n >= '005'), 'migration nova precisa entrar em tools/juntar-sql.mjs');
  await assert.doesNotReject(colar(db, noDisco), 'falhou num banco que já estava atualizado');
  await assert.doesNotReject(colar(db, noDisco), 'falhou na segunda vez');
});
