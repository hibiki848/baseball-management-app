CREATE TABLE IF NOT EXISTS meetings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  game_id INT NOT NULL,
  good_points TEXT NOT NULL,
  improvement_points TEXT NOT NULL,
  next_goals TEXT NOT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_meetings_game_id (game_id),
  KEY idx_meetings_created_at (created_at),
  CONSTRAINT fk_meetings_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  CONSTRAINT fk_meetings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
