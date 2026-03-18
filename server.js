const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const dataFile = path.join(dataDir, 'app-data.json');
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);
const useSecureCookie = process.env.NODE_ENV === 'production' || isRailway;

const ALLOWED_ROLES = new Set(['admin', 'manager', 'player']);
const ROLE_LABELS = {
  admin: '監督',
  manager: 'マネージャー',
  player: '選手',
};
const PLAYER_META_DEFAULTS = {
  bats: '右',
  throws: '右',
  position: '未設定',
};

app.set('trust proxy', 1);
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: false, limit: '12mb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: 'lax',
    },
  }),
);

function createEmptyStore() {
  return {
    nextIds: { user: 1, game: 1, entry: 1, upload: 1 },
    users: [],
    games: [],
    statEntries: [],
    scorebookUploads: [],
  };
}

let store = createEmptyStore();

async function loadStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    store = {
      ...createEmptyStore(),
      ...parsed,
      nextIds: { ...createEmptyStore().nextIds, ...(parsed.nextIds || {}) },
      users: Array.isArray(parsed.users) ? parsed.users : [],
      games: Array.isArray(parsed.games) ? parsed.games : [],
      statEntries: Array.isArray(parsed.statEntries) ? parsed.statEntries : [],
      scorebookUploads: Array.isArray(parsed.scorebookUploads) ? parsed.scorebookUploads : [],
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    store = createEmptyStore();
    await saveStore();
  }
}

let saveQueue = Promise.resolve();
function saveStore() {
  saveQueue = saveQueue.then(() => fs.writeFile(dataFile, JSON.stringify(store, null, 2)));
  return saveQueue;
}

function nextId(key) {
  const id = store.nextIds[key] || 1;
  store.nextIds[key] = id + 1;
  return id;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function outsToInnings(outs) {
  const safeOuts = Math.max(0, parseNumber(outs));
  const full = Math.floor(safeOuts / 3);
  const remainder = safeOuts % 3;
  return full + remainder / 3;
}

function round3(value) {
  return Number(Number.isFinite(value) ? value : 0).toFixed(3);
}

function ratio(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'ログインが必要です。' });
  }
  return next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ message: 'ログインが必要です。' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: 'この操作を実行する権限がありません。' });
    }
    return next();
  };
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
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

function getUserById(userId) {
  return store.users.find((user) => user.id === Number(userId));
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function getPlayerUsers() {
  return store.users
    .filter((user) => user.role === 'player')
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      ...PLAYER_META_DEFAULTS,
      ...(user.profile || {}),
    }))
    .sort((a, b) => a.id - b.id);
}

function canEditPlayer(reqUser, playerId) {
  if (!reqUser) return false;
  if (reqUser.role === 'manager') return true;
  if (reqUser.role === 'player') return Number(reqUser.id) === Number(playerId);
  return false;
}

function findEntry(gameId, playerId, category) {
  return store.statEntries.find(
    (entry) => entry.gameId === Number(gameId) && entry.playerId === Number(playerId) && entry.category === category,
  );
}

function deriveBatting(rawInput = {}) {
  const raw = {
    plateAppearances: parseNumber(rawInput.plateAppearances),
    atBats: parseNumber(rawInput.atBats),
    hits: parseNumber(rawInput.hits),
    doubles: parseNumber(rawInput.doubles),
    triples: parseNumber(rawInput.triples),
    homeRuns: parseNumber(rawInput.homeRuns),
    sacrificeBunts: parseNumber(rawInput.sacrificeBunts),
    sacrificeFlies: parseNumber(rawInput.sacrificeFlies),
    walks: parseNumber(rawInput.walks),
    hitByPitch: parseNumber(rawInput.hitByPitch),
    stolenBases: parseNumber(rawInput.stolenBases),
    stolenBaseAttempts: parseNumber(rawInput.stolenBaseAttempts),
    runsBattedIn: parseNumber(rawInput.runsBattedIn),
    runs: parseNumber(rawInput.runs),
    strikeouts: parseNumber(rawInput.strikeouts),
    errors: parseNumber(rawInput.errors),
    rispAtBats: parseNumber(rawInput.rispAtBats),
    rispHits: parseNumber(rawInput.rispHits),
    vsLeftAtBats: parseNumber(rawInput.vsLeftAtBats),
    vsLeftHits: parseNumber(rawInput.vsLeftHits),
    vsRightAtBats: parseNumber(rawInput.vsRightAtBats),
    vsRightHits: parseNumber(rawInput.vsRightHits),
  };
  const singles = Math.max(0, raw.hits - raw.doubles - raw.triples - raw.homeRuns);
  const totalBases = singles + raw.doubles * 2 + raw.triples * 3 + raw.homeRuns * 4;
  const onBaseDenominator = raw.atBats + raw.walks + raw.hitByPitch + raw.sacrificeFlies;
  const avg = ratio(raw.hits, raw.atBats);
  const obp = ratio(raw.hits + raw.walks + raw.hitByPitch, onBaseDenominator);
  const slg = ratio(totalBases, raw.atBats);
  const ops = obp + slg;
  const stealSuccessRate = ratio(raw.stolenBases, raw.stolenBaseAttempts);
  const rispAverage = ratio(raw.rispHits, raw.rispAtBats);
  const vsLeftAverage = ratio(raw.vsLeftHits, raw.vsLeftAtBats);
  const vsRightAverage = ratio(raw.vsRightHits, raw.vsRightAtBats);

  return {
    raw,
    derived: {
      battingAverage: avg,
      onBasePercentage: obp,
      sluggingPercentage: slg,
      ops,
      stealSuccessRate,
      rispAverage,
      vsLeftAverage,
      vsRightAverage,
      totalBases,
    },
  };
}

function derivePitching(rawInput = {}) {
  const raw = {
    pitchCount: parseNumber(rawInput.pitchCount),
    outsRecorded: parseNumber(rawInput.outsRecorded),
    maxVelocity: parseNumber(rawInput.maxVelocity),
    averageVelocity: parseNumber(rawInput.averageVelocity),
    breakingBallRate: parseNumber(rawInput.breakingBallRate),
    battersFaced: parseNumber(rawInput.battersFaced),
    hitsAllowed: parseNumber(rawInput.hitsAllowed),
    walks: parseNumber(rawInput.walks),
    hitByPitch: parseNumber(rawInput.hitByPitch),
    strikeouts: parseNumber(rawInput.strikeouts),
    earnedRuns: parseNumber(rawInput.earnedRuns),
    homeRunsAllowed: parseNumber(rawInput.homeRunsAllowed),
    groundOuts: parseNumber(rawInput.groundOuts),
    flyOuts: parseNumber(rawInput.flyOuts),
    vsLeftBatters: parseNumber(rawInput.vsLeftBatters),
    vsLeftHits: parseNumber(rawInput.vsLeftHits),
    vsRightBatters: parseNumber(rawInput.vsRightBatters),
    vsRightHits: parseNumber(rawInput.vsRightHits),
    fastballPull: parseNumber(rawInput.fastballPull),
    fastballCenter: parseNumber(rawInput.fastballCenter),
    fastballOpposite: parseNumber(rawInput.fastballOpposite),
    breakingPull: parseNumber(rawInput.breakingPull),
    breakingCenter: parseNumber(rawInput.breakingCenter),
    breakingOpposite: parseNumber(rawInput.breakingOpposite),
    offspeedPull: parseNumber(rawInput.offspeedPull),
    offspeedCenter: parseNumber(rawInput.offspeedCenter),
    offspeedOpposite: parseNumber(rawInput.offspeedOpposite),
  };
  const inningsPitched = outsToInnings(raw.outsRecorded);
  const walksAndHitByPitch = raw.walks + raw.hitByPitch;
  const hitAverage = ratio(raw.hitsAllowed, raw.battersFaced);
  const vsLeftHitAverage = ratio(raw.vsLeftHits, raw.vsLeftBatters);
  const vsRightHitAverage = ratio(raw.vsRightHits, raw.vsRightBatters);
  const era = ratio(raw.earnedRuns * 9, inningsPitched);
  const whip = ratio(raw.hitsAllowed + raw.walks, inningsPitched);
  const groundFlyRatio = raw.flyOuts ? raw.groundOuts / raw.flyOuts : raw.groundOuts ? raw.groundOuts : 0;

  return {
    raw,
    derived: {
      inningsPitched,
      hitAverage,
      vsLeftHitAverage,
      vsRightHitAverage,
      era,
      walksAndHitByPitch,
      whip,
      groundFlyRatio,
      pitchTypeBattedBallDirection: {
        fastball: { pull: raw.fastballPull, center: raw.fastballCenter, opposite: raw.fastballOpposite },
        breaking: { pull: raw.breakingPull, center: raw.breakingCenter, opposite: raw.breakingOpposite },
        offspeed: { pull: raw.offspeedPull, center: raw.offspeedCenter, opposite: raw.offspeedOpposite },
      },
    },
  };
}

function aggregateStatsForPlayer(playerId) {
  const battingTotals = deriveBatting().raw;
  const pitchingTotals = derivePitching().raw;

  for (const entry of store.statEntries.filter((item) => item.playerId === Number(playerId))) {
    if (entry.category === 'batting') {
      for (const [key, value] of Object.entries(entry.raw)) {
        battingTotals[key] = parseNumber(battingTotals[key]) + parseNumber(value);
      }
    }
    if (entry.category === 'pitching') {
      for (const [key, value] of Object.entries(entry.raw)) {
        pitchingTotals[key] = parseNumber(pitchingTotals[key]) + parseNumber(value);
      }
    }
  }

  return {
    batting: deriveBatting(battingTotals),
    pitching: derivePitching(pitchingTotals),
  };
}

function aggregateTeamStats() {
  const playerIds = getPlayerUsers().map((player) => player.id);
  const battingTotals = deriveBatting().raw;
  const pitchingTotals = derivePitching().raw;

  for (const playerId of playerIds) {
    const summary = aggregateStatsForPlayer(playerId);
    for (const [key, value] of Object.entries(summary.batting.raw)) {
      battingTotals[key] = parseNumber(battingTotals[key]) + parseNumber(value);
    }
    for (const [key, value] of Object.entries(summary.pitching.raw)) {
      pitchingTotals[key] = parseNumber(pitchingTotals[key]) + parseNumber(value);
    }
  }

  const games = [...store.games].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const totalRuns = games.reduce((sum, game) => sum + parseNumber(game.teamScore), 0);
  const totalRunsAllowed = games.reduce((sum, game) => sum + parseNumber(game.opponentScore), 0);

  return {
    batting: deriveBatting(battingTotals),
    pitching: derivePitching(pitchingTotals),
    totals: {
      totalRuns,
      totalRunsAllowed,
      teamSteals: battingTotals.stolenBases,
    },
  };
}

function buildRankings() {
  return getPlayerUsers()
    .map((player) => {
      const summary = aggregateStatsForPlayer(player.id);
      return {
        id: player.id,
        name: player.name,
        battingAverage: summary.batting.derived.battingAverage,
        ops: summary.batting.derived.ops,
        runsBattedIn: summary.batting.raw.runsBattedIn,
        strikeouts: summary.pitching.raw.strikeouts,
        era: summary.pitching.derived.era,
      };
    })
    .sort((a, b) => b.ops - a.ops || b.battingAverage - a.battingAverage || b.runsBattedIn - a.runsBattedIn);
}

function buildGameSummary(game) {
  if (!game) return null;
  const entries = store.statEntries.filter((entry) => entry.gameId === game.id);
  const battingPlayerCount = new Set(entries.filter((entry) => entry.category === 'batting').map((entry) => entry.playerId)).size;
  const pitchingPlayerCount = new Set(entries.filter((entry) => entry.category === 'pitching').map((entry) => entry.playerId)).size;
  return {
    ...game,
    battingPlayerCount,
    pitchingPlayerCount,
    scorebookCount: store.scorebookUploads.filter((item) => item.gameId === game.id).length,
  };
}

function buildDashboardPayload(reqUser) {
  const recentGame = buildGameSummary(
    [...store.games].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0],
  );
  const team = aggregateTeamStats();
  const rankings = buildRankings();
  const playerSummaries = getPlayerUsers().map((player) => ({
    player,
    summary: aggregateStatsForPlayer(player.id),
  }));

  return {
    user: sanitizeUser(getUserById(reqUser.id)),
    roleLabel: ROLE_LABELS[reqUser.role] || reqUser.role,
    recentGame,
    teamSummary: {
      battingAverage: team.batting.derived.battingAverage,
      onBasePercentage: team.batting.derived.onBasePercentage,
      ops: team.batting.derived.ops,
      totalRuns: team.totals.totalRuns,
      totalRunsAllowed: team.totals.totalRunsAllowed,
      teamEra: team.pitching.derived.era,
      teamSteals: team.totals.teamSteals,
    },
    rankings,
    personalSummary:
      reqUser.role === 'manager'
        ? null
        : aggregateStatsForPlayer(reqUser.role === 'player' ? reqUser.id : (playerSummaries[0] && playerSummaries[0].player.id)),
    playerSummaries:
      reqUser.role === 'player'
        ? playerSummaries.filter((item) => item.player.id === reqUser.id)
        : playerSummaries,
  };
}

function formatDirection(direction) {
  return `${direction.pull}-${direction.center}-${direction.opposite}`;
}

function serializeEntry(entry) {
  const user = getUserById(entry.playerId);
  return {
    ...entry,
    playerName: user ? user.name : '不明な選手',
  };
}

function parseScorebookText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = [];
  for (const line of lines) {
    const [namePart, payloadPart] = line.split(':').map((chunk) => chunk && chunk.trim());
    if (!namePart || !payloadPart) continue;
    const player = getPlayerUsers().find((item) => item.name === namePart);
    if (!player) continue;
    const tokens = payloadPart.split(/\s+/);
    const categoryToken = tokens.shift();
    const category = categoryToken === 'pitching' ? 'pitching' : 'batting';
    const raw = {};
    for (const token of tokens) {
      const [key, value] = token.split('=');
      if (!key) continue;
      raw[key] = parseNumber(value);
    }
    candidates.push({
      playerId: player.id,
      playerName: player.name,
      category,
      raw,
      derived: category === 'pitching' ? derivePitching(raw).derived : deriveBatting(raw).derived,
    });
  }

  return candidates;
}

app.get('/health', async (req, res) => {
  res.status(200).json({ ok: true, storage: 'json-file', users: store.users.length, games: store.games.length });
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
    return res.status(400).json({ message: '指定されたロールが不正です。' });
  }
  if (store.users.some((user) => user.email === email)) {
    return res.status(409).json({ message: 'このメールアドレスは既に登録されています。' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nextId('user'),
    name,
    email,
    role,
    passwordHash,
    profile: { ...PLAYER_META_DEFAULTS },
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  await saveStore();

  req.session.user = sanitizeUser(user);
  await saveSession(req);

  return res.status(201).json({ message: 'ユーザー登録が完了しました。', user: sanitizeUser(user) });
});

app.post('/api/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const selectedRole = String(req.body.role || '').trim();

  if (!email || !password) {
    return res.status(400).json({ message: 'email, password は必須です。' });
  }

  const user = store.users.find((item) => item.email === email);
  if (!user) {
    return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません。' });
  }

  if (selectedRole && user.role !== selectedRole) {
    return res.status(403).json({ message: '選択したロールでログインできません。' });
  }

  const isMatched = await bcrypt.compare(password, user.passwordHash);
  if (!isMatched) {
    return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません。' });
  }

  req.session.user = sanitizeUser(user);
  await saveSession(req);
  return res.status(200).json({ message: 'ログインしました。', user: sanitizeUser(user) });
});

app.post('/api/logout', (req, res) => {
  destroySession(req, res)
    .then(() => res.status(200).json({ message: 'ログアウトしました。' }))
    .catch((error) => {
      console.error('[logout] error', error);
      res.status(500).json({ message: 'ログアウトに失敗しました。' });
    });
});

app.delete('/api/account', requireLogin, async (req, res) => {
  const confirmationText = String(req.body.confirmationText || '').trim();
  const password = String(req.body.password || '');
  if (confirmationText !== '削除する') {
    return res.status(400).json({ message: '確認テキストに「削除する」と入力してください。' });
  }
  const user = store.users.find((item) => item.id === req.session.user.id);
  if (!user) {
    return res.status(404).json({ message: 'ユーザーが見つかりません。' });
  }
  const isMatched = await bcrypt.compare(password, user.passwordHash);
  if (!isMatched) {
    return res.status(401).json({ message: 'パスワードが正しくありません。' });
  }

  store.users = store.users.filter((item) => item.id !== user.id);
  store.statEntries = store.statEntries.filter((entry) => entry.playerId !== user.id && entry.createdBy !== user.id);
  store.scorebookUploads = store.scorebookUploads.filter((upload) => upload.createdBy !== user.id);
  await saveStore();
  await destroySession(req, res);
  return res.status(200).json({ message: 'アカウントを削除しました。' });
});

app.get('/api/me', requireLogin, (req, res) => {
  res.status(200).json({ user: sanitizeUser(getUserById(req.session.user.id)) });
});

app.get('/api/players', requireLogin, (req, res) => {
  if (req.session.user.role === 'player') {
    const user = getUserById(req.session.user.id);
    return res.status(200).json({ players: user ? [{ id: user.id, name: user.name, role: user.role, ...(user.profile || {}) }] : [] });
  }
  return res.status(200).json({ players: getPlayerUsers() });
});

app.get('/api/games', requireLogin, (req, res) => {
  const games = [...store.games]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((game) => buildGameSummary(game));
  res.status(200).json({ games });
});

app.post('/api/games', requireRole(['admin', 'manager']), async (req, res) => {
  const date = String(req.body.date || '').trim();
  const opponent = String(req.body.opponent || '').trim();
  const location = String(req.body.location || '').trim();
  const teamScore = parseNumber(req.body.teamScore);
  const opponentScore = parseNumber(req.body.opponentScore);
  if (!date || !opponent) {
    return res.status(400).json({ message: '試合日と対戦相手は必須です。' });
  }
  const result = teamScore > opponentScore ? 'win' : teamScore < opponentScore ? 'loss' : 'draw';
  const game = {
    id: nextId('game'),
    date,
    opponent,
    location,
    teamScore,
    opponentScore,
    result,
    createdBy: req.session.user.id,
    createdAt: new Date().toISOString(),
  };
  store.games.push(game);
  await saveStore();
  res.status(201).json({ game: buildGameSummary(game), message: '試合を追加しました。' });
});

app.get('/api/games/:id', requireLogin, (req, res) => {
  const game = store.games.find((item) => item.id === Number(req.params.id));
  if (!game) {
    return res.status(404).json({ message: '試合が見つかりません。' });
  }
  const entries = store.statEntries
    .filter((entry) => entry.gameId === game.id)
    .map((entry) => serializeEntry(entry));
  const scorebooks = store.scorebookUploads.filter((item) => item.gameId === game.id);
  return res.status(200).json({ game: buildGameSummary(game), entries, scorebooks });
});

app.get('/api/dashboard', requireLogin, (req, res) => {
  res.status(200).json(buildDashboardPayload(req.session.user));
});

app.post('/api/stats/manual', requireRole(['manager', 'player']), async (req, res) => {
  const gameId = Number(req.body.gameId);
  const playerId = Number(req.body.playerId);
  const category = String(req.body.category || '').trim();
  const sourceType = String(req.body.sourceType || 'manual').trim();
  const notes = String(req.body.notes || '').trim();
  const scorebookUploadId = req.body.scorebookUploadId ? Number(req.body.scorebookUploadId) : null;

  if (!gameId || !playerId || !['batting', 'pitching'].includes(category)) {
    return res.status(400).json({ message: '試合・選手・カテゴリを正しく指定してください。' });
  }
  if (!canEditPlayer(req.session.user, playerId)) {
    return res.status(403).json({ message: 'この選手の成績は編集できません。' });
  }
  const game = store.games.find((item) => item.id === gameId);
  if (!game) {
    return res.status(404).json({ message: '対象の試合が見つかりません。' });
  }
  const player = getUserById(playerId);
  if (!player || player.role !== 'player') {
    return res.status(404).json({ message: '対象の選手が見つかりません。' });
  }

  const { raw, derived } = category === 'pitching' ? derivePitching(req.body.raw) : deriveBatting(req.body.raw);
  let entry = findEntry(gameId, playerId, category);
  if (entry) {
    entry.raw = raw;
    entry.derived = derived;
    entry.notes = notes;
    entry.sourceType = sourceType;
    entry.scorebookUploadId = scorebookUploadId;
    entry.updatedAt = new Date().toISOString();
    entry.createdBy = req.session.user.id;
  } else {
    entry = {
      id: nextId('entry'),
      gameId,
      playerId,
      category,
      sourceType,
      notes,
      scorebookUploadId,
      raw,
      derived,
      createdBy: req.session.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.statEntries.push(entry);
  }
  await saveStore();
  res.status(200).json({ message: '成績を保存しました。', entry: serializeEntry(entry) });
});

app.post('/api/stats/scorebook-preview', requireRole(['manager']), async (req, res) => {
  const gameId = Number(req.body.gameId);
  const imageDataUrl = String(req.body.imageDataUrl || '');
  const fileName = String(req.body.fileName || 'scorebook');
  const extractedText = String(req.body.extractedText || '').trim();
  if (!gameId || !imageDataUrl) {
    return res.status(400).json({ message: '試合と画像データは必須です。' });
  }
  const game = store.games.find((item) => item.id === gameId);
  if (!game) {
    return res.status(404).json({ message: '対象の試合が見つかりません。' });
  }

  const candidates = parseScorebookText(extractedText);
  const upload = {
    id: nextId('upload'),
    gameId,
    fileName,
    imageDataUrl,
    extractedText,
    candidates,
    createdBy: req.session.user.id,
    createdAt: new Date().toISOString(),
    parseStatus: candidates.length > 0 ? 'parsed' : 'needs_manual_review',
  };
  store.scorebookUploads.push(upload);
  await saveStore();

  res.status(201).json({
    message:
      candidates.length > 0
        ? 'スコアブック画像から入力候補を作成しました。内容を確認して保存してください。'
        : '候補を十分に読み取れなかったため、手動修正してください。',
    upload,
  });
});

app.get('/api/stat-entries', requireLogin, (req, res) => {
  const visibleEntries = store.statEntries.filter((entry) => (
    req.session.user.role === 'player' ? entry.playerId === req.session.user.id : true
  ));
  res.status(200).json({ entries: visibleEntries.map((entry) => serializeEntry(entry)) });
});

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path === '/') {
    return req.session.user ? res.redirect('/index.html') : res.redirect('/login.html');
  }
  if (!req.path.endsWith('.html')) return next();
  if (req.path === '/login.html') {
    return req.session.user ? res.redirect('/index.html') : next();
  }
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  return next();
});

app.use(express.static(rootDir));

loadStore()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`Server listening on http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
