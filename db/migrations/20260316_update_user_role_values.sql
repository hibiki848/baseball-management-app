-- users.role を登録仕様（coach / manager / player）に合わせる
-- 既存に admin / director / 日本語表記ロールがある場合の移行例

UPDATE users
SET role = CASE role
  WHEN 'admin' THEN 'coach'
  WHEN 'director' THEN 'coach'
  WHEN '指導者' THEN 'coach'
  WHEN '選手' THEN 'player'
  WHEN 'マネージャー' THEN 'manager'
  ELSE role
END;

-- 不正値を player に寄せる（方針に応じて削除/手動修正でも可）
UPDATE users
SET role = 'player'
WHERE role NOT IN ('coach', 'manager', 'player') OR role IS NULL;

-- role カラム定義を許可値に合わせる（MySQL）
ALTER TABLE users
  MODIFY COLUMN role ENUM('coach', 'manager', 'player') NOT NULL DEFAULT 'player';
