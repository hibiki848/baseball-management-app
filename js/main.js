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

  function getGameTypeLabel(gameType) {
    return gameTypeLabels[gameType] || '未設定';
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

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeDiaryTags(value) {
    const source = Array.isArray(value)
      ? value
      : String(value || '')
          .split(/[,\n、]/)
          .map((item) => item.trim());
    return [...new Set(source.map((item) => String(item || '').trim()).filter(Boolean))];
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

  function bindDiaryNoteListActions(container) {
    if (!container) return;

    container.querySelectorAll('[data-diary-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const noteId = Number(button.dataset.diaryEdit);
        const targetNote = state.diaryNotes.find((note) => note.id === noteId);
        if (!targetNote) return;
        state.diaryEditingNoteId = noteId;
        state.diarySelectedDate = targetNote.entryDate;
        state.diaryCalendarMonth = targetNote.entryDate.slice(0, 7);
        renderDiary({ reload: false }).then(() => {
          qs('diaryBody')?.focus();
        });
      });
    });

    container.querySelectorAll('[data-diary-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const noteId = Number(button.dataset.diaryDelete);
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
    });
  }

  function updateDiaryNoteList() {
    const container = qs('diaryNoteListSection');
    if (!container) return;
    container.innerHTML = buildDiaryNoteList(getFilteredDiaryNotes());
    bindDiaryNoteListActions(container);
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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

  function getRoleLabel(role) {
    return AppRoles.getRoleLabel(role);
  }

  async function setupNav() {
    const user = state.user || (await fetchCurrentUser());
    const nav = document.querySelector('.bottom-nav');
    if (!nav || !user) return;
    const current = document.body.dataset.page;
    const rolePage = document.body.dataset.rolePage;
    const defaultInputHref = user.role === 'coach' ? 'coach.html' : 'condition.html';
    const defaultInputPage = user.role === 'coach' ? 'coach' : 'condition';
    const inputHref = rolePage && ['coach', 'manager', 'player'].includes(rolePage)
      ? `${rolePage}.html`
      : defaultInputHref;
    const inputPage = rolePage && ['coach', 'manager', 'player'].includes(rolePage)
      ? rolePage
      : defaultInputPage;
    const inputLabel = user.role === 'coach' ? '確認' : '入力';
    const links = [
      { href: 'index.html', page: 'home', label: 'ホーム' },
      { href: 'games.html', page: 'games', label: '試合' },
      { href: inputHref, page: inputPage, label: inputLabel },
    ];
    if (user.role === 'player') {
      links.push({ href: 'diary.html', page: 'diary', label: '野球日誌' });
    }
    links.push({ href: 'settings.html', page: 'settings', label: '設定' });

    nav.innerHTML = links.map((link) => `
      <a href="${link.href}" data-page="${link.page}" class="${link.page === current ? 'active' : ''}">${link.label}</a>
    `).join('');

    document.querySelectorAll('.bottom-nav a').forEach((link) => {
      if (link.dataset.page === current) {
        link.classList.add('active');
      }
    });
  }

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

  function buildBig3RankingCard(big3) {
    const tabs = [
      { key: 'benchPress', label: 'ベンチ' },
      { key: 'squat', label: 'スクワット' },
      { key: 'deadlift', label: 'デッド' },
      { key: 'total', label: '合計' },
    ];
    const activeKey = big3 && big3.rankings && big3.rankings[state.activeBig3Tab] ? state.activeBig3Tab : 'benchPress';
    const activeRanking = (big3 && big3.rankings && big3.rankings[activeKey]) || { label: 'ベンチプレス', entries: [] };
    const visibleEntries = activeRanking.entries.slice(0, Number(big3 && big3.leaderboardLimit) || 5);

    return `
      <section class="card">
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
            <article class="big3-rank-item ${entry.isLeader ? 'is-leader' : ''}">
              <div class="big3-rank-main">
                <div class="big3-rank-place">${entry.isLeader ? '👑 ' : ''}${entry.rank}位</div>
                <div>
                  <strong>${escapeHtml(entry.userName)}</strong>
                  <div class="meta">更新日: ${escapeHtml(String(entry.updatedAt || '').slice(0, 10) || '未設定')}</div>
                </div>
              </div>
              <div class="big3-rank-weight">${escapeHtml(fmtKg(entry.weight))}</div>
            </article>
          `).join('')}
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

  function buildRankingCard(rankings) {
    return `
      <section class="card">
        <h2>個人成績ランキング</h2>
        ${rankings.length === 0 ? '<div class="small">ランキング対象データがありません。</div>' : rankings.map((player, index) => `
          <div class="list-item">
            <strong>${index + 1}位 ${escapeHtml(player.name)}</strong>
            <div class="meta">OPS ${fmt3(player.ops)} / 打率 ${fmt3(player.battingAverage)} / 打点 ${player.runsBattedIn} / 奪三振 ${player.strikeouts} / 防御率 ${fmt3(player.era)}</div>
          </div>
        `).join('')}
      </section>
    `;
  }

  function buildPlayerSummaryTable(playerSummaries) {
    return `
      <section class="card">
        <h2>チーム全体の成績確認</h2>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>選手</th><th>打率</th><th>OPS</th><th>打点</th><th>防御率</th><th>WHIP</th></tr></thead>
            <tbody>
              ${playerSummaries.map(({ player, summary }) => `
                <tr>
                  <td>${escapeHtml(player.name)}</td>
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
    const actionLabel = user.role === 'manager' ? '入力専用ページ' : user.role === 'player' ? '自分の入力ページ' : '監督ビュー';
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
    state.diaryNotes = payload.notes || [];
  }

  async function renderHome() {
    const root = qs('homeRoot');
    if (!root) return;
    await refreshData();
    const { user, recentGame, teamSummary, personalSummary, rankings, playerSummaries, big3 } = state.dashboard;
    const sections = [buildRoleHero(user)];
    if (user.role === 'player') {
      sections.push(buildPersonalGoalCard(user));
    }
    sections.push(buildRecentGameCard(recentGame), buildBig3RankingCard(big3));
    if (user.role !== 'manager') sections.push(buildPersonalSummaryCard(personalSummary, user));
    sections.push(buildTeamSummaryCard(teamSummary));
    if (user.role === 'manager' || user.role === 'coach') {
      sections.push(buildPlayerSummaryTable(playerSummaries));
    }
    sections.push(buildRankingCard(rankings));
    root.innerHTML = sections.join('');
    bindBig3Tabs();
    bindGroundFlyToggles(root);
    bindPersonalGoalForm();
    bindManualForm();
    bindScorebookForm();
    if (state.scorebookUpload) renderScorebookPreview(state.scorebookUpload);
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
      blocks.push(buildTeamSummaryCard(state.dashboard.teamSummary));
      blocks.push(buildPlayerSummaryTable(state.dashboard.playerSummaries));
      blocks.push(buildRankingCard(state.dashboard.rankings));
    }
    root.innerHTML = blocks.join('');
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
          <p class="small">監督アカウントでは成績入力を行えません。ホームまたは確認画面から集計結果をご確認ください。</p>
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
                <strong>${escapeHtml(formatDiaryDateLabel(note.entryDate))}</strong>
                <div class="meta">更新: ${escapeHtml(String(note.updatedAt || '').replace('T', ' ').slice(0, 16) || '未更新')}</div>
              </div>
              <div class="diary-note-actions">
                <button type="button" class="button-secondary" data-diary-edit="${note.id}">編集</button>
                <button type="button" class="button-danger" data-diary-delete="${note.id}">削除</button>
              </div>
            </div>
            <p class="diary-note-body">${escapeHtml(formatDiaryExcerpt(note.body, 140))}</p>
            <div class="tag-list">
              ${(note.tags || []).length ? note.tags.map((tag) => `<span class="tag-chip">#${escapeHtml(tag)}</span>`).join('') : '<span class="small">タグなし</span>'}
            </div>
            <div class="diary-feedback-grid">
              <div class="diary-feedback-block">
                <div class="stat-label">監督コメント</div>
                ${(note.coachComments || []).length
                  ? (note.coachComments || []).map((comment) => `<div class="meta">${escapeHtml(comment.author || '監督')}: ${escapeHtml(comment.body || '')}</div>`).join('')
                  : '<div class="small">まだコメントはありません。</div>'}
              </div>
              <div class="diary-feedback-block">
                <div class="stat-label">スタンプ</div>
                ${(note.coachStamps || []).length
                  ? `<div class="stamp-list">${(note.coachStamps || []).map((stamp) => `<span class="stamp-chip">${escapeHtml(stamp.label || stamp)}</span>`).join('')}</div>`
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
          <p class="small">監督・マネージャーでは利用できません。ホームに戻って他の機能をご利用ください。</p>
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
    const filteredNotes = getFilteredDiaryNotes();
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
            <div class="small">カンマ区切りで複数タグを設定できます。</div>
          </div>
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
      <div id="diaryNoteListSection">
        ${buildDiaryNoteList(filteredNotes)}
      </div>
    `;

    const form = qs('diaryForm');
    const message = qs('diaryFormMessage');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        entryDate: form.entryDate.value,
        body: form.body.value,
        tags: normalizeDiaryTags(form.tags.value),
      };
      const noteId = Number(form.noteId.value);
      message.className = 'small';
      message.textContent = '保存中です...';
      try {
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

    const diarySearchInput = qs('diarySearch');
    const applyDiarySearch = (nextValue) => {
      state.diarySearchQuery = nextValue;
      updateDiaryNoteList();
    };

    diarySearchInput?.addEventListener('compositionstart', () => {
      state.diarySearchComposing = true;
    });

    diarySearchInput?.addEventListener('compositionend', (event) => {
      state.diarySearchComposing = false;
      applyDiarySearch(event.target.value);
    });

    diarySearchInput?.addEventListener('input', (event) => {
      if (state.diarySearchComposing) return;
      applyDiarySearch(event.target.value);
    });

    qs('diarySortOrder')?.addEventListener('change', (event) => {
      state.diarySortOrder = event.target.value || 'desc';
      updateDiaryNoteList();
    });

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

    qs('diaryClearDateBtn')?.addEventListener('click', () => {
      state.diarySelectedDate = '';
      renderDiary({ reload: false });
    });

    bindDiaryNoteListActions(qs('diaryNoteListSection'));
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
    ['profileForm', 'emailForm', 'passwordForm'].forEach((id) => {
      const form = qs(id);
      if (form) {
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const messageId = id === 'profileForm' ? 'profileMessage' : id === 'emailForm' ? 'emailMessage' : 'passwordMessage';
          qs(messageId).className = 'small success-text';
          qs(messageId).textContent = '現在のサンプル実装ではプレビューのみ対応しています。';
        });
      }
    });
  }

  function bindLogin() {
    const loginForm = qs('loginForm');
    const registerForm = qs('registerForm');
    const authTabs = Array.from(document.querySelectorAll('[data-auth-tab]'));
    const authPanels = Array.from(document.querySelectorAll('[data-auth-panel]'));
    if (!loginForm || !registerForm || authTabs.length === 0 || authPanels.length === 0) return;
    const message = qs('authMessage');

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
  });
})();
