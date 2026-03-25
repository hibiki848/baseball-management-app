CREATE TABLE IF NOT EXISTS videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  daily_log_id BIGINT UNSIGNED NOT NULL,
  video VARCHAR(1024) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT '',
  source_type ENUM('upload','external') NOT NULL DEFAULT 'upload',
  public_id VARCHAR(255) NULL,
  file_bytes BIGINT UNSIGNED NULL,
  mime_type VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_videos_daily_log (daily_log_id),
  KEY idx_videos_user (user_id),
  CONSTRAINT fk_videos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_videos_daily_log FOREIGN KEY (daily_log_id) REFERENCES baseball_diary_notes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
