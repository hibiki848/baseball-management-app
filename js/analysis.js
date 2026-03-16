window.Analysis = {
  toFixed3(v) {
    return Number.isFinite(v) ? v.toFixed(3) : '0.000';
  },
  batting(b) {
    const singles = b.hits - b.doubles - b.triples - b.hr;
    const totalBases = singles + b.doubles * 2 + b.triples * 3 + b.hr * 4;
    const avg = b.ab ? b.hits / b.ab : 0;
    const obpDen = b.ab + b.bb + b.hbp + b.sf;
    const obp = obpDen ? (b.hits + b.bb + b.hbp) / obpDen : 0;
    const slg = b.ab ? totalBases / b.ab : 0;
    const ops = obp + slg;
    return { avg, obp, slg, ops, totalBases };
  },
  pitching(p) {
    const era = p.ip ? (p.er * 9) / p.ip : 0;
    const whip = p.ip ? (p.h + p.bb) / p.ip : 0;
    return { era, whip };
  },
  team(players) {
    const sum = players.reduce((acc, pl) => {
      const b = pl.batting;
      const p = pl.pitching;
      acc.ab += b.ab; acc.hits += b.hits; acc.bb += b.bb; acc.hbp += b.hbp; acc.sf += b.sf;
      acc.tb += (b.hits - b.doubles - b.triples - b.hr) + b.doubles * 2 + b.triples * 3 + b.hr * 4;
      acc.so += b.so;
      acc.pa += b.pa;
      acc.ip += p.ip || 0; acc.er += p.er || 0; acc.runs += p.runs || 0; acc.ph += p.h || 0; acc.pbb += p.bb || 0; acc.pso += p.so || 0;
      return acc;
    }, { ab: 0, hits: 0, bb: 0, hbp: 0, sf: 0, tb: 0, so: 0, pa: 0, ip: 0, er: 0, runs: 0, ph: 0, pbb: 0, pso: 0 });

    const avg = sum.ab ? sum.hits / sum.ab : 0;
    const obp = (sum.ab + sum.bb + sum.hbp + sum.sf) ? (sum.hits + sum.bb + sum.hbp) / (sum.ab + sum.bb + sum.hbp + sum.sf) : 0;
    const slg = sum.ab ? sum.tb / sum.ab : 0;
    const ops = obp + slg;
    const soRate = sum.pa ? sum.so / sum.pa : 0;
    const bbRate = sum.pa ? sum.bb / sum.pa : 0;
    const era = sum.ip ? (sum.er * 9) / sum.ip : 0;
    const kRate = sum.ip ? (sum.pso * 9) / sum.ip : 0;
    const hRate = sum.ip ? (sum.ph * 9) / sum.ip : 0;
    return { avg, obp, slg, ops, runs: sum.runs, soRate, bbRate, era, totalRuns: sum.runs, totalEr: sum.er, kRate, hRate };
  }
};
