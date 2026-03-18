CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('coach', 'manager', 'player') NOT NULL DEFAULT 'player',
  password_hash VARCHAR(255) NOT NULL,
  profile_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS games (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  game_date DATE NOT NULL,
  opponent VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  team_score INT NOT NULL DEFAULT 0,
  opponent_score INT NOT NULL DEFAULT 0,
  result ENUM('win', 'loss', 'draw') NOT NULL,
  created_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_games_game_date (game_date),
  CONSTRAINT fk_games_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scorebook_uploads (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  game_id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  image_data LONGTEXT NOT NULL,
  extracted_text LONGTEXT NULL,
  parse_status ENUM('parsed', 'needs_manual_review') NOT NULL DEFAULT 'needs_manual_review',
  candidate_payload JSON NOT NULL,
  created_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_scorebook_uploads_game_id (game_id),
  CONSTRAINT fk_scorebooks_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_scorebooks_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stat_entries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  game_id BIGINT NOT NULL,
  player_id BIGINT NOT NULL,
  category ENUM('batting', 'pitching') NOT NULL,
  source_type ENUM('manual', 'scorebook') NOT NULL DEFAULT 'manual',
  scorebook_upload_id BIGINT NULL,
  created_by BIGINT NULL,
  notes TEXT NULL,
  raw_payload JSON NOT NULL,
  derived_payload JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_game_player_category (game_id, player_id, category),
  KEY idx_stat_entries_player_id (player_id),
  KEY idx_stat_entries_game_id (game_id),
  CONSTRAINT fk_entries_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_entries_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_entries_scorebook FOREIGN KEY (scorebook_upload_id) REFERENCES scorebook_uploads(id) ON DELETE SET NULL,
  CONSTRAINT fk_entries_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(128) PRIMARY KEY,
  sess_json JSON NOT NULL,
  expires_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sessions_expires_at (expires_at)
);
