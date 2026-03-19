CREATE TABLE IF NOT EXISTS player_condition_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  entry_date DATE NOT NULL,
  condition_status ENUM('poor', 'normal', 'good') NOT NULL,
  weight INT NOT NULL,
  sleep_hours INT NOT NULL,
  fatigue_level ENUM('low', 'medium', 'high') NOT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_player_condition_user_date (user_id, entry_date),
  KEY idx_player_condition_records_user_date (user_id, entry_date),
  CONSTRAINT fk_player_condition_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_condition_records_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_player_condition_records_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
