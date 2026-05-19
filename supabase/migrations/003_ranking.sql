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
