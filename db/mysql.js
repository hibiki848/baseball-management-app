const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');

const migrationsDir = path.join(__dirname, 'migrations');
const requiredMigrationFiles = [
  '20260318_create_mysql_persistence.sql',
  '20260318_add_big3_records.sql',
  '20260319_add_baseball_diary_notes.sql',
  '20260319_add_player_condition_records.sql',
  '20260321_add_game_meetings.sql',
  '20260323_add_daily_logs.sql',
  '20260325_add_diary_videos.sql',
];

function buildPoolOptions() {
  const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || '';
  const options = {
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    namedPlaceholders: true,
    multipleStatements: true,
  };

  if (connectionUrl) {
    const parsed = new URL(connectionUrl);
    options.host = parsed.hostname;
    options.port = parsed.port ? Number(parsed.port) : 3306;
    options.user = decodeURIComponent(parsed.username);
    options.password = decodeURIComponent(parsed.password);
    options.database = parsed.pathname.replace(/^\//, '');
  } else {
    options.host = process.env.MYSQLHOST || process.env.MYSQL_HOST || '127.0.0.1';
    options.port = Number(process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306);
    options.user = process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
    options.password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '';
    options.database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';
  }

  if (String(process.env.MYSQL_SSL || '').toLowerCase() === 'true') {
    options.ssl = { rejectUnauthorized: false };
  }

  return options;
}

function normalizeDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeDiaryTags(value) {
  const source = Array.isArray(value) ? value : [value];
  return [...new Set(
    source
      .flatMap((item) => String(item || '').split(/[,\n、・]/))
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  )];
}

function normalizeProfile(value) {
  const parsed = parseJson(value, {});
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {};
  return parsed;
}

function parseNullableNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

class MySQLSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired().catch((error) => {
        console.error('[session-store] cleanup failed', error);
      });
    }, 15 * 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  async cleanupExpired() {
    await this.pool.query('DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < UTC_TIMESTAMP()');
  }

  get(sid, callback) {
    this.pool
      .query(
        `SELECT sess_json
         FROM sessions
         WHERE sid = ?
           AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
         LIMIT 1`,
        [sid],
      )
      .then(([rows]) => {
        if (!rows.length) {
          callback(null, null);
          return;
        }
        callback(null, parseJson(rows[0].sess_json, null));
      })
      .catch((error) => callback(error));
  }

  set(sid, sess, callback) {
    const expiresAt = sess?.cookie?.expires ? new Date(sess.cookie.expires) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    this.pool
      .query(
        `INSERT INTO sessions (sid, sess_json, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE sess_json = VALUES(sess_json), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP`,
        [sid, JSON.stringify(sess), Number.isNaN(expiresAt.getTime()) ? null : expiresAt],
      )
      .then(() => callback && callback(null))
      .catch((error) => callback && callback(error));
  }

  destroy(sid, callback) {
    this.pool
      .query('DELETE FROM sessions WHERE sid = ?', [sid])
      .then(() => callback && callback(null))
      .catch((error) => callback && callback(error));
  }

  touch(sid, sess, callback) {
    const expiresAt = sess?.cookie?.expires ? new Date(sess.cookie.expires) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    this.pool
      .query('UPDATE sessions SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE sid = ?', [expiresAt, sid])
      .then(() => callback && callback(null))
      .catch((error) => callback && callback(error));
  }

  close() {
    clearInterval(this.cleanupTimer);
  }
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    profile: normalizeProfile(row.profile_json),
    createdAt: normalizeDateTime(row.created_at),
  };
}

function mapGame(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    date: normalizeDate(row.game_date),
    opponent: row.opponent,
    location: row.location || '',
    gameType: row.game_type,
    teamScore: Number(row.team_score),
    opponentScore: Number(row.opponent_score),
    result: row.result,
    createdBy: row.created_by == null ? null : Number(row.created_by),
    createdAt: normalizeDateTime(row.created_at),
  };
}

function mapStatEntry(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    gameId: Number(row.game_id),
    playerId: Number(row.player_id),
    category: row.category,
    sourceType: row.source_type,
    scorebookUploadId: row.scorebook_upload_id == null ? null : Number(row.scorebook_upload_id),
    notes: row.notes || '',
    raw: parseJson(row.raw_payload, {}),
    derived: parseJson(row.derived_payload, {}),
    createdBy: row.created_by == null ? null : Number(row.created_by),
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  };
}

function mapScorebookUpload(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    gameId: Number(row.game_id),
    fileName: row.file_name,
    imageDataUrl: row.image_data,
    extractedText: row.extracted_text || '',
    candidates: parseJson(row.candidate_payload, []),
    createdBy: row.created_by == null ? null : Number(row.created_by),
    createdAt: normalizeDateTime(row.created_at),
    parseStatus: row.parse_status,
  };
}

function mapBig3Record(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    benchPress: parseNullableNumber(row.bench_press),
    squat: parseNullableNumber(row.squat),
    deadlift: parseNullableNumber(row.deadlift),
    recordedAt: normalizeDateTime(row.recorded_at),
    updatedAt: normalizeDateTime(row.updated_at),
  };
}

function mapDiaryNote(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    entryDate: normalizeDate(row.entry_date),
    body: row.body || '',
    tags: normalizeDiaryTags(parseJson(row.tags_json, [])),
    coachComments: parseJson(row.coach_comments_json, []),
    coachStamps: parseJson(row.coach_stamps_json, []),
    createdBy: row.created_by == null ? null : Number(row.created_by),
    updatedBy: row.updated_by == null ? null : Number(row.updated_by),
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  };
}

function mapConditionRecord(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    entryDate: normalizeDate(row.entry_date),
    conditionStatus: row.condition_status,
    weight: Number(row.weight),
    sleepHours: Number(row.sleep_hours),
    fatigueLevel: row.fatigue_level,
    createdBy: row.created_by == null ? null : Number(row.created_by),
    updatedBy: row.updated_by == null ? null : Number(row.updated_by),
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  };
}

function mapDailyLog(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    entryDate: normalizeDate(row.entry_date),
    submitted: Boolean(row.submitted),
    createdBy: row.created_by == null ? null : Number(row.created_by),
    updatedBy: row.updated_by == null ? null : Number(row.updated_by),
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  };
}

function mapVideo(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    dailyLogId: Number(row.daily_log_id),
    video: row.video || '',
    title: row.title || '',
    sourceType: row.source_type || 'upload',
    publicId: row.public_id || null,
    fileBytes: row.file_bytes == null ? null : Number(row.file_bytes),
    mimeType: row.mime_type || null,
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  };
}

function mapMeeting(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    gameId: Number(row.game_id),
    goodPoints: row.good_points || '',
    improvementPoints: row.improvement_points || '',
    nextGoals: row.next_goals || '',
    createdBy: row.created_by == null ? null : Number(row.created_by),
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at),
  };
}

const pool = mysql.createPool(buildPoolOptions());
const sessionStore = new MySQLSessionStore(pool);

async function initDatabase() {
  for (const file of requiredMigrationFiles) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
  }

  const userReferenceTables = [
    {
      tableName: 'player_condition_records',
      columns: [
        { name: 'user_id', nullable: false },
        { name: 'created_by', nullable: true },
        { name: 'updated_by', nullable: true },
      ],
      foreignKeys: [],
    },
    {
      tableName: 'baseball_diary_notes',
      columns: [
        { name: 'user_id', nullable: false },
        { name: 'created_by', nullable: true },
        { name: 'updated_by', nullable: true },
      ],
      foreignKeys: [
        { name: 'fk_baseball_diary_notes_user', column: 'user_id', onDelete: 'CASCADE' },
        { name: 'fk_baseball_diary_notes_created_by', column: 'created_by', onDelete: 'SET NULL' },
        { name: 'fk_baseball_diary_notes_updated_by', column: 'updated_by', onDelete: 'SET NULL' },
      ],
    },
    {
      tableName: 'daily_logs',
      columns: [
        { name: 'user_id', nullable: false },
        { name: 'created_by', nullable: true },
        { name: 'updated_by', nullable: true },
      ],
      foreignKeys: [
        { name: 'fk_daily_logs_user', column: 'user_id', onDelete: 'CASCADE' },
        { name: 'fk_daily_logs_created_by', column: 'created_by', onDelete: 'SET NULL' },
        { name: 'fk_daily_logs_updated_by', column: 'updated_by', onDelete: 'SET NULL' },
      ],
    },
    {
      tableName: 'videos',
      columns: [
        { name: 'user_id', nullable: false },
      ],
      foreignKeys: [
        { name: 'fk_videos_user', column: 'user_id', onDelete: 'CASCADE' },
      ],
    },
  ];

  const [columnRows] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND (
         (TABLE_NAME = 'games' AND COLUMN_NAME = 'game_type')
         OR (TABLE_NAME = 'users' AND COLUMN_NAME IN ('id', 'profile_json'))
         OR (TABLE_NAME IN (${userReferenceTables.map((table) => `'${table.tableName}'`).join(', ')})
             AND COLUMN_NAME IN ('user_id', 'created_by', 'updated_by'))
       )`,
  );

  const hasGameTypeColumn = columnRows.some((row) => row.TABLE_NAME === 'games' && row.COLUMN_NAME === 'game_type');
  const hasProfileJsonColumn = columnRows.some((row) => row.TABLE_NAME === 'users' && row.COLUMN_NAME === 'profile_json');
  const userIdColumn = columnRows.find((row) => row.TABLE_NAME === 'users' && row.COLUMN_NAME === 'id');

  if (!hasGameTypeColumn) {
    await pool.query(
      `ALTER TABLE games
       ADD COLUMN game_type ENUM('official', 'practice', 'intrasquad') NOT NULL DEFAULT 'official' AFTER location`,
    );
  }

  if (!hasProfileJsonColumn) {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN profile_json JSON NULL AFTER password_hash`,
    );
  }

  if (userIdColumn) {
    const userIdColumnType = userIdColumn.COLUMN_TYPE;
    for (const table of userReferenceTables) {
      const tableColumns = columnRows.filter((row) => row.TABLE_NAME === table.tableName);
      if (!tableColumns.length) continue;

      const requiresTypeFix = table.columns.some(({ name }) => {
        const column = tableColumns.find((row) => row.COLUMN_NAME === name);
        return column && column.COLUMN_TYPE !== userIdColumnType;
      });

      if (requiresTypeFix) {
        const modifyClauses = table.columns.map(
          ({ name, nullable }) => `MODIFY COLUMN ${name} ${userIdColumnType} ${nullable ? 'NULL' : 'NOT NULL'}`,
        );

        await pool.query(
          `ALTER TABLE ${table.tableName}
           ${modifyClauses.join(',\n           ')}`,
        );
      }
    }

    const [foreignKeyRows] = await pool.query(
      `SELECT TABLE_NAME, CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE()
         AND TABLE_NAME IN (${userReferenceTables.map((table) => `'${table.tableName}'`).join(', ')})`,
    );

    for (const table of userReferenceTables) {
      for (const foreignKey of table.foreignKeys) {
        const hasForeignKey = foreignKeyRows.some(
          (row) => row.TABLE_NAME === table.tableName && row.CONSTRAINT_NAME === foreignKey.name,
        );

        if (!hasForeignKey) {
          await pool.query(
            `ALTER TABLE ${table.tableName}
             ADD CONSTRAINT ${foreignKey.name}
             FOREIGN KEY (${foreignKey.column}) REFERENCES users(id) ON DELETE ${foreignKey.onDelete}`,
          );
        }
      }
    }
  }

  await pool.query(
    `UPDATE games
     SET game_type = 'official'
     WHERE game_type IS NULL OR game_type = ''`,
  );

  await pool.query(
    `UPDATE users
     SET profile_json = JSON_OBJECT()
     WHERE profile_json IS NULL`,
  );
}

async function getCounts() {
  const [userResult, gameResult, big3Result] = await Promise.all([
    pool.query('SELECT COUNT(*) AS count FROM users'),
    pool.query('SELECT COUNT(*) AS count FROM games'),
    pool.query('SELECT COUNT(*) AS count FROM big3_records'),
  ]);
  const [userRows] = userResult;
  const [gameRows] = gameResult;
  const [big3Rows] = big3Result;
  return {
    users: Number(userRows[0].count),
    games: Number(gameRows[0].count),
    big3Records: Number(big3Rows[0].count),
  };
}

async function findUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return mapUser(rows[0]);
}

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return mapUser(rows[0]);
}

async function createUser({ name, email, role, passwordHash, profile }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, role, password_hash, profile_json)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, role, passwordHash, JSON.stringify(normalizeProfile(profile))],
  );
  return findUserById(result.insertId);
}

async function updateUserProfile(userId, profile) {
  await pool.query(
    `UPDATE users
     SET profile_json = ?
     WHERE id = ?`,
    [JSON.stringify(normalizeProfile(profile)), userId],
  );
  return findUserById(userId);
}

async function deleteUserAccount(userId) {
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
}

async function listUsers() {
  const [rows] = await pool.query('SELECT * FROM users ORDER BY id ASC');
  return rows.map(mapUser);
}

async function listGames() {
  const [rows] = await pool.query('SELECT * FROM games ORDER BY game_date DESC, id DESC');
  return rows.map(mapGame);
}

async function findGameById(id) {
  const [rows] = await pool.query('SELECT * FROM games WHERE id = ? LIMIT 1', [id]);
  return mapGame(rows[0]);
}

async function createGame({ date, opponent, location, gameType, teamScore, opponentScore, result, createdBy }) {
  const [resultInfo] = await pool.query(
    `INSERT INTO games (game_date, opponent, location, game_type, team_score, opponent_score, result, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [date, opponent, location || null, gameType, teamScore, opponentScore, result, createdBy],
  );
  return findGameById(resultInfo.insertId);
}

async function listStatEntries(filters = {}) {
  const clauses = [];
  const values = [];
  if (filters.gameId != null) {
    clauses.push('game_id = ?');
    values.push(filters.gameId);
  }
  if (filters.playerId != null) {
    clauses.push('player_id = ?');
    values.push(filters.playerId);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM stat_entries ${whereClause} ORDER BY updated_at DESC, id DESC`,
    values,
  );
  return rows.map(mapStatEntry);
}

async function upsertStatEntry({ gameId, playerId, category, sourceType, notes, scorebookUploadId, raw, derived, createdBy }) {
  await pool.query(
    `INSERT INTO stat_entries (
      game_id,
      player_id,
      category,
      source_type,
      scorebook_upload_id,
      created_by,
      notes,
      raw_payload,
      derived_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      source_type = VALUES(source_type),
      scorebook_upload_id = VALUES(scorebook_upload_id),
      created_by = VALUES(created_by),
      notes = VALUES(notes),
      raw_payload = VALUES(raw_payload),
      derived_payload = VALUES(derived_payload),
      updated_at = CURRENT_TIMESTAMP`,
    [
      gameId,
      playerId,
      category,
      sourceType,
      scorebookUploadId,
      createdBy,
      notes,
      JSON.stringify(raw),
      JSON.stringify(derived),
    ],
  );

  const [rows] = await pool.query(
    `SELECT * FROM stat_entries WHERE game_id = ? AND player_id = ? AND category = ? LIMIT 1`,
    [gameId, playerId, category],
  );
  return mapStatEntry(rows[0]);
}

async function listScorebookUploads(filters = {}) {
  const clauses = [];
  const values = [];
  if (filters.gameId != null) {
    clauses.push('game_id = ?');
    values.push(filters.gameId);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM scorebook_uploads ${whereClause} ORDER BY created_at DESC, id DESC`,
    values,
  );
  return rows.map(mapScorebookUpload);
}

async function createScorebookUpload({ gameId, fileName, imageDataUrl, extractedText, parseStatus, candidates, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO scorebook_uploads (
      game_id,
      file_name,
      image_data,
      extracted_text,
      parse_status,
      candidate_payload,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [gameId, fileName, imageDataUrl, extractedText, parseStatus, JSON.stringify(candidates || []), createdBy],
  );
  const [rows] = await pool.query('SELECT * FROM scorebook_uploads WHERE id = ? LIMIT 1', [result.insertId]);
  return mapScorebookUpload(rows[0]);
}

async function listBig3Records() {
  const [rows] = await pool.query('SELECT * FROM big3_records ORDER BY updated_at DESC, id DESC');
  return rows.map(mapBig3Record);
}

async function findBig3RecordByUserId(userId) {
  const [rows] = await pool.query('SELECT * FROM big3_records WHERE user_id = ? LIMIT 1', [userId]);
  return mapBig3Record(rows[0]);
}

async function upsertBig3Record({ userId, benchPress, squat, deadlift }) {
  await pool.query(
    `INSERT INTO big3_records (user_id, bench_press, squat, deadlift)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       bench_press = VALUES(bench_press),
       squat = VALUES(squat),
       deadlift = VALUES(deadlift),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, parseNullableNumber(benchPress), parseNullableNumber(squat), parseNullableNumber(deadlift)],
  );
  return findBig3RecordByUserId(userId);
}

async function listVideosByDailyLogIds(dailyLogIds = []) {
  const ids = [...new Set((dailyLogIds || []).map((id) => Number(id)).filter(Number.isFinite))];
  if (!ids.length) return [];
  const [rows] = await pool.query(
    `SELECT *
     FROM videos
     WHERE daily_log_id IN (?)
     ORDER BY created_at DESC, id DESC`,
    [ids],
  );
  return rows.map(mapVideo);
}

async function listVideosByDailyLogId(dailyLogId) {
  const [rows] = await pool.query(
    `SELECT *
     FROM videos
     WHERE daily_log_id = ?
     ORDER BY created_at DESC, id DESC`,
    [dailyLogId],
  );
  return rows.map(mapVideo);
}

async function createVideo({ userId, dailyLogId, video, title, sourceType = 'upload', publicId = null, fileBytes = null, mimeType = null }) {
  const [result] = await pool.query(
    `INSERT INTO videos (user_id, daily_log_id, video, title, source_type, public_id, file_bytes, mime_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, dailyLogId, video, title || '', sourceType, publicId, fileBytes, mimeType],
  );
  const [rows] = await pool.query('SELECT * FROM videos WHERE id = ? LIMIT 1', [result.insertId]);
  return mapVideo(rows[0]);
}

async function deleteVideoById({ id, userId }) {
  const [result] = await pool.query('DELETE FROM videos WHERE id = ? AND user_id = ? LIMIT 1', [id, userId]);
  return Number(result.affectedRows || 0) > 0;
}

async function listDiaryNotes(filters = {}) {
  const clauses = [];
  const values = [];
  if (filters.userId != null) {
    clauses.push('user_id = ?');
    values.push(filters.userId);
  }
  if (filters.entryDate) {
    clauses.push('entry_date = ?');
    values.push(filters.entryDate);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT *
     FROM baseball_diary_notes
     ${whereClause}
     ORDER BY entry_date DESC, updated_at DESC, id DESC`,
    values,
  );
  const notes = rows.map(mapDiaryNote);
  const videos = await listVideosByDailyLogIds(notes.map((note) => note.id));
  const videoMap = videos.reduce((map, video) => {
    const key = Number(video.dailyLogId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(video);
    return map;
  }, new Map());
  return notes.map((note) => ({ ...note, videos: videoMap.get(Number(note.id)) || [] }));
}

async function findDiaryNoteById(id) {
  const [rows] = await pool.query('SELECT * FROM baseball_diary_notes WHERE id = ? LIMIT 1', [id]);
  const note = mapDiaryNote(rows[0]);
  if (!note) return null;
  const videos = await listVideosByDailyLogId(note.id);
  return { ...note, videos };
}

async function createDiaryNote({ userId, entryDate, body, tags, coachComments, coachStamps, createdBy, updatedBy }) {
  const normalizedTags = normalizeDiaryTags(tags).slice(0, 12);
  const [result] = await pool.query(
    `INSERT INTO baseball_diary_notes (
      user_id,
      entry_date,
      body,
      tags_json,
      coach_comments_json,
      coach_stamps_json,
      created_by,
      updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      entryDate,
      body,
      JSON.stringify(normalizedTags),
      JSON.stringify(coachComments || []),
      JSON.stringify(coachStamps || []),
      createdBy,
      updatedBy,
    ],
  );
  return findDiaryNoteById(result.insertId);
}

async function updateDiaryNote(id, { entryDate, body, tags, coachComments, coachStamps, updatedBy }) {
  const normalizedTags = normalizeDiaryTags(tags).slice(0, 12);
  await pool.query(
    `UPDATE baseball_diary_notes
     SET entry_date = ?,
         body = ?,
         tags_json = ?,
         coach_comments_json = ?,
         coach_stamps_json = ?,
         updated_by = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      entryDate,
      body,
      JSON.stringify(normalizedTags),
      JSON.stringify(coachComments || []),
      JSON.stringify(coachStamps || []),
      updatedBy,
      id,
    ],
  );
  return findDiaryNoteById(id);
}

async function deleteDiaryNote(id) {
  await pool.query('DELETE FROM baseball_diary_notes WHERE id = ?', [id]);
}

async function listConditionRecords(filters = {}) {
  const clauses = [];
  const values = [];
  if (filters.userId != null) {
    clauses.push('user_id = ?');
    values.push(filters.userId);
  }
  if (filters.entryDate) {
    clauses.push('entry_date = ?');
    values.push(filters.entryDate);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT *
     FROM player_condition_records
     ${whereClause}
     ORDER BY entry_date DESC, updated_at DESC, id DESC`,
    values,
  );
  return rows.map(mapConditionRecord);
}

async function findConditionRecordByUserAndDate(userId, entryDate) {
  const [rows] = await pool.query(
    'SELECT * FROM player_condition_records WHERE user_id = ? AND entry_date = ? LIMIT 1',
    [userId, entryDate],
  );
  return mapConditionRecord(rows[0]);
}

async function upsertConditionRecord({ userId, entryDate, conditionStatus, weight, sleepHours, fatigueLevel, createdBy, updatedBy }) {
  await pool.query(
    `INSERT INTO player_condition_records (
      user_id,
      entry_date,
      condition_status,
      weight,
      sleep_hours,
      fatigue_level,
      created_by,
      updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      condition_status = VALUES(condition_status),
      weight = VALUES(weight),
      sleep_hours = VALUES(sleep_hours),
      fatigue_level = VALUES(fatigue_level),
      updated_by = VALUES(updated_by),
      updated_at = CURRENT_TIMESTAMP`,
    [userId, entryDate, conditionStatus, weight, sleepHours, fatigueLevel, createdBy, updatedBy],
  );
  return findConditionRecordByUserAndDate(userId, entryDate);
}

async function deleteConditionRecordByUserAndDate(userId, entryDate) {
  const [result] = await pool.query(
    'DELETE FROM player_condition_records WHERE user_id = ? AND entry_date = ? LIMIT 1',
    [userId, entryDate],
  );
  return Number(result.affectedRows || 0) > 0;
}

async function listDailyLogs(filters = {}) {
  const clauses = [];
  const values = [];
  if (filters.userId != null) {
    clauses.push('user_id = ?');
    values.push(filters.userId);
  }
  if (filters.entryDate) {
    clauses.push('entry_date = ?');
    values.push(filters.entryDate);
  }
  if (filters.month) {
    clauses.push("DATE_FORMAT(entry_date, '%Y-%m') = ?");
    values.push(filters.month);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT *
     FROM daily_logs
     ${whereClause}
     ORDER BY entry_date DESC, updated_at DESC, id DESC`,
    values,
  );
  return rows.map(mapDailyLog);
}

async function findDailyLogByUserAndDate(userId, entryDate) {
  const [rows] = await pool.query(
    'SELECT * FROM daily_logs WHERE user_id = ? AND entry_date = ? LIMIT 1',
    [userId, entryDate],
  );
  return mapDailyLog(rows[0]);
}

async function upsertDailyLog({ userId, entryDate, submitted, createdBy, updatedBy }) {
  await pool.query(
    `INSERT INTO daily_logs (
      user_id,
      entry_date,
      submitted,
      created_by,
      updated_by
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      submitted = VALUES(submitted),
      updated_by = VALUES(updated_by),
      updated_at = CURRENT_TIMESTAMP`,
    [userId, entryDate, submitted ? 1 : 0, createdBy, updatedBy],
  );
  return findDailyLogByUserAndDate(userId, entryDate);
}

async function listMeetings(filters = {}) {
  const clauses = [];
  const values = [];
  if (filters.gameId != null) {
    clauses.push('meetings.game_id = ?');
    values.push(filters.gameId);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT
      meetings.*,
      games.game_date,
      games.opponent,
      games.game_type
     FROM meetings
     INNER JOIN games ON games.id = meetings.game_id
     ${whereClause}
     ORDER BY meetings.created_at DESC, meetings.id DESC`,
    values,
  );
  return rows.map((row) => {
    const meeting = mapMeeting(row);
    return {
      ...meeting,
      game: {
        id: Number(row.game_id),
        date: normalizeDate(row.game_date),
        opponent: row.opponent || '',
        gameType: row.game_type || '',
      },
    };
  });
}

async function createMeeting({ gameId, goodPoints, improvementPoints, nextGoals, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO meetings (game_id, good_points, improvement_points, next_goals, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [gameId, goodPoints, improvementPoints, nextGoals, createdBy],
  );
  const [rows] = await pool.query(
    'SELECT * FROM meetings WHERE id = ? LIMIT 1',
    [result.insertId],
  );
  return mapMeeting(rows[0]);
}

async function closeDatabase() {
  sessionStore.close();
  await pool.end();
}

module.exports = {
  closeDatabase,
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
  findConditionRecordByUserAndDate,
  findDailyLogByUserAndDate,
  findDiaryNoteById,
  updateUserProfile,
  findBig3RecordByUserId,
  findGameById,
  findUserByEmail,
  findUserById,
  getCounts,
  initDatabase,
  listBig3Records,
  listConditionRecords,
  listDailyLogs,
  listDiaryNotes,
  listVideosByDailyLogId,
  listGames,
  listMeetings,
  listScorebookUploads,
  listStatEntries,
  listUsers,
  pool,
  sessionStore,
  updateDiaryNote,
  upsertDailyLog,
  upsertBig3Record,
  upsertConditionRecord,
  upsertStatEntry,
};
