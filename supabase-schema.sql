-- ═══════════════════════════════════════════════════════════════════════════
-- NFL PICK'EM — Schema completo de Supabase
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Perfiles de usuario ───────────────────────────────────────────────────
-- Se crea automáticamente al registrarse via trigger
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crea perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. Grupos ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  season      INT  NOT NULL DEFAULT 2026,
  admin_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  entry_fee   NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Miembros del grupo ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paid       BOOLEAN DEFAULT FALSE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- ── 4. Picks ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS picks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_id           TEXT NOT NULL,    -- ID de ESPN
  week              INT  NOT NULL,
  season            INT  NOT NULL DEFAULT 2026,
  picked_team_id    TEXT NOT NULL,    -- ID de ESPN del equipo elegido
  tiebreaker_total  INT,              -- Total predicho para MNF (solo Monday Night)
  is_correct        BOOLEAN,          -- NULL hasta que el juego termine
  points_earned     INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, group_id, game_id)  -- Un pick por juego por usuario por grupo
);

-- Actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER picks_updated_at
  BEFORE UPDATE ON picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 5. Vista de leaderboard ───────────────────────────────────────────────────
-- Calcula puntos totales y diferencia de tiebreaker por usuario/grupo/temporada
-- La diferencia de tiebreaker se calcula contra el total real del MNF
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  p.group_id,
  p.season,
  p.user_id,
  pr.full_name,
  SUM(p.points_earned) AS total_points,
  -- Diferencia absoluta del tiebreaker (menor es mejor)
  -- game_results.mnf_total debe cargarse cuando el MNF termine
  MIN(ABS(p.tiebreaker_total - COALESCE(gr.mnf_actual_total, 0))) FILTER (
    WHERE p.tiebreaker_total IS NOT NULL
  ) AS tiebreaker_diff,
  COUNT(*) FILTER (WHERE p.is_correct = TRUE) AS correct_picks,
  COUNT(*) FILTER (WHERE p.is_correct IS NOT NULL) AS graded_picks
FROM picks p
JOIN profiles pr ON pr.id = p.user_id
LEFT JOIN game_results gr ON gr.group_id = p.group_id
  AND gr.game_id = p.game_id
  AND gr.week = p.week
  AND gr.season = p.season
GROUP BY p.group_id, p.season, p.user_id, pr.full_name;

-- ── 6. Resultados de juegos (para calificar picks automáticamente) ────────────
CREATE TABLE IF NOT EXISTS game_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  game_id          TEXT NOT NULL,
  week             INT  NOT NULL,
  season           INT  NOT NULL DEFAULT 2026,
  winner_team_id   TEXT NOT NULL,
  mnf_actual_total INT,             -- Total real de puntos del MNF (para desempate)
  graded_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, game_id)
);

-- ── 7. Función para calificar picks de un juego ───────────────────────────────
-- Llámala desde el Admin panel cuando un juego termina
CREATE OR REPLACE FUNCTION set_game_result(
  p_group_id       UUID,
  p_game_id        TEXT,
  p_winner_team_id TEXT,
  p_week           INT,
  p_season         INT,
  p_mnf_total      INT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  base_pts INT;
BEGIN
  -- Guarda o actualiza el resultado
  INSERT INTO game_results (group_id, game_id, week, season, winner_team_id, mnf_actual_total)
  VALUES (p_group_id, p_game_id, p_week, p_season, p_winner_team_id, p_mnf_total)
  ON CONFLICT (group_id, game_id) DO UPDATE
    SET winner_team_id = p_winner_team_id,
        mnf_actual_total = p_mnf_total,
        graded_at = NOW();

  -- Califica cada pick de este juego
  UPDATE picks
  SET
    is_correct    = (picked_team_id = p_winner_team_id),
    points_earned = CASE
      WHEN picked_team_id = p_winner_team_id THEN 10  -- TODO: ajusta la escala de puntos
      ELSE 0
    END
  WHERE group_id = p_group_id
    AND game_id  = p_game_id
    AND week     = p_week
    AND season   = p_season;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. RLS (Row Level Security) ───────────────────────────────────────────────
-- Solo el usuario puede ver/editar sus propios datos

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Profiles: cada quien ve solo su propio perfil
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Groups: cualquier miembro autenticado puede ver grupos
CREATE POLICY "groups_read" ON groups
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "groups_insert" ON groups
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "groups_update" ON groups
  FOR UPDATE USING (auth.uid() = admin_id);

-- Group members: los miembros ven su propio registro; admin ve todos del grupo
CREATE POLICY "members_read_own" ON group_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "members_read_admin" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.admin_id = auth.uid()
    )
  );

CREATE POLICY "members_insert" ON group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members_update_admin" ON group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.admin_id = auth.uid()
    )
  );

-- Picks: el usuario gestiona sus picks; miembros del grupo ven los de todos (para %)
CREATE POLICY "picks_own" ON picks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "picks_group_read" ON picks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = picks.group_id AND gm.user_id = auth.uid()
    )
  );

-- Game results: admin del grupo puede insertar/actualizar
CREATE POLICY "results_admin" ON game_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_id AND g.admin_id = auth.uid()
    )
  );

CREATE POLICY "results_read_members" ON game_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = game_results.group_id AND gm.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════════
-- ÍNDICES para performance
-- ════════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_picks_group_week   ON picks (group_id, week, season);
CREATE INDEX IF NOT EXISTS idx_picks_user         ON picks (user_id);
CREATE INDEX IF NOT EXISTS idx_members_group      ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_members_user       ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_groups_invite      ON groups (invite_code);
