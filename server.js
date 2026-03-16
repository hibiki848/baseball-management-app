const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const rootDir = __dirname;
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);
const useSecureCookie = process.env.NODE_ENV === 'production' || isRailway;

function getEnv(primaryKey, secondaryKey) {
  return process.env[primaryKey] || process.env[secondaryKey];
}

const dbConfig = {
  host: getEnv('DB_HOST', 'MYSQLHOST'),
  port: Number(getEnv('DB_PORT', 'MYSQLPORT')),
  user: getEnv('DB_USER', 'MYSQLUSER'),
  password: getEnv('DB_PASSWORD', 'MYSQLPASSWORD'),
  database: getEnv('DB_NAME', 'MYSQLDATABASE'),
};

const missingDbEnv = Object.entries(dbConfig)
  .filter(([, value]) => !value || Number.isNaN(value))
  .map(([key]) => key.toUpperCase());

if (missingDbEnv.length > 0) {
  throw new Error(
    `Missing required database environment variables: ${missingDbEnv.join(', ')}. ` +
      'Set DB_* or MYSQL* variables in Railway.',
  );
}

if (!process.env.SESSION_SECRET) {
  throw new Error('Missing required environment variable: SESSION_SECRET');
}

const dbPool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
});

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: 'lax',
    },
  }),
);

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function destroySession(req, res) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }
      res.clearCookie('connect.sid');
      resolve();
    });
  });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

const ALLOWED_ROLES = new Set(['admin', 'manager', 'player']);
const ROLE_LABELS = {
  admin: '監督',
  manager: 'マネージャー',
  player: '選手',
};

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'ログインが必要です。' });
  }
  return next();
}

app.get('/health', async (req, res) => {
  try {
    await dbPool.query('SELECT 1');
    return res.status(200).json({ ok: true, db: 'connected' });
  } catch (error) {
    console.error('[health] DB error', error);
    return res.status(500).json({ ok: false, db: 'disconnected', message: 'DB接続エラー' });
  }
});

app.post('/api/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const role = String(req.body.role || '').trim();

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, role は必須です。' });
  }

  if (!ALLOWED_ROLES.has(role)) {
    return res.status(400).json({
      message: '指定されたロールが不正です。admin / manager / player のいずれかを指定してください。',
    });
  }

  try {
    const [existingRows] = await dbPool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'このメールアドレスは既に登録されています。' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [insertResult] = await dbPool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role],
    );

    req.session.user = {
      id: insertResult.insertId,
      name,
      email,
      role,
    };

    await saveSession(req);

    return res.status(201).json({
      message: 'ユーザー登録が完了しました。',
      user: req.session.user,
    });
  } catch (error) {
    console.error('[register] error', error);

    if (error && (error.code === 'WARN_DATA_TRUNCATED' || error.errno === 1265)) {
      return res.status(400).json({
        message: 'role の保存に失敗しました。admin / manager / player のいずれかを指定してください。',
      });
    }

    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'このメールアドレスは既に登録されています。' });
    }

    return res.status(500).json({
      message: `ユーザー登録に失敗しました: ${error && error.message ? error.message : '原因不明のエラー'}`,
    });
  }
});

app.post('/api/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const selectedRole = String(req.body.role || '').trim();

  if (!email || !password) {
    return res.status(400).json({ message: 'email, password は必須です。' });
  }

  if (selectedRole && !ALLOWED_ROLES.has(selectedRole)) {
    return res.status(400).json({
      message: '指定されたロールが不正です。admin / manager / player のいずれかを指定してください。',
    });
  }

  try {
    const [rows] = await dbPool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません。' });
    }

    const user = rows[0];
    const isMatched = await bcrypt.compare(password, user.password_hash);

    if (!isMatched) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません。' });
    }

    const accountRole = ALLOWED_ROLES.has(user.role) ? user.role : 'player';

    if (selectedRole && selectedRole !== accountRole) {
      const accountRoleLabel = ROLE_LABELS[accountRole] || accountRole;
      return res.status(403).json({
        message: `このアカウントは「${accountRoleLabel}」権限です。正しいロールを選択してください。`,
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: accountRole,
    };

    await saveSession(req);

    return res.status(200).json({
      message: 'ログインに成功しました。',
      user: req.session.user,
    });
  } catch (error) {
    console.error('[login] error', error);
    return res.status(500).json({ message: 'ログインに失敗しました。' });
  }
});

app.post('/api/logout', (req, res) => {
  destroySession(req, res)
    .then(() => res.status(200).json({ message: 'ログアウトしました。' }))
    .catch((error) => {
      console.error('[logout] error', error);
      return res.status(500).json({ message: 'ログアウトに失敗しました。' });
    });
});

app.delete('/api/account', requireLogin, async (req, res) => {
  const confirmationText = String(req.body.confirmationText || '').trim();
  const password = String(req.body.password || '');
  const sessionUserId = Number(req.session.user && req.session.user.id);

  if (!sessionUserId) {
    return res.status(401).json({ message: 'ログインが必要です。' });
  }

  if (confirmationText !== '削除する') {
    return res.status(400).json({ message: '確認テキストに「削除する」と入力してください。' });
  }

  if (!password) {
    return res.status(400).json({ message: '本人確認のためパスワードを入力してください。' });
  }

  let connection;
  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    const [userRows] = await connection.query(
      'SELECT id, password_hash FROM users WHERE id = ? LIMIT 1',
      [sessionUserId],
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '削除対象のユーザーが存在しません。' });
    }

    const user = userRows[0];
    const isMatched = await bcrypt.compare(password, user.password_hash);
    if (!isMatched) {
      await connection.rollback();
      return res.status(401).json({ message: 'パスワードが正しくありません。' });
    }

    const [fkRows] = await connection.query(
      `SELECT TABLE_NAME, COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE REFERENCED_TABLE_SCHEMA = ?
         AND REFERENCED_TABLE_NAME = 'users'
         AND REFERENCED_COLUMN_NAME = 'id'`,
      [dbConfig.database],
    );

    for (const relation of fkRows) {
      if (relation.TABLE_NAME === 'users') {
        continue;
      }

      const tableName = String(relation.TABLE_NAME).replace(/`/g, '');
      const columnName = String(relation.COLUMN_NAME).replace(/`/g, '');
      await connection.query(`DELETE FROM \`${tableName}\` WHERE \`${columnName}\` = ?`, [sessionUserId]);
    }

    const [deleteResult] = await connection.query('DELETE FROM users WHERE id = ? LIMIT 1', [sessionUserId]);
    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '削除対象のユーザーが存在しません。' });
    }

    await connection.commit();
    await destroySession(req, res);

    return res.status(200).json({ message: 'アカウントを削除しました。' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('[delete account] error', error);
    return res.status(500).json({ message: 'アカウント削除に失敗しました。' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get('/api/me', requireLogin, (req, res) => {
  return res.status(200).json({ user: req.session.user });
});

app.use(express.static(rootDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
