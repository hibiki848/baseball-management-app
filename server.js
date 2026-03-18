const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const {
  createGame,
  createScorebookUpload,
  createUser,
  deleteUserAccount,
  findGameById,
  findUserByEmail,
  findUserById,
  getCounts,
  initDatabase,
  listGames,
  listScorebookUploads,
  listStatEntries,
  listUsers,
  sessionStore,
  upsertStatEntry,
} = require('./db/mysql');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const rootDir = __dirname;
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);
const useSecureCookie = process.env.NODE_ENV === 'production' || isRailway;

const AppRoles = require('./js/roles');
const ALLOWED_ROLES = new Set(AppRoles.ALLOWED_ROLES);
const ROLE_LABELS = AppRoles.ROLE_LABELS;
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
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: 'lax',
      maxAge: Number(process.env.SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000),
    },
  }),
);

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

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

async function getPlayerUsers() {
  const users = await listUsers();
  return users
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

async function aggregateStatsForPlayer(playerId, allEntries) {
  const entries = allEntries || (await listStatEntries({ playerId }));
  const battingTotals = deriveBatting().raw;
  const pitchingTotals = derivePitching().raw;

  for (const entry of entries.filter((item) => item.playerId === Number(playerId))) {
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

async function aggregateTeamStats(players, games, entries) {
  const battingTotals = deriveBatting().raw;
  const pitchingTotals = derivePitching().raw;

  for (const player of players) {
    const summary = await aggregateStatsForPlayer(player.id, entries);
    for (const [key, value] of Object.entries(summary.batting.raw)) {
      battingTotals[key] = parseNumber(battingTotals[key]) + parseNumber(value);
    }
    for (const [key, value] of Object.entries(summary.pitching.raw)) {
      pitchingTotals[key] = parseNumber(pitchingTotals[key]) + parseNumber(value);
    }
  }

  const sortedGames = [...games].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const totalRuns = sortedGames.reduce((sum, game) => sum + parseNumber(game.teamScore), 0);
  const totalRunsAllowed = sortedGames.reduce((sum, game) => sum + parseNumber(game.opponentScore), 0);

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

async function buildRankings(players, entries) {
  const rankings = [];
  for (const player of players) {
    const summary = await aggregateStatsForPlayer(player.id, entries);
    rankings.push({
      id: player.id,
      name: player.name,
      battingAverage: summary.batting.derived.battingAverage,
      ops: summary.batting.derived.ops,
      runsBattedIn: summary.batting.raw.runsBattedIn,
      strikeouts: summary.pitching.raw.strikeouts,
      era: summary.pitching.derived.era,
    });
  }
  return rankings.sort((a, b) => b.ops - a.ops || b.battingAverage - a.battingAverage || b.runsBattedIn - a.runsBattedIn);
}

function buildGameSummary(game, entries, uploads) {
  if (!game) return null;
  const battingPlayerCount = new Set(entries.filter((entry) => entry.gameId === game.id && entry.category === 'batting').map((entry) => entry.playerId)).size;
  const pitchingPlayerCount = new Set(entries.filter((entry) => entry.gameId === game.id && entry.category === 'pitching').map((entry) => entry.playerId)).size;
  return {
    ...game,
    battingPlayerCount,
    pitchingPlayerCount,
    scorebookCount: uploads.filter((item) => item.gameId === game.id).length,
  };
}

async function buildDashboardPayload(reqUser) {
  const [user, players, games, entries, uploads] = await Promise.all([
    findUserById(reqUser.id),
    getPlayerUsers(),
    listGames(),
    listStatEntries(),
    listScorebookUploads(),
  ]);
  const recentGame = buildGameSummary(games[0], entries, uploads);
  const team = await aggregateTeamStats(players, games, entries);
  const rankings = await buildRankings(players, entries);

  const playerSummaries = [];
  for (const player of players) {
    playerSummaries.push({
      player,
      summary: await aggregateStatsForPlayer(player.id, entries),
    });
  }

  const personalSummary =
    reqUser.role === 'manager'
      ? null
      : await aggregateStatsForPlayer(
          reqUser.role === 'player' ? reqUser.id : (playerSummaries[0] && playerSummaries[0].player.id),
          entries,
        );

  return {
    user: sanitizeUser(user),
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
    personalSummary,
    playerSummaries:
      reqUser.role === 'player'
        ? playerSummaries.filter((item) => item.player.id === reqUser.id)
        : playerSummaries,
  };
}

async function serializeEntry(entry, userMap) {
  const user = userMap ? userMap.get(entry.playerId) : await findUserById(entry.playerId);
  return {
    ...entry,
    playerName: user ? user.name : '不明な選手',
  };
}

async function parseScorebookText(text) {
  const playerUsers = await getPlayerUsers();
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = [];
  for (const line of lines) {
    const [namePart, payloadPart] = line.split(':').map((chunk) => chunk && chunk.trim());
    if (!namePart || !payloadPart) continue;
    const player = playerUsers.find((item) => item.name === namePart);
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
  const counts = await getCounts();
  res.status(200).json({ ok: true, storage: 'mysql', ...counts });
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
  if (await findUserByEmail(email)) {
    return res.status(409).json({ message: 'このメールアドレスは既に登録されています。' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({
    name,
    email,
    role,
    passwordHash,
    profile: { ...PLAYER_META_DEFAULTS },
  });

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

  const user = await findUserByEmail(email);
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
  const user = await findUserById(req.session.user.id);
  if (!user) {
    return res.status(404).json({ message: 'ユーザーが見つかりません。' });
  }
  const isMatched = await bcrypt.compare(password, user.passwordHash);
  if (!isMatched) {
    return res.status(401).json({ message: 'パスワードが正しくありません。' });
  }

  await deleteUserAccount(user.id);
  await destroySession(req, res);
  return res.status(200).json({ message: 'アカウントを削除しました。' });
});

app.get('/api/me', requireLogin, async (req, res) => {
  res.status(200).json({ user: sanitizeUser(await findUserById(req.session.user.id)) });
});

app.get('/api/players', requireLogin, async (req, res) => {
  if (req.session.user.role === 'player') {
    const user = await findUserById(req.session.user.id);
    return res.status(200).json({ players: user ? [{ id: user.id, name: user.name, role: user.role, ...(user.profile || {}) }] : [] });
  }
  return res.status(200).json({ players: await getPlayerUsers() });
});

app.get('/api/games', requireLogin, async (req, res) => {
  const [games, entries, uploads] = await Promise.all([listGames(), listStatEntries(), listScorebookUploads()]);
  res.status(200).json({ games: games.map((game) => buildGameSummary(game, entries, uploads)) });
});

app.post('/api/games', requireRole(['coach', 'manager']), async (req, res) => {
  const date = String(req.body.date || '').trim();
  const opponent = String(req.body.opponent || '').trim();
  const location = String(req.body.location || '').trim();
  const teamScore = parseNumber(req.body.teamScore);
  const opponentScore = parseNumber(req.body.opponentScore);
  if (!date || !opponent) {
    return res.status(400).json({ message: '試合日と対戦相手は必須です。' });
  }
  const result = teamScore > opponentScore ? 'win' : teamScore < opponentScore ? 'loss' : 'draw';
  const game = await createGame({
    date,
    opponent,
    location,
    teamScore,
    opponentScore,
    result,
    createdBy: req.session.user.id,
  });
  res.status(201).json({ game: buildGameSummary(game, [], []), message: '試合を追加しました。' });
});

app.get('/api/games/:id', requireLogin, async (req, res) => {
  const game = await findGameById(Number(req.params.id));
  if (!game) {
    return res.status(404).json({ message: '試合が見つかりません。' });
  }
  const [entries, scorebooks, users] = await Promise.all([
    listStatEntries({ gameId: game.id }),
    listScorebookUploads({ gameId: game.id }),
    listUsers(),
  ]);
  const userMap = new Map(users.map((user) => [user.id, user]));
  return res.status(200).json({
    game: buildGameSummary(game, entries, scorebooks),
    entries: await Promise.all(entries.map((entry) => serializeEntry(entry, userMap))),
    scorebooks,
  });
});

app.get('/api/dashboard', requireLogin, async (req, res) => {
  res.status(200).json(await buildDashboardPayload(req.session.user));
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
  const game = await findGameById(gameId);
  if (!game) {
    return res.status(404).json({ message: '対象の試合が見つかりません。' });
  }
  const player = await findUserById(playerId);
  if (!player || player.role !== 'player') {
    return res.status(404).json({ message: '対象の選手が見つかりません。' });
  }

  const { raw, derived } = category === 'pitching' ? derivePitching(req.body.raw) : deriveBatting(req.body.raw);
  const entry = await upsertStatEntry({
    gameId,
    playerId,
    category,
    sourceType,
    notes,
    scorebookUploadId,
    raw,
    derived,
    createdBy: req.session.user.id,
  });
  res.status(200).json({ message: '成績を保存しました。', entry: await serializeEntry(entry) });
});

app.post('/api/stats/scorebook-preview', requireRole(['manager']), async (req, res) => {
  const gameId = Number(req.body.gameId);
  const imageDataUrl = String(req.body.imageDataUrl || '');
  const fileName = String(req.body.fileName || 'scorebook');
  const extractedText = String(req.body.extractedText || '').trim();
  if (!gameId || !imageDataUrl) {
    return res.status(400).json({ message: '試合と画像データは必須です。' });
  }
  const game = await findGameById(gameId);
  if (!game) {
    return res.status(404).json({ message: '対象の試合が見つかりません。' });
  }

  const candidates = await parseScorebookText(extractedText);
  const upload = await createScorebookUpload({
    gameId,
    fileName,
    imageDataUrl,
    extractedText,
    candidates,
    createdBy: req.session.user.id,
    parseStatus: candidates.length > 0 ? 'parsed' : 'needs_manual_review',
  });

  res.status(201).json({
    message:
      candidates.length > 0
        ? 'スコアブック画像から入力候補を作成しました。内容を確認して保存してください。'
        : '候補を十分に読み取れなかったため、手動修正してください。',
    upload,
  });
});

app.get('/api/stat-entries', requireLogin, async (req, res) => {
  const visibleEntries = await listStatEntries(req.session.user.role === 'player' ? { playerId: req.session.user.id } : {});
  const users = await listUsers();
  const userMap = new Map(users.map((user) => [user.id, user]));
  res.status(200).json({ entries: await Promise.all(visibleEntries.map((entry) => serializeEntry(entry, userMap))) });
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

initDatabase()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`Server listening on http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
