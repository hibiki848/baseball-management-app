(function (globalScope) {
  const PITCH_TYPE_OPTIONS = Object.freeze([
    Object.freeze({ key: 'straight', label: 'ストレート' }),
    Object.freeze({ key: 'twoSeam', label: 'ツーシーム' }),
    Object.freeze({ key: 'cutter', label: 'カットボール' }),
    Object.freeze({ key: 'slider', label: 'スライダー' }),
    Object.freeze({ key: 'curve', label: 'カーブ' }),
    Object.freeze({ key: 'fork', label: 'フォーク' }),
    Object.freeze({ key: 'changeup', label: 'チェンジアップ' }),
    Object.freeze({ key: 'shoot', label: 'シュート' }),
    Object.freeze({ key: 'sinker', label: 'シンカー' }),
    Object.freeze({ key: 'other', label: 'その他' }),
    Object.freeze({ key: 'unknown', label: '不明' }),
  ]);

  const BATTED_BALL_TYPE_OPTIONS = Object.freeze([
    Object.freeze({ key: 'ground', label: 'ゴロ' }),
    Object.freeze({ key: 'fly', label: 'フライ' }),
    Object.freeze({ key: 'liner', label: 'ライナー' }),
    Object.freeze({ key: 'popup', label: 'ポップフライ' }),
    Object.freeze({ key: 'foulFly', label: 'ファウルフライ' }),
  ]);

  const pitchTypeAliases = Object.freeze({
    straight: 'straight',
    fastball: 'straight',
    fourseam: 'straight',
    fourSeam: 'straight',
    twoSeam: 'twoSeam',
    twoseam: 'twoSeam',
    sinkerfastball: 'twoSeam',
    cutter: 'cutter',
    cut: 'cutter',
    slider: 'slider',
    sl: 'slider',
    curve: 'curve',
    curveball: 'curve',
    cb: 'curve',
    fork: 'fork',
    forkball: 'fork',
    splitter: 'fork',
    split: 'fork',
    changeup: 'changeup',
    changeUp: 'changeup',
    change: 'changeup',
    ch: 'changeup',
    shoot: 'shoot',
    shuuto: 'shoot',
    sinker: 'sinker',
    other: 'other',
    unknown: 'unknown',
    misc: 'other',
    unclassified: 'unknown',
  });

  const battedBallTypeAliases = Object.freeze({
    ground: 'ground',
    grounder: 'ground',
    gb: 'ground',
    fly: 'fly',
    flyball: 'fly',
    fb: 'fly',
    liner: 'liner',
    line: 'liner',
    linedrive: 'liner',
    ld: 'liner',
    popup: 'popup',
    pop: 'popup',
    popfly: 'popup',
    foulFly: 'foulFly',
    foulfly: 'foulFly',
    foul: 'foulFly',
    ff: 'foulFly',
  });

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toCount(value) {
    return Math.max(0, toNumber(value, 0));
  }

  function emptyPitchingBattedBallProfile() {
    return PITCH_TYPE_OPTIONS.reduce((profile, pitchType) => {
      profile[pitchType.key] = BATTED_BALL_TYPE_OPTIONS.reduce((counts, battedBallType) => {
        counts[battedBallType.key] = 0;
        return counts;
      }, {});
      return profile;
    }, {});
  }

  function normalizePitchTypeKey(value) {
    const normalized = String(value || '').replace(/[^a-zA-Z]/g, '');
    return pitchTypeAliases[normalized] || null;
  }

  function normalizeBattedBallTypeKey(value) {
    const normalized = String(value || '').replace(/[^a-zA-Z]/g, '');
    return battedBallTypeAliases[normalized] || null;
  }

  function normalizePitchingBattedBallProfile(input = {}) {
    const base = emptyPitchingBattedBallProfile();
    if (!input || typeof input !== 'object') return base;

    Object.entries(input).forEach(([pitchTypeKey, counts]) => {
      const normalizedPitchType = normalizePitchTypeKey(pitchTypeKey) || (base[pitchTypeKey] ? pitchTypeKey : null);
      if (!normalizedPitchType || !counts || typeof counts !== 'object') return;
      Object.entries(counts).forEach(([battedBallTypeKey, value]) => {
        const normalizedBattedBallType = normalizeBattedBallTypeKey(battedBallTypeKey) || (base[normalizedPitchType][battedBallTypeKey] != null ? battedBallTypeKey : null);
        if (!normalizedBattedBallType) return;
        base[normalizedPitchType][normalizedBattedBallType] = toCount(value);
      });
    });

    return base;
  }

  function sumProfileCounts(profile, battedBallTypeKey) {
    return PITCH_TYPE_OPTIONS.reduce((sum, pitchType) => sum + toCount(profile[pitchType.key] && profile[pitchType.key][battedBallTypeKey]), 0);
  }

  function mergeLegacyGroundFly(profileInput, legacyGroundOuts, legacyFlyOuts) {
    const profile = normalizePitchingBattedBallProfile(profileInput);
    const groundDiff = Math.max(0, toCount(legacyGroundOuts) - sumProfileCounts(profile, 'ground'));
    const flyDiff = Math.max(0, toCount(legacyFlyOuts) - sumProfileCounts(profile, 'fly'));
    if (groundDiff > 0) profile.unknown.ground += groundDiff;
    if (flyDiff > 0) profile.unknown.fly += flyDiff;
    return profile;
  }

  function summarizePitchingBattedBallProfile(profileInput = {}, legacyGroundOuts = 0, legacyFlyOuts = 0) {
    const profile = mergeLegacyGroundFly(profileInput, legacyGroundOuts, legacyFlyOuts);
    const rows = PITCH_TYPE_OPTIONS.map((pitchType) => {
      const counts = profile[pitchType.key] || {};
      const groundCount = toCount(counts.ground);
      const flyCount = toCount(counts.fly);
      const totalCount = BATTED_BALL_TYPE_OPTIONS.reduce((sum, battedBallType) => sum + toCount(counts[battedBallType.key]), 0);
      return {
        key: pitchType.key,
        label: pitchType.label,
        groundCount,
        flyCount,
        totalCount,
        groundRate: totalCount ? groundCount / totalCount : 0,
        flyRate: totalCount ? flyCount / totalCount : 0,
        counts: { ...counts },
      };
    });
    return {
      profile,
      rows,
      totals: {
        groundCount: rows.reduce((sum, row) => sum + row.groundCount, 0),
        flyCount: rows.reduce((sum, row) => sum + row.flyCount, 0),
        totalCount: rows.reduce((sum, row) => sum + row.totalCount, 0),
      },
    };
  }

  function applyPitchingBattedBallBreakdown(rawInput = {}) {
    const breakdownInput = rawInput.pitchingBattedBallProfile || rawInput.battedBallProfile || {};
    const summary = summarizePitchingBattedBallProfile(breakdownInput, rawInput.groundOuts, rawInput.flyOuts);
    return {
      ...rawInput,
      groundOuts: summary.totals.groundCount,
      flyOuts: summary.totals.flyCount,
      pitchingBattedBallProfile: summary.profile,
    };
  }

  function extractBreakdownToken(token, profile) {
    const dotMatch = String(token || '').match(/^battedBall\.([A-Za-z]+)\.([A-Za-z]+)=(.+)$/);
    if (dotMatch) {
      const pitchTypeKey = normalizePitchTypeKey(dotMatch[1]);
      const battedBallTypeKey = normalizeBattedBallTypeKey(dotMatch[2]);
      if (pitchTypeKey && battedBallTypeKey) {
        profile[pitchTypeKey][battedBallTypeKey] = toCount(dotMatch[3]);
        return true;
      }
    }

    const compactMatch = String(token || '').match(/^([A-Za-z]+)(Ground|Fly|Liner|Popup|FoulFly)=(.+)$/);
    if (compactMatch) {
      const pitchTypeKey = normalizePitchTypeKey(compactMatch[1]);
      const battedBallTypeKey = normalizeBattedBallTypeKey(compactMatch[2]);
      if (pitchTypeKey && battedBallTypeKey) {
        profile[pitchTypeKey][battedBallTypeKey] = toCount(compactMatch[3]);
        return true;
      }
    }

    return false;
  }

  const PERFORMANCE_SUMMARY_BUCKETS = Object.freeze([
    Object.freeze({ key: 'game', label: '試合成績', gameTypes: Object.freeze(['official', 'practice']) }),
    Object.freeze({ key: 'practice', label: '練習成績', gameTypes: Object.freeze(['intrasquad']) }),
  ]);

  const performanceSummaryBucketByGameType = Object.freeze(
    PERFORMANCE_SUMMARY_BUCKETS.reduce((bucketMap, bucket) => {
      bucket.gameTypes.forEach((gameType) => {
        bucketMap[gameType] = bucket.key;
      });
      return bucketMap;
    }, {}),
  );

  function getPerformanceSummaryBucketForGameType(gameType) {
    return performanceSummaryBucketByGameType[String(gameType || '').trim()] || 'game';
  }

  function getPerformanceSummaryBucketLabel(bucketKey) {
    const bucket = PERFORMANCE_SUMMARY_BUCKETS.find((item) => item.key === bucketKey);
    return bucket ? bucket.label : bucketKey;
  }

  const stats = Object.freeze({
    PITCH_TYPE_OPTIONS,
    BATTED_BALL_TYPE_OPTIONS,
    PERFORMANCE_SUMMARY_BUCKETS,
    toCount,
    normalizePitchTypeKey,
    normalizeBattedBallTypeKey,
    emptyPitchingBattedBallProfile,
    normalizePitchingBattedBallProfile,
    summarizePitchingBattedBallProfile,
    applyPitchingBattedBallBreakdown,
    extractBreakdownToken,
    getPerformanceSummaryBucketForGameType,
    getPerformanceSummaryBucketLabel,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = stats;
  }
  globalScope.AppStats = stats;
})(typeof globalThis !== 'undefined' ? globalThis : window);
