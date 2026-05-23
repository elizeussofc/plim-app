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
create policy if not exists "Admin lê todos os perfis"
  on public.profiles for select
  using (auth.jwt() ->> 'role' = 'admin');
