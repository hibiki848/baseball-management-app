const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const rootDir = __dirname;

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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  }),
);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

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

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, password は必須です。' });
  }

  try {
    const [existingRows] = await dbPool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'このメールアドレスは既に登録されています。' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [insertResult] = await dbPool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'manager'],
    );

    req.session.user = {
      id: insertResult.insertId,
      name,
      email,
      role: 'manager',
    };

    return res.status(201).json({
      message: 'ユーザー登録が完了しました。',
      user: req.session.user,
    });
  } catch (error) {
    console.error('[register] error', error);
    return res.status(500).json({ message: 'ユーザー登録に失敗しました。' });
  }
});

app.post('/api/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'email, password は必須です。' });
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

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

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
  req.session.destroy((error) => {
    if (error) {
      console.error('[logout] error', error);
      return res.status(500).json({ message: 'ログアウトに失敗しました。' });
    }

    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'ログアウトしました。' });
  });
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
