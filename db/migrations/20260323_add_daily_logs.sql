CREATE TABLE IF NOT EXISTS daily_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  entry_date DATE NOT NULL,
  submitted TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_daily_logs_user_date (user_id, entry_date),
  KEY idx_daily_logs_user_date (user_id, entry_date),
  KEY idx_daily_logs_entry_date (entry_date),
  CONSTRAINT fk_daily_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_logs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_daily_logs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
