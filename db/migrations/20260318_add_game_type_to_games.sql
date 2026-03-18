ALTER TABLE games
  ADD COLUMN IF NOT EXISTS game_type ENUM('official', 'practice', 'intrasquad') NOT NULL DEFAULT 'official' AFTER location;

UPDATE games
SET game_type = 'official'
WHERE game_type IS NULL OR game_type = '';
