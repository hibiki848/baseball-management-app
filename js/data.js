window.AppData = {
  currentUser: { name: '山田 太郎', role: '監督', team: 'Tokyo Falcons', email: 'coach@example.com' },
  players: [
    { id: 1, name: '山田 太郎', number: 1, pos: '内野手', throwsBats: '右投右打', age: 28, batting: { pa: 90, ab: 80, hits: 28, doubles: 6, triples: 1, hr: 3, rbi: 18, so: 14, bb: 8, hbp: 1, sh: 1, sf: 2 }, pitching: { ip: 0, er: 0, h: 0, bb: 0, so: 0 }, conditions: [
      { date: '2026-03-15', fatigue: 2, health: 4, weight: 74.2 }, { date: '2026-03-14', fatigue: 3, health: 3, weight: 74.5 }
    ] },
    { id: 2, name: '佐藤 健', number: 18, pos: '投手', throwsBats: '右投左打', age: 25, batting: { pa: 12, ab: 10, hits: 1, doubles: 0, triples: 0, hr: 0, rbi: 0, so: 5, bb: 1, hbp: 0, sh: 1, sf: 0 }, pitching: { ip: 45.2, er: 14, h: 39, bb: 15, so: 52, hr: 4, runs: 17, pitchesAvg: 86 }, conditions: [
      { date: '2026-03-15', fatigue: 3, health: 4, weight: 80.1 }, { date: '2026-03-14', fatigue: 2, health: 5, weight: 79.8 }
    ] },
    { id: 3, name: '高橋 翔', number: 7, pos: '外野手', throwsBats: '左投左打', age: 23, batting: { pa: 70, ab: 61, hits: 19, doubles: 3, triples: 2, hr: 2, rbi: 10, so: 11, bb: 6, hbp: 2, sh: 0, sf: 1 }, pitching: { ip: 0, er: 0, h: 0, bb: 0, so: 0 }, conditions: [
      { date: '2026-03-15', fatigue: 1, health: 5, weight: 69.3 }
    ] }
  ],
  games: [
    { id: 101, date: '2026-03-14', opponent: 'Yokohama Waves', type: '公式戦', result: '勝ち', score: '5-3', battingRecords: [
      { batter: '山田 太郎', order: 1, pitcherHand: '右', pitchType: 'ストレート', course: '内角高め', result: '安打', direction: '中堅' },
      { batter: '高橋 翔', order: 3, pitcherHand: '左', pitchType: 'スライダー', course: '外角低め', result: '三振', direction: '---' }
    ], pitchingRecords: [
      { pitcher: '佐藤 健', inning: '1-6', batters: 25, pitches: 94, h: 6, so: 8, bb: 2, hbp: 0, r: 2, er: 2, maxV: 148, avgV: 143 }
    ] },
    { id: 102, date: '2026-03-10', opponent: 'Chiba Stars', type: '練習試合', result: '負け', score: '2-6', battingRecords: [], pitchingRecords: [] }
  ],
  monthlyTrend: [
    { month: '1月', avg: 0.262, obp: 0.322, slg: 0.381, era: 3.92 },
    { month: '2月', avg: 0.278, obp: 0.339, slg: 0.401, era: 3.55 },
    { month: '3月', avg: 0.301, obp: 0.362, slg: 0.435, era: 3.22 }
  ],
  velocityTrend: [
    { game: '3/01', max: 147, avg: 142 },
    { game: '3/08', max: 149, avg: 143 },
    { game: '3/14', max: 148, avg: 143 }
  ],
  notifications: ['3/15 体調未入力: 4名', '3/14 打席記録未入力: 2試合'],
};
