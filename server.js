const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');

const {
  createGame,
  createDiaryNote,
  createMeeting,
  createScorebookUpload,
  createUser,
  createVideo,
  deleteConditionRecordByUserAndDate,
  deleteDiaryNote,
  deleteUserAccount,
  deleteVideoById,
  findBig3RecordByUserId,
  findConditionRecordByUserAndDate,
  findDailyLogByUserAndDate,
  findDiaryNoteById,
  findGameById,
  findUserByEmail,
  findUserById,
  getCounts,
  initDatabase,
  listBig3Records,
  listConditionRecords,
  listDailyLogs,
  listDiaryNotes,
  listGames,
  listMeetings,
  listScorebookUploads,
  listStatEntries,
  listUsers,
  sessionStore,
  updateDiaryNote,
  upsertDailyLog,
  upsertBig3Record,
  upsertConditionRecord,
  upsertStatEntry,
  updateUserProfile,
} = require('./db/mysql');

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const rootDir = __dirname;
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);
const useSecureCookie = process.env.NODE_ENV === 'production' || isRailway;

const AppRoles = require('./js/roles');
const AppStats = require('./js/stats');
const ALLOWED_ROLES = new Set(AppRoles.ALLOWED_ROLES);
const ROLE_LABELS = AppRoles.ROLE_LABELS;
const PLAYER_META_DEFAULTS = {
  bats: '右',
  throws: '右',
  position: '未設定',
  grade: '',
  personalGoal: '',
};
const PLAYER_GRADE_OPTIONS = Object.freeze(['1年', '2年', '3年', 'その他']);
const ALLOWED_PLAYER_GRADES = new Set(PLAYER_GRADE_OPTIONS);
const GAME_TYPE_LABELS = {
  official: '公式戦',
  practice: '練習試合',
  intrasquad: '紅白戦',
};
const ALLOWED_GAME_TYPES = new Set(Object.keys(GAME_TYPE_LABELS));
const COACH_DIARY_STAMPS = Object.freeze([
  'いいね',
  'ナイス',
  'おつかれ',
  'ファイト',
  'すごい',
]);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'm4v']);
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

const uploadVideoMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const extension = String(file.originalname || '').split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_VIDEO_MIME_TYPES.has(file.mimetype) && !ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
      cb(new Error('動画形式は mp4 / mov / webm / m4v のみ対応しています。'));
      return;
    }
    cb(null, true);
  },
});

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true,
  });
}

function normalizeGameType(value) {
  const normalized = String(value || '').trim();
  return ALLOWED_GAME_TYPES.has(normalized) ? normalized : '';
}

function normalizePlayerGrade(value) {
  const normalized = String(value || '').trim();
  return ALLOWED_PLAYER_GRADES.has(normalized) ? normalized : '';
}

function parsePlayerGradeInput(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return { ok: true, grade: '' };
  }
  if (!ALLOWED_PLAYER_GRADES.has(normalized)) {
    return { ok: false, message: '学年は 未設定 / 1年 / 2年 / 3年 / その他 から選択してください。' };
  }
  return { ok: true, grade: normalized };
}


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

function parseNullableNumber(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDiaryTags(value) {
  const rawValues = Array.isArray(value)
    ? value
    : String(value || '')
        .split(/[,\n、]/)
        .map((item) => item.trim());
  return [...new Set(rawValues.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 12);
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
}

function validateDiaryNoteInput(rawInput = {}) {
  const entryDate = String(rawInput.entryDate || '').trim();
  const body = String(rawInput.body || '').trim();
  const tags = normalizeDiaryTags(rawInput.tags);

  if (!entryDate) {
    return { error: '日付を入力してください。' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return { error: '日付の形式が不正です。' };
  }
  if (!isValidIsoDate(entryDate)) {
    return { error: '実在する日付を入力してください。' };
  }
  if (!body) {
    return { error: '本文を入力してください。' };
  }
  if (body.length > 4000) {
    return { error: '本文は4000文字以内で入力してください。' };
  }
  if (tags.some((tag) => tag.length > 30)) {
    return { error: 'タグは1つあたり30文字以内で入力してください。' };
  }

  const videoUrls = Array.isArray(rawInput.videoUrls)
    ? rawInput.videoUrls
    : String(rawInput.videoUrls || '')
        .split(/\r?\n|,/)
        .map((url) => url.trim())
        .filter(Boolean);
  const normalizedVideoUrls = [...new Set(videoUrls)].slice(0, 10);
  for (const videoUrl of normalizedVideoUrls) {
    try {
      const parsed = new URL(videoUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { error: '動画URLは http または https のみ利用できます。' };
      }
    } catch (_error) {
      return { error: '動画URLの形式が不正です。' };
    }
  }

  const removeVideoIds = Array.isArray(rawInput.removeVideoIds)
    ? rawInput.removeVideoIds
    : String(rawInput.removeVideoIds || '')
        .split(',')
        .map((id) => Number(id))
        .filter(Number.isFinite);

  return {
    values: {
      entryDate,
      body,
      tags,
      videoUrls: normalizedVideoUrls,
      removeVideoIds: [...new Set(removeVideoIds)],
    },
  };
}

function parseVideoTitle(fileName) {
  const base = String(fileName || '').trim().replace(/\.[^.]+$/, '');
  return base.slice(0, 255) || '練習動画';
}

function uploadBufferToCloudinaryVideo(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_DIARY_VIDEO_FOLDER || 'baseball-management/diary-videos',
        resource_type: 'video',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

function validateCoachDiaryReplyInput(rawInput = {}) {
  const message = String(rawInput.message || '').trim();
  const stamp = String(rawInput.stamp || '').trim();

  if (!message && !stamp) {
    return { error: '返信メッセージまたはスタンプを選択してください。' };
  }
  if (message.length > 500) {
    return { error: '返信メッセージは500文字以内で入力してください。' };
  }
  if (stamp && !COACH_DIARY_STAMPS.includes(stamp)) {
    return { error: '指定されたスタンプは利用できません。' };
  }

  return { values: { message, stamp } };
}

function validateBig3Input(rawInput = {}) {
  const fields = [
    ['benchPress', 'ベンチプレス'],
    ['squat', 'スクワット'],
    ['deadlift', 'デッドリフト'],
  ];
  const normalized = {};
  for (const [key, label] of fields) {
    const rawValue = rawInput[key];
    const value = parseNullableNumber(rawValue);
    if (rawValue !== '' && rawValue != null && value == null) {
      return { error: `${label}は数値で入力してください。` };
    }
    if (value != null && value < 0) {
      return { error: `${label}は0kg未満を入力できません。` };
    }
    normalized[key] = value;
  }
  return { values: normalized };
}

const CONDITION_STATUS_LABELS = {
  poor: '不良',
  normal: '普通',
  good: '良好',
};
const FATIGUE_LEVEL_LABELS = {
  low: '低',
  medium: '中',
  high: '高',
};
const ALLOWED_CONDITION_STATUSES = new Set(Object.keys(CONDITION_STATUS_LABELS));
const ALLOWED_FATIGUE_LEVELS = new Set(Object.keys(FATIGUE_LEVEL_LABELS));

function parseInteger(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function validateConditionRecordInput(rawInput = {}) {
  const entryDate = String(rawInput.entryDate || '').trim();
  const conditionStatus = String(rawInput.conditionStatus || '').trim();
  const fatigueLevel = String(rawInput.fatigueLevel || '').trim();
  const weight = parseInteger(rawInput.weight);
  const sleepHours = parseInteger(rawInput.sleepHours);

  if (!entryDate) {
    return { error: '日付を入力してください。' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || !isValidIsoDate(entryDate)) {
    return { error: '実在する日付を入力してください。' };
  }
  if (!ALLOWED_CONDITION_STATUSES.has(conditionStatus)) {
    return { error: '体調を選択してください。' };
  }
  if (weight == null) {
    return { error: '体重は整数で入力してください。' };
  }
  if (weight < 0 || weight > 300) {
    return { error: '体重は0〜300の整数で入力してください。' };
  }
  if (sleepHours == null) {
    return { error: '睡眠時間は整数で入力してください。' };
  }
  if (sleepHours < 0 || sleepHours > 24) {
    return { error: '睡眠時間は0〜24の整数で入力してください。' };
  }
  if (!ALLOWED_FATIGUE_LEVELS.has(fatigueLevel)) {
    return { error: '疲労度を選択してください。' };
  }

  return {
    values: {
      entryDate,
      conditionStatus,
      weight,
      sleepHours,
      fatigueLevel,
    },
  };
}

function validateDailyLogInput(rawInput = {}) {
  const userId = Number(rawInput.userId);
  const entryDate = String(rawInput.entryDate || rawInput.date || '').trim();
  const submitted = rawInput.submitted;

  if (!userId) {
    return { error: '対象選手を指定してください。' };
  }
  if (!entryDate) {
    return { error: '日付を入力してください。' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || !isValidIsoDate(entryDate)) {
    return { error: '実在する日付を入力してください。' };
  }
  if (typeof submitted !== 'boolean') {
    return { error: '提出状況を選択してください。' };
  }

  return {
    values: {
      userId,
      entryDate,
      submitted,
    },
  };
}

function isValidYearMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return false;
  const [yearText, monthText] = String(value).split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
}

function getMonthDateRange(yearMonth) {
  const [yearText, monthText] = String(yearMonth).split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    daysInMonth: end.getUTCDate(),
  };
}

function clampMonthRateEndDate(yearMonth, todayIsoDate) {
  const monthRange = getMonthDateRange(yearMonth);
  if (yearMonth !== String(todayIsoDate || '').slice(0, 7)) {
    return monthRange.end;
  }
  return todayIsoDate < monthRange.start ? monthRange.start : todayIsoDate;
}

function getDailyLogSubmittedMap(logs) {
  return new Map(logs.map((log) => [log.entryDate, Boolean(log.submitted)]));
}

function calculateDailyLogStreak(logs, baseDate) {
  if (!baseDate) return 0;
  const submittedByDate = getDailyLogSubmittedMap(logs);
  let cursor = new Date(`${baseDate}T00:00:00Z`);
  let streak = 0;
  while (!Number.isNaN(cursor.getTime())) {
    const isoDate = cursor.toISOString().slice(0, 10);
    if (!submittedByDate.get(isoDate)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function calculateMonthlySubmissionRate(logs, yearMonth, todayIsoDate) {
  if (!yearMonth || !isValidYearMonth(yearMonth)) {
    return { submittedCount: 0, expectedDays: 0, percentage: 0 };
  }

  const submittedByDate = getDailyLogSubmittedMap(logs);
  const monthRange = getMonthDateRange(yearMonth);
  const rateEndDate = clampMonthRateEndDate(yearMonth, todayIsoDate);
  const expectedDays = Math.max(
    0,
    Math.floor((new Date(`${rateEndDate}T00:00:00Z`) - new Date(`${monthRange.start}T00:00:00Z`)) / (24 * 60 * 60 * 1000)) + 1,
  );

  let submittedCount = 0;
  for (let day = 1; day <= expectedDays; day += 1) {
    const isoDate = `${yearMonth}-${String(day).padStart(2, '0')}`;
    if (submittedByDate.get(isoDate)) {
      submittedCount += 1;
    }
  }

  return {
    submittedCount,
    expectedDays,
    percentage: expectedDays ? Math.round((submittedCount / expectedDays) * 1000) / 10 : 0,
  };
}

function buildDailyLogCalendar(logs, yearMonth) {
  const submittedByDate = getDailyLogSubmittedMap(logs);
  const { daysInMonth } = getMonthDateRange(yearMonth);
  return Array.from({ length: daysInMonth }, (_value, index) => {
    const isoDate = `${yearMonth}-${String(index + 1).padStart(2, '0')}`;
    if (!submittedByDate.has(isoDate)) {
      return { entryDate: isoDate, status: 'unrecorded', submitted: null };
    }
    const submitted = Boolean(submittedByDate.get(isoDate));
    return {
      entryDate: isoDate,
      status: submitted ? 'submitted' : 'missed',
      submitted,
    };
  });
}

function validateMeetingInput(rawInput = {}) {
  const goodPoints = String(rawInput.goodPoints || '').trim();
  const improvementPoints = String(rawInput.improvementPoints || '').trim();
  const nextGoals = String(rawInput.nextGoals || '').trim();

  if (!goodPoints) {
    return { error: '良かった点を入力してください。' };
  }
  if (!improvementPoints) {
    return { error: '改善点を入力してください。' };
  }
  if (!nextGoals) {
    return { error: '次回の目標を入力してください。' };
  }
  if (goodPoints.length > 4000 || improvementPoints.length > 4000 || nextGoals.length > 4000) {
    return { error: '各項目は4000文字以内で入力してください。' };
  }

  return {
    values: {
      goodPoints,
      improvementPoints,
      nextGoals,
    },
  };
}

function calculateBig3Total(record) {
  return ['benchPress', 'squat', 'deadlift'].reduce((sum, key) => sum + (record[key] == null ? 0 : parseNumber(record[key])), 0);
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
      grade: normalizePlayerGrade((user.profile || {}).grade),
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
  const normalizedInput = AppStats.applyPitchingBattedBallBreakdown(rawInput);
  const normalizedBattedBallProfile = AppStats.normalizePitchingBattedBallProfile(normalizedInput.pitchingBattedBallProfile);
  const raw = {
    pitchCount: parseNumber(normalizedInput.pitchCount),
    outsRecorded: parseNumber(normalizedInput.outsRecorded),
    maxVelocity: parseNumber(normalizedInput.maxVelocity),
    averageVelocity: parseNumber(normalizedInput.averageVelocity),
    breakingBallRate: parseNumber(normalizedInput.breakingBallRate),
    battersFaced: parseNumber(normalizedInput.battersFaced),
    hitsAllowed: parseNumber(normalizedInput.hitsAllowed),
    walks: parseNumber(normalizedInput.walks),
    hitByPitch: parseNumber(normalizedInput.hitByPitch),
    strikeouts: parseNumber(normalizedInput.strikeouts),
    earnedRuns: parseNumber(normalizedInput.earnedRuns),
    homeRunsAllowed: parseNumber(normalizedInput.homeRunsAllowed),
    groundOuts: parseNumber(normalizedInput.groundOuts),
    flyOuts: parseNumber(normalizedInput.flyOuts),
    vsLeftBatters: parseNumber(normalizedInput.vsLeftBatters),
    vsLeftHits: parseNumber(normalizedInput.vsLeftHits),
    vsRightBatters: parseNumber(normalizedInput.vsRightBatters),
    vsRightHits: parseNumber(normalizedInput.vsRightHits),
    fastballPull: parseNumber(normalizedInput.fastballPull),
    fastballCenter: parseNumber(normalizedInput.fastballCenter),
    fastballOpposite: parseNumber(normalizedInput.fastballOpposite),
    breakingPull: parseNumber(normalizedInput.breakingPull),
    breakingCenter: parseNumber(normalizedInput.breakingCenter),
    breakingOpposite: parseNumber(normalizedInput.breakingOpposite),
    offspeedPull: parseNumber(normalizedInput.offspeedPull),
    offspeedCenter: parseNumber(normalizedInput.offspeedCenter),
    offspeedOpposite: parseNumber(normalizedInput.offspeedOpposite),
    pitchingBattedBallProfile: normalizedBattedBallProfile,
  };
  const inningsPitched = outsToInnings(raw.outsRecorded);
  const walksAndHitByPitch = raw.walks + raw.hitByPitch;
  const hitAverage = ratio(raw.hitsAllowed, raw.battersFaced);
  const vsLeftHitAverage = ratio(raw.vsLeftHits, raw.vsLeftBatters);
  const vsRightHitAverage = ratio(raw.vsRightHits, raw.vsRightBatters);
  const era = ratio(raw.earnedRuns * 9, inningsPitched);
  const whip = ratio(raw.hitsAllowed + raw.walks, inningsPitched);
  const groundFlyRatio = raw.flyOuts ? raw.groundOuts / raw.flyOuts : raw.groundOuts ? raw.groundOuts : 0;
  const battedBallBreakdown = AppStats.summarizePitchingBattedBallProfile(raw.pitchingBattedBallProfile, raw.groundOuts, raw.flyOuts);

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
      pitchingBattedBallBreakdown: {
        rows: battedBallBreakdown.rows,
        totals: battedBallBreakdown.totals,
      },
      pitchTypeBattedBallDirection: {
        fastball: { pull: raw.fastballPull, center: raw.fastballCenter, opposite: raw.fastballOpposite },
        breaking: { pull: raw.breakingPull, center: raw.breakingCenter, opposite: raw.breakingOpposite },
        offspeed: { pull: raw.offspeedPull, center: raw.offspeedCenter, opposite: raw.offspeedOpposite },
      },
    },
  };
}

function mergePitchingBattedBallProfile(currentProfile, nextProfile) {
  const mergedProfile = AppStats.normalizePitchingBattedBallProfile(currentProfile);
  const normalizedNextProfile = AppStats.normalizePitchingBattedBallProfile(nextProfile);

  AppStats.PITCH_TYPE_OPTIONS.forEach(({ key: pitchTypeKey }) => {
    AppStats.BATTED_BALL_TYPE_OPTIONS.forEach(({ key: battedBallTypeKey }) => {
      mergedProfile[pitchTypeKey][battedBallTypeKey] += normalizedNextProfile[pitchTypeKey][battedBallTypeKey];
    });
  });

  return mergedProfile;
}

function createEmptyAggregateTotals() {
  return {
    batting: deriveBatting().raw,
    pitching: derivePitching().raw,
  };
}

function mergeEntryIntoAggregateTotals(totals, entry) {
  if (!totals || !entry) return;

  if (entry.category === 'batting') {
    for (const [key, value] of Object.entries(entry.raw || {})) {
      totals.batting[key] = parseNumber(totals.batting[key]) + parseNumber(value);
    }
  }

  if (entry.category === 'pitching') {
    for (const [key, value] of Object.entries(entry.raw || {})) {
      if (key === 'pitchingBattedBallProfile') {
        totals.pitching.pitchingBattedBallProfile = mergePitchingBattedBallProfile(totals.pitching.pitchingBattedBallProfile, value);
        continue;
      }
      totals.pitching[key] = parseNumber(totals.pitching[key]) + parseNumber(value);
    }
  }
}

function finalizeAggregateTotals(totals) {
  return {
    batting: deriveBatting(totals.batting),
    pitching: derivePitching(totals.pitching),
  };
}

function buildGameTypeMap(games = []) {
  return new Map(games.map((game) => [Number(game.id), game.gameType]));
}

function createEmptySummaryBuckets() {
  return AppStats.PERFORMANCE_SUMMARY_BUCKETS.reduce((buckets, bucket) => {
    buckets[bucket.key] = createEmptyAggregateTotals();
    return buckets;
  }, {});
}

async function aggregateStatsForPlayer(playerId, allEntries, gamesOrGameTypeMap) {
  const entries = allEntries || (await listStatEntries({ playerId }));
  const gameTypeById =
    gamesOrGameTypeMap instanceof Map
      ? gamesOrGameTypeMap
      : buildGameTypeMap(Array.isArray(gamesOrGameTypeMap) ? gamesOrGameTypeMap : (await listGames()));
  const overallTotals = createEmptyAggregateTotals();
  const totalsByBucket = createEmptySummaryBuckets();

  for (const entry of entries.filter((item) => item.playerId === Number(playerId))) {
    mergeEntryIntoAggregateTotals(overallTotals, entry);
    const bucketKey = AppStats.getPerformanceSummaryBucketForGameType(gameTypeById.get(Number(entry.gameId)));
    mergeEntryIntoAggregateTotals(totalsByBucket[bucketKey], entry);
  }

  return {
    ...finalizeAggregateTotals(overallTotals),
    byBucket: AppStats.PERFORMANCE_SUMMARY_BUCKETS.reduce((result, bucket) => {
      result[bucket.key] = finalizeAggregateTotals(totalsByBucket[bucket.key]);
      return result;
    }, {}),
  };
}

async function aggregateTeamStats(players, games, entries) {
  const battingTotals = deriveBatting().raw;
  const pitchingTotals = derivePitching().raw;
  const gameTypeById = buildGameTypeMap(games);

  for (const player of players) {
    const summary = await aggregateStatsForPlayer(player.id, entries, gameTypeById);
    for (const [key, value] of Object.entries(summary.batting.raw)) {
      battingTotals[key] = parseNumber(battingTotals[key]) + parseNumber(value);
    }
    for (const [key, value] of Object.entries(summary.pitching.raw)) {
      if (key === 'pitchingBattedBallProfile') {
        pitchingTotals.pitchingBattedBallProfile = mergePitchingBattedBallProfile(pitchingTotals.pitchingBattedBallProfile, value);
        continue;
      }
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

async function buildRankings(players, entries, gameTypeById) {
  const rankings = [];
  for (const player of players) {
    const summary = await aggregateStatsForPlayer(player.id, entries, gameTypeById);
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

function buildBig3Rankings(players, big3Records) {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const lifts = [
    { key: 'benchPress', label: 'ベンチプレス' },
    { key: 'squat', label: 'スクワット' },
    { key: 'deadlift', label: 'デッドリフト' },
    { key: 'total', label: 'BIG3合計' },
  ];

  const rankingByLift = {};
  lifts.forEach(({ key, label }) => {
    const entriesForLift = big3Records
      .map((record) => {
        const player = playerMap.get(record.userId);
        if (!player) return null;
        const weight = key === 'total' ? calculateBig3Total(record) : record[key];
        if (weight == null || weight <= 0) return null;
        return {
          userId: player.id,
          userName: player.name,
          weight: Number(weight),
          updatedAt: record.updatedAt,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.weight - a.weight || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || a.userName.localeCompare(b.userName, 'ja'));

    let previousWeight = null;
    let previousRank = 0;
    rankingByLift[key] = {
      key,
      label,
      entries: entriesForLift.map((entry, index) => {
        const rank = previousWeight !== null && previousWeight === entry.weight ? previousRank : index + 1;
        previousWeight = entry.weight;
        previousRank = rank;
        return { ...entry, rank, isLeader: rank === 1 };
      }),
    };
  });

  return rankingByLift;
}

function buildGameSummary(game, entries, uploads) {
  if (!game) return null;
  const battingPlayerCount = new Set(entries.filter((entry) => entry.gameId === game.id && entry.category === 'batting').map((entry) => entry.playerId)).size;
  const pitchingPlayerCount = new Set(entries.filter((entry) => entry.gameId === game.id && entry.category === 'pitching').map((entry) => entry.playerId)).size;
  return {
    ...game,
    gameTypeLabel: GAME_TYPE_LABELS[game.gameType] || game.gameType,
    battingPlayerCount,
    pitchingPlayerCount,
    scorebookCount: uploads.filter((item) => item.gameId === game.id).length,
  };
}

async function buildDashboardPayload(reqUser) {
  const [user, players, games, entries, uploads, big3Records, currentBig3Record] = await Promise.all([
    findUserById(reqUser.id),
    getPlayerUsers(),
    listGames(),
    listStatEntries(),
    listScorebookUploads(),
    listBig3Records(),
    findBig3RecordByUserId(reqUser.id),
  ]);
  const recentGame = buildGameSummary(games[0], entries, uploads);
  const gameTypeById = buildGameTypeMap(games);
  const team = await aggregateTeamStats(players, games, entries);
  const rankings = await buildRankings(players, entries, gameTypeById);
  const big3Rankings = buildBig3Rankings(players, big3Records);

  const playerSummaries = [];
  for (const player of players) {
    playerSummaries.push({
      player,
      summary: await aggregateStatsForPlayer(player.id, entries, gameTypeById),
    });
  }

  const personalSummary =
    reqUser.role === 'manager'
      ? null
      : await aggregateStatsForPlayer(
          reqUser.role === 'player' ? reqUser.id : (playerSummaries[0] && playerSummaries[0].player.id),
          entries,
          gameTypeById,
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
    big3: {
      currentRecord: currentBig3Record,
      rankings: big3Rankings,
      recordsByUser: Object.fromEntries(big3Records.map((record) => [record.userId, record])),
      leaderboardLimit: 10,
    },
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
    const pitchingBattedBallProfile = AppStats.emptyPitchingBattedBallProfile();
    for (const token of tokens) {
      if (category === 'pitching' && AppStats.extractBreakdownToken(token, pitchingBattedBallProfile)) {
        continue;
      }
      const [key, value] = token.split('=');
      if (!key) continue;
      raw[key] = parseNumber(value);
    }
    if (category === 'pitching') {
      raw.pitchingBattedBallProfile = pitchingBattedBallProfile;
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
  const parsedGrade = parsePlayerGradeInput(req.body.grade);
  if (!parsedGrade.ok) {
    return res.status(400).json({ message: parsedGrade.message });
  }
  const grade = parsedGrade.grade;

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
    profile: { ...PLAYER_META_DEFAULTS, grade: role === 'player' ? grade : '' },
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
    return res.status(200).json({
      players: user
        ? [{ id: user.id, name: user.name, role: user.role, ...PLAYER_META_DEFAULTS, ...(user.profile || {}), grade: normalizePlayerGrade((user.profile || {}).grade) }]
        : [],
    });
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
  const gameType = normalizeGameType(req.body.gameType);
  const teamScore = parseNumber(req.body.teamScore);
  const opponentScore = parseNumber(req.body.opponentScore);
  if (!date || !opponent) {
    return res.status(400).json({ message: '試合日と対戦相手は必須です。' });
  }
  if (!gameType) {
    return res.status(400).json({ message: '試合種別を選択してください。' });
  }
  const result = teamScore > opponentScore ? 'win' : teamScore < opponentScore ? 'loss' : 'draw';
  const game = await createGame({
    date,
    opponent,
    location,
    gameType,
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
  const [entries, scorebooks, users, meetings] = await Promise.all([
    listStatEntries({ gameId: game.id }),
    listScorebookUploads({ gameId: game.id }),
    listUsers(),
    listMeetings({ gameId: game.id }),
  ]);
  const userMap = new Map(users.map((user) => [user.id, user]));
  return res.status(200).json({
    game: buildGameSummary(game, entries, scorebooks),
    entries: await Promise.all(entries.map((entry) => serializeEntry(entry, userMap))),
    scorebooks,
    meetings: meetings.map((meeting) => ({
      ...meeting,
      createdByName: meeting.createdBy ? (userMap.get(meeting.createdBy)?.name || '') : '',
    })),
  });
});

app.get('/api/meetings', requireLogin, async (_req, res) => {
  const [meetings, users] = await Promise.all([listMeetings(), listUsers()]);
  const userMap = new Map(users.map((user) => [user.id, user]));
  return res.status(200).json({
    meetings: meetings.map((meeting) => ({
      ...meeting,
      createdByName: meeting.createdBy ? (userMap.get(meeting.createdBy)?.name || '') : '',
    })),
  });
});

app.post('/api/games/:id/meetings', requireLogin, async (req, res) => {
  const gameId = Number(req.params.id);
  const game = await findGameById(gameId);
  if (!game) {
    return res.status(404).json({ message: '試合が見つかりません。' });
  }

  const validated = validateMeetingInput(req.body);
  if (validated.error) {
    return res.status(400).json({ message: validated.error });
  }

  const meeting = await createMeeting({
    gameId: game.id,
    ...validated.values,
    createdBy: req.session.user.id,
  });
  return res.status(201).json({ meeting, message: 'ミーティングを記録しました。' });
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


app.put('/api/profile/grade', requireRole(['player']), async (req, res) => {
  const user = await findUserById(req.session.user.id);
  if (!user || user.role !== 'player') {
    return res.status(404).json({ message: '対象の選手が見つかりません。' });
  }

  const parsedGrade = parsePlayerGradeInput(req.body.grade);
  if (!parsedGrade.ok) {
    return res.status(400).json({ message: parsedGrade.message });
  }
  const grade = parsedGrade.grade;
  const updatedUser = await updateUserProfile(user.id, {
    ...PLAYER_META_DEFAULTS,
    ...(user.profile || {}),
    grade,
  });
  req.session.user = sanitizeUser(updatedUser);
  await saveSession(req);

  return res.status(200).json({
    message: grade ? '学年を保存しました。' : '学年を未設定にしました。',
    user: sanitizeUser(updatedUser),
  });
});

app.put('/api/profile/personal-goal', requireRole(['player']), async (req, res) => {
  const user = await findUserById(req.session.user.id);
  if (!user || user.role !== 'player') {
    return res.status(404).json({ message: '対象の選手が見つかりません。' });
  }

  const personalGoal = String(req.body.personalGoal || '').trim();
  if (personalGoal.length > 300) {
    return res.status(400).json({ message: '個人目標は300文字以内で入力してください。' });
  }

  const updatedUser = await updateUserProfile(user.id, {
    ...PLAYER_META_DEFAULTS,
    ...(user.profile || {}),
    personalGoal,
  });
  req.session.user = sanitizeUser(updatedUser);
  await saveSession(req);

  return res.status(200).json({
    message: personalGoal ? '個人目標を保存しました。' : '個人目標をクリアしました。',
    user: sanitizeUser(updatedUser),
  });
});

app.post('/api/big3', requireRole(['manager', 'player']), async (req, res) => {
  const userId = Number(req.body.userId);
  if (!userId) {
    return res.status(400).json({ message: '対象ユーザーを指定してください。' });
  }
  if (!canEditPlayer(req.session.user, userId)) {
    return res.status(403).json({ message: 'この選手のBIG3記録は編集できません。' });
  }
  const player = await findUserById(userId);
  if (!player || player.role !== 'player') {
    return res.status(404).json({ message: '対象の選手が見つかりません。' });
  }

  const validation = validateBig3Input(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const record = await upsertBig3Record({ userId, ...validation.values });
  return res.status(200).json({ message: 'BIG3記録を保存しました。', record });
});

app.get('/api/diary-notes', requireRole(['player']), async (req, res) => {
  const notes = await listDiaryNotes({ userId: req.session.user.id });
  return res.status(200).json({ notes });
});

app.get('/api/coach/diary-notes', requireRole(['coach']), async (req, res) => {
  const [notes, users] = await Promise.all([listDiaryNotes(), listUsers()]);
  const playerMap = new Map(
    users
      .filter((user) => user.role === 'player')
      .map((user) => [user.id, user]),
  );

  return res.status(200).json({
    stampOptions: COACH_DIARY_STAMPS,
    notes: notes
      .filter((note) => playerMap.has(note.userId))
      .map((note) => {
        const player = playerMap.get(note.userId);
        return {
          ...note,
          playerId: note.userId,
          playerName: player?.name || `選手#${note.userId}`,
          playerProfile: player?.profile || {},
        };
      }),
  });
});

app.post('/api/diary-videos/upload', requireRole(['player']), uploadVideoMiddleware.array('videos', 5), async (req, res) => {
  if (!process.env.CLOUDINARY_URL) {
    return res.status(500).json({ message: '動画アップロード設定(CLOUDINARY_URL)が未設定です。' });
  }
  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) {
    return res.status(400).json({ message: 'アップロードする動画を選択してください。' });
  }

  try {
    const uploads = await Promise.all(
      files.map(async (file) => {
        const result = await uploadBufferToCloudinaryVideo(file.buffer);
        return {
          title: parseVideoTitle(file.originalname),
          video: result.secure_url,
          publicId: result.public_id,
          fileBytes: Number(file.size || result.bytes || 0) || null,
          mimeType: file.mimetype || null,
          sourceType: 'upload',
        };
      }),
    );
    return res.status(201).json({ videos: uploads });
  } catch (error) {
    return res.status(500).json({ message: '動画アップロードに失敗しました。', detail: error.message });
  }
});

app.post('/api/diary-notes', requireRole(['player']), async (req, res) => {
  const validation = validateDiaryNoteInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const note = await createDiaryNote({
    userId: req.session.user.id,
    ...validation.values,
    coachComments: [],
    coachStamps: [],
    createdBy: req.session.user.id,
    updatedBy: req.session.user.id,
  });

  const requestedVideos = Array.isArray(req.body.videos) ? req.body.videos : [];
  const normalizedUploadedVideos = requestedVideos
    .filter((video) => video && typeof video === 'object' && typeof video.video === 'string')
    .slice(0, 10);

  await Promise.all([
    ...normalizedUploadedVideos.map((video) => createVideo({
      userId: req.session.user.id,
      dailyLogId: note.id,
      video: String(video.video || '').slice(0, 1024),
      title: String(video.title || '練習動画').slice(0, 255),
      sourceType: video.sourceType === 'external' ? 'external' : 'upload',
      publicId: video.publicId ? String(video.publicId).slice(0, 255) : null,
      fileBytes: Number.isFinite(Number(video.fileBytes)) ? Number(video.fileBytes) : null,
      mimeType: video.mimeType ? String(video.mimeType).slice(0, 100) : null,
    })),
    ...validation.values.videoUrls.map((videoUrl) => createVideo({
      userId: req.session.user.id,
      dailyLogId: note.id,
      video: videoUrl,
      title: '外部動画リンク',
      sourceType: 'external',
    })),
  ]);

  const latestNote = await findDiaryNoteById(note.id);
  return res.status(201).json({ message: '野球日誌を作成しました。', note: latestNote });
});

app.put('/api/diary-notes/:id', requireRole(['player']), async (req, res) => {
  const noteId = Number(req.params.id);
  if (!noteId) {
    return res.status(400).json({ message: '対象ノートが不正です。' });
  }
  const existingNote = await findDiaryNoteById(noteId);
  if (!existingNote || existingNote.userId !== req.session.user.id) {
    return res.status(404).json({ message: '対象の野球日誌が見つかりません。' });
  }

  const validation = validateDiaryNoteInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const note = await updateDiaryNote(noteId, {
    ...validation.values,
    tags: validation.values.tags,
    coachComments: existingNote.coachComments || [],
    coachStamps: existingNote.coachStamps || [],
    updatedBy: req.session.user.id,
  });

  const requestedVideos = Array.isArray(req.body.videos) ? req.body.videos : [];
  const normalizedUploadedVideos = requestedVideos
    .filter((video) => video && typeof video === 'object' && typeof video.video === 'string')
    .slice(0, 10);

  await Promise.all(normalizedUploadedVideos.map((video) => createVideo({
    userId: req.session.user.id,
    dailyLogId: note.id,
    video: String(video.video || '').slice(0, 1024),
    title: String(video.title || '練習動画').slice(0, 255),
    sourceType: video.sourceType === 'external' ? 'external' : 'upload',
    publicId: video.publicId ? String(video.publicId).slice(0, 255) : null,
    fileBytes: Number.isFinite(Number(video.fileBytes)) ? Number(video.fileBytes) : null,
    mimeType: video.mimeType ? String(video.mimeType).slice(0, 100) : null,
  })));

  const existingVideoIds = new Set((existingNote.videos || []).map((video) => Number(video.id)));
  await Promise.all(
    validation.values.removeVideoIds
      .filter((videoId) => existingVideoIds.has(Number(videoId)))
      .map((videoId) => deleteVideoById({ id: videoId, userId: req.session.user.id })),
  );

  await Promise.all(validation.values.videoUrls.map((videoUrl) => createVideo({
    userId: req.session.user.id,
    dailyLogId: note.id,
    video: videoUrl,
    title: '外部動画リンク',
    sourceType: 'external',
  })));

  const latestNote = await findDiaryNoteById(note.id);
  return res.status(200).json({ message: '野球日誌を更新しました。', note: latestNote });
});

app.post('/api/coach/diary-notes/:id/replies', requireRole(['coach']), async (req, res) => {
  const noteId = Number(req.params.id);
  if (!noteId) {
    return res.status(400).json({ message: '対象ノートが不正です。' });
  }

  const existingNote = await findDiaryNoteById(noteId);
  if (!existingNote) {
    return res.status(404).json({ message: '対象の野球日誌が見つかりません。' });
  }

  const validation = validateCoachDiaryReplyInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const repliedAt = new Date().toISOString();
  const coachComments = [...(existingNote.coachComments || [])];
  const coachStamps = [...(existingNote.coachStamps || [])];

  if (validation.values.message) {
    coachComments.push({
      id: `comment-${Date.now()}`,
      noteId,
      playerId: existingNote.userId,
      author: req.session.user.name || '指導者',
      body: validation.values.message,
      repliedAt,
    });
  }

  if (validation.values.stamp) {
    coachStamps.push({
      id: `stamp-${Date.now()}`,
      noteId,
      playerId: existingNote.userId,
      label: validation.values.stamp,
      author: req.session.user.name || '指導者',
      repliedAt,
    });
  }

  const note = await updateDiaryNote(noteId, {
    entryDate: existingNote.entryDate,
    body: existingNote.body,
    tags: existingNote.tags || [],
    coachComments,
    coachStamps,
    updatedBy: req.session.user.id,
  });

  const player = await findUserById(existingNote.userId);
  return res.status(200).json({
    message: '野球日誌へ返信しました。',
    stampOptions: COACH_DIARY_STAMPS,
    note: {
      ...note,
      playerId: note.userId,
      playerName: player?.name || `選手#${note.userId}`,
      playerProfile: player?.profile || {},
    },
  });
});

app.delete('/api/diary-notes/:id', requireRole(['player']), async (req, res) => {
  const noteId = Number(req.params.id);
  if (!noteId) {
    return res.status(400).json({ message: '対象ノートが不正です。' });
  }
  const existingNote = await findDiaryNoteById(noteId);
  if (!existingNote || existingNote.userId !== req.session.user.id) {
    return res.status(404).json({ message: '対象の野球日誌が見つかりません。' });
  }

  await deleteDiaryNote(noteId);
  return res.status(200).json({ message: '野球日誌を削除しました。' });
});

app.get('/api/condition-records', requireRole(['player']), async (req, res) => {
  const records = (await listConditionRecords({ userId: req.session.user.id })).map((record) => ({
    ...record,
    conditionStatusLabel: CONDITION_STATUS_LABELS[record.conditionStatus] || record.conditionStatus,
    fatigueLevelLabel: FATIGUE_LEVEL_LABELS[record.fatigueLevel] || record.fatigueLevel,
  }));
  return res.status(200).json({ records });
});

app.get('/api/team-condition-records', requireRole(['coach', 'manager']), async (req, res) => {
  const [players, records] = await Promise.all([
    listUsers(),
    listConditionRecords(),
  ]);
  const playerMap = new Map(
    players
      .filter((user) => user.role === 'player')
      .map((user) => [user.id, user]),
  );

  return res.status(200).json({
    players: [...playerMap.values()]
      .map((player) => ({
        id: player.id,
        name: player.name,
        role: player.role,
        profile: player.profile || {},
      }))
      .sort((left, right) => left.id - right.id),
    records: records
      .filter((record) => playerMap.has(record.userId))
      .map((record) => ({
        ...record,
        playerName: playerMap.get(record.userId)?.name || `選手#${record.userId}`,
        conditionStatusLabel: CONDITION_STATUS_LABELS[record.conditionStatus] || record.conditionStatus,
        fatigueLevelLabel: FATIGUE_LEVEL_LABELS[record.fatigueLevel] || record.fatigueLevel,
      })),
  });
});

app.get('/api/manager/daily-logs', requireRole(['manager']), async (req, res) => {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7)).trim();
  const selectedDate = String(req.query.date || `${month}-01`).trim();

  if (!isValidYearMonth(month)) {
    return res.status(400).json({ message: '対象月が不正です。' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || !isValidIsoDate(selectedDate)) {
    return res.status(400).json({ message: '対象日が不正です。' });
  }

  const [players, logs] = await Promise.all([getPlayerUsers(), listDailyLogs()]);
  const logsByUserId = logs.reduce((map, log) => {
    const current = map.get(log.userId) || [];
    current.push(log);
    map.set(log.userId, current);
    return map;
  }, new Map());
  const todayIsoDate = new Date().toISOString().slice(0, 10);

  const playerStatuses = players.map((player) => {
    const playerLogs = logsByUserId.get(player.id) || [];
    const selectedLog = playerLogs.find((log) => log.entryDate === selectedDate) || null;
    const monthRate = calculateMonthlySubmissionRate(playerLogs, month, todayIsoDate);
    return {
      id: player.id,
      name: player.name,
      role: player.role,
      grade: normalizePlayerGrade(player.grade),
      position: player.position || '',
      bats: player.bats || '',
      throws: player.throws || '',
      selectedDateStatus: selectedLog
        ? {
            entryDate: selectedLog.entryDate,
            submitted: selectedLog.submitted,
            status: selectedLog.submitted ? 'submitted' : 'missed',
          }
        : {
            entryDate: selectedDate,
            submitted: null,
            status: 'unrecorded',
          },
      streak: calculateDailyLogStreak(playerLogs, selectedDate),
      monthRate,
      calendar: buildDailyLogCalendar(playerLogs, month),
    };
  });

  const missingPlayers = playerStatuses
    .filter((player) => player.selectedDateStatus.submitted !== true)
    .map((player) => ({
      id: player.id,
      name: player.name,
      grade: player.grade,
      position: player.position,
      status: player.selectedDateStatus.status,
    }));

  const submittedPlayers = playerStatuses.filter((player) => player.selectedDateStatus.submitted === true).length;

  return res.status(200).json({
    month,
    selectedDate,
    summary: {
      totalPlayers: playerStatuses.length,
      submittedPlayers,
      missingPlayers: missingPlayers.length,
      submissionRate: playerStatuses.length ? Math.round((submittedPlayers / playerStatuses.length) * 1000) / 10 : 0,
    },
    players: playerStatuses,
    missingPlayers,
  });
});

app.post('/api/manager/daily-logs', requireRole(['manager']), async (req, res) => {
  const validation = validateDailyLogInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const player = await findUserById(validation.values.userId);
  if (!player || player.role !== 'player') {
    return res.status(404).json({ message: '対象の選手が見つかりません。' });
  }

  const existingLog = await findDailyLogByUserAndDate(validation.values.userId, validation.values.entryDate);
  const log = await upsertDailyLog({
    userId: validation.values.userId,
    entryDate: validation.values.entryDate,
    submitted: validation.values.submitted,
    createdBy: existingLog ? existingLog.createdBy : req.session.user.id,
    updatedBy: req.session.user.id,
  });

  return res.status(existingLog ? 200 : 201).json({
    message: validation.values.submitted ? '提出済みとして記録しました。' : '未提出として記録しました。',
    log,
  });
});

app.get('/api/player-summaries/:playerId', requireRole(['coach']), async (req, res) => {
  const playerId = Number(req.params.playerId);
  if (!playerId) {
    return res.status(400).json({ message: '対象選手が不正です。' });
  }

  const [player, games, entries] = await Promise.all([
    findUserById(playerId),
    listGames(),
    listStatEntries(),
  ]);

  if (!player || player.role !== 'player') {
    return res.status(404).json({ message: '対象の選手が見つかりません。' });
  }

  const gameTypeById = buildGameTypeMap(games);
  const summary = await aggregateStatsForPlayer(player.id, entries, gameTypeById);

  return res.status(200).json({
    player: {
      id: player.id,
      name: player.name,
      role: player.role,
      ...PLAYER_META_DEFAULTS,
      ...(player.profile || {}),
      grade: normalizePlayerGrade((player.profile || {}).grade),
    },
    summary,
  });
});

app.post('/api/condition-records', requireRole(['player']), async (req, res) => {
  const validation = validateConditionRecordInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const existingRecord = await findConditionRecordByUserAndDate(req.session.user.id, validation.values.entryDate);
  const record = await upsertConditionRecord({
    userId: req.session.user.id,
    ...validation.values,
    createdBy: existingRecord ? existingRecord.createdBy : req.session.user.id,
    updatedBy: req.session.user.id,
  });

  return res.status(existingRecord ? 200 : 201).json({
    message: existingRecord ? '体調データを更新しました。' : '体調データを保存しました。',
    record,
    labels: {
      conditionStatus: CONDITION_STATUS_LABELS[record.conditionStatus] || record.conditionStatus,
      fatigueLevel: FATIGUE_LEVEL_LABELS[record.fatigueLevel] || record.fatigueLevel,
    },
  });
});

app.delete('/api/condition-records/:entryDate', requireRole(['player']), async (req, res) => {
  const entryDate = String(req.params.entryDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || !isValidIsoDate(entryDate)) {
    return res.status(400).json({ message: '削除対象の日付が不正です。' });
  }

  const deleted = await deleteConditionRecordByUserAndDate(req.session.user.id, entryDate);
  if (!deleted) {
    return res.status(404).json({ message: '削除対象の体調データが見つかりません。' });
  }

  return res.status(200).json({ message: '体調データを削除しました。' });
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

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '動画サイズは50MB以下にしてください。' });
    }
    return res.status(400).json({ message: `動画アップロードエラー: ${error.message}` });
  }
  if (error && typeof error.message === 'string' && error.message.includes('動画形式')) {
    return res.status(400).json({ message: error.message });
  }
  return next(error);
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
  const roleProtectedPages = {
    '/diary.html': ['player'],
    '/player.html': ['player'],
    '/condition-check.html': ['player'],
    '/manager.html': ['manager'],
    '/prepare.html': ['manager'],
    '/coach.html': ['coach'],
    '/coach-condition.html': ['coach', 'manager'],
    '/player-detail.html': ['coach'],
  };
  const allowedRoles = roleProtectedPages[req.path];
  if (allowedRoles && !allowedRoles.includes(req.session.user.role)) {
    return res.redirect('/index.html');
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
