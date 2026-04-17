(function () {
  const state = {
    user: null,
    dashboard: null,
    games: [],
    players: [],
    entries: [],
    diaryNotes: [],
    currentGame: null,
    scorebookUpload: null,
    activeBig3Tab: 'benchPress',
    diarySortOrder: 'desc',
    diarySearchQuery: '',
    diarySearchComposing: false,
    diarySelectedDate: '',
    diaryCalendarMonth: new Date().toISOString().slice(0, 7),
    diaryEditingNoteId: null,
    conditionRecords: [],
    conditionSelectedDate: '',
    conditionCalendarMonth: new Date().toISOString().slice(0, 7),
    conditionDetailMode: 'view',
    conditionWeightChartVisible: false,
    conditionWeightChartRange: 'all',
    coachConditionPlayers: [],
    coachConditionRecords: [],
    coachConditionSelectedDate: new Date().toISOString().slice(0, 10),
    coachConditionCalendarMonth: new Date().toISOString().slice(0, 7),
    coachConditionSelectedPlayerId: null,
    coachConditionWeightChartVisible: false,
    coachConditionWeightChartRange: 'all',
    coachConditionSelectedGrade: '',
    coachDiaryNotes: [],
    coachDiarySelectedGrade: '',
    coachDiarySearchQuery: '',
    coachDiarySelectedTag: '',
    coachDiarySelectedDate: '',
    coachDiaryCalendarMonth: new Date().toISOString().slice(0, 7),
    coachDiaryStampOptions: ['いいね', 'ナイス', 'おつかれ', 'ファイト', 'すごい'],
    coachDiaryReplyDrafts: {},
    coachDiarySelectedStamps: {},
    coachDiaryModalNoteId: null,
    coachDiaryEscListenerBound: false,
    coachDiarySearchComposing: false,
    coachDiaryFilterTimer: null,
    managerDailyLogs: [],
    managerDailyLogMissingPlayers: [],
    managerDailyLogSummary: null,
    managerDailyLogSelectedPlayerId: null,
    managerDailyLogSelectedDate: new Date().toISOString().slice(0, 10),
    managerDailyLogCalendarMonth: new Date().toISOString().slice(0, 7),
    managerChecklistItems: [],
    prepareChecklistItems: [],
    playerSummaryDetail: null,
    playerWeightsHistory: {},
    playerCondition: {},
    conditionCharts: {},
  };

  const big3Fields = [
    ['benchPress', 'ベンチプレス'],
    ['squat', 'スクワット'],
    ['deadlift', 'デッドリフト'],
  ];

  const battingFields = [
    ['plateAppearances', '打席数'],
    ['atBats', '打数'],
    ['hits', '安打数'],
    ['doubles', '二塁打'],
    ['triples', '三塁打'],
    ['homeRuns', '本塁打'],
    ['sacrificeBunts', '犠打数'],
    ['sacrificeFlies', '犠飛'],
    ['walks', '四球数'],
    ['hitByPitch', '死球'],
    ['stolenBases', '盗塁数'],
    ['stolenBaseAttempts', '盗塁企図数'],
    ['runsBattedIn', '打点'],
    ['runs', '得点'],
    ['strikeouts', '三振数'],
    ['errors', '失策数'],
    ['rispAtBats', '得点圏打数'],
    ['rispHits', '得点圏安打'],
    ['vsLeftAtBats', '左投手対打数'],
    ['vsLeftHits', '左投手対安打'],
    ['vsRightAtBats', '右投手対打数'],
    ['vsRightHits', '右投手対安打'],
  ];

  const pitchingFields = [
    ['pitchCount', '投球数'],
    ['outsRecorded', '取得アウト数'],
    ['maxVelocity', '最速'],
    ['averageVelocity', '平均球速'],
    ['breakingBallRate', '変化球割合(%)'],
    ['battersFaced', '対戦打者'],
    ['hitsAllowed', '被安打'],
    ['walks', '与四球'],
    ['hitByPitch', '与死球'],
    ['strikeouts', '奪三振'],
    ['earnedRuns', '自責点'],
    ['homeRunsAllowed', '被本塁打'],
    ['groundOuts', 'ゴロアウト'],
    ['flyOuts', 'フライアウト'],
    ['vsLeftBatters', '左打者対戦数'],
    ['vsLeftHits', '左打者被安打'],
    ['vsRightBatters', '右打者対戦数'],
    ['vsRightHits', '右打者被安打'],
    ['fastballPull', '直球:引っ張り'],
    ['fastballCenter', '直球:センター'],
    ['fastballOpposite', '直球:逆方向'],
    ['breakingPull', '変化球:引っ張り'],
    ['breakingCenter', '変化球:センター'],
    ['breakingOpposite', '変化球:逆方向'],
    ['offspeedPull', '緩球:引っ張り'],
    ['offspeedCenter', '緩球:センター'],
    ['offspeedOpposite', '緩球:逆方向'],
  ];
  const pitchTypeOptions = AppStats.PITCH_TYPE_OPTIONS;
  const battedBallTypeOptions = AppStats.BATTED_BALL_TYPE_OPTIONS;

  const gameTypeLabels = {
    official: '公式戦',
    practice: '練習試合',
    intrasquad: '紅白戦',
  };
  const performanceSummaryBuckets = AppStats.PERFORMANCE_SUMMARY_BUCKETS;
  const conditionStatusOptions = [
    { value: 'poor', label: '不良' },
    { value: 'normal', label: '普通' },
    { value: 'good', label: '良好' },
  ];
  const fatigueLevelOptions = [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
  ];
  const defaultCoachDiaryStampOptions = ['いいね', 'ナイス', 'おつかれ', 'ファイト', 'すごい'];
  const playerGradeOptions = ['', '1年', '2年', '3年', 'マネージャー', 'その他'];

  const managerChecklistStorageKey = 'baseball-manager-checklist-v1';
  const prepareChecklistStorageKey = 'checklist';
  const playerWeightsHistoryStorageKey = 'playerWeightsHistory';
  const playerConditionStorageKey = 'playerCondition';
  const defaultPrepareChecklistItems = [
    '試合球',
    'ノック・キャッチボール球',
    'ヘルメット',
    'キャッチャー防具',
    'バット',
    'ノックバッド',
    'コールドスプレー',
    '救急箱',
    'ロジンバッグ',
    'ドリンク（キーパー）',
    'クーラーボックス',
    'タオル、雑巾',
  ];
  const defaultManagerChecklistItems = [
    'ボール',
    'バット',
    'ヘルメット',
    'キャッチャー防具',
    'グローブ',
    'スパイク',
    'ユニフォーム',
    '帽子',
    '水分',
    '救急セット',
  ];

  function createManagerChecklistItems(sourceItems = defaultManagerChecklistItems) {
    return sourceItems.map((label, index) => ({
      id: `default-${index}-${String(label).trim()}`,
      label: String(label).trim(),
      checked: false,
      custom: false,
    }));
  }

  function normalizeManagerChecklistItems(items) {
    const normalized = Array.isArray(items)
      ? items
          .map((item, index) => {
            if (typeof item === 'string') {
              const label = item.trim();
              if (!label) return null;
              return {
                id: `legacy-${index}-${label}`,
                label,
                checked: false,
                custom: false,
              };
            }
            if (!item || typeof item !== 'object') return null;
            const label = String(item.label || '').trim();
            if (!label) return null;
            const id = String(item.id || `${item.custom ? 'custom' : 'item'}-${index}-${label}`).trim();
            return {
              id,
              label,
              checked: Boolean(item.checked),
              custom: Boolean(item.custom),
            };
          })
          .filter(Boolean)
      : [];
    return normalized.length ? normalized : createManagerChecklistItems();
  }

  function loadManagerChecklistItems() {
    try {
      const saved = window.localStorage.getItem(managerChecklistStorageKey);
      if (!saved) return createManagerChecklistItems();
      return normalizeManagerChecklistItems(JSON.parse(saved));
    } catch (error) {
      return createManagerChecklistItems();
    }
  }

  function saveManagerChecklistItems() {
    window.localStorage.setItem(managerChecklistStorageKey, JSON.stringify(state.managerChecklistItems));
  }

  function ensureManagerChecklistState() {
    if (!state.managerChecklistItems.length) {
      state.managerChecklistItems = loadManagerChecklistItems();
    }
  }

  function buildManagerChecklistPanel() {
    ensureManagerChecklistState();
    const checkedCount = state.managerChecklistItems.filter((item) => item.checked).length;
    const itemsMarkup = state.managerChecklistItems.map((item) => `
      <label class="manager-checklist-item ${item.checked ? 'is-checked' : ''}" for="managerChecklist-${escapeHtml(item.id)}">
        <input
          id="managerChecklist-${escapeHtml(item.id)}"
          type="checkbox"
          data-manager-checklist-item="${escapeHtml(item.id)}"
          ${item.checked ? 'checked' : ''}
        />
        <span class="manager-checklist-item-copy">
          <span class="manager-checklist-item-label">${escapeHtml(item.label)}</span>
          <span class="manager-checklist-item-meta">${item.checked ? 'チェック済み' : '未チェック'}</span>
        </span>
      </label>
    `).join('');

    return `
      <section class="card manager-checklist-card">
        <div class="card-head-actions manager-checklist-head">
          <div>
            <h2>試合道具チェックリスト</h2>
            <p class="small">持ち物の準備状況をタップで確認できます。チェック状態はこの端末に保存されます。</p>
          </div>
          <div class="manager-checklist-summary">
            <strong>${checkedCount}/${state.managerChecklistItems.length}</strong>
            <span class="small">チェック済み</span>
          </div>
        </div>
        <div class="manager-checklist-grid">
          ${itemsMarkup}
        </div>
        <form id="managerChecklistAddForm" class="manager-checklist-add-form">
          <label for="managerChecklistNewItem">項目を追加</label>
          <div class="manager-checklist-add-row">
            <input id="managerChecklistNewItem" name="itemName" type="text" maxlength="40" placeholder="例: タオル" />
            <button type="submit" class="button button-primary">追加</button>
          </div>
          <p class="small">必要に応じて道具を追加できます。</p>
        </form>
        <div class="actions single-action compact-top">
          <button type="button" id="managerChecklistResetButton" class="button button-secondary">リセット</button>
        </div>
      </section>
    `;
  }

  function bindManagerChecklist() {
    const root = qs('managerChecklistRoot');
    if (!root) return;

    root.querySelectorAll('[data-manager-checklist-item]').forEach((input) => {
      input.addEventListener('change', () => {
        const itemId = input.dataset.managerChecklistItem;
        state.managerChecklistItems = state.managerChecklistItems.map((item) => (
          item.id === itemId
            ? { ...item, checked: input.checked }
            : item
        ));
        saveManagerChecklistItems();
        renderRoleWorkspace();
      });
    });

    qs('managerChecklistAddForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const input = form.querySelector('#managerChecklistNewItem');
      const label = String(input.value || '').trim();
      if (!label) return;
      const exists = state.managerChecklistItems.some((item) => item.label === label);
      if (exists) {
        window.alert('同じ項目がすでにあります。');
        return;
      }
      state.managerChecklistItems = [
        ...state.managerChecklistItems,
        {
          id: `custom-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          label,
          checked: false,
          custom: true,
        },
      ];
      saveManagerChecklistItems();
      renderRoleWorkspace();
    });

    qs('managerChecklistResetButton')?.addEventListener('click', () => {
      state.managerChecklistItems = state.managerChecklistItems.map((item) => ({ ...item, checked: false }));
      saveManagerChecklistItems();
      renderRoleWorkspace();
    });
  }

  function getGameTypeLabel(gameType) {
    return gameTypeLabels[gameType] || '未設定';
  }

  function normalizePlayerGrade(value) {
    const normalized = String(value || '').trim();
    return playerGradeOptions.includes(normalized) ? normalized : '';
  }

  function getPlayerGrade(player) {
    if (!player) return '';
    return normalizePlayerGrade(player.grade || (player.profile && player.profile.grade) || '');
  }

  function getPlayerGradeLabel(playerOrGrade) {
    const grade = typeof playerOrGrade === 'string' ? normalizePlayerGrade(playerOrGrade) : getPlayerGrade(playerOrGrade);
    return grade || '学年未設定';
  }

  function buildGradeOptionTags(selectedValue, { includeAll = false, includeUnset = true, allLabel = 'すべての学年' } = {}) {
    const options = [];
    if (includeAll) {
      options.push({ value: '', label: allLabel });
    } else if (includeUnset) {
      options.push({ value: '', label: '未設定' });
    }
    playerGradeOptions
      .filter((value) => value)
      .forEach((value) => options.push({ value, label: value }));
    return options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(selectedValue || '') === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
  }

  function getRosterPlayerById(playerId) {
    return state.players.find((player) => Number(player.id) === Number(playerId)) || null;
  }

  function getCoachDiaryNotePlayerProfile(note) {
    const rosterPlayer = getRosterPlayerById(note && note.playerId);
    return {
      ...(rosterPlayer || {}),
      ...((note && note.playerProfile) || {}),
    };
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function nullableNumber(value) {
    if (value === '' || value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function fmt3(value) {
    return Number(number(value)).toFixed(3);
  }

  function fmtPct(value) {
    return `${(number(value) * 100).toFixed(1)}%`;
  }

  function fmtRateOrDash(value, denominator) {
    return number(denominator) ? `${(number(value) * 100).toFixed(1)}%` : '—';
  }

  function fmtKg(value) {
    if (value == null || value === '') return '—';
    const normalized = Number(value);
    return `${normalized.toFixed(normalized % 1 === 0 ? 0 : 1)}kg`;
  }

  function buildPlayerMetaLine(player) {
    const metaParts = [
      player.position || 'ポジション未設定',
      getPlayerGradeLabel(player),
      `${player.throws || '—'}投${player.bats || '—'}打`,
    ];
    return metaParts.join(' / ');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
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

  function getDiaryTagInputValue(tags) {
    return (Array.isArray(tags) ? tags : []).join(', ');
  }

  function formatDiaryExcerpt(body, maxLength = 80) {
    const normalized = String(body || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}…`;
  }

  function formatDiaryDateLabel(dateString) {
    if (!dateString) return '日付未設定';
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  function formatDateTimeLabel(dateTimeString) {
    if (!dateTimeString) return '日時未設定';
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) return String(dateTimeString);
    return date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function getConditionStatusLabel(value, record = null) {
    return record?.conditionStatusLabel || conditionStatusOptions.find((option) => option.value === value)?.label || value || '—';
  }

  function getFatigueLevelLabel(value, record = null) {
    return record?.fatigueLevelLabel || fatigueLevelOptions.find((option) => option.value === value)?.label || value || '—';
  }

  function normalizeConditionRecord(record) {
    if (!record) return record;
    return {
      ...record,
      conditionStatusLabel: getConditionStatusLabel(record.conditionStatus, record),
      fatigueLevelLabel: getFatigueLevelLabel(record.fatigueLevel, record),
    };
  }

  function getConditionRecordCountsByDate(records) {
    return records.reduce((map, record) => {
      if (!record.entryDate) return map;
      map.set(record.entryDate, (map.get(record.entryDate) || 0) + 1);
      return map;
    }, new Map());
  }

  function getConditionRecordForSelectedDate() {
    if (!state.conditionSelectedDate) return null;
    return state.conditionRecords.find((record) => record.entryDate === state.conditionSelectedDate) || null;
  }

  function compareDiaryNotes(a, b, sortOrder) {
    const left = `${a.entryDate || ''} ${a.updatedAt || ''} ${String(a.id || '').padStart(8, '0')}`;
    const right = `${b.entryDate || ''} ${b.updatedAt || ''} ${String(b.id || '').padStart(8, '0')}`;
    return sortOrder === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
  }

  function getFilteredDiaryNotes() {
    const searchTerm = String(state.diarySearchQuery || '').trim().toLowerCase();
    return [...state.diaryNotes]
      .filter((note) => {
        if (state.diarySelectedDate && note.entryDate !== state.diarySelectedDate) return false;
        if (!searchTerm) return true;
        const tagText = (note.tags || []).join(' ').toLowerCase();
        return String(note.body || '').toLowerCase().includes(searchTerm) || tagText.includes(searchTerm);
      })
      .sort((a, b) => compareDiaryNotes(a, b, state.diarySortOrder));
  }

  function getDiaryNoteCountsByDate(notes) {
    return notes.reduce((map, note) => {
      const key = note.entryDate;
      if (!key) return map;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
  }

  function buildDiaryVideosSection(videos = [], { editable = false } = {}) {
    const safeVideos = Array.isArray(videos) ? videos : [];
    if (!safeVideos.length && !editable) return '<div class="small">練習動画はまだありません。</div>';
    return `
      <div class="diary-video-list">
        ${safeVideos.map((video) => `
          <div class="diary-video-item">
            <div class="meta">${escapeHtml(video.title || '練習動画')}</div>
            <video controls preload="metadata" src="${escapeHtml(video.video || '')}"></video>
            ${editable ? `<label class="small"><input type="checkbox" name="removeVideoIds" value="${Number(video.id)}" /> この動画を削除</label>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function bindDiaryNoteListActions(container) {
    if (!container || container.dataset.diaryNoteListBound === 'true') return;

    container.dataset.diaryNoteListBound = 'true';
    container.addEventListener('click', async (event) => {
      const clearDateButton = event.target.closest('#diaryClearDateBtn');
      if (clearDateButton) {
        state.diarySelectedDate = '';
        await renderDiary({ reload: false });
        return;
      }

      const editButton = event.target.closest('[data-diary-edit]');
      if (editButton) {
        const noteId = Number(editButton.dataset.diaryEdit);
        const targetNote = state.diaryNotes.find((note) => note.id === noteId);
        if (!targetNote) return;
        state.diaryEditingNoteId = noteId;
        state.diarySelectedDate = targetNote.entryDate;
        state.diaryCalendarMonth = targetNote.entryDate.slice(0, 7);
        await renderDiary({ reload: false });
        qs('diaryBody')?.focus();
        return;
      }

      const deleteButton = event.target.closest('[data-diary-delete]');
      if (!deleteButton) return;

      const noteId = Number(deleteButton.dataset.diaryDelete);
      if (!window.confirm('この野球日誌を削除しますか？')) return;
      try {
        await api(`/api/diary-notes/${noteId}`, { method: 'DELETE' });
        if (state.diaryEditingNoteId === noteId) {
          state.diaryEditingNoteId = null;
        }
        await renderDiary();
      } catch (error) {
        window.alert(error.message);
      }
    });
  }

  function updateDiaryNoteList() {
    const container = qs('diaryNoteListSection');
    if (!container) return;
    container.innerHTML = buildDiaryNoteList(getFilteredDiaryNotes());
    bindDiaryNoteListActions(container);
  }

  async function api(path, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const res = await fetch(path, {
      credentials: 'include',
      headers: isFormData ? { ...(options.headers || {}) } : { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const payload = isJson ? await res.json() : null;
    if (!res.ok) {
      throw new Error((payload && payload.message) || '通信に失敗しました。');
    }
    return payload;
  }

  async function fetchCurrentUser() {
    if (state.user) return state.user;
    try {
      const payload = await api('/api/me');
      state.user = payload.user;
      return state.user;
    } catch (error) {
      return null;
    }
  }

  async function refreshConditionRecords() {
    const payload = await api('/api/condition-records');
    state.conditionRecords = (payload.records || []).map((record) => normalizeConditionRecord(record));
    const hasSelectedRecord = state.conditionSelectedDate && state.conditionRecords.some((record) => record.entryDate === state.conditionSelectedDate);
    if (!hasSelectedRecord) {
      state.conditionDetailMode = 'view';
      state.conditionSelectedDate = state.conditionRecords[0]?.entryDate || state.conditionSelectedDate;
      if (state.conditionSelectedDate) {
        state.conditionCalendarMonth = state.conditionSelectedDate.slice(0, 7);
      }
    }
    if (!state.conditionSelectedDate && state.conditionRecords[0]) {
      state.conditionSelectedDate = state.conditionRecords[0].entryDate;
      state.conditionCalendarMonth = state.conditionSelectedDate.slice(0, 7);
    }
    return state.conditionRecords;
  }

  function getRoleLabel(role) {
    return AppRoles.getRoleLabel(role);
  }

  async function setupNav() {
    const user = state.user || (await fetchCurrentUser());
    const nav = document.querySelector('.bottom-nav');
    if (!nav || !user) return;
    const current = document.body.dataset.page;
    const rolePage = document.body.dataset.rolePage;
    const isPlayerPage = rolePage === 'player' || ['player', 'diary'].includes(current);
    const roleInputConfig = {
      coach: { href: 'coach.html', page: 'coach', label: '野球日誌' },
      manager: { href: 'manager.html', page: 'manager', label: '入力' },
      player: { href: 'condition.html', page: 'condition', label: '入力' },
    };
    const fallbackInputConfig = roleInputConfig.player;
    const userInputConfig = roleInputConfig[user.role] || fallbackInputConfig;
    const rolePageInputConfig = roleInputConfig[rolePage];
    const shouldUseRolePageForInput = rolePageInputConfig && rolePage === user.role;
    const inputHref = shouldUseRolePageForInput ? rolePageInputConfig.href : userInputConfig.href;
    const inputPage = shouldUseRolePageForInput ? rolePageInputConfig.page : userInputConfig.page;
    const inputLabel = shouldUseRolePageForInput ? rolePageInputConfig.label : userInputConfig.label;
    const links = [
      { href: 'index.html', page: 'home', label: 'ホーム' },
      { href: 'games.html', page: 'games', label: '試合' },
      { href: inputHref, page: inputPage, label: inputLabel },
    ];
    if (user.role === 'player') {
      links.push({ href: 'diary.html', page: 'diary', label: '野球日誌' });
    }
    const conditionLink = ['coach', 'manager'].includes(user.role)
      ? { href: 'coach-condition.html', page: 'coach-condition', label: '体調' }
      : { href: 'condition-check.html', page: 'condition', label: '体調' };
    links.push(conditionLink);
    if (user?.role === 'manager') {
      links.push({ href: 'prepare.html', page: 'prepare', label: '試合準備' });
    }

    if (isPlayerPage && user.role !== 'player') {
      window.location.href = 'index.html';
      return;
    }
    links.push({ href: 'settings.html', page: 'settings', label: '設定' });

    nav.style.setProperty('--nav-columns', String(links.length));
    nav.innerHTML = links.map((link) => `
      <a href="${link.href}" data-page="${link.page}" class="${link.page === current ? 'active' : ''}">${link.label}</a>
    `).join('');

    document.querySelectorAll('.bottom-nav a').forEach((link) => {
      if (link.dataset.page === current) {
        link.classList.add('active');
      }
    });
  }

  function getDefaultPrepareChecklist() {
    return defaultPrepareChecklistItems.map((name) => ({ name, checked: false }));
  }

  function normalizePrepareChecklist(items) {
    if (!Array.isArray(items)) return getDefaultPrepareChecklist();
    const normalized = items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const name = String(item.name || '').trim();
        if (!name) return null;
        return { name, checked: Boolean(item.checked) };
      })
      .filter(Boolean);
    return normalized.length ? normalized : getDefaultPrepareChecklist();
  }

  function savePrepareChecklist() {
    window.localStorage.setItem(prepareChecklistStorageKey, JSON.stringify(state.prepareChecklistItems));
  }

  function loadChecklist() {
    try {
      const raw = window.localStorage.getItem(prepareChecklistStorageKey);
      state.prepareChecklistItems = raw ? normalizePrepareChecklist(JSON.parse(raw)) : getDefaultPrepareChecklist();
    } catch (error) {
      state.prepareChecklistItems = getDefaultPrepareChecklist();
    }

    const root = qs('prepareChecklistRoot');
    if (!root) return;

    root.innerHTML = state.prepareChecklistItems.map((item, index) => `
      <label class="prepare-checklist-item ${item.checked ? 'is-checked' : ''}">
        <input
          type="checkbox"
          class="prepare-checklist-checkbox"
          ${item.checked ? 'checked' : ''}
          onchange="window.toggleCheck(${index})"
        />
        <span class="prepare-checklist-name">${escapeHtml(item.name)}</span>
      </label>
    `).join('');
  }

  function toggleCheck(index) {
    const targetIndex = Number(index);
    if (!Number.isInteger(targetIndex) || !state.prepareChecklistItems[targetIndex]) return;
    state.prepareChecklistItems = state.prepareChecklistItems.map((item, itemIndex) => (
      itemIndex === targetIndex ? { ...item, checked: !item.checked } : item
    ));
    savePrepareChecklist();
    loadChecklist();
  }

  function resetChecklist() {
    state.prepareChecklistItems = state.prepareChecklistItems.map((item) => ({ ...item, checked: false }));
    savePrepareChecklist();
    loadChecklist();
  }

  function addItem() {
    const input = qs('prepareItemInput');
    if (!input) return;
    const name = String(input.value || '').trim();
    if (!name) return;
    const exists = state.prepareChecklistItems.some((item) => item.name === name);
    if (exists) {
      window.alert('同じ項目がすでにあります。');
      return;
    }
    state.prepareChecklistItems = [...state.prepareChecklistItems, { name, checked: false }];
    input.value = '';
    savePrepareChecklist();
    loadChecklist();
  }

  function showPage(pageId) {
    if (pageId === 'prepare') loadChecklist();
    if (pageId === 'condition') {
      loadWeights();
    }
  }

  function getTodayIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadConditionStorage() {
    try {
      state.playerWeightsHistory = JSON.parse(window.localStorage.getItem(playerWeightsHistoryStorageKey) || '{}');
    } catch (error) {
      state.playerWeightsHistory = {};
    }
    try {
      state.playerCondition = JSON.parse(window.localStorage.getItem(playerConditionStorageKey) || '{}');
    } catch (error) {
      state.playerCondition = {};
    }
  }

  function saveConditionStorage() {
    window.localStorage.setItem(playerWeightsHistoryStorageKey, JSON.stringify(state.playerWeightsHistory));
    window.localStorage.setItem(playerConditionStorageKey, JSON.stringify(state.playerCondition));
  }

  function getConditionPlayers() {
    const user = state.user || {};
    const allPlayers = (state.players || []).map((player) => player.name).filter(Boolean);
    if (user.role === 'player') {
      const ownName = String(user.playerName || user.name || '').trim();
      if (!ownName) return [];
      return [ownName];
    }
    return Array.from(new Set(allPlayers));
  }

  function getLatestWeight(playerName) {
    const history = Array.isArray(state.playerWeightsHistory[playerName]) ? state.playerWeightsHistory[playerName] : [];
    if (!history.length) return null;
    return [...history].sort((a, b) => String(a.date).localeCompare(String(b.date))).at(-1) || null;
  }

  function calculateDiff(playerName) {
    const history = Array.isArray(state.playerWeightsHistory[playerName]) ? state.playerWeightsHistory[playerName] : [];
    const sorted = [...history].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (sorted.length < 2) return { value: null, label: '—', className: 'weight-diff-neutral' };
    const today = Number(sorted[sorted.length - 1].weight);
    const prev = Number(sorted[sorted.length - 2].weight);
    const diff = today - prev;
    if (diff > 0) return { value: diff, label: `+${diff.toFixed(1).replace(/\.0$/, '')}kg`, className: 'weight-diff-plus' };
    if (diff < 0) return { value: diff, label: `${diff.toFixed(1).replace(/\.0$/, '')}kg`, className: 'weight-diff-minus' };
    return { value: 0, label: '±0kg', className: 'weight-diff-neutral' };
  }

  function renderChart(playerName) {
    const canvas = document.querySelector(`[data-condition-chart="${CSS.escape(playerName)}"]`);
    if (!canvas) return;
    if (state.conditionCharts[playerName]) {
      state.conditionCharts[playerName].destroy();
      delete state.conditionCharts[playerName];
    }
    if (typeof window.Chart === 'undefined') return;
    const history = Array.isArray(state.playerWeightsHistory[playerName]) ? state.playerWeightsHistory[playerName] : [];
    const sorted = [...history].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (!sorted.length) return;
    state.conditionCharts[playerName] = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: sorted.map((entry) => entry.date),
        datasets: [{
          label: '体重(kg)',
          data: sorted.map((entry) => Number(entry.weight)),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.2)',
          pointRadius: 3,
          tension: 0.2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  async function loadWeights() {
    const root = qs('conditionRoot');
    if (!root) return;
    if (!state.user) {
      state.user = await fetchCurrentUser();
    }
    if (!state.players.length) {
      try {
        const payload = await api('/api/players');
        state.players = payload.players || [];
      } catch (error) {
        state.players = [];
      }
    }
    loadConditionStorage();
    const user = state.user;
    if (!user) return;
    const canEditCondition = user.role === 'player';
    const canEditWeight = user.role === 'player' || user.role === 'manager';
    const players = getConditionPlayers();
    root.innerHTML = `
      <section id="condition" class="condition-page">
        <div class="card role-hero">
          <div class="hero-kicker">体調管理</div>
          <h2>体調 + 体重</h2>
          <p class="small">体重履歴は日付単位で保存され、同日入力は上書きされます。</p>
        </div>
        ${players.length === 0 ? '<section class="card"><p class="small">表示できる選手データがありません。</p></section>' : players.map((playerName) => {
          const latestWeight = getLatestWeight(playerName);
          const diff = calculateDiff(playerName);
          const selectedCondition = state.playerCondition[playerName] || '普通';
          return `
            <article class="card condition-player-card">
              <h3>${escapeHtml(playerName)}</h3>
              <div class="condition-meta-grid">
                <div><span class="small">体調</span><div>${escapeHtml(state.playerCondition[playerName] || '未入力')}</div></div>
                <div><span class="small">最新体重</span><div>${latestWeight ? `${escapeHtml(String(latestWeight.weight))}kg` : '—'}</div></div>
                <div><span class="small">前日比</span><div class="${diff.className}">${escapeHtml(diff.label)}</div></div>
              </div>
              <div class="condition-input-grid">
                ${canEditCondition ? `
                  <div class="form-row">
                    <label for="conditionStatus-${escapeHtml(playerName)}">体調入力</label>
                    <select id="conditionStatus-${escapeHtml(playerName)}" data-condition-input="${escapeHtml(playerName)}">
                      ${['良い', '普通', '悪い'].map((status) => `<option value="${status}" ${selectedCondition === status ? 'selected' : ''}>${status}</option>`).join('')}
                    </select>
                  </div>
                ` : ''}
                ${canEditWeight ? `
                  <div class="form-row">
                    <label for="weightInput-${escapeHtml(playerName)}">体重入力(kg)</label>
                    <input id="weightInput-${escapeHtml(playerName)}" type="number" inputmode="decimal" min="0" step="0.1" data-weight-input="${escapeHtml(playerName)}" value="${latestWeight ? escapeHtml(String(latestWeight.weight)) : ''}" />
                  </div>
                ` : ''}
              </div>
              ${(canEditCondition || canEditWeight) ? `<div class="actions single-action"><button type="button" class="button button-primary" data-save-condition-player="${escapeHtml(playerName)}">保存</button></div>` : ''}
              <div class="condition-chart-wrap">
                <canvas data-condition-chart="${escapeHtml(playerName)}" aria-label="${escapeHtml(playerName)}の体重推移"></canvas>
              </div>
            </article>
          `;
        }).join('')}
      </section>
    `;

    root.querySelectorAll('[data-save-condition-player]').forEach((button) => {
      button.addEventListener('click', async () => {
        const playerName = button.dataset.saveConditionPlayer || '';
        if (canEditWeight) {
          saveWeight(playerName);
        }
        if (canEditCondition) {
          saveCondition(playerName);
        }
        saveConditionStorage();
        await loadWeights();
      });
    });

    players.forEach((playerName) => renderChart(playerName));
  }

  function saveWeight(playerName) {
    const input = document.querySelector(`[data-weight-input="${CSS.escape(playerName)}"]`);
    if (!input) return;
    const value = Number(input.value);
    if (!Number.isFinite(value) || value <= 0) return;
    const today = getTodayIsoDate();
    const currentHistory = Array.isArray(state.playerWeightsHistory[playerName]) ? state.playerWeightsHistory[playerName] : [];
    const nextHistory = currentHistory.filter((entry) => entry.date !== today);
    nextHistory.push({ date: today, weight: value });
    state.playerWeightsHistory[playerName] = nextHistory.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function saveCondition(playerName) {
    const select = document.querySelector(`[data-condition-input="${CSS.escape(playerName)}"]`);
    if (!select) return;
    state.playerCondition[playerName] = select.value;
  }

  function renderPrepare() {
    const root = qs('prepareRoot');
    if (!root) return;

    root.innerHTML = `
      <section id="prepare" class="card prepare-card">
        <h2>試合準備チェックリスト</h2>
        <div id="prepareChecklistRoot" class="prepare-checklist-list" aria-live="polite"></div>
        <div class="prepare-add-row">
          <input id="prepareItemInput" type="text" maxlength="40" placeholder="項目を追加" />
          <button type="button" class="button button-primary" id="prepareAddButton">追加</button>
        </div>
        <div class="actions single-action compact-top">
          <button type="button" id="prepareResetButton" class="button button-secondary">リセット</button>
        </div>
      </section>
    `;

    qs('prepareAddButton')?.addEventListener('click', addItem);
    qs('prepareItemInput')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addItem();
      }
    });
    qs('prepareResetButton')?.addEventListener('click', resetChecklist);
    showPage('prepare');
  }

  async function renderConditionPage() {
    const root = qs('conditionRoot');
    if (!root) return;
    showPage('condition');
  }

  window.loadChecklist = loadChecklist;
  window.toggleCheck = toggleCheck;
  window.resetChecklist = resetChecklist;
  window.addItem = addItem;

  function createStatGrid(items) {
    if (!items.length) return '<div class="small">データがありません。</div>';
    return `<div class="grid">${items.map((item) => `
      <div class="stat-card ${item.className || ''}" ${item.attributes || ''}>
        <div class="stat-label">${escapeHtml(item.label)}</div>
        <div class="stat-value">${escapeHtml(item.value)}</div>
        ${item.meta ? `<div class="meta">${escapeHtml(item.meta)}</div>` : ''}
      </div>
    `).join('')}</div>`;
  }

  function buildPitchingBattedBallEditorFields(prefix, profileInput = {}) {
    const profile = AppStats.normalizePitchingBattedBallProfile(profileInput);
    return `
      <details class="subtle-details">
        <summary>球種別ゴロ・フライ内訳（任意）</summary>
        <div class="field-grid compact-top batted-ball-grid">
          ${pitchTypeOptions.map((pitchType) => `
            <div class="stat-card">
              <div class="stat-label">${escapeHtml(pitchType.label)}</div>
              ${battedBallTypeOptions.slice(0, 2).map((battedBallType) => `
                <div class="form-row compact-row compact-top">
                  <label for="${prefix}-${pitchType.key}-${battedBallType.key}">${escapeHtml(battedBallType.label)}数</label>
                  <input id="${prefix}-${pitchType.key}-${battedBallType.key}" name="battedBall.${pitchType.key}.${battedBallType.key}" type="number" step="1" min="0" value="${number(profile[pitchType.key] && profile[pitchType.key][battedBallType.key])}" />
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div class="small compact-top">将来的なライナーやポップフライ追加に備え、内部では球種×打球種別で保持します。</div>
      </details>
    `;
  }

  function collectPitchingBattedBallProfile(form) {
    const profile = AppStats.emptyPitchingBattedBallProfile();
    pitchTypeOptions.forEach((pitchType) => {
      battedBallTypeOptions.forEach((battedBallType) => {
        const input = form.querySelector(`[name="battedBall.${pitchType.key}.${battedBallType.key}"]`);
        if (input) profile[pitchType.key][battedBallType.key] = number(input.value);
      });
    });
    return profile;
  }

  function applyPitchingBattedBallProfileToForm(form, profileInput = {}) {
    const profile = AppStats.normalizePitchingBattedBallProfile(profileInput);
    pitchTypeOptions.forEach((pitchType) => {
      battedBallTypeOptions.forEach((battedBallType) => {
        const input = form.querySelector(`[name="battedBall.${pitchType.key}.${battedBallType.key}"]`);
        if (input) input.value = number(profile[pitchType.key] && profile[pitchType.key][battedBallType.key]);
      });
    });
  }

  function buildGroundFlyDetailTable(summary) {
    const breakdown = summary && summary.pitching && summary.pitching.derived && summary.pitching.derived.pitchingBattedBallBreakdown;
    const rows = (breakdown && breakdown.rows) || [];
    if (!rows.length) {
      return '<div class="small">球種別の打球内訳はまだありません。</div>';
    }
    return `
      <div class="table-wrap compact-top">
        <table class="table compact-table">
          <thead><tr><th>球種</th><th>ゴロ数</th><th>フライ数</th><th>総打球数</th><th>ゴロ率</th><th>フライ率</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.label)}</td>
                <td>${row.groundCount}</td>
                <td>${row.flyCount}</td>
                <td>${row.totalCount}</td>
                <td>${fmtRateOrDash(row.groundRate, row.totalCount)}</td>
                <td>${fmtRateOrDash(row.flyRate, row.totalCount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function buildManualFields(fields, prefix) {
    return fields.map(([key, label]) => `
      <div class="form-row compact-row">
        <label for="${prefix}-${key}">${label}</label>
        <input id="${prefix}-${key}" name="raw.${key}" type="number" step="0.01" min="0" value="0" />
      </div>
    `).join('');
  }

  function buildEntryMap(entries) {
    const map = new Map();
    entries.forEach((entry) => {
      map.set(`${entry.gameId}:${entry.playerId}:${entry.category}`, entry);
    });
    return map;
  }

  function buildManualInputCard(user, options = {}) {
    const players = state.players;
    const games = state.games;
    const disabled = games.length === 0 ? 'disabled' : '';
    const selfPlayerId = user.role === 'player' ? user.id : null;
    const selectablePlayers = players.filter((player) => (selfPlayerId ? player.id === selfPlayerId : true));
    const playerOptions = selectablePlayers
      .map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`)
      .join('');
    const playerField = selfPlayerId
      ? `
          <div class="form-row">
            <label>対象選手</label>
            <input type="text" value="${escapeHtml(selectablePlayers[0] ? selectablePlayers[0].name : user.name)}" disabled />
            <input type="hidden" name="playerId" value="${selfPlayerId}" />
          </div>
        `
      : `
          <div class="form-row">
            <label for="manualPlayerId">対象選手</label>
            <select id="manualPlayerId" name="playerId" ${disabled}>${playerOptions}</select>
          </div>
        `;
    const gameOptions = games.map((game) => `<option value="${game.id}">${escapeHtml(`${game.date} [${getGameTypeLabel(game.gameType)}] vs ${game.opponent}`)}</option>`).join('');
    const hint = user.role === 'player'
      ? '自分の成績のみ入力できます。'
      : 'マネージャーは全選手分の成績を試合単位で登録できます。';

    return `
      <section class="card">
        <h2>${options.title || '成績手動入力'}</h2>
        <p class="small">${hint}</p>
        ${games.length === 0 ? '<div class="notice">先に試合を登録してください。</div>' : ''}
        <form id="manualStatsForm">
          <div class="form-row">
            <label for="manualGameId">対象試合</label>
            <select id="manualGameId" name="gameId" ${disabled}>${gameOptions}</select>
          </div>
          ${playerField}
          <div class="form-row">
            <label for="manualCategory">入力カテゴリ</label>
            <select id="manualCategory" name="category" ${disabled}>
              <option value="batting">個人成績（野手）</option>
              <option value="pitching">個人成績（投手）</option>
            </select>
          </div>
          <div id="manualBattingFields" class="field-grid">${buildManualFields(battingFields, 'batting')}</div>
          <div id="manualPitchingFields" class="field-grid hidden">${buildManualFields(pitchingFields, 'pitching')}</div>
          <div id="manualPitchingBattedBallFields" class="hidden">${buildPitchingBattedBallEditorFields('manual-batted-ball')}</div>
          <div class="actions single-action">
            <button class="button-primary" type="submit" ${disabled}>保存する</button>
          </div>
          <div id="manualStatsMessage" class="small"></div>
          <div id="manualDerivedPreview" class="derived-box"></div>
        </form>
      </section>
    `;
  }

  function buildBig3InputCard(user) {
    const players = state.players;
    const selfPlayerId = user.role === 'player' ? user.id : null;
    const selectablePlayers = players.filter((player) => (selfPlayerId ? player.id === selfPlayerId : true));
    const warningText = '※ 1000kg以上の値は異常値の可能性があります。保存前に再確認してください。';
    const currentRecord = (state.dashboard && state.dashboard.big3 && state.dashboard.big3.currentRecord) || {};
    const disabled = selectablePlayers.length === 0 ? 'disabled' : '';
    const playerField = selfPlayerId
      ? `
          <div class="form-row">
            <label>対象選手</label>
            <input type="text" value="${escapeHtml(selectablePlayers[0] ? selectablePlayers[0].name : user.name)}" disabled />
            <input type="hidden" name="userId" value="${selfPlayerId}" />
          </div>
        `
      : `
          <div class="form-row">
            <label for="big3UserId">対象選手</label>
            <select id="big3UserId" name="userId" ${disabled}>
              ${selectablePlayers.map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join('')}
            </select>
          </div>
        `;

    return `
      <section class="card">
        <h2>筋トレBIG3入力</h2>
        <p class="small">ベンチプレス・スクワット・デッドリフトの最新記録を保存します。未入力の種目は空欄のまま保存できます。</p>
        <form id="big3Form">
          ${playerField}
          ${selectablePlayers.length === 0 ? '<div class="notice small">BIG3を入力できる選手がまだ登録されていません。</div>' : ''}
          <div class="field-grid">
            ${big3Fields.map(([key, label]) => `
              <div class="form-row compact-row">
                <label for="big3-${key}">${label} (kg)</label>
                <input
                  id="big3-${key}"
                  name="${key}"
                  type="number"
                  step="0.1"
                  min="0"
                  inputmode="decimal"
                  ${disabled}
                  placeholder="未入力可"
                  value="${currentRecord[key] == null ? '' : escapeHtml(currentRecord[key])}"
                />
              </div>
            `).join('')}
          </div>
          <div id="big3Warning" class="small notice hidden">${warningText}</div>
          <div class="actions single-action">
            <button class="button-primary" type="submit" ${disabled}>BIG3を保存</button>
          </div>
          <div id="big3Message" class="small"></div>
        </form>
      </section>
    `;
  }

  function buildBig3RankingCard(big3, options = {}) {
    const limit = Number(options.limit);
    const hasLimit = Number.isFinite(limit) && limit > 0;
    const showDetailLink = Boolean(options.showDetailLink);
    const detailHref = options.detailHref || 'coach-stats.html#big3-ranking';
    const detailLabel = options.detailLabel || 'もっと表示する';
    const detailLinkMode = options.detailLinkMode || 'always';
    const highlightUserId = Number(options.highlightUserId);
    const cardClass = options.cardClass ? ` ${options.cardClass}` : '';
    const tabs = [
      { key: 'benchPress', label: 'ベンチ' },
      { key: 'squat', label: 'スクワット' },
      { key: 'deadlift', label: 'デッド' },
      { key: 'total', label: '合計' },
    ];
    const activeKey = big3 && big3.rankings && big3.rankings[state.activeBig3Tab] ? state.activeBig3Tab : 'benchPress';
    const activeRanking = (big3 && big3.rankings && big3.rankings[activeKey]) || { label: 'ベンチプレス', entries: [] };
    const visibleEntries = activeRanking.entries.slice(0, hasLimit ? limit : (Number(big3 && big3.leaderboardLimit) || 5));
    const hasOverflow = Boolean(hasLimit && tabs.some((tab) => {
      const entries = (big3 && big3.rankings && big3.rankings[tab.key] && big3.rankings[tab.key].entries) || [];
      return entries.length > limit;
    }));
    const shouldShowDetailLink = showDetailLink && (detailLinkMode !== 'overflow' || hasOverflow);

    return `
      <section class="card${cardClass}">
        <h2>筋トレBIG3ランキング</h2>
        <p class="small">全ロール共通で閲覧できます。各種目は重量の高い順で表示され、同重量は同順位です。</p>
        <div class="tab-row" role="tablist" aria-label="BIG3ランキング切り替え">
          ${tabs.map((tab) => `
            <button type="button" class="tab-button ${tab.key === activeKey ? 'active' : ''}" data-big3-tab="${tab.key}" aria-pressed="${String(tab.key === activeKey)}">${tab.label}</button>
          `).join('')}
        </div>
        <div class="ranking-list">
          <div class="small ranking-caption">${escapeHtml(activeRanking.label)} 上位${visibleEntries.length || 0}名</div>
          ${visibleEntries.length === 0 ? '<div class="small">ランキング対象データがまだありません。</div>' : visibleEntries.map((entry) => `
            <article class="big3-rank-item ${entry.isLeader ? 'is-leader' : ''} ${Number(entry.userId) === highlightUserId ? 'is-self-highlight' : ''}">
              <div class="big3-rank-main">
                <div class="big3-rank-place">${entry.isLeader ? '👑 ' : ''}${entry.rank}位</div>
                <div>
                  <strong>${escapeHtml(entry.userName)}</strong>
                  ${Number(entry.userId) === highlightUserId ? '<div class="meta self-badge">あなた</div>' : ''}
                  <div class="meta">更新日: ${escapeHtml(String(entry.updatedAt || '').slice(0, 10) || '未設定')}</div>
                </div>
              </div>
              <div class="big3-rank-weight">${escapeHtml(fmtKg(entry.weight))}</div>
            </article>
          `).join('')}
        </div>
        ${shouldShowDetailLink ? `<div class="actions single-action"><a class="button button-secondary" href="${detailHref}">${escapeHtml(detailLabel)}</a></div>` : ''}
      </section>
    `;
  }

  function buildCoachHomeEntryCard(title, description, href, buttonLabel = '詳細を見る') {
    return `
      <section class="card">
        <h2>${escapeHtml(title)}</h2>
        <p class="small">${escapeHtml(description)}</p>
        <div class="actions single-action">
          <a class="button button-secondary" href="${href}">${escapeHtml(buttonLabel)}</a>
        </div>
      </section>
    `;
  }

  function buildScorebookCard() {
    const gameOptions = state.games.map((game) => `<option value="${game.id}">${escapeHtml(`${game.date} [${getGameTypeLabel(game.gameType)}] vs ${game.opponent}`)}</option>`).join('');
    return `
      <section class="card">
        <h2>スコアブック写真からの入力</h2>
        <p class="small">写真をアップロードし、必要に応じてスマートフォンOCRの結果や補足テキストを貼り付けると候補を作成できます。候補は保存前に必ず確認・修正してください。</p>
        ${state.games.length === 0 ? '<div class="notice">試合登録後に利用できます。</div>' : ''}
        <form id="scorebookForm">
          <div class="form-row">
            <label for="scorebookGameId">対象試合</label>
            <select id="scorebookGameId" name="gameId" ${state.games.length === 0 ? 'disabled' : ''}>${gameOptions}</select>
          </div>
          <div class="form-row">
            <label for="scorebookFile">スコアブック写真</label>
            <input id="scorebookFile" name="file" type="file" accept="image/*" ${state.games.length === 0 ? 'disabled' : ''} />
          </div>
          <div class="form-row">
            <label for="scorebookText">読み取り補助テキスト</label>
            <textarea id="scorebookText" name="extractedText" placeholder="例: 山田: batting atBats=4 hits=2 walks=1 runsBattedIn=2\n佐藤: pitching outsRecorded=15 pitchCount=86 hitsAllowed=4 walks=2 strikeouts=6 earnedRuns=1 battersFaced=23 battedBall.straight.ground=2 battedBall.slider.fly=1"></textarea>
          </div>
          <button class="button-secondary" type="submit" ${state.games.length === 0 ? 'disabled' : ''}>入力候補を作成</button>
          <div id="scorebookMessage" class="small"></div>
        </form>
        <div id="scorebookPreview"></div>
      </section>
    `;
  }

  function buildPersonalGoalCard(user) {
    if (!user || user.role !== 'player') return '';
    const personalGoal = String((user.profile && user.profile.personalGoal) || '');
    const hasGoal = Boolean(personalGoal.trim());
    return `
      <section class="card">
        <h2>個人目標</h2>
        <p class="small">${hasGoal ? '今月の目標は入力内容を更新すると自動で反映されます。' : '今月の目標を入力すると自動で保存され、次回ログイン後もこの画面に表示されます。'}</p>
        <div id="personalGoalForm">
          <div class="form-row">
            <label for="personalGoalInput">今月の目標</label>
            <textarea id="personalGoalInput" name="personalGoal" maxlength="300" placeholder="今月の目標を入力">${escapeHtml(personalGoal)}</textarea>
          </div>
          <div class="goal-card-footer">
            <div id="personalGoalStatus" class="small goal-status">${hasGoal ? `保存済み: ${escapeHtml(personalGoal)}` : 'まだ個人目標は未入力です。'}</div>
            <div id="personalGoalMessage" class="small goal-message" aria-live="polite"></div>
          </div>
        </div>
      </section>
    `;
  }

  function bindPersonalGoalForm() {
    const form = qs('personalGoalForm');
    if (!form) return;
    const message = qs('personalGoalMessage');
    const input = qs('personalGoalInput');
    const status = qs('personalGoalStatus');
    if (!message || !input || !status) return;

    let lastSavedGoal = String(input.value || '').trim();
    let saveTimer = null;
    let isSaving = false;
    let pendingGoal = null;

    function setMessage(text, tone) {
      message.className = `small goal-message${tone ? ` ${tone}` : ''}`;
      message.textContent = text;
    }

    function updateStatus(goal) {
      status.textContent = goal ? `保存済み: ${goal}` : 'まだ個人目標は未入力です。';
    }

    async function saveGoal(goalValue) {
      const normalizedGoal = String(goalValue || '').trim();
      if (normalizedGoal === lastSavedGoal) {
        if (!normalizedGoal) setMessage('', '');
        return;
      }
      if (isSaving) {
        pendingGoal = goalValue;
        return;
      }

      isSaving = true;
      setMessage('自動保存中です...', '');
      try {
        const payload = await api('/api/profile/personal-goal', {
          method: 'PUT',
          body: JSON.stringify({ personalGoal: goalValue }),
        });
        state.user = payload.user;
        if (state.dashboard) {
          state.dashboard.user = payload.user;
        }
        const savedGoal = String((payload.user && payload.user.profile && payload.user.profile.personalGoal) || '');
        const currentGoal = String(input.value || '').trim();
        lastSavedGoal = savedGoal.trim();
        updateStatus(savedGoal);
        if (currentGoal === normalizedGoal) {
          input.value = savedGoal;
        }
        setMessage(payload.message, 'success-text');
      } catch (error) {
        setMessage(error.message, 'error-text');
      } finally {
        isSaving = false;
        if (pendingGoal != null) {
          const nextGoal = pendingGoal;
          pendingGoal = null;
          if (String(nextGoal || '').trim() !== lastSavedGoal) {
            saveGoal(nextGoal);
          }
        }
      }
    }

    function queueAutoSave() {
      const normalizedGoal = String(input.value || '').trim();
      if (saveTimer) clearTimeout(saveTimer);
      if (normalizedGoal === lastSavedGoal) {
        setMessage('', '');
        return;
      }
      setMessage('入力内容を自動で保存します...', '');
      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        saveGoal(input.value);
      }, 700);
    }

    input.addEventListener('input', queueAutoSave);
    input.addEventListener('blur', () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      saveGoal(input.value);
    });
  }

  function buildRecentGameCard(recentGame) {
    if (!recentGame) {
      return `<section class="card"><h2>直近試合結果</h2><div class="small">試合がまだ登録されていません。</div></section>`;
    }
    const resultClass = recentGame.result === 'win' ? 'result-win' : recentGame.result === 'loss' ? 'result-loss' : '';
    const resultLabel = recentGame.result === 'win' ? '勝利' : recentGame.result === 'loss' ? '敗戦' : '引き分け';
    return `
      <section class="card">
        <h2>直近試合結果</h2>
        <div class="list-item">
          <strong>${escapeHtml(`${recentGame.date} vs ${recentGame.opponent}`)}</strong>
          <div class="meta">試合種別: ${escapeHtml(getGameTypeLabel(recentGame.gameType))}</div>
          <div class="meta">${escapeHtml(recentGame.location || '会場未設定')}</div>
          <div class="score-line"><span class="score-badge">${recentGame.teamScore} - ${recentGame.opponentScore}</span> <span class="${resultClass}">${resultLabel}</span></div>
          <div class="meta">打者入力: ${recentGame.battingPlayerCount}名 / 投手入力: ${recentGame.pitchingPlayerCount}名 / スコアブック: ${recentGame.scorebookCount}件</div>
          <a class="inline-link" href="game-detail.html?gameId=${recentGame.id}">試合詳細を見る</a>
        </div>
      </section>
    `;
  }

  function buildPersonalSummarySection(summary, sectionKey, heading) {
    const bucketSummary = summary || {};
    const battingDerived = (bucketSummary.batting && bucketSummary.batting.derived) || {};
    const pitchingDerived = (bucketSummary.pitching && bucketSummary.pitching.derived) || {};
    const breakdown = pitchingDerived.pitchingBattedBallBreakdown;
    const toggleId = `personal-summary-${sectionKey}`;
    const stats = [
      { label: '打率', value: fmt3(battingDerived.battingAverage) },
      { label: '出塁率', value: fmt3(battingDerived.onBasePercentage) },
      { label: '長打率', value: fmt3(battingDerived.sluggingPercentage) },
      { label: 'OPS', value: fmt3(battingDerived.ops) },
      { label: '盗塁成功率', value: fmtPct(battingDerived.stealSuccessRate) },
      { label: '得点圏打率', value: fmt3(battingDerived.rispAverage) },
      { label: '左右投手別打率', value: `${fmt3(battingDerived.vsLeftAverage)} / ${fmt3(battingDerived.vsRightAverage)}` },
      { label: '防御率', value: fmt3(pitchingDerived.era) },
      { label: 'WHIP', value: fmt3(pitchingDerived.whip) },
      { label: '被打率', value: fmt3(pitchingDerived.hitAverage) },
      { label: '左右別被打率', value: `${fmt3(pitchingDerived.vsLeftHitAverage)} / ${fmt3(pitchingDerived.vsRightHitAverage)}` },
      {
        label: 'ゴロ/フライ',
        value: fmt3(pitchingDerived.groundFlyRatio),
        meta: 'クリックで球種別内訳',
        className: 'stat-card-button',
        attributes: `data-ground-fly-toggle="${toggleId}" role="button" tabindex="0" aria-expanded="false"`,
      },
    ];
    return `
      <div class="summary-split-section">
        <h3>${escapeHtml(heading)}</h3>
        ${createStatGrid(stats)}
        <div id="groundFlyDetailPanel-${toggleId}" class="ground-fly-detail hidden">
          <div class="small">球種ごとのゴロ・フライ割合を簡易表示しています。既存データで球種不明のものは「不明」に集約しています。</div>
          ${buildGroundFlyDetailTable({ pitching: { derived: { pitchingBattedBallBreakdown: breakdown } } })}
        </div>
      </div>
    `;
  }

  function buildPersonalSummaryCard(summary, user) {
    if (!summary) return '';
    const bucketSections = performanceSummaryBuckets
      .map(({ key, label }) => buildPersonalSummarySection((summary.byBucket && summary.byBucket[key]) || summary, key, label))
      .join('');
    return `
      <section class="card">
        <h2>個人成績サマリー</h2>
        <p class="small">${user.role === 'player' ? '自分の成績のみ表示しています。' : '反映済みの集計結果です。'}</p>
        ${bucketSections}
      </section>
    `;
  }

  function buildCoachPlayerSummaryCards(playerSummaries) {
    return `
      <section class="card">
        <div class="section-heading-row">
          <div>
            <h2>選手別 個人成績サマリー</h2>
            <div class="small">指導者ホームでは選手ごとの主要指標を一覧で確認できます。</div>
          </div>
        </div>
        ${!playerSummaries.length ? '<div class="small">表示できる選手データがありません。</div>' : `
          <div class="coach-player-summary-grid">
            ${playerSummaries.map(({ player, summary }) => `
              <a class="coach-player-summary-card" href="player-detail.html?playerId=${player.id}">
                <div class="coach-player-summary-head">
                  <div>
                    <strong>${escapeHtml(player.name)}</strong>
                    <div class="meta">${escapeHtml(buildPlayerMetaLine(player))}</div>
                  </div>
                  <span class="summary-link-text">詳細へ</span>
                </div>
                <div class="coach-player-summary-stats">
                  <div class="stat-card">
                    <div class="stat-label">打率</div>
                    <div class="stat-value">${fmt3(summary.batting.derived.battingAverage)}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">OPS</div>
                    <div class="stat-value">${fmt3(summary.batting.derived.ops)}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">打点</div>
                    <div class="stat-value">${summary.batting.raw.runsBattedIn}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-label">防御率</div>
                    <div class="stat-value">${fmt3(summary.pitching.derived.era)}</div>
                  </div>
                </div>
              </a>
            `).join('')}
          </div>
        `}
      </section>
    `;
  }

  function buildTeamSummaryCard(teamSummary) {
    return `
      <section class="card">
        <h2>チーム成績サマリー</h2>
        ${createStatGrid([
          { label: 'チーム打率', value: fmt3(teamSummary.battingAverage) },
          { label: 'チーム出塁率', value: fmt3(teamSummary.onBasePercentage) },
          { label: 'チームOPS', value: fmt3(teamSummary.ops) },
          { label: '総得点', value: teamSummary.totalRuns },
          { label: '総失点', value: teamSummary.totalRunsAllowed },
          { label: 'チーム防御率', value: fmt3(teamSummary.teamEra) },
          { label: 'チーム盗塁数', value: teamSummary.teamSteals },
        ])}
      </section>
    `;
  }

  function buildRankingCard(rankings, options = {}) {
    const limit = Number(options.limit);
    const hasLimit = Number.isFinite(limit) && limit > 0;
    const showDetailLink = Boolean(options.showDetailLink);
    const detailHref = options.detailHref || 'coach-stats.html#player-ranking';
    const detailLabel = options.detailLabel || 'もっと表示する';
    const detailLinkMode = options.detailLinkMode || 'always';
    const highlightUserId = Number(options.highlightUserId);
    const cardClass = options.cardClass ? ` ${options.cardClass}` : '';
    const visibleRankings = hasLimit ? rankings.slice(0, limit) : rankings;
    const hasOverflow = rankings.length > visibleRankings.length;
    const shouldShowDetailLink = showDetailLink && (detailLinkMode !== 'overflow' || hasOverflow);
    return `
      <section class="card${cardClass}">
        <h2>個人成績ランキング</h2>
        ${visibleRankings.length === 0 ? '<div class="small">ランキング対象データがありません。</div>' : visibleRankings.map((player, index) => `
          <div class="list-item ${Number(player.id) === highlightUserId ? 'is-self-highlight' : ''}">
            <strong>${index + 1}位 ${escapeHtml(player.name)}</strong>
            ${Number(player.id) === highlightUserId ? '<span class="meta self-badge">あなた</span>' : ''}
            <div class="meta">OPS ${fmt3(player.ops)} / 打率 ${fmt3(player.battingAverage)} / 打点 ${player.runsBattedIn} / 奪三振 ${player.strikeouts} / 防御率 ${fmt3(player.era)}</div>
          </div>
        `).join('')}
        ${shouldShowDetailLink ? `<div class="actions single-action"><a class="button button-secondary" href="${detailHref}">${escapeHtml(detailLabel)}</a></div>` : ''}
      </section>
    `;
  }

  function buildPlayerSummaryTable(playerSummaries) {
    return `
      <section class="card">
        <h2>チーム全体の成績確認</h2>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>選手</th><th>学年</th><th>打率</th><th>OPS</th><th>打点</th><th>防御率</th><th>WHIP</th></tr></thead>
            <tbody>
              ${playerSummaries.map(({ player, summary }) => `
                <tr>
                  <td>${escapeHtml(player.name)}</td>
                  <td>${escapeHtml(getPlayerGradeLabel(player))}</td>
                  <td>${fmt3(summary.batting.derived.battingAverage)}</td>
                  <td>${fmt3(summary.batting.derived.ops)}</td>
                  <td>${summary.batting.raw.runsBattedIn}</td>
                  <td>${fmt3(summary.pitching.derived.era)}</td>
                  <td>${fmt3(summary.pitching.derived.whip)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function buildRoleHero(user) {
    const actionLink = ['manager', 'player'].includes(user.role) ? 'condition.html' : AppRoles.getRolePage(user.role);
    const actionLabel = user.role === 'manager' ? '入力専用ページ' : user.role === 'player' ? '自分の入力ページ' : '指導者ビュー';
    return `
      <section class="card role-hero">
        <div class="hero-kicker">${escapeHtml(getRoleLabel(user.role))}</div>
        <h2>${escapeHtml(user.name)} さんのホーム</h2>
        <a class="button button-secondary" href="${actionLink}">${actionLabel}</a>
      </section>
    `;
  }

  function getMatchingEntry(form) {
    const entryMap = buildEntryMap(state.entries);
    const gameId = form.querySelector('[name="gameId"]')?.value;
    const playerId = form.querySelector('[name="playerId"]')?.value;
    const category = form.querySelector('[name="category"]')?.value;
    return entryMap.get(`${gameId}:${playerId}:${category}`) || null;
  }

  function resetFields(form, fields) {
    fields.forEach(([key]) => {
      const input = form.querySelector(`[name="raw.${key}"]`);
      if (input) input.value = '0';
    });
  }

  function applyEntryToForm(form, entry) {
    const category = form.querySelector('[name="category"]')?.value;
    resetFields(form, battingFields);
    resetFields(form, pitchingFields);
    applyPitchingBattedBallProfileToForm(form, {});
    if (!entry) return;
    const fields = category === 'pitching' ? pitchingFields : battingFields;
    fields.forEach(([key]) => {
      const input = form.querySelector(`[name="raw.${key}"]`);
      if (input) input.value = entry.raw[key] ?? 0;
    });
    if (category === 'pitching') {
      applyPitchingBattedBallProfileToForm(form, entry.raw.pitchingBattedBallProfile);
    }
  }

  function collectRaw(form, category) {
    const fields = category === 'pitching' ? pitchingFields : battingFields;
    const raw = fields.reduce((acc, [key]) => {
      const input = form.querySelector(`[name="raw.${key}"]`);
      acc[key] = number(input && input.value);
      return acc;
    }, {});
    if (category === 'pitching') {
      raw.pitchingBattedBallProfile = collectPitchingBattedBallProfile(form);
    }
    return raw;
  }

  function battingDerived(raw) {
    const singles = Math.max(0, number(raw.hits) - number(raw.doubles) - number(raw.triples) - number(raw.homeRuns));
    const totalBases = singles + number(raw.doubles) * 2 + number(raw.triples) * 3 + number(raw.homeRuns) * 4;
    const avg = number(raw.atBats) ? number(raw.hits) / number(raw.atBats) : 0;
    const obpDen = number(raw.atBats) + number(raw.walks) + number(raw.hitByPitch) + number(raw.sacrificeFlies);
    const obp = obpDen ? (number(raw.hits) + number(raw.walks) + number(raw.hitByPitch)) / obpDen : 0;
    const slg = number(raw.atBats) ? totalBases / number(raw.atBats) : 0;
    return {
      battingAverage: avg,
      onBasePercentage: obp,
      sluggingPercentage: slg,
      ops: obp + slg,
      stealSuccessRate: number(raw.stolenBaseAttempts) ? number(raw.stolenBases) / number(raw.stolenBaseAttempts) : 0,
      rispAverage: number(raw.rispAtBats) ? number(raw.rispHits) / number(raw.rispAtBats) : 0,
      vsLeftAverage: number(raw.vsLeftAtBats) ? number(raw.vsLeftHits) / number(raw.vsLeftAtBats) : 0,
      vsRightAverage: number(raw.vsRightAtBats) ? number(raw.vsRightHits) / number(raw.vsRightAtBats) : 0,
    };
  }

  function pitchingDerived(raw) {
    const normalizedRaw = AppStats.applyPitchingBattedBallBreakdown(raw);
    const innings = number(raw.outsRecorded) / 3;
    const breakdown = AppStats.summarizePitchingBattedBallProfile(
      normalizedRaw.pitchingBattedBallProfile,
      normalizedRaw.groundOuts,
      normalizedRaw.flyOuts,
    );
    return {
      era: innings ? (number(raw.earnedRuns) * 9) / innings : 0,
      whip: innings ? (number(raw.hitsAllowed) + number(raw.walks)) / innings : 0,
      hitAverage: number(raw.battersFaced) ? number(raw.hitsAllowed) / number(raw.battersFaced) : 0,
      vsLeftHitAverage: number(raw.vsLeftBatters) ? number(raw.vsLeftHits) / number(raw.vsLeftBatters) : 0,
      vsRightHitAverage: number(raw.vsRightBatters) ? number(raw.vsRightHits) / number(raw.vsRightBatters) : 0,
      groundFlyRatio: number(normalizedRaw.flyOuts) ? number(normalizedRaw.groundOuts) / number(normalizedRaw.flyOuts) : number(normalizedRaw.groundOuts),
      pitchingBattedBallBreakdown: {
        rows: breakdown.rows,
        totals: breakdown.totals,
      },
    };
  }

  function renderManualDerivedPreview(form) {
    const category = form.querySelector('[name="category"]').value;
    const raw = collectRaw(form, category);
    const target = qs('manualDerivedPreview');
    if (!target) return;
    if (category === 'batting') {
      const d = battingDerived(raw);
      target.innerHTML = createStatGrid([
        { label: '打率', value: fmt3(d.battingAverage) },
        { label: '出塁率', value: fmt3(d.onBasePercentage) },
        { label: '長打率', value: fmt3(d.sluggingPercentage) },
        { label: 'OPS', value: fmt3(d.ops) },
        { label: '盗塁成功率', value: fmtPct(d.stealSuccessRate) },
        { label: '得点圏打率', value: fmt3(d.rispAverage) },
        { label: '左右投手別打率', value: `${fmt3(d.vsLeftAverage)} / ${fmt3(d.vsRightAverage)}` },
      ]);
      return;
    }
    const d = pitchingDerived(raw);
    target.innerHTML = createStatGrid([
      { label: '被打率', value: fmt3(d.hitAverage) },
      { label: '左右別被打率', value: `${fmt3(d.vsLeftHitAverage)} / ${fmt3(d.vsRightHitAverage)}` },
      { label: '防御率', value: fmt3(d.era) },
      { label: 'WHIP', value: fmt3(d.whip) },
      { label: 'ゴロ/フライ', value: fmt3(d.groundFlyRatio) },
    ]);
    target.insertAdjacentHTML('beforeend', `<div class="ground-fly-detail manual-inline-detail">${buildGroundFlyDetailTable({ pitching: { derived: { pitchingBattedBallBreakdown: d.pitchingBattedBallBreakdown } } })}</div>`);
  }

  function toggleCategoryFields(category) {
    qs('manualBattingFields')?.classList.toggle('hidden', category !== 'batting');
    qs('manualPitchingFields')?.classList.toggle('hidden', category !== 'pitching');
    qs('manualPitchingBattedBallFields')?.classList.toggle('hidden', category !== 'pitching');
  }

  function bindManualForm() {
    const form = qs('manualStatsForm');
    if (!form) return;
    const categorySelect = qs('manualCategory');
    const reload = () => {
      toggleCategoryFields(categorySelect.value);
      applyEntryToForm(form, getMatchingEntry(form));
      renderManualDerivedPreview(form);
    };

    form.addEventListener('change', (event) => {
      if (['manualCategory', 'manualGameId', 'manualPlayerId'].includes(event.target.id)) {
        reload();
      }
      if (String(event.target.name || '').startsWith('raw.') || String(event.target.name || '').startsWith('battedBall.')) {
        renderManualDerivedPreview(form);
      }
    });
    form.addEventListener('input', (event) => {
      if (String(event.target.name || '').startsWith('raw.') || String(event.target.name || '').startsWith('battedBall.')) {
        renderManualDerivedPreview(form);
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = qs('manualStatsMessage');
      const category = categorySelect.value;
      const payload = {
        gameId: number(form.gameId.value),
        playerId: number(form.playerId.value),
        category,
        sourceType: 'manual',
        raw: collectRaw(form, category),
      };
      message.className = 'small';
      message.textContent = '保存中です...';
      try {
        await api('/api/stats/manual', { method: 'POST', body: JSON.stringify(payload) });
        message.classList.add('success-text');
        message.textContent = '成績を保存しました。ホームのサマリーへ反映されます。';
        await refreshData();
      } catch (error) {
        message.classList.add('error-text');
        message.textContent = error.message;
      }
    });

    reload();
  }

  function syncBig3Warning(form) {
    const warning = qs('big3Warning');
    if (!form || !warning) return;
    const hasExtremeValue = big3Fields.some(([key]) => {
      const value = nullableNumber(form.querySelector(`[name="${key}"]`)?.value);
      return value != null && value >= 1000;
    });
    warning.classList.toggle('hidden', !hasExtremeValue);
  }

  function fillBig3Form(form) {
    if (!form) return;
    const selectedUserId = Number(form.userId.value);
    const recordsByUser = (state.dashboard && state.dashboard.big3 && state.dashboard.big3.recordsByUser) || {};
    const currentRecord = recordsByUser[selectedUserId] || {};
    big3Fields.forEach(([key]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) input.value = currentRecord[key] == null ? '' : currentRecord[key];
    });
    syncBig3Warning(form);
  }

  function bindBig3Form() {
    const form = qs('big3Form');
    if (!form) return;

    form.addEventListener('input', () => {
      syncBig3Warning(form);
    });
    form.userId?.addEventListener('change', () => {
      fillBig3Form(form);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = qs('big3Message');
      const payload = {
        userId: Number(form.userId.value),
      };

      big3Fields.forEach(([key]) => {
        payload[key] = form.querySelector(`[name="${key}"]`)?.value ?? '';
      });

      message.className = 'small';
      message.textContent = '保存中です...';
      try {
        await api('/api/big3', { method: 'POST', body: JSON.stringify(payload) });
        message.className = 'small success-text';
        message.textContent = 'BIG3記録を保存しました。ホームのランキングへ反映されます。';
        await refreshData();
        fillBig3Form(form);
      } catch (error) {
        message.className = 'small error-text';
        message.textContent = error.message;
      }
    });

    fillBig3Form(form);
  }

  function bindBig3Tabs() {
    document.querySelectorAll('[data-big3-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        state.activeBig3Tab = button.dataset.big3Tab || 'benchPress';
        renderHome();
      });
    });
  }

  function bindGroundFlyToggles(root = document) {
    root.querySelectorAll('[data-ground-fly-toggle]').forEach((toggle) => {
      const key = toggle.dataset.groundFlyToggle;
      const panel = root.querySelector(`#groundFlyDetailPanel-${key}`);
      if (!panel) return;
      const handleToggle = () => {
        const isHidden = panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !isHidden);
        toggle.setAttribute('aria-expanded', String(isHidden));
      };
      toggle.addEventListener('click', handleToggle);
      toggle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleToggle();
        }
      });
    });
  }

  function buildCandidateEditor(candidate, uploadId, gameId) {
    const fields = candidate.category === 'pitching' ? pitchingFields : battingFields;
    return `
      <form class="list-item scorebook-candidate" data-upload-id="${uploadId}" data-player-id="${candidate.playerId}" data-category="${candidate.category}" data-game-id="${gameId}">
        <strong>${escapeHtml(candidate.playerName)} / ${candidate.category === 'pitching' ? '投手' : '野手'}</strong>
        <div class="meta">自動候補を確認してから保存してください。</div>
        <div class="field-grid compact-top">
          ${fields.map(([key, label]) => `
            <div class="form-row compact-row">
              <label>${label}</label>
              <input type="number" step="0.01" min="0" name="raw.${key}" value="${number(candidate.raw[key])}" />
            </div>
          `).join('')}
        </div>
        ${candidate.category === 'pitching' ? buildPitchingBattedBallEditorFields(`scorebook-${uploadId}-${candidate.playerId}`, candidate.raw.pitchingBattedBallProfile) : ''}
        <button class="button-primary" type="submit">この候補を保存</button>
      </form>
    `;
  }

  function renderScorebookPreview(upload) {
    const root = qs('scorebookPreview');
    if (!root) return;
    const fallback = state.players[0]
      ? buildCandidateEditor({ playerId: state.players[0].id, playerName: state.players[0].name, category: 'batting', raw: {} }, upload.id, upload.gameId)
      : '<div class="small">選手登録後に候補修正フォームを表示できます。</div>';
    root.innerHTML = `
      <div class="upload-preview">
        <img src="${upload.imageDataUrl}" alt="scorebook preview" class="scorebook-image" />
        <div class="small">解析ステータス: ${escapeHtml(upload.parseStatus)}</div>
      </div>
      <div class="small">${upload.candidates.length > 0 ? '候補が作成されました。必要な箇所を修正して保存してください。' : '候補を十分に読み取れなかったため、手動修正フォームを表示しています。'}</div>
      ${(upload.candidates.length > 0 ? upload.candidates : []).map((candidate) => buildCandidateEditor(candidate, upload.id, upload.gameId)).join('') || fallback}
    `;

    root.querySelectorAll('.scorebook-candidate').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const category = form.dataset.category;
        const fields = category === 'pitching' ? pitchingFields : battingFields;
        const raw = fields.reduce((acc, [key]) => {
          acc[key] = number(form.querySelector(`[name="raw.${key}"]`)?.value);
          return acc;
        }, {});
        if (category === 'pitching') {
          raw.pitchingBattedBallProfile = collectPitchingBattedBallProfile(form);
        }
        const payload = {
          gameId: number(form.dataset.gameId),
          playerId: number(form.dataset.playerId),
          category,
          sourceType: 'scorebook',
          scorebookUploadId: number(form.dataset.uploadId),
          raw,
        };
        try {
          await api('/api/stats/manual', { method: 'POST', body: JSON.stringify(payload) });
          form.insertAdjacentHTML('beforeend', '<div class="small success-text">保存しました。</div>');
          await refreshData();
        } catch (error) {
          form.insertAdjacentHTML('beforeend', `<div class="small error-text">${escapeHtml(error.message)}</div>`);
        }
      });
    });
  }

  async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function bindScorebookForm() {
    const form = qs('scorebookForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const file = form.file.files[0];
      const message = qs('scorebookMessage');
      if (!file) {
        message.className = 'small error-text';
        message.textContent = '画像ファイルを選択してください。';
        return;
      }
      message.className = 'small';
      message.textContent = '入力候補を作成中です...';
      try {
        const imageDataUrl = await readFileAsDataUrl(file);
        const payload = await api('/api/stats/scorebook-preview', {
          method: 'POST',
          body: JSON.stringify({
            gameId: number(form.gameId.value),
            fileName: file.name,
            imageDataUrl,
            extractedText: form.extractedText.value,
          }),
        });
        message.className = 'small success-text';
        message.textContent = payload.message;
        state.scorebookUpload = payload.upload;
        renderScorebookPreview(payload.upload);
      } catch (error) {
        message.className = 'small error-text';
        message.textContent = error.message;
      }
    });
  }

  async function refreshData() {
    const [dashboard, games, players, entries] = await Promise.all([
      api('/api/dashboard'),
      api('/api/games'),
      api('/api/players'),
      api('/api/stat-entries'),
    ]);
    state.dashboard = dashboard;
    state.games = games.games;
    state.players = players.players;
    state.entries = entries.entries;
    state.user = dashboard.user;
  }

  async function refreshDiaryNotes() {
    const user = state.user || (await fetchCurrentUser());
    if (!user || user.role !== 'player') {
      state.diaryNotes = [];
      return;
    }
    const payload = await api('/api/diary-notes');
    state.diaryNotes = (payload.notes || []).map((note) => ({ ...note, tags: normalizeDiaryTags(note.tags) }));
  }

  async function refreshCoachDiaryNotes() {
    const user = state.user || (await fetchCurrentUser());
    if (!user || user.role !== 'coach') {
      state.coachDiaryNotes = [];
      return;
    }
    const payload = await api('/api/coach/diary-notes');
    state.coachDiaryNotes = (payload.notes || []).map((note) => prepareCoachDiaryNote(note));
    state.coachDiaryStampOptions = payload.stampOptions || defaultCoachDiaryStampOptions;
  }

  function prepareCoachDiaryNote(note) {
    const normalizedTags = normalizeDiaryTags(note.tags);
    const normalizedTagsLower = normalizedTags
      .map((tag) => String(tag || '').trim().toLowerCase())
      .filter(Boolean);
    const playerName = String(note.playerName || '').toLowerCase();
    const body = String(note.body || '').toLowerCase();
    note.tags = normalizedTags;
    note._coachDiaryTagSet = new Set(normalizedTagsLower);
    note._coachDiarySearchable = `${playerName} ${body} ${normalizedTagsLower.join(' ')}`;
    note._coachDiaryGrade = getPlayerGrade(getCoachDiaryNotePlayerProfile(note));
    return note;
  }

  function normalizeYearMonth(value) {
    const normalized = String(value || '').trim();
    return /^\d{4}-\d{2}$/.test(normalized) ? normalized : new Date().toISOString().slice(0, 7);
  }

  function shiftYearMonth(yearMonth, offset) {
    const [yearValue, monthValue] = String(normalizeYearMonth(yearMonth)).split('-');
    const next = new Date(Number(yearValue), Number(monthValue) - 1 + Number(offset || 0), 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }

  function getMonthLabel(yearMonth) {
    const [yearValue, monthValue] = String(normalizeYearMonth(yearMonth)).split('-');
    const date = new Date(Number(yearValue), Number(monthValue) - 1, 1);
    if (Number.isNaN(date.getTime())) return yearMonth;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  }

  async function refreshManagerDailyLogs() {
    const user = state.user || (await fetchCurrentUser());
    if (!user || user.role !== 'manager') {
      state.managerDailyLogs = [];
      state.managerDailyLogMissingPlayers = [];
      state.managerDailyLogSummary = null;
      return;
    }

    const month = normalizeYearMonth(state.managerDailyLogCalendarMonth);
    if (!state.managerDailyLogSelectedDate || !String(state.managerDailyLogSelectedDate).startsWith(month)) {
      state.managerDailyLogSelectedDate = `${month}-${String(new Date().getDate()).padStart(2, '0')}`;
    }

    const payload = await api(`/api/manager/daily-logs?month=${encodeURIComponent(month)}&date=${encodeURIComponent(state.managerDailyLogSelectedDate)}`);
    state.managerDailyLogs = payload.players || [];
    state.managerDailyLogMissingPlayers = payload.missingPlayers || [];
    state.managerDailyLogSummary = payload.summary || null;
    state.managerDailyLogCalendarMonth = payload.month || month;
    state.managerDailyLogSelectedDate = payload.selectedDate || state.managerDailyLogSelectedDate;

    if (
      state.managerDailyLogSelectedPlayerId
      && !state.managerDailyLogs.some((player) => Number(player.id) === Number(state.managerDailyLogSelectedPlayerId))
    ) {
      state.managerDailyLogSelectedPlayerId = null;
    }
    if (!state.managerDailyLogSelectedPlayerId && state.managerDailyLogs[0]) {
      state.managerDailyLogSelectedPlayerId = state.managerDailyLogs[0].id;
    }
  }

  function getManagerDailyLogPlayerById(playerId) {
    return state.managerDailyLogs.find((player) => Number(player.id) === Number(playerId)) || null;
  }

  function getManagerDailyLogSelectedPlayer() {
    return getManagerDailyLogPlayerById(state.managerDailyLogSelectedPlayerId) || state.managerDailyLogs[0] || null;
  }

  function getManagerDailyLogStatusMeta(status) {
    switch (status) {
      case 'submitted':
        return { symbol: '○', label: '提出済み', className: 'is-submitted' };
      case 'missed':
        return { symbol: '×', label: '未提出', className: 'is-missed' };
      default:
        return { symbol: '—', label: '未記録', className: 'is-unrecorded' };
    }
  }

  function getManagerDailyLogPlayerMeta(player) {
    if (!player) return '';
    const parts = [player.position || 'ポジション未設定', getPlayerGradeLabel(player.grade || ''), `${player.throws || '—'}投${player.bats || '—'}打`];
    return parts.join(' / ');
  }

  async function refreshPlayerSummaryDetail(playerId) {
    if (!playerId) {
      state.playerSummaryDetail = null;
      return null;
    }
    const payload = await api(`/api/player-summaries/${playerId}`);
    state.playerSummaryDetail = payload;
    return payload;
  }

  async function renderHome() {
    const root = qs('homeRoot');
    if (!root) return;
    await refreshData();
    const { user, recentGame, teamSummary, personalSummary, rankings, playerSummaries, big3 } = state.dashboard;
    const sections = user.role === 'coach'
      ? [buildTeamSummaryCard(teamSummary)]
      : [buildRoleHero(user)];
    if (user.role === 'player') {
      sections.push(buildPersonalGoalCard(user));
    }
    sections.push(buildRecentGameCard(recentGame));
    if (user.role === 'coach') {
      sections.push(
        buildCoachHomeEntryCard('チーム全体の成績確認', '選手別の詳細データは専用ページで確認できます。', 'coach-stats.html#team-overview', '詳細を見る'),
        buildCoachHomeEntryCard('個人成績サマリー', 'ホームでは個人成績の数値を表示しません。詳細ページから選手ごとの成績を確認してください。', 'coach-stats.html#personal-summary', '詳細を見る'),
      );
    } else if (user.role !== 'manager') {
      sections.push(buildPersonalSummaryCard(personalSummary, user));
    }
    if (user.role !== 'coach') {
      sections.push(buildTeamSummaryCard(teamSummary));
    }
    if (user.role === 'manager') {
      sections.push(buildPlayerSummaryTable(playerSummaries));
    }
    if (user.role === 'coach') {
      sections.push(
        buildRankingCard(rankings, { limit: 3, showDetailLink: true, detailHref: 'coach-stats.html#player-ranking' }),
        buildBig3RankingCard(big3, { limit: 3, showDetailLink: true, detailHref: 'coach-stats.html#big3-ranking' }),
      );
    } else if (user.role === 'player') {
      sections.push(
        buildRankingCard(rankings, {
          limit: 3,
          showDetailLink: true,
          detailLinkMode: 'overflow',
          detailHref: 'player-home-detail.html#player-ranking',
          detailLabel: 'もっと表示する',
          cardClass: 'player-home-ranking-card',
        }),
        buildBig3RankingCard(big3, {
          limit: 3,
          showDetailLink: true,
          detailLinkMode: 'overflow',
          detailHref: 'player-home-detail.html#big3-ranking',
          detailLabel: 'もっと表示する',
          cardClass: 'player-home-ranking-card',
        }),
      );
    } else {
      sections.push(buildRankingCard(rankings), buildBig3RankingCard(big3));
    }
    root.innerHTML = sections.join('');
    bindBig3Tabs();
    bindGroundFlyToggles(root);
    bindPersonalGoalForm();
    bindManualForm();
    bindScorebookForm();
    if (state.scorebookUpload) renderScorebookPreview(state.scorebookUpload);
  }

  function buildManagerDailyLogCalendar(player) {
    const month = normalizeYearMonth(state.managerDailyLogCalendarMonth);
    const [yearValue, monthValue] = month.split('-');
    const year = Number(yearValue);
    const monthIndex = Number(monthValue) - 1;
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const startOffset = monthStart.getDay();
    const entriesByDate = new Map(((player && player.calendar) || []).map((entry) => [entry.entryDate, entry]));
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const isoDate = `${month}-${String(day).padStart(2, '0')}`;
      const calendarEntry = entriesByDate.get(isoDate) || { status: 'unrecorded' };
      const statusMeta = getManagerDailyLogStatusMeta(calendarEntry.status);
      const isSelected = state.managerDailyLogSelectedDate === isoDate;
      const isToday = isoDate === new Date().toISOString().slice(0, 10);
      cells.push(`
        <button
          type="button"
          class="calendar-day manager-log-calendar-day ${statusMeta.className} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}"
          data-manager-daily-log-date="${isoDate}"
          aria-pressed="${String(isSelected)}"
        >
          <span class="calendar-day-number">${day}</span>
          <span class="manager-log-calendar-symbol">${statusMeta.symbol}</span>
          <span class="calendar-day-count ${calendarEntry.status === 'unrecorded' ? 'placeholder' : ''}">${statusMeta.label}</span>
        </button>
      `);
    }

    return `
      <section class="card manager-log-calendar-card">
        <div class="diary-calendar-header">
          <div>
            <h2>${player ? `${escapeHtml(player.name)} の提出カレンダー` : '提出カレンダー'}</h2>
            <p class="small">○: 提出済み / ×: 未提出 / —: まだ記録していない日です。</p>
          </div>
          <div class="calendar-month-nav">
            <button type="button" class="button-secondary" data-manager-daily-log-calendar-nav="-1">前月</button>
            <strong>${escapeHtml(getMonthLabel(month))}</strong>
            <button type="button" class="button-secondary" data-manager-daily-log-calendar-nav="1">次月</button>
          </div>
        </div>
        <div class="calendar-weekdays">
          <span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span>
        </div>
        <div class="calendar-grid">${cells.join('')}</div>
      </section>
    `;
  }

  function buildManagerDailyLogPanel() {
    const selectedPlayer = getManagerDailyLogSelectedPlayer();
    const summary = state.managerDailyLogSummary || { totalPlayers: 0, submittedPlayers: 0, missingPlayers: 0, submissionRate: 0 };
    const missingPlayersMarkup = state.managerDailyLogMissingPlayers.length
      ? `<div class="manager-log-chip-list">${state.managerDailyLogMissingPlayers.map((player) => {
          const statusMeta = getManagerDailyLogStatusMeta(player.status);
          return `<span class="tag-chip manager-log-status-chip ${statusMeta.className}">${escapeHtml(player.name)} / ${escapeHtml(getPlayerGradeLabel(player.grade || ''))} / ${statusMeta.label}</span>`;
        }).join('')}</div>`
      : '<div class="small success-text">未提出の選手はいません。</div>';

    const rosterRows = state.managerDailyLogs.map((player) => {
      const statusMeta = getManagerDailyLogStatusMeta(player.selectedDateStatus && player.selectedDateStatus.status);
      const isSelected = Number(selectedPlayer && selectedPlayer.id) === Number(player.id);
      return `
        <tr class="${isSelected ? 'manager-log-table-row-selected' : ''}">
          <td>
            <button type="button" class="inline-link manager-log-player-link" data-manager-daily-log-player="${player.id}">${escapeHtml(player.name)}</button>
            <div class="meta">${escapeHtml(getPlayerGradeLabel(player.grade || ''))} / ${escapeHtml(player.position || 'ポジション未設定')}</div>
          </td>
          <td><span class="condition-status-badge ${statusMeta.className}">${statusMeta.symbol} ${statusMeta.label}</span></td>
          <td>${escapeHtml(String(player.streak || 0))}日</td>
          <td>${escapeHtml(String((player.monthRate && player.monthRate.percentage) || 0))}%</td>
          <td>
            <div class="manager-log-table-actions">
              <button type="button" class="button-secondary" data-manager-daily-log-mark="submitted" data-manager-daily-log-player="${player.id}">提出済み</button>
              <button type="button" class="button-danger" data-manager-daily-log-mark="missed" data-manager-daily-log-player="${player.id}">未提出</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const selectedStatusMeta = getManagerDailyLogStatusMeta(selectedPlayer && selectedPlayer.selectedDateStatus && selectedPlayer.selectedDateStatus.status);

    return `
      <section class="card">
        <div class="card-head-actions manager-log-head-actions">
          <div>
            <h2>野球日誌チェック</h2>
            <p class="small">日付単位で提出状況を記録し、ストリークと提出率を自動表示します。</p>
          </div>
          <div class="manager-log-date-controls">
            <label class="compact-row" for="managerDailyLogDate">チェック日</label>
            <input id="managerDailyLogDate" type="date" value="${escapeHtml(state.managerDailyLogSelectedDate)}" />
          </div>
        </div>
        <div class="grid manager-log-summary-grid">
          <div class="stat-card"><div class="stat-label">対象選手数</div><div class="stat-value">${summary.totalPlayers}</div></div>
          <div class="stat-card"><div class="stat-label">提出済み</div><div class="stat-value">${summary.submittedPlayers}</div></div>
          <div class="stat-card"><div class="stat-label">未提出</div><div class="stat-value">${summary.missingPlayers}</div></div>
          <div class="stat-card"><div class="stat-label">当日提出率</div><div class="stat-value">${summary.submissionRate}%</div></div>
        </div>
        <div class="compact-top">
          <h3>未提出の選手一覧</h3>
          ${missingPlayersMarkup}
        </div>
      </section>
      <section class="card manager-log-player-overview-card">
        <div class="coach-condition-section-header">
          <div>
            <h2>選手別ステータス</h2>
            <p class="small">選択日: ${escapeHtml(formatDiaryDateLabel(state.managerDailyLogSelectedDate))}</p>
          </div>
          ${selectedPlayer ? `
            <div class="manager-log-selected-player-summary">
              <div class="condition-status-badge ${selectedStatusMeta.className}">${selectedStatusMeta.symbol} ${selectedStatusMeta.label}</div>
              <div class="small">${escapeHtml(selectedPlayer.name)} / ストリーク ${escapeHtml(String(selectedPlayer.streak || 0))}日 / 今月 ${escapeHtml(String((selectedPlayer.monthRate && selectedPlayer.monthRate.percentage) || 0))}%</div>
            </div>
          ` : ''}
        </div>
        ${selectedPlayer ? `
          <div class="list-item manager-log-selected-player-card">
            <strong>${escapeHtml(selectedPlayer.name)}</strong>
            <div class="meta">${escapeHtml(getManagerDailyLogPlayerMeta(selectedPlayer))}</div>
            <div class="manager-log-selected-player-actions">
              <button type="button" class="button-secondary" data-manager-daily-log-mark="submitted" data-manager-daily-log-player="${selectedPlayer.id}">この日を提出済みにする</button>
              <button type="button" class="button-danger" data-manager-daily-log-mark="missed" data-manager-daily-log-player="${selectedPlayer.id}">この日を未提出にする</button>
            </div>
          </div>
        ` : '<div class="small">選手データがありません。</div>'}
        <div class="table-wrap compact-top">
          <table class="table">
            <thead><tr><th>選手</th><th>状態</th><th>連続提出</th><th>今月提出率</th><th>操作</th></tr></thead>
            <tbody>${rosterRows || '<tr><td colspan="5">選手がいません。</td></tr>'}</tbody>
          </table>
        </div>
      </section>
      ${buildManagerDailyLogCalendar(selectedPlayer)}
    `;
  }

  async function renderManagerDailyLogs(options = {}) {
    const root = qs('managerDailyLogsRoot');
    if (!root) return;
    if (options.reload !== false) {
      await refreshManagerDailyLogs();
    }
    root.innerHTML = buildManagerDailyLogPanel();

    qs('managerDailyLogDate')?.addEventListener('change', async (event) => {
      state.managerDailyLogSelectedDate = event.target.value || state.managerDailyLogSelectedDate;
      if (state.managerDailyLogSelectedDate) {
        state.managerDailyLogCalendarMonth = state.managerDailyLogSelectedDate.slice(0, 7);
      }
      await renderManagerDailyLogs();
    });

    root.querySelectorAll('[data-manager-daily-log-player]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (button.dataset.managerDailyLogMark) return;
        state.managerDailyLogSelectedPlayerId = Number(button.dataset.managerDailyLogPlayer || 0) || null;
        await renderManagerDailyLogs({ reload: false });
      });
    });

    root.querySelectorAll('[data-manager-daily-log-calendar-nav]').forEach((button) => {
      button.addEventListener('click', async () => {
        const nextMonth = shiftYearMonth(state.managerDailyLogCalendarMonth, Number(button.dataset.managerDailyLogCalendarNav || 0));
        state.managerDailyLogCalendarMonth = nextMonth;
        if (!String(state.managerDailyLogSelectedDate || '').startsWith(nextMonth)) {
          state.managerDailyLogSelectedDate = `${nextMonth}-01`;
        }
        await renderManagerDailyLogs();
      });
    });

    root.querySelectorAll('[data-manager-daily-log-date]').forEach((button) => {
      button.addEventListener('click', async () => {
        state.managerDailyLogSelectedDate = button.dataset.managerDailyLogDate || state.managerDailyLogSelectedDate;
        await renderManagerDailyLogs();
      });
    });

    root.querySelectorAll('[data-manager-daily-log-mark]').forEach((button) => {
      button.addEventListener('click', async () => {
        const userId = Number(button.dataset.managerDailyLogPlayer || 0);
        if (!userId || !state.managerDailyLogSelectedDate) return;
        try {
          await api('/api/manager/daily-logs', {
            method: 'POST',
            body: JSON.stringify({
              userId,
              entryDate: state.managerDailyLogSelectedDate,
              submitted: button.dataset.managerDailyLogMark === 'submitted',
            }),
          });
          state.managerDailyLogSelectedPlayerId = userId;
          await renderManagerDailyLogs();
        } catch (error) {
          window.alert(error.message);
        }
      });
    });
  }

  async function renderRoleWorkspace() {
    const root = qs('roleWorkspaceRoot');
    if (!root) return;
    await refreshData();
    const user = state.user;
    const requiredRole = document.body.dataset.rolePage;
    if (requiredRole && requiredRole !== user.role) {
      window.location.href = 'index.html';
      return;
    }
    const blocks = [buildRoleHero(user)];
    if (user.role === 'manager') {
      blocks.push(`
        <section class="card">
          <h2>入力ページのご案内</h2>
          <p class="small">成績入力は専用ページへ移動しました。下のボタンから入力画面を開いてください。</p>
          <div class="actions single-action">
            <a class="button button-primary" href="condition.html">入力ページを開く</a>
          </div>
        </section>
      `);
      blocks.push(buildPlayerSummaryTable(state.dashboard.playerSummaries));
      blocks.push('<section id="managerChecklistRoot"></section>');
      blocks.push('<section id="managerDailyLogsRoot"></section>');
    } else if (user.role === 'player') {
      blocks.push(buildPersonalSummaryCard(state.dashboard.personalSummary, user));
      blocks.push(`
        <section class="card">
          <h2>入力ページのご案内</h2>
          <p class="small">自分の成績入力は専用ページへ移動しました。下のボタンから入力画面を開いてください。</p>
          <div class="actions single-action">
            <a class="button button-primary" href="condition.html">入力ページを開く</a>
          </div>
        </section>
      `);
    } else {
      await renderCoachDiary();
      return;
    }
    root.innerHTML = blocks.join('');
    if (user.role === 'manager') {
      const checklistRoot = qs('managerChecklistRoot');
      if (checklistRoot) {
        checklistRoot.innerHTML = buildManagerChecklistPanel();
        bindManagerChecklist();
      }
      await renderManagerDailyLogs();
    }
    bindGroundFlyToggles(root);
    bindManualForm();
    bindScorebookForm();
    if (state.scorebookUpload) renderScorebookPreview(state.scorebookUpload);
  }

  async function renderGames() {
    const root = qs('gamesRoot');
    if (!root) return;
    await refreshData();
    const user = state.user;
    root.innerHTML = `
      ${['coach', 'manager'].includes(user.role) ? `
        <section class="card">
          <h2>試合登録</h2>
          <form id="gameForm">
            <div class="form-row"><label for="gameDate">試合日</label><input id="gameDate" name="date" type="date" required /></div>
            <div class="form-row"><label for="gameOpponent">対戦相手</label><input id="gameOpponent" name="opponent" type="text" required placeholder="○○高校" /></div>
            <div class="form-row"><label for="gameLocation">会場</label><input id="gameLocation" name="location" type="text" placeholder="○○球場" /></div>
            <div class="form-row"><label for="gameType">試合種別</label><select id="gameType" name="gameType" required><option value="" selected disabled>選択してください</option><option value="official">公式戦</option><option value="practice">練習試合</option><option value="intrasquad">紅白戦</option></select></div>
            <div class="inline-fields">
              <div class="form-row"><label for="gameTeamScore">自チーム得点</label><input id="gameTeamScore" name="teamScore" type="number" min="0" value="0" /></div>
              <div class="form-row"><label for="gameOpponentScore">相手得点</label><input id="gameOpponentScore" name="opponentScore" type="number" min="0" value="0" /></div>
            </div>
            <button class="button-primary" type="submit">試合を追加</button>
            <div id="gameFormMessage" class="small"></div>
          </form>
        </section>
      ` : ''}
      <section class="card">
        <h2>登録済み試合</h2>
        ${state.games.length === 0 ? '<div class="small">試合がまだ登録されていません。</div>' : state.games.map((game) => `
          <div class="list-item">
            <strong>${escapeHtml(`${game.date} vs ${game.opponent}`)}</strong>
            <div class="meta">試合種別: ${escapeHtml(getGameTypeLabel(game.gameType))}</div>
            <div class="meta">${escapeHtml(game.location || '会場未設定')} / ${game.teamScore}-${game.opponentScore}</div>
            <div class="meta">打者入力 ${game.battingPlayerCount}名 / 投手入力 ${game.pitchingPlayerCount}名 / スコアブック ${game.scorebookCount}件</div>
            <a class="inline-link" href="game-detail.html?gameId=${game.id}">試合詳細へ</a>
          </div>
        `).join('')}
      </section>
    `;

    const form = qs('gameForm');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = qs('gameFormMessage');
        message.className = 'small';
        message.textContent = '登録中です...';
        try {
          await api('/api/games', {
            method: 'POST',
            body: JSON.stringify({
              date: form.date.value,
              opponent: form.opponent.value,
              location: form.location.value,
              gameType: form.gameType.value,
              teamScore: number(form.teamScore.value),
              opponentScore: number(form.opponentScore.value),
            }),
          });
          message.className = 'small success-text';
          message.textContent = '試合を追加しました。';
          await renderGames();
        } catch (error) {
          message.className = 'small error-text';
          message.textContent = error.message;
        }
      });
    }
  }

  async function renderGameDetail() {
    const root = qs('gameDetailRoot');
    if (!root) return;
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('gameId');
    if (!gameId) {
      root.innerHTML = '<section class="card"><div class="small">試合が指定されていません。</div></section>';
      return;
    }
    try {
      const payload = await api(`/api/games/${gameId}`);
      const battingEntries = payload.entries.filter((entry) => entry.category === 'batting');
      const pitchingEntries = payload.entries.filter((entry) => entry.category === 'pitching');
      root.innerHTML = `
        <section class="card">
          <h2>${escapeHtml(`${payload.game.date} vs ${payload.game.opponent}`)}</h2>
          <div class="small">試合種別: ${escapeHtml(getGameTypeLabel(payload.game.gameType))}</div>
          <div class="small">${escapeHtml(payload.game.location || '会場未設定')} / ${payload.game.teamScore}-${payload.game.opponentScore}</div>
        </section>
        <section class="card">
          <div class="card-head-actions">
            <h2>試合後ミーティング</h2>
            <a class="button button-secondary" href="meeting-history.html">ミーティング履歴</a>
          </div>
          <button id="toggleMeetingFormBtn" class="button button-secondary" type="button">ミーティングを記録</button>
          <form id="meetingForm" class="form hidden compact-top">
            <div class="form-row">
              <label for="meetingGoodPoints">良かった点</label>
              <textarea id="meetingGoodPoints" name="goodPoints" rows="3" maxlength="4000" required></textarea>
            </div>
            <div class="form-row">
              <label for="meetingImprovementPoints">改善点</label>
              <textarea id="meetingImprovementPoints" name="improvementPoints" rows="3" maxlength="4000" required></textarea>
            </div>
            <div class="form-row">
              <label for="meetingNextGoals">次回の目標</label>
              <textarea id="meetingNextGoals" name="nextGoals" rows="3" maxlength="4000" required></textarea>
            </div>
            <div class="actions">
              <button class="button" type="submit">保存する</button>
            </div>
            <div id="meetingFormMessage" class="small"></div>
          </form>
          <div class="compact-top">
            ${payload.meetings.length === 0 ? '<div class="small">まだミーティング記録がありません。</div>' : payload.meetings.map((meeting) => `
              <article class="list-item meeting-item">
                <div class="meta">${escapeHtml(formatDateTimeLabel(meeting.createdAt))}${meeting.createdByName ? ` / ${escapeHtml(meeting.createdByName)}` : ''}</div>
                <h3>良かった点</h3>
                <p>${escapeHtml(meeting.goodPoints).replaceAll('\n', '<br/>')}</p>
                <h3>改善点</h3>
                <p>${escapeHtml(meeting.improvementPoints).replaceAll('\n', '<br/>')}</p>
                <h3>次回の目標</h3>
                <p>${escapeHtml(meeting.nextGoals).replaceAll('\n', '<br/>')}</p>
              </article>
            `).join('')}
          </div>
        </section>
        <section class="card">
          <h2>打撃入力一覧</h2>
          ${battingEntries.length === 0 ? '<div class="small">まだ打撃入力がありません。</div>' : `
            <div class="table-wrap"><table class="table"><thead><tr><th>選手</th><th>打率</th><th>OPS</th><th>打点</th><th>盗塁</th><th>得点圏打率</th></tr></thead><tbody>
              ${battingEntries.map((entry) => `
                <tr><td>${escapeHtml(entry.playerName)}</td><td>${fmt3(entry.derived.battingAverage)}</td><td>${fmt3(entry.derived.ops)}</td><td>${entry.raw.runsBattedIn}</td><td>${entry.raw.stolenBases}</td><td>${fmt3(entry.derived.rispAverage)}</td></tr>
              `).join('')}
            </tbody></table></div>
          `}
        </section>
        <section class="card">
          <h2>投手入力一覧</h2>
          ${pitchingEntries.length === 0 ? '<div class="small">まだ投手入力がありません。</div>' : `
            <div class="table-wrap"><table class="table"><thead><tr><th>選手</th><th>防御率</th><th>WHIP</th><th>被打率</th><th>球速(最速/平均)</th><th>球種別打球方向</th></tr></thead><tbody>
              ${pitchingEntries.map((entry) => `
                <tr><td>${escapeHtml(entry.playerName)}</td><td>${fmt3(entry.derived.era)}</td><td>${fmt3(entry.derived.whip)}</td><td>${fmt3(entry.derived.hitAverage)}</td><td>${entry.raw.maxVelocity}/${entry.raw.averageVelocity}</td><td>直球 ${entry.raw.fastballPull}-${entry.raw.fastballCenter}-${entry.raw.fastballOpposite}</td></tr>
              `).join('')}
            </tbody></table></div>
          `}
        </section>
        <section class="card">
          <h2>スコアブック写真</h2>
          ${payload.scorebooks.length === 0 ? '<div class="small">まだアップロードされていません。</div>' : payload.scorebooks.map((upload) => `
            <div class="list-item">
              <strong>${escapeHtml(upload.fileName)}</strong>
              <div class="meta">候補 ${upload.candidates.length}件 / ${escapeHtml(upload.parseStatus)}</div>
              <img src="${upload.imageDataUrl}" alt="scorebook" class="scorebook-image compact-image" />
            </div>
          `).join('')}
        </section>
      `;
      const toggleMeetingFormBtn = qs('toggleMeetingFormBtn');
      const meetingForm = qs('meetingForm');
      const meetingFormMessage = qs('meetingFormMessage');
      if (toggleMeetingFormBtn && meetingForm) {
        toggleMeetingFormBtn.addEventListener('click', () => {
          meetingForm.classList.toggle('hidden');
        });
      }
      if (meetingForm && meetingFormMessage) {
        meetingForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          const formData = new FormData(meetingForm);
          meetingFormMessage.className = 'small';
          meetingFormMessage.textContent = '保存中です...';
          try {
            await api(`/api/games/${gameId}/meetings`, {
              method: 'POST',
              body: JSON.stringify({
                goodPoints: formData.get('goodPoints'),
                improvementPoints: formData.get('improvementPoints'),
                nextGoals: formData.get('nextGoals'),
              }),
            });
            await renderGameDetail();
          } catch (error) {
            meetingFormMessage.className = 'small error-text';
            meetingFormMessage.textContent = error.message;
          }
        });
      }
    } catch (error) {
      root.innerHTML = `<section class="card"><div class="small error-text">${escapeHtml(error.message)}</div></section>`;
    }
  }

  async function renderMeetingHistory() {
    const root = qs('meetingHistoryRoot');
    if (!root) return;
    try {
      const payload = await api('/api/meetings');
      root.innerHTML = `
        <section class="card role-hero">
          <h2>試合後ミーティング履歴</h2>
          <p class="small">最新の記録から表示しています。</p>
          <div class="actions">
            <a class="button button-secondary" href="games.html">試合一覧へ</a>
          </div>
        </section>
        <section class="card">
          <h2>履歴一覧</h2>
          ${payload.meetings.length === 0 ? '<div class="small">まだ履歴がありません。</div>' : payload.meetings.map((meeting) => `
            <article class="list-item meeting-item">
              <div class="meta">${escapeHtml(formatDateTimeLabel(meeting.createdAt))}</div>
              <div class="small"><a class="inline-link" href="game-detail.html?gameId=${meeting.game.id}">${escapeHtml(`${meeting.game.date} [${getGameTypeLabel(meeting.game.gameType)}] vs ${meeting.game.opponent}`)}</a></div>
              <h3>良かった点</h3>
              <p>${escapeHtml(meeting.goodPoints).replaceAll('\n', '<br/>')}</p>
              <h3>改善点</h3>
              <p>${escapeHtml(meeting.improvementPoints).replaceAll('\n', '<br/>')}</p>
              <h3>次回の目標</h3>
              <p>${escapeHtml(meeting.nextGoals).replaceAll('\n', '<br/>')}</p>
            </article>
          `).join('')}
        </section>
      `;
    } catch (error) {
      root.innerHTML = `<section class="card"><div class="small error-text">${escapeHtml(error.message)}</div></section>`;
    }
  }

  async function renderInputWorkspace() {
    const root = qs('inputWorkspaceRoot');
    if (!root) return;
    await refreshData();
    const user = state.user;

    if (user.role === 'coach') {
      root.innerHTML = `
        <section class="card">
          <h2>入力権限がありません</h2>
          <p class="small">指導者アカウントでは成績入力を行えません。ホームまたは確認画面から集計結果をご確認ください。</p>
          <div class="actions single-action">
            <a class="button button-secondary" href="index.html">ホームへ戻る</a>
          </div>
        </section>
      `;
      return;
    }

    const sections = [
      `
        <section class="card role-hero">
          <div class="hero-kicker">${escapeHtml(getRoleLabel(user.role))}</div>
          <h2>${user.role === 'manager' ? '試合ごとの成績を入力' : '自分の成績を入力'}</h2>
          <p class="small">この画面では入力フォームのみを表示しています。保存後はホームの集計へ反映されます。</p>
          <div class="actions">
            <a class="button button-secondary" href="index.html">ホームへ戻る</a>
            <a class="button button-secondary" href="games.html">試合一覧へ</a>
          </div>
        </section>
      `,
      buildBig3InputCard(user),
      buildManualInputCard(user, { title: user.role === 'manager' ? '全選手の成績入力' : '自分の成績を入力' }),
    ];

    if (user.role === 'manager') {
      sections.push(buildScorebookCard());
    }

    root.innerHTML = sections.join('');
    bindBig3Form();
    bindManualForm();
    bindScorebookForm();
    if (state.scorebookUpload) renderScorebookPreview(state.scorebookUpload);
  }

  function buildDiaryCalendar(notes) {
    const [yearValue, monthValue] = String(state.diaryCalendarMonth || new Date().toISOString().slice(0, 7)).split('-');
    const year = Number(yearValue);
    const monthIndex = Number(monthValue) - 1;
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const startOffset = monthStart.getDay();
    const countsByDate = getDiaryNoteCountsByDate(notes);
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const isoDate = `${yearValue}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const noteCount = countsByDate.get(isoDate) || 0;
      const isSelected = state.diarySelectedDate === isoDate;
      const isToday = isoDate === new Date().toISOString().slice(0, 10);
      cells.push(`
        <button
          type="button"
          class="calendar-day ${noteCount > 0 ? 'has-note' : ''} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}"
          data-diary-date="${isoDate}"
          aria-pressed="${String(isSelected)}"
        >
          <span class="calendar-day-number">${day}</span>
          ${noteCount > 0 ? `<span class="calendar-day-count">${noteCount}件</span>` : '<span class="calendar-day-count placeholder">　</span>'}
        </button>
      `);
    }

    return `
      <section class="card">
        <div class="diary-calendar-header">
          <div>
            <h2>カレンダー</h2>
            <div class="small">ノートがある日は件数バッジを表示します。</div>
          </div>
          <div class="calendar-month-nav">
            <button type="button" class="button-secondary" data-diary-calendar-nav="-1">前月</button>
            <strong>${monthStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}</strong>
            <button type="button" class="button-secondary" data-diary-calendar-nav="1">次月</button>
          </div>
        </div>
        <div class="calendar-weekdays">
          ${['日', '月', '火', '水', '木', '金', '土'].map((label) => `<div>${label}</div>`).join('')}
        </div>
        <div class="calendar-grid">${cells.join('')}</div>
      </section>
    `;
  }

  function buildDiaryNoteList(notes) {
    const selectedDateLabel = state.diarySelectedDate ? formatDiaryDateLabel(state.diarySelectedDate) : 'すべての日付';
    return `
      <section class="card">
        <div class="diary-list-header">
          <div>
            <h2>ノート一覧</h2>
            <div class="small">対象日: ${escapeHtml(selectedDateLabel)} / ${notes.length}件</div>
          </div>
          ${state.diarySelectedDate ? '<button type="button" class="button-secondary diary-clear-date" id="diaryClearDateBtn">日付絞り込みを解除</button>' : ''}
        </div>
        ${notes.length === 0 ? '<div class="small">条件に一致する野球日誌はまだありません。</div>' : notes.map((note) => `
          <article class="list-item diary-note-item">
            <div class="diary-note-header">
              <div>
                <strong>${escapeHtml(formatDiaryDateLabel(note.entryDate))}${(note.videos || []).length ? ' 🎥' : ''}</strong>
                <div class="meta">更新: ${escapeHtml(String(note.updatedAt || '').replace('T', ' ').slice(0, 16) || '未更新')}</div>
              </div>
              <div class="diary-note-actions">
                <button type="button" class="button-secondary" data-diary-edit="${note.id}">編集</button>
                <button type="button" class="button-danger" data-diary-delete="${note.id}">削除</button>
              </div>
            </div>
            <p class="diary-note-body">${escapeHtml(formatDiaryExcerpt(note.body, 140))}</p>
            <div class="diary-video-block">
              <div class="stat-label">練習動画</div>
              ${buildDiaryVideosSection(note.videos || [])}
            </div>
            <div class="tag-list">
              ${(note.tags || []).length ? note.tags.map((tag) => `<span class="tag-chip">#${escapeHtml(tag)}</span>`).join('') : '<span class="small">タグなし</span>'}
            </div>
            <div class="diary-feedback-grid">
              <div class="diary-feedback-block">
                <div class="stat-label">指導者コメント</div>
                ${(note.coachComments || []).length
                  ? (note.coachComments || []).map((comment) => `
                      <div class="meta">${escapeHtml(comment.author || '指導者')}: ${escapeHtml(comment.body || '')}</div>
                      ${comment.repliedAt ? `<div class="meta">返信: ${escapeHtml(String(comment.repliedAt).replace('T', ' ').slice(0, 16))}</div>` : ''}
                    `).join('')
                  : '<div class="small">まだコメントはありません。</div>'}
              </div>
              <div class="diary-feedback-block">
                <div class="stat-label">スタンプ</div>
                ${(note.coachStamps || []).length
                  ? `<div class="stamp-list">${(note.coachStamps || []).map((stamp) => `<span class="stamp-chip" title="${escapeHtml(stamp.repliedAt ? `${stamp.author || '指導者'} ${String(stamp.repliedAt).replace('T', ' ').slice(0, 16)}` : (stamp.author || '指導者'))}">${escapeHtml(stamp.label || stamp)}</span>`).join('')}</div>`
                  : '<div class="small">まだスタンプはありません。</div>'}
              </div>
            </div>
          </article>
        `).join('')}
      </section>
    `;
  }

  async function renderDiary(options = {}) {
    const root = qs('diaryRoot');
    if (!root) return;
    const user = state.user || (await fetchCurrentUser());
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    if (user.role !== 'player') {
      root.innerHTML = `
        <section class="card">
          <h2>野球日誌は選手専用です</h2>
          <p class="small">指導者・マネージャーでは利用できません。ホームに戻って他の機能をご利用ください。</p>
          <div class="actions single-action">
            <a class="button button-secondary" href="index.html">ホームへ戻る</a>
          </div>
        </section>
      `;
      return;
    }

    if (options.reload !== false) {
      await refreshDiaryNotes();
    }
    const editingNote = state.diaryNotes.find((note) => note.id === state.diaryEditingNoteId) || null;

    root.innerHTML = `
      <section class="card role-hero">
        <div class="hero-kicker">選手専用</div>
        <h2>野球日誌</h2>
        <p class="small">練習や試合の振り返りを日付・タグ付きで残し、カレンダーから見返せます。</p>
      </section>
      <section class="card">
        <h2>${editingNote ? '野球日誌を編集' : '野球日誌を新規作成'}</h2>
        <form id="diaryForm">
          <input type="hidden" name="noteId" value="${editingNote ? editingNote.id : ''}" />
          <div class="form-row">
            <label for="diaryEntryDate">日付</label>
            <input id="diaryEntryDate" name="entryDate" type="date" required value="${escapeHtml((editingNote && editingNote.entryDate) || state.diarySelectedDate || new Date().toISOString().slice(0, 10))}" />
          </div>
          <div class="form-row">
            <label for="diaryBody">本文</label>
            <textarea id="diaryBody" name="body" maxlength="4000" placeholder="今日の振り返り、課題、次回の意識を書く">${escapeHtml((editingNote && editingNote.body) || '')}</textarea>
          </div>
          <div class="form-row">
            <label for="diaryTags">タグ</label>
            <input id="diaryTags" name="tags" type="text" placeholder="例: 打撃, 守備, 練習試合" value="${escapeHtml(getDiaryTagInputValue((editingNote && editingNote.tags) || []))}" />
            <div class="small">カンマ（,）・読点（、）・中点（・）区切りで複数タグを設定できます。</div>
          </div>
          <div class="form-row">
            <label for="diaryVideos">練習動画アップロード（50MBまで、複数可）</label>
            <input id="diaryVideos" name="videos" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v" multiple />
          </div>
          <div class="form-row">
            <label for="diaryVideoUrls">動画URL（任意）</label>
            <textarea id="diaryVideoUrls" name="videoUrls" maxlength="3000" placeholder="https://example.com/video.mp4&#10;https://youtube.com/..."></textarea>
          </div>
          ${(editingNote && (editingNote.videos || []).length)
            ? `<div class="form-row"><div class="stat-label">既存動画の削除</div>${buildDiaryVideosSection(editingNote.videos || [], { editable: true })}</div>`
            : ''}
          <div class="actions">
            <button class="button-primary" type="submit">${editingNote ? '更新する' : '作成する'}</button>
            <button class="button-secondary" type="button" id="diaryResetBtn">${editingNote ? '新規作成に戻す' : '入力をクリア'}</button>
          </div>
          <div id="diaryFormMessage" class="small"></div>
        </form>
      </section>
      ${buildDiaryCalendar(state.diaryNotes)}
      <section class="card">
        <h2>検索・並び替え</h2>
        <div class="inline-fields diary-filter-grid">
          <div class="form-row">
            <label for="diarySearch">検索</label>
            <input id="diarySearch" type="search" placeholder="本文・タグで検索" value="${escapeHtml(state.diarySearchQuery)}" />
          </div>
          <div class="form-row">
            <label for="diarySortOrder">並び替え</label>
            <select id="diarySortOrder">
              <option value="desc" ${state.diarySortOrder === 'desc' ? 'selected' : ''}>新しい順</option>
              <option value="asc" ${state.diarySortOrder === 'asc' ? 'selected' : ''}>古い順</option>
            </select>
          </div>
        </div>
      </section>
      <div id="diaryNoteListSection"></div>
    `;

    const form = qs('diaryForm');
    const message = qs('diaryFormMessage');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        entryDate: form.entryDate.value,
        body: form.body.value,
        tags: normalizeDiaryTags(form.tags.value),
        videoUrls: form.videoUrls?.value || '',
        removeVideoIds: Array.from(form.querySelectorAll('input[name="removeVideoIds"]:checked')).map((el) => Number(el.value)).filter(Number.isFinite),
      };
      const noteId = Number(form.noteId.value);
      message.className = 'small';
      message.textContent = '保存中です...';
      try {
        const selectedFiles = Array.from(form.videos?.files || []);
        let uploadedVideos = [];
        if (selectedFiles.length) {
          const uploadFormData = new FormData();
          selectedFiles.forEach((file) => uploadFormData.append('videos', file));
          const uploadPayload = await api('/api/diary-videos/upload', {
            method: 'POST',
            body: uploadFormData,
          });
          uploadedVideos = uploadPayload.videos || [];
        }
        payload.videos = uploadedVideos;
        await api(noteId ? `/api/diary-notes/${noteId}` : '/api/diary-notes', {
          method: noteId ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        });
        message.className = 'small success-text';
        message.textContent = noteId ? '野球日誌を更新しました。' : '野球日誌を作成しました。';
        state.diaryEditingNoteId = null;
        state.diarySelectedDate = payload.entryDate;
        state.diaryCalendarMonth = payload.entryDate.slice(0, 7);
        await renderDiary();
      } catch (error) {
        message.className = 'small error-text';
        message.textContent = error.message;
      }
    });

    qs('diaryResetBtn')?.addEventListener('click', () => {
      state.diaryEditingNoteId = null;
      renderDiary({ reload: false });
    });

    const applyDiarySearch = (nextValue) => {
      state.diarySearchQuery = nextValue;
      updateDiaryNoteList();
    };

    qs('diarySearch')?.addEventListener('compositionstart', () => {
      state.diarySearchComposing = true;
    });

    qs('diarySearch')?.addEventListener('compositionend', (event) => {
      state.diarySearchComposing = false;
      applyDiarySearch(event.target.value);
    });

    qs('diarySearch')?.addEventListener('input', (event) => {
      if (state.diarySearchComposing) return;
      applyDiarySearch(event.target.value);
    });

    qs('diarySortOrder')?.addEventListener('change', (event) => {
      state.diarySortOrder = event.target.value || 'desc';
      updateDiaryNoteList();
    });

    updateDiaryNoteList();

    root.querySelectorAll('[data-diary-calendar-nav]').forEach((button) => {
      button.addEventListener('click', () => {
        const [yearValue, monthValue] = String(state.diaryCalendarMonth).split('-');
        const next = new Date(Number(yearValue), Number(monthValue) - 1 + Number(button.dataset.diaryCalendarNav || 0), 1);
        state.diaryCalendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        renderDiary({ reload: false });
      });
    });

    root.querySelectorAll('[data-diary-date]').forEach((button) => {
      button.addEventListener('click', () => {
        state.diarySelectedDate = button.dataset.diaryDate || '';
        state.diaryCalendarMonth = state.diarySelectedDate.slice(0, 7) || state.diaryCalendarMonth;
        renderDiary({ reload: false });
      });
    });

  }

  function getFilteredCoachDiaryNotes() {
    const normalizedKeyword = String(state.coachDiarySearchQuery || '').trim().toLowerCase();
    const normalizedTagFilter = String(state.coachDiarySelectedTag || '').trim().toLowerCase();
    const filteredNotes = [];
    state.coachDiaryNotes.forEach((rawNote) => {
      const note = prepareCoachDiaryNote(rawNote);
      if (state.coachDiarySelectedGrade && note._coachDiaryGrade !== state.coachDiarySelectedGrade) return;
      if (normalizedTagFilter && !note._coachDiaryTagSet.has(normalizedTagFilter)) return;
      if (normalizedKeyword && !note._coachDiarySearchable.includes(normalizedKeyword)) return;
      filteredNotes.push(note);
    });
    return filteredNotes;
  }

  function getCoachDiaryAvailableTags() {
    const tagSet = new Set();
    state.coachDiaryNotes.forEach((note) => {
      prepareCoachDiaryNote(note).tags.forEach((tag) => {
        const normalized = String(tag || '').trim();
        if (normalized) tagSet.add(normalized);
      });
    });
    return [...tagSet].sort((left, right) => left.localeCompare(right, 'ja'));
  }

  function buildCoachDiaryFeedbackList(note) {
    const commentMarkup = (note.coachComments || []).length
      ? (note.coachComments || []).map((comment) => `
          <div class="diary-detail-comment">
            <strong>${escapeHtml(comment.author || '指導者')}</strong>
            <div>${escapeHtml(comment.body || '')}</div>
            <div class="meta">${escapeHtml(String(comment.repliedAt || '').replace('T', ' ').slice(0, 16) || '返信日時未設定')}</div>
          </div>
        `).join('')
      : '<div class="small">まだコメントはありません。</div>';

    const stampMarkup = (note.coachStamps || []).length
      ? `<div class="stamp-list">${(note.coachStamps || []).map((stamp) => `
          <span class="stamp-chip" title="${escapeHtml(stamp.author || '指導者')}">${escapeHtml(stamp.label || stamp)}</span>
        `).join('')}</div>`
      : '<div class="small">まだスタンプはありません。</div>';

    return `
      <div class="diary-feedback-grid coach-diary-feedback-grid">
        <div class="diary-feedback-block">
          <div class="stat-label">既存のコメント／返信</div>
          ${commentMarkup}
        </div>
        <div class="diary-feedback-block">
          <div class="stat-label">スタンプ表示</div>
          ${stampMarkup}
        </div>
      </div>
    `;
  }

  function buildCoachDiaryReplyForm(note) {
    const suffix = `-${note.id}`;
    const replyDraft = state.coachDiaryReplyDrafts[note.id] || '';
    const selectedStamp = state.coachDiarySelectedStamps[note.id] || '';
    return `
      <form class="coach-diary-reply-form" data-coach-diary-reply-form="${note.id}">
        <div class="form-row">
          <label for="coachDiaryReplyMessage${suffix}">指導者からの返信</label>
          <textarea id="coachDiaryReplyMessage${suffix}" name="message" maxlength="500" placeholder="気づきや励ましのコメントを入力">${escapeHtml(replyDraft)}</textarea>
        </div>
        <div class="form-row">
          <label for="coachDiaryStamp${suffix}">スタンプ送信</label>
          <select id="coachDiaryStamp${suffix}" name="stamp">
            <option value="">選択してください</option>
            ${state.coachDiaryStampOptions.map((stamp) => `
              <option value="${escapeHtml(stamp)}" ${selectedStamp === stamp ? 'selected' : ''}>${escapeHtml(stamp)}</option>
            `).join('')}
          </select>
        </div>
        <div class="actions single-action">
          <button type="submit" class="button-primary" data-note-id="${note.id}">返信を送信</button>
        </div>
        <div class="small" data-coach-diary-reply-message></div>
      </form>
    `;
  }

  function buildCoachDiaryFilterPanel(notes) {
    const totalComments = notes.reduce((count, note) => count + ((note.coachComments || []).length), 0);
    const totalStamps = notes.reduce((count, note) => count + ((note.coachStamps || []).length), 0);
    const availableTags = getCoachDiaryAvailableTags();
    const tagOptions = ['<option value="">すべてのタグ</option>']
      .concat(availableTags.map((tag) => `
        <option value="${escapeHtml(tag)}" ${state.coachDiarySelectedTag === tag ? 'selected' : ''}>${escapeHtml(tag)}</option>
      `))
      .join('');
    return `
      <section class="card">
        <div class="coach-condition-section-header">
          <div>
            <h2>日誌検索・絞り込み</h2>
            <div class="small">キーワード（選手名・タグ・本文）と学年・タグで、必要な日誌をすばやく絞り込めます。</div>
          </div>
          <div class="coach-diary-player-summary small" aria-label="絞り込み結果サマリー">
            <span>表示: <strong>${notes.length}件</strong></span>
            <span>コメント: <strong>${totalComments}件</strong></span>
            <span>スタンプ: <strong>${totalStamps}件</strong></span>
          </div>
        </div>
        <div class="inline-fields diary-filter-grid coach-diary-filter-grid">
          <div class="form-row compact-row">
            <label for="coachDiaryKeyword">キーワード</label>
            <input id="coachDiaryKeyword" type="search" placeholder="選手名・タグ・本文で検索" value="${escapeHtml(state.coachDiarySearchQuery)}" />
          </div>
          <div class="form-row compact-row">
            <label for="coachDiaryGradeFilter">学年</label>
            <select id="coachDiaryGradeFilter">${buildGradeOptionTags(state.coachDiarySelectedGrade, { includeAll: true, allLabel: 'すべて' })}</select>
          </div>
          <div class="form-row compact-row">
            <label for="coachDiaryTagFilter">タグ</label>
            <select id="coachDiaryTagFilter">${tagOptions}</select>
          </div>
        </div>
      </section>
    `;
  }

  function getCoachDiaryNotesByDate(notes) {
    return [...notes].reduce((map, note) => {
      const key = note.entryDate || '';
      if (!key) return map;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(note);
      return map;
    }, new Map());
  }

  function syncCoachDiaryDateSelection(notes) {
    const availableDates = [...new Set(notes.map((note) => note.entryDate).filter(Boolean))]
      .sort((left, right) => right.localeCompare(left));
    const defaultDate = availableDates[0] || new Date().toISOString().slice(0, 10);

    if (!state.coachDiarySelectedDate) {
      state.coachDiarySelectedDate = defaultDate;
    }

    if (!state.coachDiaryCalendarMonth) {
      state.coachDiaryCalendarMonth = state.coachDiarySelectedDate.slice(0, 7) || new Date().toISOString().slice(0, 7);
    }

    if (availableDates.length && !availableDates.includes(state.coachDiarySelectedDate)) {
      state.coachDiarySelectedDate = defaultDate;
      state.coachDiaryCalendarMonth = defaultDate.slice(0, 7);
    }
  }

  function buildCoachDiaryCalendar(notes) {
    const noteMap = getCoachDiaryNotesByDate(notes);
    syncCoachDiaryDateSelection(notes);

    const [yearValue, monthValue] = String(state.coachDiaryCalendarMonth || new Date().toISOString().slice(0, 7)).split('-');
    const year = Number(yearValue) || new Date().getFullYear();
    const monthIndex = (Number(monthValue) || (new Date().getMonth() + 1)) - 1;
    const firstDay = new Date(year, monthIndex, 1);
    const lastDate = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlankCount = firstDay.getDay();
    const todayIso = new Date().toISOString().slice(0, 10);
    const monthLabel = `${year}年${monthIndex + 1}月`;
    const selectedDateLabel = formatDiaryDateLabel(state.coachDiarySelectedDate);

    const cells = [];
    for (let i = 0; i < leadingBlankCount; i += 1) {
      cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
    }

    for (let day = 1; day <= lastDate; day += 1) {
      const isoDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayNotes = noteMap.get(isoDate) || [];
      const count = dayNotes.length;
      const isSelected = state.coachDiarySelectedDate === isoDate;
      const isToday = todayIso === isoDate;
      cells.push(`
        <button
          type="button"
          class="calendar-day coach-diary-calendar-day ${count ? 'has-note' : ''} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}"
          data-coach-diary-date="${isoDate}"
          aria-pressed="${isSelected ? 'true' : 'false'}"
        >
          <span class="calendar-day-number">${day}</span>
          <span class="calendar-day-count ${count ? 'has-count' : 'is-muted'}">${count ? `${Math.min(count, 99)}${count > 99 ? '+' : ''}件` : '0件'}</span>
        </button>
      `);
    }

    return `
      <section class="card coach-diary-calendar-card">
        <div class="diary-calendar-header">
          <div>
            <h2>チーム野球日誌カレンダー</h2>
            <div class="small">日付ごとの投稿件数を確認し、選択した日の詳細を下部カードでまとめて確認できます。</div>
          </div>
          <div class="calendar-month-nav">
            <button type="button" class="button-secondary" data-coach-diary-calendar-nav="-1">前月</button>
            <strong>${escapeHtml(monthLabel)}</strong>
            <button type="button" class="button-secondary" data-coach-diary-calendar-nav="1">次月</button>
          </div>
        </div>
        <div class="coach-diary-calendar-summary">
          <span class="coach-diary-calendar-chip">選択日: <strong>${escapeHtml(selectedDateLabel)}</strong></span>
          <span class="coach-diary-calendar-chip">投稿: <strong>${(noteMap.get(state.coachDiarySelectedDate) || []).length}件</strong></span>
        </div>
        <div class="calendar-weekdays">
          <span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span>
        </div>
        <div class="calendar-grid">
          ${cells.join('')}
        </div>
      </section>
    `;
  }

  function getCoachDiarySelectedModalNote(notes) {
    const modalNoteId = Number(state.coachDiaryModalNoteId || 0);
    if (!modalNoteId) return null;
    return notes.find((note) => Number(note.id) === modalNoteId) || null;
  }

  function buildCoachDiaryDetailModal(note) {
    if (!note) return '';
    const playerProfile = getCoachDiaryNotePlayerProfile(note);
    const updatedLabel = formatDateTimeLabel(note.updatedAt || note.createdAt || '');
    return `
      <div class="coach-diary-modal-overlay" data-coach-diary-modal-close role="presentation">
        <section class="card coach-diary-modal" role="dialog" aria-modal="true" aria-labelledby="coachDiaryModalTitle" tabindex="-1">
          <div class="coach-diary-detail-head">
            <div>
              <h2 id="coachDiaryModalTitle">${escapeHtml(note.playerName || `選手#${note.playerId}`)} の日誌詳細</h2>
              <div class="small">${escapeHtml(`${buildPlayerMetaLine(playerProfile)} / ${formatDiaryDateLabel(note.entryDate)}`)}</div>
            </div>
            <button type="button" class="button-secondary" data-coach-diary-modal-close aria-label="日誌詳細を閉じる">閉じる</button>
          </div>
          <div class="coach-diary-modal-meta">
            <span class="condition-status-badge">更新: ${escapeHtml(updatedLabel)}</span>
            <span class="condition-status-badge">タグ ${(note.tags || []).length}件</span>
            <span class="condition-status-badge">コメント ${(note.coachComments || []).length}件</span>
            <span class="condition-status-badge">スタンプ ${(note.coachStamps || []).length}件</span>
          </div>
          <div class="tag-list coach-diary-tag-list">
            ${(note.tags || []).length ? note.tags.map((tag) => `<span class="tag-chip">#${escapeHtml(tag)}</span>`).join('') : '<span class="small">タグなし</span>'}
          </div>
          <div class="stat-label">日誌本文</div>
          <p class="coach-diary-detail-body">${escapeHtml(note.body || '')}</p>
          ${buildCoachDiaryFeedbackList(note)}
          ${buildCoachDiaryReplyForm(note)}
        </section>
      </div>
    `;
  }

  function buildCoachDiaryDayDetails(notes) {
    syncCoachDiaryDateSelection(notes);
    const selectedDate = state.coachDiarySelectedDate || new Date().toISOString().slice(0, 10);
    const selectedDateNotes = [...notes]
      .filter((note) => note.entryDate === selectedDate)
      .sort((left, right) => compareDiaryNotes(left, right, 'desc'));
    const selectedDateLabel = formatDiaryDateLabel(selectedDate);

    if (!selectedDateNotes.length) {
      return `
        <section class="card coach-diary-detail-card">
          <div class="coach-diary-detail-head">
            <div>
              <h2>${escapeHtml(selectedDateLabel)} の日誌詳細</h2>
              <div class="small">絞り込み条件に一致する投稿を表示中</div>
            </div>
            <span class="condition-status-badge muted">0件</span>
          </div>
          <div class="small">その日の投稿はありません。</div>
        </section>
      `;
    }

    const selectedModalNote = getCoachDiarySelectedModalNote(selectedDateNotes);
    return `
      <section class="card coach-diary-detail-card">
        <div class="coach-diary-detail-head">
          <div>
            <h2>${escapeHtml(selectedDateLabel)} の日誌詳細</h2>
            <div class="small">カードをタップすると、その場で日誌全文を確認できます。</div>
          </div>
          <span class="condition-status-badge">${selectedDateNotes.length}件</span>
        </div>
        <div class="coach-diary-day-card-list coach-diary-player-grid">
          ${selectedDateNotes.map((note) => `
            <button
              type="button"
              class="list-item coach-diary-day-card ${selectedModalNote && Number(selectedModalNote.id) === Number(note.id) ? 'is-selected' : ''}"
              data-coach-diary-note-card="${note.id}"
              aria-label="${escapeHtml(note.playerName || `選手#${note.playerId}`)}の日誌詳細を開く"
            >
              <div class="coach-diary-detail-head coach-diary-day-card-head">
                <div>
                  <h3>${escapeHtml(note.playerName || `選手#${note.playerId}`)}</h3>
                  <div class="small">${escapeHtml(buildPlayerMetaLine(getCoachDiaryNotePlayerProfile(note)))}</div>
                </div>
              </div>
              <p class="coach-diary-card-excerpt">${escapeHtml(formatDiaryExcerpt(note.body, 160) || '本文未入力')}</p>
              <div class="coach-diary-player-meta">
                <span>${escapeHtml(formatDateTimeLabel(note.updatedAt || note.createdAt || ''))}</span>
              </div>
            </button>
          `).join('')}
        </div>
        ${buildCoachDiaryDetailModal(selectedModalNote)}
      </section>
    `;
  }

  function buildCoachDiaryPanel(notes) {
    if (!notes.length) {
      return `
        ${buildCoachDiaryFilterPanel(notes)}
        <section class="card coach-diary-detail-card">
          <div class="coach-diary-detail-head">
            <div>
              <h2>日誌詳細</h2>
              <div class="small">条件を変更して再検索してください。</div>
            </div>
            <span class="condition-status-badge muted">0件</span>
          </div>
          <div class="small">該当する日誌がありません。</div>
        </section>
      `;
    }

    return `
      ${buildCoachDiaryFilterPanel(notes)}
      <div class="coach-diary-layout coach-diary-layout-calendar">
        ${buildCoachDiaryCalendar(notes)}
        <div class="coach-diary-detail">
          ${buildCoachDiaryDayDetails(notes)}
        </div>
      </div>
    `;
  }

  async function renderCoachDiary(options = {}) {
    const root = qs('roleWorkspaceRoot');
    if (!root) return;
    const user = state.user || (await fetchCurrentUser());
    if (!user || user.role !== 'coach') return;
    if (options.reload !== false) {
      await refreshData();
      await refreshCoachDiaryNotes();
    }

    const notes = getFilteredCoachDiaryNotes();
    root.innerHTML = `
      <section class="card role-hero">
        <div class="hero-kicker">指導者専用</div>
        <h2>チーム野球日誌カレンダー</h2>
        <p class="small">指導者が日ごとの投稿状況を把握しやすいよう、投稿件数をカレンダーで見て、その日の詳細をカードでまとめて確認できる構成にしています。</p>
      </section>
      ${buildCoachDiaryPanel(notes)}
    `;

    const getLatestCoachDiaryDate = (filteredNotes) => {
      let latestDate = '';
      filteredNotes.forEach((note) => {
        const date = String(note.entryDate || '');
        if (date && (!latestDate || date > latestDate)) latestDate = date;
      });
      return latestDate || new Date().toISOString().slice(0, 10);
    };

    const applyCoachDiaryFiltersAndRender = () => {
      const filteredNotes = getFilteredCoachDiaryNotes();
      const selectedDate = state.coachDiarySelectedDate;
      const hasSelectedDateNotes = filteredNotes.some((note) => note.entryDate === selectedDate);
      if (!hasSelectedDateNotes) {
        state.coachDiarySelectedDate = getLatestCoachDiaryDate(filteredNotes);
      }
      if (state.coachDiarySelectedDate) {
        state.coachDiaryCalendarMonth = state.coachDiarySelectedDate.slice(0, 7) || state.coachDiaryCalendarMonth;
      }
      state.coachDiaryModalNoteId = null;
      renderCoachDiary({ reload: false });
    };

    const scheduleCoachDiaryFilterRender = () => {
      if (state.coachDiaryFilterTimer) {
        clearTimeout(state.coachDiaryFilterTimer);
      }
      state.coachDiaryFilterTimer = window.setTimeout(() => {
        state.coachDiaryFilterTimer = null;
        applyCoachDiaryFiltersAndRender();
      }, 220);
    };

    const applyCoachDiaryFiltersImmediately = () => {
      if (state.coachDiaryFilterTimer) {
        clearTimeout(state.coachDiaryFilterTimer);
        state.coachDiaryFilterTimer = null;
      }
      applyCoachDiaryFiltersAndRender();
    };

    const keywordInput = qs('coachDiaryKeyword');
    keywordInput?.addEventListener('compositionstart', () => {
      state.coachDiarySearchComposing = true;
    });
    keywordInput?.addEventListener('compositionend', (event) => {
      state.coachDiarySearchComposing = false;
      state.coachDiarySearchQuery = event.target.value || '';
      scheduleCoachDiaryFilterRender();
    });
    keywordInput?.addEventListener('input', (event) => {
      state.coachDiarySearchQuery = event.target.value || '';
      if (state.coachDiarySearchComposing) return;
      scheduleCoachDiaryFilterRender();
    });

    qs('coachDiaryGradeFilter')?.addEventListener('change', (event) => {
      state.coachDiarySelectedGrade = event.target.value || '';
      applyCoachDiaryFiltersImmediately();
    });

    qs('coachDiaryTagFilter')?.addEventListener('change', (event) => {
      state.coachDiarySelectedTag = event.target.value || '';
      applyCoachDiaryFiltersImmediately();
    });

    root.querySelectorAll('[data-coach-diary-calendar-nav]').forEach((button) => {
      button.addEventListener('click', () => {
        const [yearValue, monthValue] = String(state.coachDiaryCalendarMonth || new Date().toISOString().slice(0, 7)).split('-');
        const next = new Date(Number(yearValue), Number(monthValue) - 1 + Number(button.dataset.coachDiaryCalendarNav || 0), 1);
        state.coachDiaryCalendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        const monthNotes = getFilteredCoachDiaryNotes()
          .filter((note) => String(note.entryDate || '').startsWith(state.coachDiaryCalendarMonth))
          .sort((left, right) => compareDiaryNotes(left, right, 'desc'));
        state.coachDiarySelectedDate = monthNotes[0]
          ? monthNotes[0].entryDate
          : `${state.coachDiaryCalendarMonth}-01`;
        state.coachDiaryModalNoteId = null;
        renderCoachDiary({ reload: false });
      });
    });

    root.querySelectorAll('[data-coach-diary-date]').forEach((button) => {
      button.addEventListener('click', () => {
        state.coachDiarySelectedDate = button.dataset.coachDiaryDate || '';
        state.coachDiaryCalendarMonth = state.coachDiarySelectedDate.slice(0, 7) || state.coachDiaryCalendarMonth;
        state.coachDiaryModalNoteId = null;
        renderCoachDiary({ reload: false });
      });
    });

    root.querySelectorAll('[data-coach-diary-note-card]').forEach((button) => {
      button.addEventListener('click', () => {
        state.coachDiaryModalNoteId = Number(button.dataset.coachDiaryNoteCard || 0) || null;
        renderCoachDiary({ reload: false });
      });
    });

    const closeCoachDiaryModal = () => {
      if (!state.coachDiaryModalNoteId) return;
      state.coachDiaryModalNoteId = null;
      renderCoachDiary({ reload: false });
    };

    root.querySelectorAll('[data-coach-diary-modal-close]').forEach((element) => {
      element.addEventListener('click', (event) => {
        if (event.target !== event.currentTarget && !event.target.closest('button')) return;
        closeCoachDiaryModal();
      });
    });

    if (!state.coachDiaryEscListenerBound) {
      window.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !state.coachDiaryModalNoteId) return;
        state.coachDiaryModalNoteId = null;
        renderCoachDiary({ reload: false });
      });
      state.coachDiaryEscListenerBound = true;
    }

    root.querySelectorAll('[data-coach-diary-reply-form]').forEach((replyForm) => {
      const noteId = Number(replyForm.dataset.coachDiaryReplyForm || 0);
      const messageField = replyForm.querySelector('[name="message"]');
      const stampField = replyForm.querySelector('[name="stamp"]');
      if (noteId && messageField) {
        messageField.addEventListener('input', () => {
          state.coachDiaryReplyDrafts[noteId] = messageField.value || '';
        });
      }
      if (noteId && stampField) {
        stampField.addEventListener('change', () => {
          state.coachDiarySelectedStamps[noteId] = stampField.value || '';
        });
      }

      replyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const messageBox = replyForm.querySelector('[data-coach-diary-reply-message]');
        const submitNoteId = Number(replyForm.querySelector('[data-note-id]')?.dataset.noteId || 0);
        if (!messageBox || !submitNoteId) return;
        messageBox.className = 'small';
        messageBox.textContent = '返信を送信しています...';
        try {
          const payload = await api(`/api/coach/diary-notes/${submitNoteId}/replies`, {
            method: 'POST',
            body: JSON.stringify({
              message: replyForm.message.value,
              stamp: replyForm.stamp.value,
            }),
          });
          delete state.coachDiaryReplyDrafts[submitNoteId];
          delete state.coachDiarySelectedStamps[submitNoteId];
          state.coachDiaryStampOptions = payload.stampOptions || state.coachDiaryStampOptions;
          state.coachDiaryNotes = state.coachDiaryNotes
            .map((note) => (Number(note.id) === Number(payload.note.id) ? prepareCoachDiaryNote(payload.note) : note));
          messageBox.className = 'small success-text';
          messageBox.textContent = payload.message;
          renderCoachDiary({ reload: false });
        } catch (error) {
          messageBox.className = 'small error-text';
          messageBox.textContent = error.message;
        }
      });
    });

    if (state.coachDiaryModalNoteId) {
      root.querySelector('.coach-diary-modal')?.focus();
    }
  }

  function buildConditionCalendar(records) {
    const [yearValue, monthValue] = String(state.conditionCalendarMonth || new Date().toISOString().slice(0, 7)).split('-');
    const year = Number(yearValue);
    const monthIndex = Number(monthValue) - 1;
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const startOffset = monthStart.getDay();
    const countsByDate = getConditionRecordCountsByDate(records);
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const isoDate = `${yearValue}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const recordCount = countsByDate.get(isoDate) || 0;
      const isSelected = state.conditionSelectedDate === isoDate;
      const isToday = isoDate === new Date().toISOString().slice(0, 10);
      cells.push(`
        <button
          type="button"
          class="calendar-day ${recordCount > 0 ? 'has-note' : ''} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}"
          data-condition-date="${isoDate}"
          aria-pressed="${String(isSelected)}"
        >
          <span class="calendar-day-number">${day}</span>
          ${recordCount > 0 ? '<span class="calendar-day-count">入力済</span>' : '<span class="calendar-day-count placeholder">　</span>'}
        </button>
      `);
    }

    return `
      <section class="card">
        <div class="diary-calendar-header">
          <div>
            <h2>カレンダー</h2>
            <div class="small">入力がある日はカレンダー上で確認できます。</div>
          </div>
          <div class="calendar-month-nav">
            <button type="button" class="button-secondary" data-condition-calendar-nav="-1">前月</button>
            <strong>${monthStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}</strong>
            <button type="button" class="button-secondary" data-condition-calendar-nav="1">次月</button>
          </div>
        </div>
        <div class="calendar-weekdays">
          ${['日', '月', '火', '水', '木', '金', '土'].map((label) => `<div>${label}</div>`).join('')}
        </div>
        <div class="calendar-grid">${cells.join('')}</div>
      </section>
    `;
  }


  function formatConditionChartAxisDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  }

  function getConditionWeightChartReferenceDate() {
    return state.conditionSelectedDate || state.conditionRecords[0]?.entryDate || new Date().toISOString().slice(0, 10);
  }

  function getConditionWeightHistory(range = 'all') {
    const referenceDate = getConditionWeightChartReferenceDate();
    const baseRecords = [...state.conditionRecords]
      .filter((record) => record && record.entryDate && Number.isFinite(Number(record.weight)) && record.entryDate <= referenceDate)
      .sort((left, right) => String(left.entryDate).localeCompare(String(right.entryDate)));

    if (range === 'all') return baseRecords;

    const dayWindow = range === '7d' ? 7 : range === '30d' ? 30 : null;
    if (!dayWindow) return baseRecords;

    const endDate = new Date(`${referenceDate}T00:00:00`);
    if (Number.isNaN(endDate.getTime())) return baseRecords;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (dayWindow - 1));
    const startKey = startDate.toISOString().slice(0, 10);
    return baseRecords.filter((record) => record.entryDate >= startKey);
  }

  function buildConditionWeightChart(record) {
    if (!state.conditionWeightChartVisible) return '';

    const range = state.conditionWeightChartRange || 'all';
    const records = getConditionWeightHistory(range);
    const rangeOptions = [
      { value: '7d', label: '直近7日' },
      { value: '30d', label: '直近30日' },
      { value: 'all', label: '全期間' },
    ];

    if (!records.length) {
      return `
        <section class="condition-weight-chart" aria-live="polite">
          <div class="condition-weight-chart-header">
            <div>
              <h3>体重の推移</h3>
              <div class="small">${escapeHtml(formatDiaryDateLabel(getConditionWeightChartReferenceDate()))}までの記録</div>
            </div>
            <div class="segmented-control" aria-label="体重推移の表示範囲切り替え">
              ${rangeOptions.map((option) => `
                <button
                  type="button"
                  class="segmented-control-button ${range === option.value ? 'is-active' : ''}"
                  data-condition-weight-range="${option.value}"
                  aria-pressed="${String(range === option.value)}"
                >${option.label}</button>
              `).join('')}
            </div>
          </div>
          <div class="condition-weight-chart-empty">体重データがありません。</div>
        </section>
      `;
    }

    const width = 320;
    const height = 180;
    const padding = { top: 20, right: 12, bottom: 34, left: 42 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const weights = records.map((entry) => Number(entry.weight));
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const spread = Math.max(maxWeight - minWeight, 2);
    const chartMin = Math.floor((minWeight - spread * 0.2) * 10) / 10;
    const chartMax = Math.ceil((maxWeight + spread * 0.2) * 10) / 10;
    const normalizedRange = Math.max(chartMax - chartMin, 1);
    const getX = (index) => (records.length === 1 ? padding.left + chartWidth / 2 : padding.left + (chartWidth * index) / (records.length - 1));
    const getY = (weight) => padding.top + ((chartMax - weight) / normalizedRange) * chartHeight;
    const polylinePoints = records.map((entry, index) => `${getX(index).toFixed(1)},${getY(Number(entry.weight)).toFixed(1)}`).join(' ');
    const gridValues = [chartMax, (chartMax + chartMin) / 2, chartMin];
    const axisLabelIndexes = [...new Set([0, Math.floor((records.length - 1) / 2), records.length - 1])];
    const firstWeight = Number(records[0].weight);
    const lastWeight = Number(records[records.length - 1].weight);
    const delta = lastWeight - firstWeight;
    const deltaText = `${delta > 0 ? '+' : ''}${delta.toFixed(delta % 1 === 0 ? 0 : 1)}kg`;
    const deltaClass = delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat';
    const latestRecord = records[records.length - 1];
    const activeDateLabel = formatDiaryDateLabel(latestRecord?.entryDate || record?.entryDate || getConditionWeightChartReferenceDate());

    return `
      <section class="condition-weight-chart" aria-live="polite">
        <div class="condition-weight-chart-header">
          <div>
            <h3>体重の推移</h3>
            <div class="small">${escapeHtml(activeDateLabel)}までの推移を表示しています。</div>
          </div>
          <div class="segmented-control" aria-label="体重推移の表示範囲切り替え">
            ${rangeOptions.map((option) => `
              <button
                type="button"
                class="segmented-control-button ${range === option.value ? 'is-active' : ''}"
                data-condition-weight-range="${option.value}"
                aria-pressed="${String(range === option.value)}"
              >${option.label}</button>
            `).join('')}
          </div>
        </div>
        <div class="condition-weight-chart-summary">
          <div class="condition-weight-chart-highlight">
            <span class="stat-label">最新体重</span>
            <strong>${escapeHtml(fmtKg(lastWeight))}</strong>
          </div>
          <div class="condition-weight-chart-highlight ${deltaClass}">
            <span class="stat-label">増減</span>
            <strong>${escapeHtml(deltaText)}</strong>
          </div>
          <div class="condition-weight-chart-highlight">
            <span class="stat-label">件数</span>
            <strong>${records.length}件</strong>
          </div>
        </div>
        <div class="condition-weight-chart-canvas" role="img" aria-label="日付ごとの体重推移グラフ">
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            ${gridValues.map((value) => {
              const y = getY(value);
              return `
                <line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${y.toFixed(1)}" class="condition-weight-chart-grid" />
                <text x="${(padding.left - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="condition-weight-chart-axis">${Number(value).toFixed(1).replace(/\.0$/, '')}</text>
              `;
            }).join('')}
            <line x1="${padding.left}" y1="${(padding.top + chartHeight).toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${(padding.top + chartHeight).toFixed(1)}" class="condition-weight-chart-baseline" />
            ${records.length > 1 ? `<polyline fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />` : ''}
            ${records.map((entry, index) => `
              <circle cx="${getX(index).toFixed(1)}" cy="${getY(Number(entry.weight)).toFixed(1)}" r="4" class="condition-weight-chart-point ${entry.entryDate === state.conditionSelectedDate ? 'is-current' : ''}" />
            `).join('')}
            ${axisLabelIndexes.map((index) => `
              <text x="${getX(index).toFixed(1)}" y="${(height - 10).toFixed(1)}" text-anchor="middle" class="condition-weight-chart-axis">${escapeHtml(formatConditionChartAxisDate(records[index].entryDate))}</text>
            `).join('')}
          </svg>
        </div>
      </section>
    `;
  }

  function buildConditionDetail(record) {
    const selectedDateLabel = state.conditionSelectedDate ? formatDiaryDateLabel(state.conditionSelectedDate) : '日付未選択';
    const isEditing = Boolean(record) && state.conditionDetailMode === 'edit';
    return `
      <section class="card">
        <div class="condition-detail-header">
          <div>
            <h2>当日の詳細</h2>
            <div class="small">${escapeHtml(selectedDateLabel)}</div>
          </div>
          ${record ? '<span class="condition-status-badge">入力あり</span>' : '<span class="condition-status-badge muted">未入力</span>'}
        </div>
        ${record ? (isEditing ? `
          <form id="conditionDetailEditForm">
            <div class="inline-fields">
              <div class="form-row">
                <label for="conditionDetailStatus">体調</label>
                <select id="conditionDetailStatus" name="conditionStatus" required>
                  ${conditionStatusOptions.map((option) => `<option value="${option.value}" ${record.conditionStatus === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-row">
                <label for="conditionDetailFatigue">疲労度</label>
                <select id="conditionDetailFatigue" name="fatigueLevel" required>
                  ${fatigueLevelOptions.map((option) => `<option value="${option.value}" ${record.fatigueLevel === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="inline-fields">
              <div class="form-row">
                <label for="conditionDetailWeight">体重</label>
                <input id="conditionDetailWeight" name="weight" type="number" inputmode="numeric" step="1" min="0" required value="${escapeHtml(String(record.weight))}" placeholder="整数で入力" />
              </div>
              <div class="form-row">
                <label for="conditionDetailSleepHours">睡眠時間</label>
                <input id="conditionDetailSleepHours" name="sleepHours" type="number" inputmode="numeric" step="1" min="0" max="24" required value="${escapeHtml(String(record.sleepHours))}" placeholder="整数で入力" />
              </div>
            </div>
            <div class="actions">
              <button class="button-primary" type="submit">保存する</button>
              <button class="button-secondary" type="button" id="conditionDetailCancelBtn">キャンセル</button>
              <button class="button-danger" type="button" id="conditionDetailDeleteBtn">削除する</button>
            </div>
            <div id="conditionDetailMessage" class="small"></div>
          </form>
        ` : `
          <div class="grid">
            <div class="stat-card">
              <div class="stat-label">体調</div>
              <div class="stat-value">${escapeHtml(getConditionStatusLabel(record.conditionStatus, record))}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">疲労度</div>
              <div class="stat-value">${escapeHtml(getFatigueLevelLabel(record.fatigueLevel, record))}</div>
            </div>
            <button
              type="button"
              class="stat-card stat-card-button condition-weight-trigger ${state.conditionWeightChartVisible ? 'is-active' : ''}"
              data-condition-weight-toggle
              aria-expanded="${String(state.conditionWeightChartVisible)}"
            >
              <div class="condition-weight-trigger-label">
                <div class="stat-label">体重</div>
                <span class="small inline-link">${state.conditionWeightChartVisible ? 'グラフを閉じる' : '推移を見る'}</span>
              </div>
              <div class="stat-value">${escapeHtml(String(record.weight))}kg</div>
            </button>
            <div class="stat-card">
              <div class="stat-label">睡眠時間</div>
              <div class="stat-value">${escapeHtml(String(record.sleepHours))}時間</div>
            </div>
          </div>
          ${buildConditionWeightChart(record)}
          <div class="condition-detail-footer">
            <div class="meta">更新: ${escapeHtml(String(record.updatedAt || '').replace('T', ' ').slice(0, 16) || '未更新')}</div>
            <div class="actions">
              <button class="button-secondary" type="button" id="conditionDetailEditBtn">編集する</button>
              <button class="button-danger" type="button" id="conditionDetailDeleteBtn">削除する</button>
            </div>
          </div>
          <div id="conditionDetailMessage" class="small"></div>
        `) : '<div class="small">選択した日付の体調データはまだありません。</div>'}
      </section>
    `;
  }
  async function renderConditionCheck(options = {}) {
    const root = qs('conditionCheckRoot');
    if (!root) return;
    const user = state.user || (await fetchCurrentUser());
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    if (user.role !== 'player') {
      window.location.href = 'index.html';
      return;
    }

    if (options.reload !== false) {
      await refreshConditionRecords();
    }

    const selectedRecord = getConditionRecordForSelectedDate();
    root.innerHTML = `
      <section class="card role-hero">
        <div class="hero-kicker">選手専用</div>
        <h2>体調</h2>
        <p class="small">日ごとの体調を整数入力で記録し、カレンダーと当日の詳細から確認できます。</p>
      </section>
      <section class="card">
        <h2>体調を入力</h2>
        <form id="conditionRecordForm">
          <div class="form-row">
            <label for="conditionEntryDate">日付</label>
            <input id="conditionEntryDate" name="entryDate" type="date" required value="${escapeHtml((state.conditionSelectedDate || new Date().toISOString().slice(0, 10)))}" />
          </div>
          <div class="inline-fields">
            <div class="form-row">
              <label for="conditionStatus">体調</label>
              <select id="conditionStatus" name="conditionStatus" required>
                ${conditionStatusOptions.map((option) => `<option value="${option.value}" ${selectedRecord && selectedRecord.entryDate === (state.conditionSelectedDate || '') && selectedRecord.conditionStatus === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <label for="fatigueLevel">疲労度</label>
              <select id="fatigueLevel" name="fatigueLevel" required>
                ${fatigueLevelOptions.map((option) => `<option value="${option.value}" ${selectedRecord && selectedRecord.entryDate === (state.conditionSelectedDate || '') && selectedRecord.fatigueLevel === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="inline-fields">
            <div class="form-row">
              <label for="conditionWeight">体重</label>
              <input id="conditionWeight" name="weight" type="number" inputmode="numeric" step="1" min="0" required value="${selectedRecord ? escapeHtml(String(selectedRecord.weight)) : ''}" placeholder="整数で入力" />
            </div>
            <div class="form-row">
              <label for="conditionSleepHours">睡眠時間</label>
              <input id="conditionSleepHours" name="sleepHours" type="number" inputmode="numeric" step="1" min="0" max="24" required value="${selectedRecord ? escapeHtml(String(selectedRecord.sleepHours)) : ''}" placeholder="整数で入力" />
            </div>
          </div>
          <div class="actions">
            <button class="button-primary" type="submit">保存する</button>
            <button class="button-secondary" type="button" id="conditionTodayBtn">今日を選択</button>
          </div>
          <div id="conditionFormMessage" class="small"></div>
        </form>
      </section>
      ${buildConditionDetail(selectedRecord)}
      ${buildConditionCalendar(state.conditionRecords)}
    `;

    const form = qs('conditionRecordForm');
    const message = qs('conditionFormMessage');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        entryDate: form.entryDate.value,
        conditionStatus: form.conditionStatus.value,
        weight: form.weight.value,
        sleepHours: form.sleepHours.value,
        fatigueLevel: form.fatigueLevel.value,
      };
      message.className = 'small';
      message.textContent = '保存中です...';
      try {
        await api('/api/condition-records', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        message.className = 'small success-text';
        message.textContent = '体調データを保存しました。';
        state.conditionSelectedDate = payload.entryDate;
        state.conditionCalendarMonth = payload.entryDate.slice(0, 7);
        state.conditionDetailMode = 'view';
        await renderConditionCheck();
      } catch (error) {
        message.className = 'small error-text';
        message.textContent = error.message;
      }
    });

    qs('conditionTodayBtn')?.addEventListener('click', () => {
      state.conditionSelectedDate = new Date().toISOString().slice(0, 10);
      state.conditionCalendarMonth = state.conditionSelectedDate.slice(0, 7);
      state.conditionDetailMode = 'view';
      renderConditionCheck({ reload: false });
    });

    root.querySelector('[data-condition-weight-toggle]')?.addEventListener('click', () => {
      state.conditionWeightChartVisible = !state.conditionWeightChartVisible;
      renderConditionCheck({ reload: false });
    });

    root.querySelectorAll('[data-condition-weight-range]').forEach((button) => {
      button.addEventListener('click', () => {
        state.conditionWeightChartVisible = true;
        state.conditionWeightChartRange = button.dataset.conditionWeightRange || 'all';
        renderConditionCheck({ reload: false });
      });
    });

    root.querySelectorAll('[data-condition-calendar-nav]').forEach((button) => {
      button.addEventListener('click', () => {
        const [yearValue, monthValue] = String(state.conditionCalendarMonth).split('-');
        const next = new Date(Number(yearValue), Number(monthValue) - 1 + Number(button.dataset.conditionCalendarNav || 0), 1);
        state.conditionCalendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        renderConditionCheck({ reload: false });
      });
    });

    qs('conditionDetailEditBtn')?.addEventListener('click', () => {
      state.conditionDetailMode = 'edit';
      renderConditionCheck({ reload: false });
    });

    qs('conditionDetailCancelBtn')?.addEventListener('click', () => {
      state.conditionDetailMode = 'view';
      renderConditionCheck({ reload: false });
    });

    qs('conditionDetailDeleteBtn')?.addEventListener('click', async () => {
      if (!state.conditionSelectedDate) return;
      if (!window.confirm(`${formatDiaryDateLabel(state.conditionSelectedDate)}の体調データを削除しますか？`)) return;
      const detailMessage = qs('conditionDetailMessage');
      if (detailMessage) {
        detailMessage.className = 'small';
        detailMessage.textContent = '削除中です...';
      }
      try {
        await api(`/api/condition-records/${encodeURIComponent(state.conditionSelectedDate)}`, { method: 'DELETE' });
        state.conditionDetailMode = 'view';
        await renderConditionCheck();
      } catch (error) {
        if (detailMessage) {
          detailMessage.className = 'small error-text';
          detailMessage.textContent = error.message;
        } else {
          window.alert(error.message);
        }
      }
    });

    qs('conditionDetailEditForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const detailForm = event.currentTarget;
      const detailMessage = qs('conditionDetailMessage');
      const payload = {
        entryDate: state.conditionSelectedDate,
        conditionStatus: detailForm.conditionStatus.value,
        weight: detailForm.weight.value,
        sleepHours: detailForm.sleepHours.value,
        fatigueLevel: detailForm.fatigueLevel.value,
      };
      detailMessage.className = 'small';
      detailMessage.textContent = '保存中です...';
      try {
        await api('/api/condition-records', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        detailMessage.className = 'small success-text';
        detailMessage.textContent = '当日の体調データを更新しました。';
        state.conditionDetailMode = 'view';
        await renderConditionCheck();
      } catch (error) {
        detailMessage.className = 'small error-text';
        detailMessage.textContent = error.message;
      }
    });

    root.querySelectorAll('[data-condition-date]').forEach((button) => {
      button.addEventListener('click', () => {
        state.conditionSelectedDate = button.dataset.conditionDate || '';
        if (state.conditionSelectedDate) {
          state.conditionCalendarMonth = state.conditionSelectedDate.slice(0, 7);
        }
        state.conditionDetailMode = 'view';
        renderConditionCheck({ reload: false });
      });
    });
  }


  async function refreshCoachConditionData() {
    const payload = await api('/api/team-condition-records');
    state.coachConditionPlayers = payload.players || [];
    state.coachConditionRecords = (payload.records || []).map((record) => normalizeConditionRecord(record));

    const availablePlayerIds = new Set(state.coachConditionPlayers.map((player) => Number(player.id)));
    if (!availablePlayerIds.has(Number(state.coachConditionSelectedPlayerId))) {
      const datedRecords = getCoachConditionRecordsForDate(state.coachConditionSelectedDate);
      state.coachConditionSelectedPlayerId = Number(datedRecords[0]?.userId || state.coachConditionPlayers[0]?.id || null);
    }

    if (!state.coachConditionSelectedDate) {
      state.coachConditionSelectedDate = state.coachConditionRecords[0]?.entryDate || new Date().toISOString().slice(0, 10);
    }
    if (state.coachConditionSelectedDate) {
      state.coachConditionCalendarMonth = state.coachConditionSelectedDate.slice(0, 7);
    }
  }

  function getFilteredCoachConditionPlayers() {
    return [...state.coachConditionPlayers]
      .filter((player) => !state.coachConditionSelectedGrade || getPlayerGrade(player.profile || player) === state.coachConditionSelectedGrade)
      .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'ja'));
  }

  function getCoachConditionRecordsForDate(entryDate, visiblePlayers = getFilteredCoachConditionPlayers()) {
    const visiblePlayerIds = new Set(visiblePlayers.map((player) => Number(player.id)));
    return [...state.coachConditionRecords]
      .filter((record) => record.entryDate === entryDate && visiblePlayerIds.has(Number(record.userId)))
      .sort((left, right) => {
        const leftKey = `${left.updatedAt || ''}-${String(left.id || '').padStart(8, '0')}`;
        const rightKey = `${right.updatedAt || ''}-${String(right.id || '').padStart(8, '0')}`;
        return rightKey.localeCompare(leftKey);
      });
  }

  function getCoachConditionPlayerById(playerId, players = getFilteredCoachConditionPlayers()) {
    return players.find((player) => Number(player.id) === Number(playerId)) || null;
  }

  function getCoachConditionRecordForPlayerAndDate(playerId, entryDate) {
    if (!playerId || !entryDate) return null;
    return state.coachConditionRecords.find((record) => Number(record.userId) === Number(playerId) && record.entryDate === entryDate) || null;
  }

  function getCoachConditionHistoryForPlayer(playerId) {
    if (!playerId) return [];
    return [...state.coachConditionRecords]
      .filter((record) => Number(record.userId) === Number(playerId))
      .sort((left, right) => {
        const leftKey = `${left.entryDate || ''}-${left.updatedAt || ''}-${String(left.id || '').padStart(8, '0')}`;
        const rightKey = `${right.entryDate || ''}-${right.updatedAt || ''}-${String(right.id || '').padStart(8, '0')}`;
        return rightKey.localeCompare(leftKey);
      });
  }

  function buildCoachConditionCalendar(visiblePlayers = getFilteredCoachConditionPlayers()) {
    const [yearValue, monthValue] = String(state.coachConditionCalendarMonth || new Date().toISOString().slice(0, 7)).split('-');
    const year = Number(yearValue);
    const monthIndex = Number(monthValue) - 1;
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const startOffset = monthStart.getDay();
    const visiblePlayerIds = new Set(visiblePlayers.map((player) => Number(player.id)));
    const countsByDate = getConditionRecordCountsByDate(state.coachConditionRecords.filter((record) => visiblePlayerIds.has(Number(record.userId))));
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push('<div class="calendar-day is-empty" aria-hidden="true"></div>');
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const isoDate = `${yearValue}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const recordCount = countsByDate.get(isoDate) || 0;
      const isSelected = state.coachConditionSelectedDate === isoDate;
      const isToday = isoDate === new Date().toISOString().slice(0, 10);
      cells.push(`
        <button
          type="button"
          class="calendar-day ${recordCount > 0 ? 'has-note' : ''} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}"
          data-coach-condition-date="${isoDate}"
          aria-pressed="${String(isSelected)}"
        >
          <span class="calendar-day-number">${day}</span>
          ${recordCount > 0 ? `<span class="calendar-day-count">${recordCount}件</span>` : '<span class="calendar-day-count placeholder">　</span>'}
        </button>
      `);
    }

    return `
      <section class="card">
        <div class="diary-calendar-header">
          <div>
            <h2>日付を切り替える</h2>
            <div class="small">過去データを日付選択とカレンダーから確認できます。</div>
          </div>
          <div class="calendar-month-nav">
            <button type="button" class="button-secondary" data-coach-condition-calendar-nav="-1">前月</button>
            <strong>${monthStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}</strong>
            <button type="button" class="button-secondary" data-coach-condition-calendar-nav="1">次月</button>
          </div>
        </div>
        <div class="calendar-weekdays">
          ${['日', '月', '火', '水', '木', '金', '土'].map((label) => `<div>${label}</div>`).join('')}
        </div>
        <div class="calendar-grid">${cells.join('')}</div>
      </section>
    `;
  }

  function getCoachConditionWeightHistory(range = 'all') {
    const playerId = state.coachConditionSelectedPlayerId;
    const referenceDate = state.coachConditionSelectedDate || new Date().toISOString().slice(0, 10);
    const baseRecords = getCoachConditionHistoryForPlayer(playerId)
      .filter((record) => record.entryDate <= referenceDate && Number.isFinite(Number(record.weight)))
      .sort((left, right) => String(left.entryDate).localeCompare(String(right.entryDate)));

    if (range === 'all') return baseRecords;
    const dayWindow = range === '7d' ? 7 : range === '30d' ? 30 : null;
    if (!dayWindow) return baseRecords;

    const endDate = new Date(`${referenceDate}T00:00:00`);
    if (Number.isNaN(endDate.getTime())) return baseRecords;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (dayWindow - 1));
    const startKey = startDate.toISOString().slice(0, 10);
    return baseRecords.filter((record) => record.entryDate >= startKey);
  }

  function buildCoachConditionWeightChart(record, player) {
    if (!state.coachConditionWeightChartVisible) return '';

    const range = state.coachConditionWeightChartRange || 'all';
    const records = getCoachConditionWeightHistory(range);
    const rangeOptions = [
      { value: '7d', label: '直近7日' },
      { value: '30d', label: '直近30日' },
      { value: 'all', label: '全期間' },
    ];

    if (!records.length) {
      return `
        <section class="condition-weight-chart" aria-live="polite">
          <div class="condition-weight-chart-header">
            <div>
              <h3>体重の推移</h3>
              <div class="small">${escapeHtml(player?.name || '選手未選択')}の体重履歴はまだありません。</div>
            </div>
            <div class="segmented-control" aria-label="体重推移の表示範囲切り替え">
              ${rangeOptions.map((option) => `
                <button
                  type="button"
                  class="segmented-control-button ${range === option.value ? 'is-active' : ''}"
                  data-coach-condition-weight-range="${option.value}"
                  aria-pressed="${String(range === option.value)}"
                >${option.label}</button>
              `).join('')}
            </div>
          </div>
          <div class="condition-weight-chart-empty">体重履歴がないためグラフを表示できません。</div>
        </section>
      `;
    }

    const width = 320;
    const height = 180;
    const padding = { top: 20, right: 12, bottom: 34, left: 42 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const weights = records.map((entry) => Number(entry.weight));
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const spread = Math.max(maxWeight - minWeight, 2);
    const chartMin = Math.floor((minWeight - spread * 0.2) * 10) / 10;
    const chartMax = Math.ceil((maxWeight + spread * 0.2) * 10) / 10;
    const normalizedRange = Math.max(chartMax - chartMin, 1);
    const getX = (index) => (records.length === 1 ? padding.left + chartWidth / 2 : padding.left + (chartWidth * index) / (records.length - 1));
    const getY = (weight) => padding.top + ((chartMax - weight) / normalizedRange) * chartHeight;
    const polylinePoints = records.map((entry, index) => `${getX(index).toFixed(1)},${getY(Number(entry.weight)).toFixed(1)}`).join(' ');
    const gridValues = [chartMax, (chartMax + chartMin) / 2, chartMin];
    const axisLabelIndexes = [...new Set([0, Math.floor((records.length - 1) / 2), records.length - 1])];
    const firstWeight = Number(records[0].weight);
    const lastWeight = Number(records[records.length - 1].weight);
    const delta = lastWeight - firstWeight;
    const deltaText = `${delta > 0 ? '+' : ''}${delta.toFixed(delta % 1 === 0 ? 0 : 1)}kg`;
    const deltaClass = delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat';
    const latestRecord = records[records.length - 1];
    const activeDateLabel = formatDiaryDateLabel(latestRecord?.entryDate || record?.entryDate || state.coachConditionSelectedDate);

    return `
      <section class="condition-weight-chart" aria-live="polite">
        <div class="condition-weight-chart-header">
          <div>
            <h3>体重の推移</h3>
            <div class="small">${escapeHtml(player?.name || '選手未選択')} / ${escapeHtml(activeDateLabel)}までの推移</div>
          </div>
          <div class="segmented-control" aria-label="体重推移の表示範囲切り替え">
            ${rangeOptions.map((option) => `
              <button
                type="button"
                class="segmented-control-button ${range === option.value ? 'is-active' : ''}"
                data-coach-condition-weight-range="${option.value}"
                aria-pressed="${String(range === option.value)}"
              >${option.label}</button>
            `).join('')}
          </div>
        </div>
        <div class="condition-weight-chart-summary">
          <div class="condition-weight-chart-highlight">
            <span class="stat-label">最新体重</span>
            <strong>${escapeHtml(fmtKg(lastWeight))}</strong>
          </div>
          <div class="condition-weight-chart-highlight ${deltaClass}">
            <span class="stat-label">増減</span>
            <strong>${escapeHtml(deltaText)}</strong>
          </div>
          <div class="condition-weight-chart-highlight">
            <span class="stat-label">件数</span>
            <strong>${records.length}件</strong>
          </div>
        </div>
        <div class="condition-weight-chart-canvas" role="img" aria-label="日付ごとの体重推移グラフ">
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            ${gridValues.map((value) => {
              const y = getY(value);
              return `
                <line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${y.toFixed(1)}" class="condition-weight-chart-grid" />
                <text x="${(padding.left - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="condition-weight-chart-axis">${Number(value).toFixed(1).replace(/\.0$/, '')}</text>
              `;
            }).join('')}
            <line x1="${padding.left}" y1="${(padding.top + chartHeight).toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${(padding.top + chartHeight).toFixed(1)}" class="condition-weight-chart-baseline" />
            ${records.length > 1 ? `<polyline fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />` : ''}
            ${records.map((entry, index) => `
              <circle cx="${getX(index).toFixed(1)}" cy="${getY(Number(entry.weight)).toFixed(1)}" r="4" class="condition-weight-chart-point ${entry.entryDate === state.coachConditionSelectedDate ? 'is-current' : ''}" />
            `).join('')}
            ${axisLabelIndexes.map((index) => `
              <text x="${getX(index).toFixed(1)}" y="${(height - 10).toFixed(1)}" text-anchor="middle" class="condition-weight-chart-axis">${escapeHtml(formatConditionChartAxisDate(records[index].entryDate))}</text>
            `).join('')}
          </svg>
        </div>
      </section>
    `;
  }

  function buildCoachConditionList(selectedDate, visiblePlayers = getFilteredCoachConditionPlayers()) {
    const recordsForDate = getCoachConditionRecordsForDate(selectedDate, visiblePlayers);
    const recordMap = new Map(recordsForDate.map((record) => [Number(record.userId), record]));
    const items = visiblePlayers.map((player) => {
      const record = recordMap.get(Number(player.id)) || null;
      const isSelected = Number(player.id) === Number(state.coachConditionSelectedPlayerId);
      return `
        <button type="button" class="list-item coach-condition-list-item ${isSelected ? 'is-selected' : ''}" data-coach-condition-player="${player.id}">
          <div class="coach-condition-list-head">
            <strong class="coach-condition-player-name">${escapeHtml(player.name)}</strong>
            <span class="condition-status-badge coach-condition-entry-badge ${record ? '' : 'muted'}">${record ? '入力あり' : '未入力'}</span>
          </div>
          <div class="coach-condition-primary-status ${record ? '' : 'is-empty'}">${escapeHtml(record ? getConditionStatusLabel(record.conditionStatus, record) : '未入力')}</div>
          <div class="meta">${escapeHtml(buildPlayerMetaLine(player.profile || player))}</div>
          <div class="coach-condition-summary-grid">
            <div>
              <span class="meta-label">体重</span>
              <span>${escapeHtml(record ? fmtKg(record.weight) : '—')}</span>
            </div>
            <div>
              <span class="meta-label">疲労</span>
              <span>${escapeHtml(record ? getFatigueLevelLabel(record.fatigueLevel, record) : '—')}</span>
            </div>
            <div>
              <span class="meta-label">睡眠</span>
              <span>${escapeHtml(record ? `${record.sleepHours}h` : '—')}</span>
            </div>
          </div>
        </button>
      `;
    }).join('');

    return `
      <section class="card">
        <div class="coach-condition-section-header">
          <div>
            <h2>選手一覧</h2>
            <div class="small">${escapeHtml(formatDiaryDateLabel(selectedDate))}時点の各選手の最新体調を簡易表示しています。学年フィルターは日付選択と併用されます。</div>
          </div>
          <div class="small">入力件数: ${recordsForDate.length} / ${visiblePlayers.length}</div>
        </div>
        <div class="inline-fields diary-filter-grid">
          <div class="form-row compact-row">
            <label for="coachConditionGradeFilter">学年で絞り込み</label>
            <select id="coachConditionGradeFilter">${buildGradeOptionTags(state.coachConditionSelectedGrade, { includeAll: true })}</select>
          </div>
          <div class="form-row compact-row">
            <label>表示対象</label>
            <div class="condition-status-badge ${visiblePlayers.length ? '' : 'muted'}">${escapeHtml(state.coachConditionSelectedGrade ? getPlayerGradeLabel(state.coachConditionSelectedGrade) : '全学年')}</div>
          </div>
        </div>
        ${visiblePlayers.length ? `<div class="coach-condition-list">${items}</div>` : '<div class="small">該当する選手がいません。</div>'}
      </section>
    `;
  }

  function buildCoachConditionDetail(visiblePlayers = getFilteredCoachConditionPlayers()) {
    const player = getCoachConditionPlayerById(state.coachConditionSelectedPlayerId, visiblePlayers);
    if (!player) {
      return '<section class="card"><h2>選手詳細</h2><div class="small">確認する選手を選択してください。</div></section>';
    }

    const record = getCoachConditionRecordForPlayerAndDate(player.id, state.coachConditionSelectedDate);
    const history = getCoachConditionHistoryForPlayer(player.id);
    return `
      <section class="card">
        <div class="condition-detail-header">
          <div>
            <h2>${escapeHtml(player.name)} の体調詳細</h2>
            <div class="small">${escapeHtml(`${buildPlayerMetaLine(player.profile || player)} / ${formatDiaryDateLabel(state.coachConditionSelectedDate)}`)}</div>
          </div>
          ${record ? '<span class="condition-status-badge">入力あり</span>' : '<span class="condition-status-badge muted">未入力</span>'}
        </div>
        ${record ? `
          <div class="grid">
            <div class="stat-card">
              <div class="stat-label">体調</div>
              <div class="stat-value">${escapeHtml(getConditionStatusLabel(record.conditionStatus, record))}</div>
            </div>
            <button
              type="button"
              class="stat-card stat-card-button condition-weight-trigger ${state.coachConditionWeightChartVisible ? 'is-active' : ''}"
              data-coach-condition-weight-toggle
              aria-expanded="${String(state.coachConditionWeightChartVisible)}"
            >
              <div class="condition-weight-trigger-label">
                <div class="stat-label">体重</div>
                <span class="small inline-link">${state.coachConditionWeightChartVisible ? 'グラフを閉じる' : '推移を見る'}</span>
              </div>
              <div class="stat-value">${escapeHtml(fmtKg(record.weight))}</div>
            </button>
            <div class="stat-card">
              <div class="stat-label">睡眠時間</div>
              <div class="stat-value">${escapeHtml(String(record.sleepHours))}時間</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">疲労度</div>
              <div class="stat-value">${escapeHtml(getFatigueLevelLabel(record.fatigueLevel, record))}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">入力日</div>
              <div class="stat-value">${escapeHtml(formatDiaryDateLabel(record.entryDate))}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">最終更新</div>
              <div class="stat-value">${escapeHtml(String(record.updatedAt || '').replace('T', ' ').slice(0, 16) || '—')}</div>
            </div>
          </div>
          ${buildCoachConditionWeightChart(record, player)}
        ` : '<div class="small">選択日の体調入力はありません。下の履歴から過去データを選ぶと詳細を確認できます。</div>'}
        <div class="coach-condition-history">
          <div class="coach-condition-section-header">
            <div>
              <h3>過去の体調履歴</h3>
              <div class="small">日付を押すと、その日の詳細へ切り替わります。</div>
            </div>
            <div class="small">履歴 ${history.length}件</div>
          </div>
          ${history.length ? `<div class="coach-condition-history-list">${history.map((entry) => `
            <button type="button" class="coach-condition-history-item ${entry.entryDate === state.coachConditionSelectedDate ? 'is-selected' : ''}" data-coach-condition-history-date="${entry.entryDate}">
              <strong>${escapeHtml(formatDiaryDateLabel(entry.entryDate))}</strong>
              <div class="meta">体調: ${escapeHtml(getConditionStatusLabel(entry.conditionStatus, entry))} / 体重: ${escapeHtml(fmtKg(entry.weight))} / 疲労度: ${escapeHtml(getFatigueLevelLabel(entry.fatigueLevel, entry))}</div>
            </button>
          `).join('')}</div>` : '<div class="small">この選手の履歴はまだありません。</div>'}
        </div>
      </section>
    `;
  }

  async function renderCoachCondition(options = {}) {
    const root = qs('coachConditionRoot');
    if (!root) return;
    const user = state.user || (await fetchCurrentUser());
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    if (!['coach', 'manager'].includes(user.role)) {
      window.location.href = 'index.html';
      return;
    }

    if (options.reload !== false) {
      await refreshCoachConditionData();
    }

    const visiblePlayers = getFilteredCoachConditionPlayers();
    if (state.coachConditionSelectedPlayerId && !visiblePlayers.some((player) => Number(player.id) === Number(state.coachConditionSelectedPlayerId))) {
      state.coachConditionSelectedPlayerId = Number(visiblePlayers[0]?.id || null);
      state.coachConditionWeightChartVisible = false;
    }

    const selectedDate = state.coachConditionSelectedDate || new Date().toISOString().slice(0, 10);
    root.innerHTML = `
      <section class="card role-hero">
        <div class="hero-kicker">${escapeHtml(`${getRoleLabel(user.role)}専用`)}</div>
        <h2>チーム体調一覧</h2>
        <p class="small">日付ごとの体調状況を一覧で確認し、選手詳細から履歴や体重推移まで追えます。</p>
      </section>
      ${buildCoachConditionList(selectedDate, visiblePlayers)}
      ${buildCoachConditionDetail(visiblePlayers)}
      ${buildCoachConditionCalendar(visiblePlayers)}
    `;

    qs('coachConditionGradeFilter')?.addEventListener('change', (event) => {
      state.coachConditionSelectedGrade = event.target.value || '';
      const filteredPlayers = getFilteredCoachConditionPlayers();
      state.coachConditionSelectedPlayerId = Number(filteredPlayers[0]?.id || null);
      state.coachConditionWeightChartVisible = false;
      renderCoachCondition({ reload: false });
    });

    root.querySelectorAll('[data-coach-condition-player]').forEach((button) => {
      button.addEventListener('click', () => {
        state.coachConditionSelectedPlayerId = Number(button.dataset.coachConditionPlayer || 0) || null;
        state.coachConditionWeightChartVisible = false;
        renderCoachCondition({ reload: false });
      });
    });

    root.querySelector('[data-coach-condition-weight-toggle]')?.addEventListener('click', () => {
      state.coachConditionWeightChartVisible = !state.coachConditionWeightChartVisible;
      renderCoachCondition({ reload: false });
    });

    root.querySelectorAll('[data-coach-condition-weight-range]').forEach((button) => {
      button.addEventListener('click', () => {
        state.coachConditionWeightChartVisible = true;
        state.coachConditionWeightChartRange = button.dataset.coachConditionWeightRange || 'all';
        renderCoachCondition({ reload: false });
      });
    });

    root.querySelectorAll('[data-coach-condition-history-date]').forEach((button) => {
      button.addEventListener('click', () => {
        state.coachConditionSelectedDate = button.dataset.coachConditionHistoryDate || state.coachConditionSelectedDate;
        state.coachConditionCalendarMonth = state.coachConditionSelectedDate.slice(0, 7);
        renderCoachCondition({ reload: false });
      });
    });

    root.querySelectorAll('[data-coach-condition-date]').forEach((button) => {
      button.addEventListener('click', () => {
        state.coachConditionSelectedDate = button.dataset.coachConditionDate || selectedDate;
        state.coachConditionCalendarMonth = state.coachConditionSelectedDate.slice(0, 7);
        state.coachConditionWeightChartVisible = false;
        const datedRecords = getCoachConditionRecordsForDate(state.coachConditionSelectedDate, visiblePlayers);
        if (datedRecords.length && !datedRecords.some((record) => Number(record.userId) === Number(state.coachConditionSelectedPlayerId))) {
          state.coachConditionSelectedPlayerId = Number(datedRecords[0].userId);
        }
        renderCoachCondition({ reload: false });
      });
    });

    root.querySelectorAll('[data-coach-condition-calendar-nav]').forEach((button) => {
      button.addEventListener('click', () => {
        const [yearValue, monthValue] = String(state.coachConditionCalendarMonth).split('-');
        const next = new Date(Number(yearValue), Number(monthValue) - 1 + Number(button.dataset.coachConditionCalendarNav || 0), 1);
        state.coachConditionCalendarMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        renderCoachCondition({ reload: false });
      });
    });
  }

  async function renderSettings() {
    if (!qs('settingsRoot')) return;
    const user = await fetchCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    qs('profileName').textContent = user.name;
    qs('profileRole').textContent = getRoleLabel(user.role);
    qs('profileTeam').textContent = '野球部';
    if (qs('profileGrade')) qs('profileGrade').textContent = user.role === 'player' ? getPlayerGradeLabel(user.profile || {}) : '—';

    const gradeSettingsCard = qs('gradeSettingsCard');
    const gradeForm = qs('gradeForm');
    const gradeSelect = qs('gradeSelect');
    const gradeMessage = qs('gradeMessage');
    if (gradeSettingsCard) {
      gradeSettingsCard.hidden = user.role !== 'player';
    }
    if (gradeSelect) {
      gradeSelect.value = user.role === 'player' ? getPlayerGrade(user.profile || {}) : '';
    }
    if (gradeForm && gradeMessage) {
      gradeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          const payload = await api('/api/profile/grade', {
            method: 'PUT',
            body: JSON.stringify({ grade: gradeSelect ? gradeSelect.value : '' }),
          });
          gradeMessage.className = 'small success-text';
          gradeMessage.textContent = payload.message || '学年を保存しました。';
          const updatedUser = payload.user || user;
          if (gradeSelect) gradeSelect.value = getPlayerGrade(updatedUser.profile || {});
          if (qs('profileGrade')) qs('profileGrade').textContent = getPlayerGradeLabel(updatedUser.profile || {});
          state.user = updatedUser;
        } catch (error) {
          gradeMessage.className = 'small error-text';
          gradeMessage.textContent = error.message;
        }
      });
    }

    qs('logoutBtn')?.addEventListener('click', async () => {
      await api('/api/logout', { method: 'POST' });
      window.location.href = 'login.html';
    });
    qs('deleteAccountBtn')?.addEventListener('click', async () => {
      const message = qs('accountDeleteMessage');
      try {
        await api('/api/account', {
          method: 'DELETE',
          body: JSON.stringify({
            confirmationText: qs('deleteConfirmText').value,
            password: qs('deleteAccountPassword').value,
          }),
        });
        message.className = 'small success-text';
        message.textContent = 'アカウントを削除しました。';
        window.location.href = 'login.html';
      } catch (error) {
        message.className = 'small error-text';
        message.textContent = error.message;
      }
    });
    ['emailForm', 'passwordForm'].forEach((id) => {
      const form = qs(id);
      if (form) {
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const messageId = id === 'emailForm' ? 'emailMessage' : 'passwordMessage';
          qs(messageId).className = 'small success-text';
          qs(messageId).textContent = '現在のサンプル実装ではプレビューのみ対応しています。';
        });
      }
    });
  }

  async function renderPlayerDetail() {
    const root = qs('playerDetailRoot');
    if (!root) return;
    const user = state.user || (await fetchCurrentUser());
    if (!user) return;
    if (user.role !== 'coach') {
      root.innerHTML = `
        <section class="card">
          <h2>指導者専用ページです</h2>
          <p class="small">このページは指導者ロールの個人成績サマリー詳細確認用です。</p>
        </section>
      `;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const playerId = Number(params.get('playerId'));
    if (!playerId) {
      root.innerHTML = `
        <section class="card">
          <h2>選手が指定されていません</h2>
          <p class="small">ホームの選手カードから詳細画面を開いてください。</p>
          <div class="actions single-action">
            <a class="button button-secondary" href="index.html">ホームへ戻る</a>
          </div>
        </section>
      `;
      return;
    }

    try {
      const payload = await refreshPlayerSummaryDetail(playerId);
      root.innerHTML = `
        <section class="card role-hero">
          <div class="hero-kicker">指導者専用</div>
          <h2>${escapeHtml(payload.player.name)} の個人成績サマリー</h2>
          <p class="small">${escapeHtml(buildPlayerMetaLine(payload.player))}</p>
          <div class="actions">
            <a class="button button-secondary" href="index.html">ホームへ戻る</a>
            <a class="button button-secondary" href="coach.html">野球日誌へ</a>
          </div>
        </section>
        ${buildPersonalSummaryCard(payload.summary, user)}
      `;
      bindGroundFlyToggles(root);
    } catch (error) {
      root.innerHTML = `<section class="card"><div class="small error-text">${escapeHtml(error.message)}</div></section>`;
    }
  }

  async function renderCoachStatsDetail() {
    const root = qs('coachStatsRoot');
    if (!root) return;
    const user = state.user || (await fetchCurrentUser());
    if (!user) return;
    if (user.role !== 'coach') {
      root.innerHTML = `
        <section class="card">
          <h2>指導者専用ページです</h2>
          <p class="small">このページは指導者ロールのホーム詳細確認用です。</p>
        </section>
      `;
      return;
    }

    await refreshData();
    const { teamSummary, rankings, playerSummaries, big3 } = state.dashboard;
    root.innerHTML = `
      <section class="card role-hero">
        <div class="hero-kicker">指導者専用</div>
        <h2>ホーム詳細</h2>
        <p class="small">ホームで省略している成績の詳細を確認できます。</p>
        <div class="actions single-action">
          <a class="button button-secondary" href="index.html">ホームへ戻る</a>
        </div>
      </section>
      <div id="team-summary">${buildTeamSummaryCard(teamSummary)}</div>
      <div id="team-overview">${buildPlayerSummaryTable(playerSummaries)}</div>
      <div id="personal-summary">${buildCoachPlayerSummaryCards(playerSummaries)}</div>
      <div id="player-ranking">${buildRankingCard(rankings)}</div>
      <div id="big3-ranking">${buildBig3RankingCard(big3)}</div>
    `;
    bindBig3Tabs();
  }

  async function renderPlayerHomeDetail() {
    const root = qs('playerHomeDetailRoot');
    if (!root) return;
    const user = state.user || (await fetchCurrentUser());
    if (!user) return;
    if (user.role !== 'player') {
      root.innerHTML = `
        <section class="card">
          <h2>選手専用ページです</h2>
          <p class="small">このページは選手ロールのホーム詳細確認用です。</p>
        </section>
      `;
      return;
    }

    await refreshData();
    const { rankings, big3 } = state.dashboard;
    root.innerHTML = `
      <section class="card role-hero">
        <div class="hero-kicker">選手向け</div>
        <h2>ホーム詳細</h2>
        <p class="small">ホームで省略している順位・記録を確認できます。</p>
        <div class="actions single-action">
          <a class="button button-secondary" href="index.html">ホームへ戻る</a>
        </div>
      </section>
      <div id="player-ranking">${buildRankingCard(rankings, { highlightUserId: user.id })}</div>
      <div id="big3-ranking">${buildBig3RankingCard(big3, { highlightUserId: user.id })}</div>
    `;
    bindBig3Tabs();
  }

  function bindLogin() {
    const loginForm = qs('loginForm');
    const registerForm = qs('registerForm');
    const authTabs = Array.from(document.querySelectorAll('[data-auth-tab]'));
    const authPanels = Array.from(document.querySelectorAll('[data-auth-panel]'));
    if (!loginForm || !registerForm || authTabs.length === 0 || authPanels.length === 0) return;
    const message = qs('authMessage');
    const registerRole = qs('registerRole');
    const registerGradeRow = qs('registerGradeRow');
    const registerGrade = qs('registerGrade');

    function syncRegisterGradeField(role = '') {
      const isPlayer = role === 'player';
      if (registerGradeRow) registerGradeRow.hidden = !isPlayer;
      if (registerGrade) {
        registerGrade.disabled = !isPlayer;
        if (!isPlayer) registerGrade.value = '';
      }
    }

    function setAuthView(activeTab) {
      authTabs.forEach((tabButton) => {
        const isActive = tabButton.dataset.authTab === activeTab;
        tabButton.classList.toggle('active', isActive);
        tabButton.setAttribute('aria-selected', String(isActive));
        tabButton.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      authPanels.forEach((panel) => {
        const isActive = panel.dataset.authPanel === activeTab;
        panel.classList.toggle('active', isActive);
        panel.classList.toggle('hidden', !isActive);
        panel.hidden = !isActive;
        panel.setAttribute('aria-hidden', String(!isActive));
      });

      message.textContent = '';
    }

    authTabs.forEach((button) => {
      button.addEventListener('click', () => {
        setAuthView(button.dataset.authTab || 'login');
      });
    });

    setAuthView('login');
    syncRegisterGradeField(registerRole?.value || '');
    registerRole?.addEventListener('change', (event) => {
      syncRegisterGradeField(event.target.value || '');
    });

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      message.textContent = 'ログイン中です...';
      try {
        const payload = await api('/api/login', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
          }),
        });
        state.user = payload.user;
        window.location.href = 'index.html';
      } catch (error) {
        message.textContent = error.message;
      }
    });

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);
      if (formData.get('password') !== formData.get('passwordConfirm')) {
        message.textContent = '確認用パスワードが一致しません。';
        return;
      }
      message.textContent = '登録中です...';
      try {
        const payload = await api('/api/register', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
            grade: formData.get('role') === 'player' ? formData.get('grade') : '',
          }),
        });
        state.user = payload.user;
        window.location.href = 'index.html';
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  async function enforceSessionAccess() {
    if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/login.html') {
      const user = await fetchCurrentUser();
      if (user) window.location.href = 'index.html';
      return true;
    }
    const user = await fetchCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    const requiredRole = document.body.dataset.rolePage;
    if (requiredRole && user.role !== requiredRole) {
      window.location.href = 'index.html';
      return false;
    }
    if (document.body.dataset.page === 'prepare' && user.role !== 'manager') {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const ok = await enforceSessionAccess();
    if (!ok) return;
    await setupNav();
    bindLogin();
    await renderSettings();
    await renderHome();
    await renderGames();
    await renderGameDetail();
    await renderInputWorkspace();
    await renderRoleWorkspace();
    await renderDiary();
    await renderConditionCheck();
    await renderCoachCondition();
    await renderPlayerDetail();
    await renderCoachStatsDetail();
    await renderPlayerHomeDetail();
    await renderMeetingHistory();
    await renderPrepare();
    await renderConditionPage();
  });
})();
