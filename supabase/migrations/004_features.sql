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
