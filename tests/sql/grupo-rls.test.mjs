// Regras de segurança do Grupo, testadas num Postgres de verdade (PGlite) com a migração 007.
// O que o Supabase traz pronto (auth.uid, storage, papéis) é simulado no começo.
//   npm run test:sql
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';

const A = '11111111-1111-4111-8111-111111111111'; // grátis, dona dos posts
const B = '22222222-2222-4222-8222-222222222222'; // Pro
const C = '33333333-3333-4333-8333-333333333333'; // grátis

const SIMULACAO = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable
    as $$ select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to authenticated;
  grant select, insert, delete on storage.objects to authenticated;
  grant execute on function storage.foldername(text) to authenticated;

  grant usage on schema public to anon, authenticated;

  -- Como a migração 001 deixou profiles e posts_comunidade.
  create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text,
    plano text default 'free' check (plano in ('free', 'pro'))
  );
  alter table public.profiles enable row level security;
  create policy "Usuário lê próprio perfil" on public.profiles for select using (auth.uid() = id);
  create policy "Usuário atualiza próprio perfil" on public.profiles for update using (auth.uid() = id);
  grant select, insert, update on public.profiles to authenticated;

  create table public.posts_comunidade (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    tipo text not null check (tipo in ('conquista', 'desafio', 'texto')),
    conteudo text not null,
    imagem_url text,
    anonimo boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  alter table public.posts_comunidade enable row level security;
  create policy "Todos lêem posts públicos" on public.posts_comunidade for select using (true);
  create policy "Usuário insere próprios posts" on public.posts_comunidade for insert with check (auth.uid() = user_id);
  create policy "Usuário atualiza próprios posts" on public.posts_comunidade for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create policy "Usuário deleta próprios posts" on public.posts_comunidade for delete using (auth.uid() = user_id);
  grant select on public.posts_comunidade to anon;
`;

let db;

/** Roda SQL como uma pessoa logada (ou como visitante sem login, com quem = null). */
async function como(quem, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [quem ?? '']);
    await tx.exec(`set local role ${quem ? 'authenticated' : 'anon'}`);
    return tx.query(sql, params);
  });
}

const recusa = (promessa, motivo) => assert.rejects(promessa, (e) => { assert.match(String(e.message), motivo); return true; });
const POLITICA = /row-level security/;

before(async () => {
  db = new PGlite();
  await db.exec(SIMULACAO);
  const migracao = readFileSync(new URL('../../supabase/migrations/007_grupo.sql', import.meta.url), 'utf8');
  await db.exec(migracao);
  await db.exec(migracao); // rodar de novo não pode quebrar
  await db.exec(`
    insert into auth.users (id) values ('${A}'), ('${B}'), ('${C}');
    insert into public.profiles (id, email, plano) values ('${A}', 'a@x', 'free'), ('${B}', 'b@x', 'pro'), ('${C}', 'c@x', 'free');
  `);
});

after(async () => { await db?.close(); });

test('ninguém vira Pro gravando o próprio perfil', async () => {
  await como(A, `update public.profiles set plano = 'pro' where id = $1`, [A]);
  const { rows } = await db.query(`select plano from public.profiles where id = $1`, [A]);
  assert.equal(rows[0].plano, 'free');
});

test('cartão do Grupo: cada um cria e edita só o seu, e não expõe o e-mail', async () => {
  for (const [id, apelido] of [[A, 'Ana'], [B, 'Bia'], [C, 'Caio']]) {
    await como(id, `insert into public.grupo_perfis (user_id, apelido) values ($1, $2)`, [id, apelido]);
  }
  await recusa(como(C, `insert into public.grupo_perfis (user_id, apelido) values ($1, 'Falso')`, [A]), /row-level security|duplicate key/);
  const troca = await como(C, `update public.grupo_perfis set apelido = 'Invadido' where user_id = $1`, [A]);
  assert.equal(troca.affectedRows, 0);
  const lista = await como(C, `select apelido from public.grupo_perfis order by apelido`);
  assert.deepEqual(lista.rows.map((r) => r.apelido), ['Ana', 'Bia', 'Caio']);
  const perfis = await como(C, `select email from public.profiles`);
  assert.deepEqual(perfis.rows.map((r) => r.email), ['c@x'], 'profiles (com e-mail) continua fechado');
});

test('Instagram dos outros: só o Pro enxerga', async () => {
  await como(A, `insert into public.grupo_instagram (user_id, usuario) values ($1, 'ana.foco')`, [A]);
  const dona = await como(A, `select usuario from public.grupo_instagram where user_id = $1`, [A]);
  const gratis = await como(C, `select usuario from public.grupo_instagram where user_id = $1`, [A]);
  const pro = await como(B, `select usuario from public.grupo_instagram where user_id = $1`, [A]);
  assert.equal(dona.rows.length, 1);
  assert.equal(gratis.rows.length, 0, 'grátis não pode ver');
  assert.deepEqual(pro.rows, [{ usuario: 'ana.foco' }]);
  await recusa(como(C, `insert into public.grupo_instagram (user_id, usuario) values ($1, 'tem espaço')`, [C]), /check constraint/);
});

let postA;

test('post: só em nome próprio, sem endereço de fora e com imagem na própria pasta', async () => {
  const r = await como(A, `insert into public.posts_comunidade (user_id, tipo, conteudo, local, imagem_path) values ($1, 'texto', 'Rotina feita!', 'Praça da Sé', $2) returning id`, [A, `${A}/foto_1.jpg`]);
  postA = r.rows[0].id;
  await recusa(como(C, `insert into public.posts_comunidade (user_id, tipo, conteudo) values ($1, 'texto', 'oi')`, [A]), POLITICA);
  await recusa(como(C, `insert into public.posts_comunidade (user_id, tipo, conteudo, imagem_url) values ($1, 'texto', 'oi', 'https://fora.example/x.png')`, [C]), POLITICA);
  await recusa(como(C, `insert into public.posts_comunidade (user_id, tipo, conteudo, imagem_path) values ($1, 'texto', 'oi', $2)`, [C, `${A}/foto_1.jpg`]), POLITICA);
  await recusa(como(C, `insert into public.posts_comunidade (user_id, tipo, conteudo, imagem_path) values ($1, 'texto', 'oi', '../../etc/passwd')`, [C]), /row-level security|check constraint/);
  const apagou = await como(C, `delete from public.posts_comunidade where id = $1`, [postA]);
  assert.equal(apagou.affectedRows, 0, 'ninguém apaga post alheio');
});

test('quem não está logado não lê o Grupo', async () => {
  await recusa(como(null, `select * from public.grupo_perfis`), /permission denied/);
  // Antes o visitante recebia uma lista vazia (a regra por linha barrava). Agora a tabela nem abre para ele.
  await recusa(como(null, `select * from public.posts_comunidade`), /permission denied/);
});

test('comentário: grátis só no próprio post; Pro em qualquer um', async () => {
  await recusa(como(C, `insert into public.grupo_comentarios (post_id, user_id, texto) values ($1, $2, 'boa!')`, [postA, C]), POLITICA);
  const doPro = await como(B, `insert into public.grupo_comentarios (post_id, user_id, texto) values ($1, $2, 'Que orgulho!') returning id`, [postA, B]);
  await como(A, `insert into public.grupo_comentarios (post_id, user_id, texto) values ($1, $2, 'Obrigada!')`, [postA, A]);
  await recusa(como(B, `insert into public.grupo_comentarios (post_id, user_id, texto) values ($1, $2, 'em nome dela')`, [postA, A]), POLITICA);
  await recusa(como(B, `insert into public.grupo_comentarios (post_id, user_id, texto) values ($1, $2, '   ')`, [postA, B]), /check constraint/);

  const lidos = await como(C, `select texto from public.grupo_comentarios where post_id = $1 order by criado_em`, [postA]);
  assert.equal(lidos.rows.length, 2, 'ler comentário todo mundo pode');

  const alheio = await como(C, `delete from public.grupo_comentarios where id = $1`, [doPro.rows[0].id]);
  assert.equal(alheio.affectedRows, 0);
  const dona = await como(A, `delete from public.grupo_comentarios where id = $1`, [doPro.rows[0].id]);
  assert.equal(dona.affectedRows, 1, 'a dona do post pode apagar comentário no post dela');
});

test('reação: uma por pessoa, com emoji da lista, em nome próprio', async () => {
  await como(C, `insert into public.grupo_reacoes (post_id, user_id, emoji) values ($1, $2, '🔥')`, [postA, C]);
  await como(B, `insert into public.grupo_reacoes (post_id, user_id, emoji) values ($1, $2, '👏')`, [postA, B]);
  await recusa(como(C, `insert into public.grupo_reacoes (post_id, user_id, emoji) values ($1, $2, '🎉')`, [postA, C]), /duplicate key/);
  await como(C, `update public.grupo_reacoes set emoji = '🎉' where post_id = $1 and user_id = $2`, [postA, C]);
  await recusa(como(C, `update public.grupo_reacoes set emoji = 'xingo' where post_id = $1 and user_id = $2`, [postA, C]), /check constraint/);
  const invasao = await como(C, `update public.grupo_reacoes set emoji = '😢' where post_id = $1 and user_id = $2`, [postA, B]);
  assert.equal(invasao.affectedRows, 0);
  await recusa(como(C, `insert into public.grupo_reacoes (post_id, user_id, emoji) values ($1, $2, '💜')`, [postA, A]), POLITICA);
  const { rows } = await como(A, `select emoji from public.grupo_reacoes where post_id = $1 order by emoji`, [postA]);
  assert.deepEqual(rows.map((r) => r.emoji).sort(), ['🎉', '👏'].sort());
});

test('story: dura 24 horas contadas pelo servidor e precisa de foto ou texto', async () => {
  const r = await como(A, `insert into public.grupo_stories (user_id, texto, expira_em) values ($1, 'Treino feito', now() + interval '10 years') returning id, expira_em - criado_em as duracao`, [A]);
  assert.match(String(r.rows[0].duracao), /24:00:00|1 day/);
  await recusa(como(A, `insert into public.grupo_stories (user_id, texto) values ($1, '  ')`, [A]), /check constraint/);
  await recusa(como(C, `insert into public.grupo_stories (user_id, texto) values ($1, 'falso')`, [A]), POLITICA);
  await recusa(como(C, `insert into public.grupo_stories (user_id, imagem_path) values ($1, $2)`, [C, `${A}/roubada.jpg`]), POLITICA);

  assert.equal((await como(C, `select id from public.grupo_stories`)).rows.length, 1);
  await db.query(`update public.grupo_stories set expira_em = now() - interval '1 minute' where id = $1`, [r.rows[0].id]);
  assert.equal((await como(C, `select id from public.grupo_stories`)).rows.length, 0, 'story vencido some para os outros');
  assert.equal((await como(A, `select id from public.grupo_stories`)).rows.length, 1, 'a dona ainda vê, para poder limpar');
});

test('visitas ao perfil: o grátis vê só o número; a lista é do Pro', async () => {
  await como(C, `insert into public.grupo_visitas (perfil_id, visitante_id) values ($1, $2)`, [A, C]);
  await como(B, `insert into public.grupo_visitas (perfil_id, visitante_id) values ($1, $2)`, [A, B]);
  await como(C, `insert into public.grupo_visitas (perfil_id, visitante_id) values ($1, $2)`, [B, C]);
  await recusa(como(C, `insert into public.grupo_visitas (perfil_id, visitante_id) values ($1, $2)`, [C, C]), /check constraint/);
  await recusa(como(C, `insert into public.grupo_visitas (perfil_id, visitante_id) values ($1, $2)`, [A, B]), POLITICA);

  const gratis = await como(A, `select visitante_id from public.grupo_visitas where perfil_id = $1`, [A]);
  assert.equal(gratis.rows.length, 0, 'grátis não vê quem visitou');
  const total = await como(A, `select public.grupo_total_visitas() as n`);
  assert.equal(total.rows[0].n, 2, 'mas vê quantas pessoas foram');

  const pro = await como(B, `select visitante_id from public.grupo_visitas where perfil_id = $1`, [B]);
  assert.deepEqual(pro.rows, [{ visitante_id: C }]);
  const alheias = await como(B, `select visitante_id from public.grupo_visitas where perfil_id = $1`, [A]);
  assert.deepEqual(alheias.rows, [{ visitante_id: B }], 'do perfil dos outros, o Pro só vê a própria visita');
  assert.equal((await como(null, `select 1`)).rows.length, 1);
  await recusa(como(null, `select public.grupo_total_visitas()`), /permission denied/);
});

test('modo discreto: não deixa rastro e também não vê quem visitou', async () => {
  await como(B, `update public.grupo_perfis set discreto = true where user_id = $1`, [B]);
  await recusa(como(B, `insert into public.grupo_visitas (perfil_id, visitante_id, dia) values ($1, $2, current_date + 1)`, [C, B]), POLITICA);
  const lista = await como(B, `select visitante_id from public.grupo_visitas where perfil_id = $1`, [B]);
  assert.equal(lista.rows.length, 0);
  await como(B, `update public.grupo_perfis set discreto = false where user_id = $1`, [B]);
});

test('denúncia: qualquer pessoa logada envia, ninguém do app lê', async () => {
  await como(C, `insert into public.grupo_denuncias (autor_id, alvo_tipo, alvo_id, motivo) values ($1, 'post', $2, 'ofensa')`, [C, postA]);
  await recusa(como(C, `insert into public.grupo_denuncias (autor_id, alvo_tipo, alvo_id) values ($1, 'post', $2)`, [A, postA]), POLITICA);
  await recusa(como(C, `select * from public.grupo_denuncias`), /permission denied/);
});

test('imagens: cada um envia e apaga só na própria pasta', async () => {
  await como(A, `insert into storage.objects (bucket_id, name) values ('grupo', $1)`, [`${A}/foto_1.jpg`]);
  await recusa(como(C, `insert into storage.objects (bucket_id, name) values ('grupo', $1)`, [`${A}/invasao.jpg`]), POLITICA);
  const apagou = await como(C, `delete from storage.objects where name = $1`, [`${A}/foto_1.jpg`]);
  assert.equal(apagou.affectedRows, 0);
  const balde = await db.query(`select public, file_size_limit from storage.buckets where id = 'grupo'`);
  assert.deepEqual(balde.rows, [{ public: true, file_size_limit: 3145728 }]);
});

test('sair do Grupo: cada um apaga só o próprio cartão e o próprio rastro', async () => {
  const alheio = await como(C, `delete from public.grupo_perfis where user_id = $1`, [A]);
  assert.equal(alheio.affectedRows, 0);
  const visitasAlheias = await como(C, `delete from public.grupo_visitas where perfil_id = $1 and visitante_id = $2`, [A, B]);
  assert.equal(visitasAlheias.affectedRows, 0);
  const minhas = await como(C, `delete from public.grupo_visitas where visitante_id = $1`, [C]);
  assert.equal(minhas.affectedRows, 2);
  const cartao = await como(C, `delete from public.grupo_perfis where user_id = $1`, [C]);
  assert.equal(cartao.affectedRows, 1);
  await como(C, `insert into public.grupo_perfis (user_id, apelido) values ($1, 'Caio')`, [C]);
});

test('apagar o post leva junto comentários e reações', async () => {
  await como(A, `delete from public.posts_comunidade where id = $1`, [postA]);
  const sobras = await db.query(`select (select count(*) from public.grupo_comentarios)::int as c, (select count(*) from public.grupo_reacoes)::int as r`);
  assert.deepEqual(sobras.rows, [{ c: 0, r: 0 }]);
});
