-- users.role を登録仕様（admin / manager / player）に合わせる
-- 既存に coach や日本語表記ロールがある場合の移行例

UPDATE users
SET role = CASE role
  WHEN 'coach' THEN 'admin'
  WHEN 'director' THEN 'admin'
  WHEN '監督' THEN 'admin'
  WHEN '選手' THEN 'player'
  WHEN 'マネージャー' THEN 'manager'
  ELSE role
END;

-- 不正値を player に寄せる（方針に応じて削除/手動修正でも可）
UPDATE users
SET role = 'player'
WHERE role NOT IN ('admin', 'manager', 'player') OR role IS NULL;

-- role カラム定義を許可値に合わせる（MySQL）
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'manager', 'player') NOT NULL DEFAULT 'player';
