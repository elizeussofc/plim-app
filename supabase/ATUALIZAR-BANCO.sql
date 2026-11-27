-- ============================================================
-- PLIM — atualizar o banco (cole este arquivo inteiro no SQL Editor do Supabase)
-- Junta as migrations 005, 006, 007, 008. Pode rodar mais de uma vez.
-- Arquivo gerado por tools/juntar-sql.mjs: não edite aqui, edite as migrations.
-- ============================================================

-- >>>>>>>>>> 005_profiles_extra_columns.sql

-- ============================================================
-- PLIM — Adiciona colunas faltando em profiles
-- ============================================================

alter table public.profiles
  add column if not exists streak       integer default 0,
  add column if not exists conquistas   jsonb   default '[]'::jsonb,
  add column if not exists bio          text,
  add column if not exists instagram    text,
  add column if not exists avatar_emoji text    default '⚡';

-- Política de leitura para o painel admin (service_role já bypassa RLS,
-- mas garantimos que admins autenticados também possam ler todos os perfis)
-- (O Postgres não aceita "create policy if not exists": o arquivo inteiro falhava aqui
-- e as colunas acima nunca eram criadas. Apagar e criar de novo dá no mesmo e pode repetir.)
drop policy if exists "Admin lê todos os perfis" on public.profiles;
create policy "Admin lê todos os perfis"
  on public.profiles for select
  using (auth.jwt() ->> 'role' = 'admin');

-- >>>>>>>>>> 006_seguranca_plano_ia.sql

-- ============================================================
-- PLIM — Segurança: plano Pro e uso da IA
-- Rodar no SQL Editor do Supabase (uma vez).
-- ============================================================

-- ------------------------------------------------------------
-- 1) O app NÃO pode mais definir o próprio plano.
--    Antes, qualquer usuário logado conseguia gravar plano = 'pro'
--    no próprio perfil. Agora só o servidor (service_role / webhooks)
--    altera essa coluna. Tentativas do app são ignoradas em silêncio,
--    para não quebrar versões antigas que ainda enviam o campo.
-- ------------------------------------------------------------
create or replace function public.proteger_plano()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.plano := 'free';
    else
      new.plano := old.plano;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_plano on public.profiles;
create trigger trg_proteger_plano
  before insert or update on public.profiles
  for each row execute function public.proteger_plano();

-- ------------------------------------------------------------
-- 2) Contador diário de mensagens da Plim IA (limite por plano).
--    Só o servidor escreve; o usuário pode ler o próprio uso.
-- ------------------------------------------------------------
create table if not exists public.ia_uso (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia     date not null,
  total   integer not null default 0,
  primary key (user_id, dia)
);

alter table public.ia_uso enable row level security;

drop policy if exists "Usuário lê próprio uso da IA" on public.ia_uso;
create policy "Usuário lê próprio uso da IA"
  on public.ia_uso for select
  using (auth.uid() = user_id);

-- Soma 1 ao uso de hoje (fuso de São Paulo) se ainda estiver abaixo do limite.
-- Retorna o novo total, ou -1 se o limite do dia já foi atingido.
create or replace function public.ia_registrar_uso(p_user uuid, p_limite integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_total integer;
begin
  insert into public.ia_uso as u (user_id, dia, total)
  values (p_user, v_dia, 1)
  on conflict (user_id, dia) do update
    set total = u.total + 1
    where u.total < p_limite
  returning u.total into v_total;

  if v_total is null or v_total > p_limite then
    return -1;
  end if;
  return v_total;
end;
$$;

revoke all on function public.ia_registrar_uso(uuid, integer) from public, anon, authenticated;
grant execute on function public.ia_registrar_uso(uuid, integer) to service_role;

-- >>>>>>>>>> 007_grupo.sql

-- ============================================================
-- PLIM — Grupo: posts com foto e lugar, stories de 24 h, comentários,
-- reações com emoji, visitas ao perfil e Instagram.
--
-- Rodar no SQL Editor do Supabase (uma vez). Pode rodar de novo sem quebrar.
--
-- Regras que ficam no servidor (o app sozinho não consegue burlar):
--   * comentar em post de outra pessoa: só quem assina o Pro;
--   * ver o Instagram de outra pessoa: só quem assina o Pro;
--   * ver quem visitou o seu perfil: só quem assina o Pro;
--   * cada um só publica, apaga e envia imagem em nome próprio.
-- ============================================================

-- ------------------------------------------------------------
-- 0) O plano Pro não pode ser gravado pelo app (mesma trava da 006,
--    repetida aqui porque as regras abaixo dependem dela).
-- ------------------------------------------------------------
create or replace function public.proteger_plano()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.plano := 'free';
    else
      new.plano := old.plano;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_plano on public.profiles;
create trigger trg_proteger_plano
  before insert or update on public.profiles
  for each row execute function public.proteger_plano();

-- ------------------------------------------------------------
-- 1) Funções de apoio, fora do alcance da API (schema private).
-- ------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated;

-- Quem está logado assina o Pro? Lê só a própria linha de profiles.
create or replace function private.sou_pro()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.plano = 'pro'
  );
$$;

revoke all on function private.sou_pro() from public, anon;
grant execute on function private.sou_pro() to authenticated;

-- ------------------------------------------------------------
-- 2) Cartão público de cada pessoa no Grupo.
--    profiles continua fechado (tem e-mail); aqui fica só o que
--    a pessoa aceita mostrar: apelido, bio e o boneco.
-- ------------------------------------------------------------
create table if not exists public.grupo_perfis (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  apelido       text not null check (char_length(btrim(apelido)) between 1 and 30),
  bio           text check (bio is null or char_length(bio) <= 160),
  avatar        jsonb not null default '{}'::jsonb check (pg_column_size(avatar) < 2000),
  -- Modo discreto: as visitas desta pessoa não ficam registradas,
  -- e ela também não vê quem a visitou.
  discreto      boolean not null default false,
  atualizado_em timestamptz not null default now()
);

alter table public.grupo_perfis enable row level security;
revoke all on table public.grupo_perfis from anon, authenticated;
grant select, insert, update, delete on table public.grupo_perfis to authenticated;
grant all on table public.grupo_perfis to service_role;

drop policy if exists "grupo_perfis: logado lê" on public.grupo_perfis;
create policy "grupo_perfis: logado lê"
  on public.grupo_perfis for select to authenticated
  using (true);

drop policy if exists "grupo_perfis: cada um cria o seu" on public.grupo_perfis;
create policy "grupo_perfis: cada um cria o seu"
  on public.grupo_perfis for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "grupo_perfis: cada um edita o seu" on public.grupo_perfis;
create policy "grupo_perfis: cada um edita o seu"
  on public.grupo_perfis for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sair do Grupo: a pessoa apaga o próprio cartão quando quiser.
drop policy if exists "grupo_perfis: cada um apaga o seu" on public.grupo_perfis;
create policy "grupo_perfis: cada um apaga o seu"
  on public.grupo_perfis for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Quem está em modo discreto? (usada nas regras de visita)
create or replace function private.sou_discreto()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.grupo_perfis g
    where g.user_id = (select auth.uid()) and g.discreto
  );
$$;

revoke all on function private.sou_discreto() from public, anon;
grant execute on function private.sou_discreto() to authenticated;

-- ------------------------------------------------------------
-- 3) Instagram: tabela separada, porque só o Pro enxerga o dos outros.
-- ------------------------------------------------------------
create table if not exists public.grupo_instagram (
  user_id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null check (usuario ~ '^[A-Za-z0-9._]{1,30}$')
);

alter table public.grupo_instagram enable row level security;
revoke all on table public.grupo_instagram from anon, authenticated;
grant select, insert, update, delete on table public.grupo_instagram to authenticated;
grant all on table public.grupo_instagram to service_role;

drop policy if exists "grupo_instagram: o dono e quem é Pro leem" on public.grupo_instagram;
create policy "grupo_instagram: o dono e quem é Pro leem"
  on public.grupo_instagram for select to authenticated
  using ((select auth.uid()) = user_id or (select private.sou_pro()));

drop policy if exists "grupo_instagram: cada um cria o seu" on public.grupo_instagram;
create policy "grupo_instagram: cada um cria o seu"
  on public.grupo_instagram for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "grupo_instagram: cada um edita o seu" on public.grupo_instagram;
create policy "grupo_instagram: cada um edita o seu"
  on public.grupo_instagram for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "grupo_instagram: cada um apaga o seu" on public.grupo_instagram;
create policy "grupo_instagram: cada um apaga o seu"
  on public.grupo_instagram for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 4) Posts: ganham lugar e imagem guardada no próprio Plim.
--    imagem_path é o caminho dentro do balde "grupo" (pasta = id de quem enviou).
--    imagem_url (endereço de fora) deixa de ser aceito: evita imagem
--    hospedada em site alheio rastreando quem abre o Grupo.
-- ------------------------------------------------------------
alter table public.posts_comunidade
  add column if not exists local text,
  add column if not exists imagem_path text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'posts_comunidade_tamanho') then
    alter table public.posts_comunidade
      add constraint posts_comunidade_tamanho check (char_length(conteudo) <= 1000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'posts_comunidade_local') then
    alter table public.posts_comunidade
      add constraint posts_comunidade_local check (local is null or char_length(local) <= 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'posts_comunidade_imagem_path') then
    alter table public.posts_comunidade
      add constraint posts_comunidade_imagem_path
      check (imagem_path is null or imagem_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(jpg|webp|png)$');
  end if;
end $$;

create index if not exists posts_comunidade_recentes on public.posts_comunidade (created_at desc);
create index if not exists posts_comunidade_autor on public.posts_comunidade (user_id, created_at desc);

revoke all on table public.posts_comunidade from anon, authenticated;
grant select, insert, update, delete on table public.posts_comunidade to authenticated;

drop policy if exists "Todos lêem posts públicos" on public.posts_comunidade;
drop policy if exists "posts: logado lê" on public.posts_comunidade;
create policy "posts: logado lê"
  on public.posts_comunidade for select to authenticated
  using (true);

drop policy if exists "Usuário insere próprios posts" on public.posts_comunidade;
drop policy if exists "posts: cada um publica o seu" on public.posts_comunidade;
create policy "posts: cada um publica o seu"
  on public.posts_comunidade for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and imagem_url is null
    and (imagem_path is null or split_part(imagem_path, '/', 1) = (select auth.uid())::text)
  );

drop policy if exists "Usuário atualiza próprios posts" on public.posts_comunidade;
drop policy if exists "posts: cada um edita o seu" on public.posts_comunidade;
create policy "posts: cada um edita o seu"
  on public.posts_comunidade for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and imagem_url is null
    and (imagem_path is null or split_part(imagem_path, '/', 1) = (select auth.uid())::text)
  );

drop policy if exists "Usuário deleta próprios posts" on public.posts_comunidade;
drop policy if exists "posts: cada um apaga o seu" on public.posts_comunidade;
create policy "posts: cada um apaga o seu"
  on public.posts_comunidade for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 5) Reações: uma por pessoa em cada post, com o emoji que ela escolher.
--    A lista é fechada para ninguém usar o campo como recado.
-- ------------------------------------------------------------
create table if not exists public.grupo_reacoes (
  post_id   uuid not null references public.posts_comunidade (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  emoji     text not null check (emoji in (
    '💜','🔥','👏','💪','🎉','🫂','😂','😮','😢','🙏','🌱','⭐',
    '🚀','🧠','☕','🤝','💡','🥹','😍','🤯','✨','🏆','🍀','👀'
  )),
  criado_em timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.grupo_reacoes enable row level security;
revoke all on table public.grupo_reacoes from anon, authenticated;
grant select, insert, update, delete on table public.grupo_reacoes to authenticated;
grant all on table public.grupo_reacoes to service_role;

drop policy if exists "grupo_reacoes: logado lê" on public.grupo_reacoes;
create policy "grupo_reacoes: logado lê"
  on public.grupo_reacoes for select to authenticated
  using (true);

drop policy if exists "grupo_reacoes: cada um reage por si" on public.grupo_reacoes;
create policy "grupo_reacoes: cada um reage por si"
  on public.grupo_reacoes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "grupo_reacoes: cada um troca a sua" on public.grupo_reacoes;
create policy "grupo_reacoes: cada um troca a sua"
  on public.grupo_reacoes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "grupo_reacoes: cada um tira a sua" on public.grupo_reacoes;
create policy "grupo_reacoes: cada um tira a sua"
  on public.grupo_reacoes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 6) Comentários. No grátis a pessoa só comenta no próprio post
--    (para responder quem comentou); em post dos outros, só o Pro.
-- ------------------------------------------------------------
create table if not exists public.grupo_comentarios (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references public.posts_comunidade (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  texto     text not null check (char_length(btrim(texto)) between 1 and 300),
  criado_em timestamptz not null default now()
);

create index if not exists grupo_comentarios_post on public.grupo_comentarios (post_id, criado_em);

alter table public.grupo_comentarios enable row level security;
revoke all on table public.grupo_comentarios from anon, authenticated;
grant select, insert, delete on table public.grupo_comentarios to authenticated;
grant all on table public.grupo_comentarios to service_role;

drop policy if exists "grupo_comentarios: logado lê" on public.grupo_comentarios;
create policy "grupo_comentarios: logado lê"
  on public.grupo_comentarios for select to authenticated
  using (true);

drop policy if exists "grupo_comentarios: Pro comenta; grátis só no próprio post" on public.grupo_comentarios;
create policy "grupo_comentarios: Pro comenta; grátis só no próprio post"
  on public.grupo_comentarios for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      (select private.sou_pro())
      or exists (
        select 1 from public.posts_comunidade p
        where p.id = post_id and p.user_id = (select auth.uid())
      )
    )
  );

-- Apaga o comentário quem escreveu ou o dono do post.
drop policy if exists "grupo_comentarios: autor ou dono do post apaga" on public.grupo_comentarios;
create policy "grupo_comentarios: autor ou dono do post apaga"
  on public.grupo_comentarios for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.posts_comunidade p
      where p.id = post_id and p.user_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 7) Stories: somem sozinhos depois de 24 horas.
-- ------------------------------------------------------------
create table if not exists public.grupo_stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  imagem_path text check (imagem_path is null or imagem_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(jpg|webp|png)$'),
  texto       text check (texto is null or char_length(texto) <= 200),
  local       text check (local is null or char_length(local) <= 60),
  cor         text not null default 'roxo' check (cor in ('roxo', 'laranja', 'verde', 'azul', 'rosa', 'ouro')),
  criado_em   timestamptz not null default now(),
  expira_em   timestamptz not null default (now() + interval '24 hours'),
  check (imagem_path is not null or char_length(btrim(coalesce(texto, ''))) > 0)
);

create index if not exists grupo_stories_validos on public.grupo_stories (expira_em);
create index if not exists grupo_stories_autor on public.grupo_stories (user_id, criado_em desc);

-- A hora de criação e de expiração é sempre a do servidor.
create or replace function private.carimbar_story()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.criado_em := now();
  new.expira_em := now() + interval '24 hours';
  return new;
end;
$$;

drop trigger if exists trg_carimbar_story on public.grupo_stories;
create trigger trg_carimbar_story
  before insert on public.grupo_stories
  for each row execute function private.carimbar_story();

alter table public.grupo_stories enable row level security;
revoke all on table public.grupo_stories from anon, authenticated;
grant select, insert, delete on table public.grupo_stories to authenticated;
grant all on table public.grupo_stories to service_role;

-- Os vencidos só o dono enxerga (para o app poder limpar os dele).
drop policy if exists "grupo_stories: logado lê os de hoje" on public.grupo_stories;
create policy "grupo_stories: logado lê os de hoje"
  on public.grupo_stories for select to authenticated
  using (expira_em > now() or (select auth.uid()) = user_id);

drop policy if exists "grupo_stories: cada um publica o seu" on public.grupo_stories;
create policy "grupo_stories: cada um publica o seu"
  on public.grupo_stories for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (imagem_path is null or split_part(imagem_path, '/', 1) = (select auth.uid())::text)
  );

drop policy if exists "grupo_stories: cada um apaga o seu" on public.grupo_stories;
create policy "grupo_stories: cada um apaga o seu"
  on public.grupo_stories for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 8) Visitas ao perfil: uma linha por visitante por dia.
--    Quem foi visitado só vê a lista se assinar o Pro.
-- ------------------------------------------------------------
create table if not exists public.grupo_visitas (
  perfil_id    uuid not null references auth.users (id) on delete cascade,
  visitante_id uuid not null references auth.users (id) on delete cascade,
  dia          date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  visto_em     timestamptz not null default now(),
  primary key (perfil_id, visitante_id, dia),
  check (perfil_id <> visitante_id)
);

create index if not exists grupo_visitas_recentes on public.grupo_visitas (perfil_id, visto_em desc);

alter table public.grupo_visitas enable row level security;
revoke all on table public.grupo_visitas from anon, authenticated;
grant select, insert, delete on table public.grupo_visitas to authenticated;
grant all on table public.grupo_visitas to service_role;

drop policy if exists "grupo_visitas: Pro vê quem visitou" on public.grupo_visitas;
create policy "grupo_visitas: Pro vê quem visitou"
  on public.grupo_visitas for select to authenticated
  using (
    (select auth.uid()) = visitante_id
    or (
      (select auth.uid()) = perfil_id
      and (select private.sou_pro())
      and not (select private.sou_discreto())
    )
  );

drop policy if exists "grupo_visitas: registra a própria visita" on public.grupo_visitas;
create policy "grupo_visitas: registra a própria visita"
  on public.grupo_visitas for insert to authenticated
  with check (
    (select auth.uid()) = visitante_id
    and not (select private.sou_discreto())
  );

-- Quem sai do Grupo leva junto o rastro: as visitas que fez e as que recebeu.
drop policy if exists "grupo_visitas: apaga as próprias" on public.grupo_visitas;
create policy "grupo_visitas: apaga as próprias"
  on public.grupo_visitas for delete to authenticated
  using ((select auth.uid()) = visitante_id or (select auth.uid()) = perfil_id);

-- Quantas pessoas diferentes visitaram o meu perfil nos últimos 30 dias.
-- O grátis vê só o número; a lista é do Pro. Não recebe parâmetro:
-- responde sempre sobre quem chamou.
create or replace function public.grupo_total_visitas()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct v.visitante_id)::integer
  from public.grupo_visitas v
  where v.perfil_id = (select auth.uid())
    and v.visto_em > now() - interval '30 days';
$$;

revoke all on function public.grupo_total_visitas() from public, anon;
grant execute on function public.grupo_total_visitas() to authenticated;

-- ------------------------------------------------------------
-- 9) Denúncias: qualquer pessoa logada envia; só a equipe lê
--    (pelo painel do Supabase, tabela grupo_denuncias).
-- ------------------------------------------------------------
create table if not exists public.grupo_denuncias (
  id        uuid primary key default gen_random_uuid(),
  autor_id  uuid not null references auth.users (id) on delete cascade,
  alvo_tipo text not null check (alvo_tipo in ('post', 'comentario', 'story', 'perfil')),
  alvo_id   uuid not null,
  motivo    text check (motivo is null or char_length(motivo) <= 300),
  criado_em timestamptz not null default now()
);

alter table public.grupo_denuncias enable row level security;
revoke all on table public.grupo_denuncias from anon, authenticated;
grant insert on table public.grupo_denuncias to authenticated;
grant all on table public.grupo_denuncias to service_role;

drop policy if exists "grupo_denuncias: logado denuncia" on public.grupo_denuncias;
create policy "grupo_denuncias: logado denuncia"
  on public.grupo_denuncias for insert to authenticated
  with check ((select auth.uid()) = autor_id);

-- ------------------------------------------------------------
-- 10) Balde de imagens. Leitura por endereço (balde público);
--     envio e remoção só na pasta com o id de quem está logado.
--     Limite de 3 MB e só imagem.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('grupo', 'grupo', true, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "grupo: envia na própria pasta" on storage.objects;
create policy "grupo: envia na própria pasta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'grupo' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "grupo: vê a própria pasta" on storage.objects;
create policy "grupo: vê a própria pasta"
  on storage.objects for select to authenticated
  using (bucket_id = 'grupo' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "grupo: apaga na própria pasta" on storage.objects;
create policy "grupo: apaga na própria pasta"
  on storage.objects for delete to authenticated
  using (bucket_id = 'grupo' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- >>>>>>>>>> 008_liberacoes_do_app.sql

-- ============================================================
-- PLIM — O que o app pode acessar (liberações da Data API)
--
-- Desde 30/05/2026 um projeto novo do Supabase não libera mais as tabelas do
-- esquema public para o app sozinho: cada tabela precisa de um GRANT. Sem ele,
-- o app recebe o erro 42501 (permission denied) mesmo com as regras por linha certas.
--
-- Aqui fica liberado só o que o app usa de fato. O resto fica fechado, seja qual
-- for a configuração do projeto. As tabelas do Grupo são liberadas na 007.
-- Pode rodar mais de uma vez.
-- ============================================================

-- Privilégios que a Data API nem usa e que o app nunca precisa.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- ------------------------------------------------------------
-- 1) Tabelas do começo do projeto que o app não usa (esses dados ficam no aparelho).
--    Ficam fechadas até existir uma função que precise delas.
-- ------------------------------------------------------------
revoke all on table
  public.tarefas,
  public.conclusoes,
  public.streaks,
  public.itens_avatar,
  public.itens_usuario,
  public.despejo_mental,
  public.rastreador,
  public.humor_diario,
  public.sessoes_foco,
  public.mensagens_diarias,
  public.ia_conversas,
  public.reacoes_comunidade,
  public.lembretes_medicacao,
  public.assinaturas,
  public.exercicios_tcc
from anon, authenticated;

-- ------------------------------------------------------------
-- 2) Tabelas que o app usa: zera e libera só o necessário.
--    Quem decide QUAIS linhas cada pessoa vê continua sendo a regra por linha (RLS).
-- ------------------------------------------------------------
revoke all on table public.profiles, public.ranking_scores, public.parceiros, public.ia_uso
  from anon, authenticated;

-- Perfil: a pessoa lê, cria e atualiza o próprio. Ninguém apaga pelo app.
grant select, insert, update on table public.profiles to authenticated;

-- Ranking: qualquer visitante lê; só quem está logado grava a própria linha.
grant select on table public.ranking_scores to anon, authenticated;
grant insert, update on table public.ranking_scores to authenticated;

-- Parceiro: só para quem está logado (visitante sem conta não lê mais essa tabela).
grant select, insert, update, delete on table public.parceiros to authenticated;

-- Uso diário da Plim IA: a pessoa só lê o próprio; quem escreve é o servidor.
grant select on table public.ia_uso to authenticated;

-- ------------------------------------------------------------
-- 3) O servidor (funções plim-ia e revenuecat-webhook) enxerga todas as tabelas.
-- ------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to service_role;

-- ------------------------------------------------------------
-- 4) Funções de gatilho com o caminho de busca travado (recomendação do Supabase).
-- ------------------------------------------------------------
alter function public.update_updated_at() set search_path = '';
alter function public.proteger_plano() set search_path = '';
