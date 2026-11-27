-- ============================================================
-- PLIM — banco novo (cole este arquivo inteiro no SQL Editor do Supabase)
-- Junta as migrations 001, 003, 004, 005, 006, 007, 008. Rode UMA vez, num projeto vazio. Depois use ATUALIZAR-BANCO.sql.
-- Arquivo gerado por tools/juntar-sql.mjs: não edite aqui, edite as migrations.
-- ============================================================

-- >>>>>>>>>> 001_initial_schema.sql

-- ============================================================
-- PLIM APP — Schema Inicial
-- Execute no Supabase SQL Editor em ordem
-- ============================================================

-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES — perfil do usuário
-- ============================================================
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  nome           text,
  apelido        text,
  email          text,
  avatar_config  jsonb    default '{}'::jsonb,
  plano          text     default 'free' check (plano in ('free', 'pro')),
  onboarding     jsonb    default '{}'::jsonb,
  preferencias   jsonb    default '{"modo_baixo_estimulo": false, "reduzir_animacoes": false, "tema": "light", "fonte": "padrao"}'::jsonb,
  xp_total       integer  default 0,
  nivel          integer  default 1,
  moedas         integer  default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuário lê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Usuário insere próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger: criar perfil automaticamente ao registrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TAREFAS — rotina do usuário
-- ============================================================
create table public.tarefas (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  titulo      text not null,
  icone       text default '⚡',
  categoria   text default 'geral',
  horario     time,
  recorrencia jsonb default '{"tipo": "diaria", "dias": []}'::jsonb,
  ativo       boolean default true,
  ordem       integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.tarefas enable row level security;

create policy "CRUD tarefas próprias"
  on public.tarefas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CONCLUSOES — registro de tarefas concluídas
-- ============================================================
create table public.conclusoes (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  tarefa_id     uuid not null references public.tarefas(id) on delete cascade,
  data          date not null default current_date,
  status        text default 'feita' check (status in ('feita', 'parcial', 'pulada')),
  pontos_ganhos integer default 0,
  created_at    timestamptz default now()
);

alter table public.conclusoes enable row level security;

create policy "CRUD conclusões próprias"
  on public.conclusoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- STREAKS — sequência de dias ativos
-- ============================================================
create table public.streaks (
  user_id                   uuid primary key references public.profiles(id) on delete cascade,
  streak_atual              integer default 0,
  recorde                   integer default 0,
  congelamentos_disponiveis integer default 2,
  ultima_atividade          date,
  updated_at                timestamptz default now()
);

alter table public.streaks enable row level security;

create policy "CRUD streak próprio"
  on public.streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- ITENS_AVATAR — catálogo de cosméticos da loja
-- ============================================================
create table public.itens_avatar (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  tipo        text not null check (tipo in ('pele', 'acessorio', 'fundo', 'roupa')),
  custo_moedas integer default 0,
  raridade    text default 'comum' check (raridade in ('comum', 'raro', 'epico', 'lendario')),
  asset_url   text,
  requer_nivel integer default 1,
  created_at  timestamptz default now()
);

alter table public.itens_avatar enable row level security;

create policy "Todos lêem catálogo de itens"
  on public.itens_avatar for select
  using (true);

-- ============================================================
-- ITENS_USUARIO — itens desbloqueados pelo usuário
-- ============================================================
create table public.itens_usuario (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  item_id         uuid not null references public.itens_avatar(id) on delete cascade,
  equipado        boolean default false,
  data_desbloqueio timestamptz default now(),
  unique(user_id, item_id)
);

alter table public.itens_usuario enable row level security;

create policy "CRUD itens do próprio usuário"
  on public.itens_usuario for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- DESPEJO_MENTAL — brain dump
-- ============================================================
create table public.despejo_mental (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  conteudo    text not null,
  processado  boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.despejo_mental enable row level security;

create policy "CRUD despejo próprio"
  on public.despejo_mental for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- RASTREADOR — objetos e ações
-- ============================================================
create table public.rastreador (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  tipo        text not null check (tipo in ('objeto', 'acao')),
  titulo      text not null,
  descricao   text,
  foto_url    text,
  localizacao jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.rastreador enable row level security;

create policy "CRUD rastreador próprio"
  on public.rastreador for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- HUMOR_DIARIO — check-in de humor/energia/foco
-- ============================================================
create table public.humor_diario (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  data    date not null default current_date,
  humor   smallint check (humor between 1 and 5),
  energia smallint check (energia between 1 and 5),
  foco    smallint check (foco between 1 and 5),
  nota    text,
  created_at timestamptz default now(),
  unique(user_id, data)
);

alter table public.humor_diario enable row level security;

create policy "CRUD humor próprio"
  on public.humor_diario for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SESSOES_FOCO — timer pomodoro
-- ============================================================
create table public.sessoes_foco (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  inicio       timestamptz not null default now(),
  fim          timestamptz,
  duracao_min  integer,
  tipo         text default 'solo' check (tipo in ('solo', 'dupla')),
  concluida    boolean default false,
  created_at   timestamptz default now()
);

alter table public.sessoes_foco enable row level security;

create policy "CRUD sessões próprias"
  on public.sessoes_foco for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- MENSAGENS_DIARIAS — mensagem motivacional do dia
-- ============================================================
create table public.mensagens_diarias (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  data    date not null default current_date,
  texto   text not null,
  created_at timestamptz default now(),
  unique(user_id, data)
);

alter table public.mensagens_diarias enable row level security;

create policy "CRUD mensagens próprias"
  on public.mensagens_diarias for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- IA_CONVERSAS — histórico do assistente
-- ============================================================
create table public.ia_conversas (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  mensagens jsonb default '[]'::jsonb,
  resumo    text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ia_conversas enable row level security;

create policy "CRUD conversas próprias"
  on public.ia_conversas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- POSTS_COMUNIDADE
-- ============================================================
create table public.posts_comunidade (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references public.profiles(id) on delete cascade,
  tipo      text not null check (tipo in ('conquista', 'desafio', 'texto')),
  conteudo  text not null,
  imagem_url text,
  anonimo   boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts_comunidade enable row level security;

create policy "Todos lêem posts públicos"
  on public.posts_comunidade for select
  using (true);

create policy "Usuário insere próprios posts"
  on public.posts_comunidade for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza próprios posts"
  on public.posts_comunidade for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuário deleta próprios posts"
  on public.posts_comunidade for delete
  using (auth.uid() = user_id);

-- ============================================================
-- REACOES_COMUNIDADE
-- ============================================================
create table public.reacoes_comunidade (
  post_id uuid not null references public.posts_comunidade(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo    text not null check (tipo in ('apoio', 'forca', 'parabens')),
  primary key (post_id, user_id)
);

alter table public.reacoes_comunidade enable row level security;

create policy "Todos vêem reações"
  on public.reacoes_comunidade for select
  using (true);

create policy "Usuário insere próprias reações"
  on public.reacoes_comunidade for insert
  with check (auth.uid() = user_id);

create policy "Usuário deleta próprias reações"
  on public.reacoes_comunidade for delete
  using (auth.uid() = user_id);

-- ============================================================
-- LEMBRETES_MEDICACAO
-- ============================================================
create table public.lembretes_medicacao (
  id       uuid primary key default uuid_generate_v4(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  nome     text not null,
  horarios jsonb default '[]'::jsonb,
  ativo    boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.lembretes_medicacao enable row level security;

create policy "CRUD lembretes próprios"
  on public.lembretes_medicacao for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- ASSINATURAS
-- ============================================================
create table public.assinaturas (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  plano      text not null check (plano in ('mensal', 'trimestral', 'semestral', 'anual')),
  ciclo      text not null check (ciclo in ('mensal', 'trimestral', 'semestral', 'anual')),
  status     text default 'ativa' check (status in ('ativa', 'cancelada', 'expirada')),
  inicio     timestamptz default now(),
  fim        timestamptz,
  gateway_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.assinaturas enable row level security;

create policy "CRUD assinatura própria"
  on public.assinaturas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- EXERCICIOS_TCC
-- ============================================================
create table public.exercicios_tcc (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo    text not null,
  conteudo jsonb default '{}'::jsonb,
  data    date default current_date,
  created_at timestamptz default now()
);

alter table public.exercicios_tcc enable row level security;

create policy "CRUD exercícios próprios"
  on public.exercicios_tcc for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================================
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at       before update on public.profiles        for each row execute procedure public.update_updated_at();
create trigger trg_tarefas_updated_at        before update on public.tarefas         for each row execute procedure public.update_updated_at();
create trigger trg_despejo_updated_at        before update on public.despejo_mental  for each row execute procedure public.update_updated_at();
create trigger trg_rastreador_updated_at     before update on public.rastreador      for each row execute procedure public.update_updated_at();
create trigger trg_ia_conversas_updated_at   before update on public.ia_conversas    for each row execute procedure public.update_updated_at();
create trigger trg_posts_updated_at          before update on public.posts_comunidade for each row execute procedure public.update_updated_at();
create trigger trg_lembretes_updated_at      before update on public.lembretes_medicacao for each row execute procedure public.update_updated_at();
create trigger trg_assinaturas_updated_at    before update on public.assinaturas     for each row execute procedure public.update_updated_at();

-- >>>>>>>>>> 003_ranking.sql

-- ============================================================
-- Migração 003: Sistema de Ranking
-- Execute no Supabase → SQL Editor
-- ============================================================

-- Tabela pública de ranking (SELECT aberto para todos)
CREATE TABLE IF NOT EXISTS ranking_scores (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  nome_exibido  TEXT    NOT NULL DEFAULT 'Guerreiro',
  avatar_emoji  TEXT    NOT NULL DEFAULT '⚡',
  pontos        INTEGER NOT NULL DEFAULT 0,
  nivel         INTEGER NOT NULL DEFAULT 1,
  streak        INTEGER NOT NULL DEFAULT 0,
  tarefas_feitas   INTEGER NOT NULL DEFAULT 0,
  tarefas_puladas  INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ranking_scores ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode LER o ranking (incluindo anônimos)
CREATE POLICY "ranking_select_publico" ON ranking_scores
  FOR SELECT USING (true);

-- Usuário autenticado pode inserir/atualizar apenas sua própria linha
CREATE POLICY "ranking_insert_proprio" ON ranking_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ranking_update_proprio" ON ranking_scores
  FOR UPDATE USING (auth.uid() = user_id);

-- Habilita Realtime nesta tabela
ALTER PUBLICATION supabase_realtime ADD TABLE ranking_scores;

-- >>>>>>>>>> 004_features.sql

-- ============================================================
-- Migração 004: Features — Parceiro + Humor + Medicação
-- Execute no Supabase → SQL Editor
-- ============================================================

-- Parceiros: vincula dois usuários para acompanhamento mútuo
CREATE TABLE IF NOT EXISTS parceiros (
  user_id     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  parceiro_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parceiros_select" ON parceiros
  FOR SELECT USING (true);

CREATE POLICY "parceiros_insert_own" ON parceiros
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "parceiros_update_own" ON parceiros
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "parceiros_delete_own" ON parceiros
  FOR DELETE USING (auth.uid() = user_id);

-- Habilita Realtime para parceiros
ALTER PUBLICATION supabase_realtime ADD TABLE parceiros;

-- Humor diário: guarda os registros de humor dos usuários logados
CREATE TABLE IF NOT EXISTS humor_diario (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  data       DATE NOT NULL,
  humor      SMALLINT NOT NULL CHECK (humor BETWEEN 1 AND 5),
  criado_em  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, data)
);

ALTER TABLE humor_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "humor_all_own" ON humor_diario
  FOR ALL USING (auth.uid() = user_id);

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
