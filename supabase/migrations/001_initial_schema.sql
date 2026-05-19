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
