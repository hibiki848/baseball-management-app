const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const rootDir = __dirname;

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'baseball_management',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
});

console.log('[boot] server.js loaded');
console.log('[boot] __dirname =', rootDir);
console.log('[boot] PORT =', process.env.PORT);
console.log('[boot] NODE_ENV =', process.env.NODE_ENV);

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

app.use((req, res, next) => {
  console.log(`[request] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-session-secret',
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
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[health] DB error', error);
    res.status(500).json({ ok: false, message: 'DB接続エラー' });
  }
});

app.post('/api/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, password は必須です。' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'パスワードは8文字以上で入力してください。' });
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

    return res.status(201).json({
      message: 'ユーザー登録が完了しました。',
      user: {
        id: insertResult.insertId,
        name,
        email,
        role: 'manager',
      },
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

  if (password.length < 8) {
    return res.status(400).json({ message: 'パスワードは8文字以上で入力してください。' });
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
  const filePath = path.join(rootDir, 'index.html');
  console.log('[route /] sendFile =', filePath);
  res.sendFile(filePath);
});

app.listen(port, host, () => {
  console.log(`[listen] Server is running on http://${host}:${port}`);
});
