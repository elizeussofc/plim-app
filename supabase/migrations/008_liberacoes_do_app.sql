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
