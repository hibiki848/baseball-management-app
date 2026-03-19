CREATE TABLE IF NOT EXISTS baseball_diary_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  entry_date DATE NOT NULL,
  body TEXT NOT NULL,
  tags_json JSON NOT NULL,
  coach_comments_json JSON NOT NULL,
  coach_stamps_json JSON NOT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_baseball_diary_notes_user_date (user_id, entry_date),
  CONSTRAINT fk_baseball_diary_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_baseball_diary_notes_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_baseball_diary_notes_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
