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
