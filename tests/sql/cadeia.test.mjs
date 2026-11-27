// As migrations do Plim rodadas em ordem, do zero, num Postgres de verdade (PGlite).
// Existe porque a 005 ficou meses com um comando que o Postgres recusa e ninguém viu:
// o arquivo inteiro falhava e as colunas que o app grava no perfil nunca eram criadas.
//   npm run test:sql
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { BASE, PARTES, juntar, juntarNovo } from '../../tools/juntar-sql.mjs';

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
  grant usage on schema public to anon, authenticated, service_role;
  create publication supabase_realtime;
`;

// Projeto do Supabase com "Automatically expose new tables" ligado (o padrão até 30/05/2026):
// toda tabela nova do public nasce liberada para o app.
const EXPOR_TUDO = `
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`;

const pasta = new URL('../../supabase/migrations/', import.meta.url);
const ler = (nome) => readFileSync(new URL(`${nome}.sql`, pasta), 'utf8');
const lerColavel = (nome) => readFileSync(new URL(`../../supabase/${nome}.sql`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const TODAS = readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort().map((f) => f.replace(/\.sql$/, ''));
/** Como o SQL Editor do Supabase: o arquivo inteiro numa transação. */
const colar = (db, sql) => db.exec(`begin;\n${sql}\ncommit;`);

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

/** Roda SQL como uma pessoa logada, como visitante (null) ou como o servidor ('servidor'). */
async function como(db, quem, sql, params = []) {
  return db.transaction(async (tx) => {
    const logada = quem && quem !== 'servidor';
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [logada ? quem : '']);
    await tx.exec(`set local role ${quem === 'servidor' ? 'service_role' : logada ? 'authenticated' : 'anon'}`);
    return tx.query(sql, params);
  });
}

/** O que anon e authenticated conseguem em cada tabela do public: { tabela: { anon: 'SELECT', ... } }. */
async function liberacoes(db) {
  const { rows } = await db.query(`
    select c.relname as tabela, r.papel, string_agg(p.priv, ',' order by p.ordem) as privs
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated')) r(papel)
    cross join (values (1, 'SELECT'), (2, 'INSERT'), (3, 'UPDATE'), (4, 'DELETE'), (5, 'TRUNCATE'), (6, 'REFERENCES'), (7, 'TRIGGER')) p(ordem, priv)
    where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege(r.papel, c.oid, p.priv)
    group by c.relname, r.papel`);
  const mapa = {};
  for (const r of rows) (mapa[r.tabela] ??= {})[r.papel] = r.privs;
  return mapa;
}

// O que o app usa fora do Grupo. Tabela nova que o app passe a usar entra aqui e na 008.
const DO_APP = {
  profiles: { authenticated: 'SELECT,INSERT,UPDATE' },
  ranking_scores: { anon: 'SELECT', authenticated: 'SELECT,INSERT,UPDATE' },
  parceiros: { authenticated: 'SELECT,INSERT,UPDATE,DELETE' },
  ia_uso: { authenticated: 'SELECT' },
};
// O que a 007 libera para o Grupo.
const DO_GRUPO = {
  grupo_perfis: { authenticated: 'SELECT,INSERT,UPDATE,DELETE' },
  grupo_instagram: { authenticated: 'SELECT,INSERT,UPDATE,DELETE' },
  posts_comunidade: { authenticated: 'SELECT,INSERT,UPDATE,DELETE' },
  grupo_reacoes: { authenticated: 'SELECT,INSERT,UPDATE,DELETE' },
  grupo_comentarios: { authenticated: 'SELECT,INSERT,DELETE' },
  grupo_stories: { authenticated: 'SELECT,INSERT,DELETE' },
  grupo_visitas: { authenticated: 'SELECT,INSERT,DELETE' },
  grupo_denuncias: { authenticated: 'INSERT' },
};

let db; // projeto novo de hoje: nada é liberado sozinho
let dbAberto; // projeto com tudo liberado sozinho, montado com o BANCO-NOVO.sql
before(async () => {
  db = new PGlite({ extensions: { uuid_ossp } });
  await db.exec(SUPABASE);
  dbAberto = new PGlite({ extensions: { uuid_ossp } });
  await dbAberto.exec(SUPABASE + EXPOR_TUDO);
});
after(async () => { await db?.close(); await dbAberto?.close(); });

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

test('os arquivos de colar são a junção das migrations', async () => {
  assert.equal(lerColavel('ATUALIZAR-BANCO'), juntar(), 'rode: node tools/juntar-sql.mjs');
  assert.equal(lerColavel('BANCO-NOVO'), juntarNovo(), 'rode: node tools/juntar-sql.mjs');
  assert.deepEqual([...BASE, ...PARTES], TODAS, 'migration nova precisa entrar em tools/juntar-sql.mjs');
});

test('o BANCO-NOVO roda num projeto vazio, e o ATUALIZAR-BANCO pode rodar depois quantas vezes for', async () => {
  await assert.doesNotReject(colar(dbAberto, lerColavel('BANCO-NOVO')), 'BANCO-NOVO falhou num projeto vazio');
  for (const banco of [db, dbAberto]) {
    await assert.doesNotReject(colar(banco, lerColavel('ATUALIZAR-BANCO')), 'falhou num banco que já estava atualizado');
    await assert.doesNotReject(colar(banco, lerColavel('ATUALIZAR-BANCO')), 'falhou na segunda vez');
  }
});

test('num projeto novo, o app só alcança as tabelas que usa, e só com o necessário', async () => {
  assert.deepEqual(await liberacoes(db), { ...DO_APP, ...DO_GRUPO });
});

test('num projeto que libera tudo sozinho, o resultado é o mesmo: fecha o que o app não usa', async () => {
  assert.deepEqual(await liberacoes(dbAberto), { ...DO_APP, ...DO_GRUPO });
});

test('uma pessoa logada grava e lê o próprio perfil, e não vira Pro sozinha', async () => {
  for (const banco of [db, dbAberto]) {
    await banco.query(`insert into auth.users (id, email) values ($1, 'a@teste.dev'), ($2, 'b@teste.dev')`, [A, B]);
    // O mesmo upsert de stores/userStore.ts, com um "plano" que o app não deveria mandar.
    const gravar = `
      insert into public.profiles (id, nome, apelido, bio, instagram, email, xp_total, nivel, moedas, streak, avatar_emoji, avatar_config, conquistas, preferencias, plano)
      values ($1, 'Ana', 'ana', 'oi', '@ana', 'a@teste.dev', 120, 2, 30, 4, '⚡', '{"cabelo":"coque"}', '[]', '{}', 'pro')
      on conflict (id) do update set nome = excluded.nome, xp_total = excluded.xp_total, streak = excluded.streak, avatar_config = excluded.avatar_config, plano = excluded.plano`;
    await assert.doesNotReject(como(banco, A, gravar, [A]), 'o app não conseguiu gravar o perfil');

    const meu = await como(banco, A, `select nome, xp_total, streak, plano from public.profiles where id = $1`, [A]);
    assert.deepEqual(meu.rows, [{ nome: 'Ana', xp_total: 120, streak: 4, plano: 'free' }]);

    const alheio = await como(banco, A, `select id from public.profiles where id = $1`, [B]);
    assert.equal(alheio.rows.length, 0, 'uma pessoa leu o perfil de outra');
    const invadir = await como(banco, A, `update public.profiles set nome = 'invadido' where id = $1 returning id`, [B]);
    assert.equal(invadir.rows.length, 0, 'uma pessoa alterou o perfil de outra');
    await assert.rejects(como(banco, A, `delete from public.profiles where id = $1`, [A]), /permission denied/);
    await assert.rejects(como(banco, null, `select id from public.profiles`), /permission denied/);

    // Só o servidor (webhook de pagamento) muda o plano.
    await como(banco, 'servidor', `update public.profiles set plano = 'pro' where id = $1`, [A]);
    const depois = await como(banco, A, `select plano from public.profiles where id = $1`, [A]);
    assert.equal(depois.rows[0].plano, 'pro');
  }
});

test('ranking aberto para leitura, parceiro só para quem tem conta, o resto fechado', async () => {
  for (const banco of [db, dbAberto]) {
    await como(banco, A, `insert into public.ranking_scores (user_id, nome_exibido, pontos) values ($1, 'Ana', 50) on conflict (user_id) do update set pontos = excluded.pontos`, [A]);
    const visitante = await como(banco, null, `select nome_exibido, pontos from public.ranking_scores`);
    assert.deepEqual(visitante.rows, [{ nome_exibido: 'Ana', pontos: 50 }]);
    await assert.rejects(como(banco, B, `insert into public.ranking_scores (user_id, nome_exibido, pontos) values ($1, 'Falsa', 999)`, [A]), /row-level security/);
    await assert.rejects(como(banco, null, `insert into public.ranking_scores (user_id, nome_exibido) values ($1, 'x')`, [B]), /permission denied/);

    await como(banco, A, `insert into public.parceiros (user_id, parceiro_id) values ($1, $2) on conflict (user_id) do update set parceiro_id = excluded.parceiro_id`, [A, B]);
    const par = await como(banco, A, `select parceiro_id from public.parceiros where user_id = $1`, [A]);
    assert.equal(par.rows[0].parceiro_id, B);
    await assert.rejects(como(banco, null, `select * from public.parceiros`), /permission denied/);
    await como(banco, A, `delete from public.parceiros where user_id = $1`, [A]);

    // Tabelas que o app não usa: nem logado alcança.
    for (const tabela of ['tarefas', 'assinaturas', 'humor_diario', 'ia_conversas']) {
      await assert.rejects(como(banco, A, `select * from public.${tabela}`), /permission denied/, `${tabela} deveria estar fechada`);
    }
    // O contador da IA: a pessoa lê o próprio, só o servidor soma.
    await assert.rejects(como(banco, A, `select public.ia_registrar_uso($1, 10)`, [A]), /permission denied/);
    const uso = await como(banco, 'servidor', `select public.ia_registrar_uso($1, 10) as total`, [A]);
    assert.equal(uso.rows[0].total, 1);
    const meuUso = await como(banco, A, `select total from public.ia_uso`);
    assert.deepEqual(meuUso.rows, [{ total: 1 }]);
    await assert.rejects(como(banco, A, `update public.ia_uso set total = 0`), /permission denied/);
  }
});
