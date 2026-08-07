/* ============================================================
   BACKTEST Y CALIBRACIÓN
   Una sola llamada (todos los partidos de una temporada) basta para
   reconstruir el modelo partido a partido y medir si acierta.
   ============================================================ */

/** Convierte la respuesta de /fixtures en una lista ordenada y mínima. */
function leagueDataset(fixtures) {
  return (fixtures || [])
    .filter((f) => f && f.fixture && f.teams?.home?.id && f.teams?.away?.id &&
      DONE_STATES.includes(f.fixture?.status?.short) &&
      f.goals?.home !== null && f.goals?.home !== undefined &&
      f.goals?.away !== null && f.goals?.away !== undefined)
    .map((f) => ({
      t: new Date(f.fixture.date).getTime(),
      h: f.teams.home.id, a: f.teams.away.id,
      hn: f.teams.home.name, an: f.teams.away.name,
      gh: num(f.goals.home), ga: num(f.goals.away),
      date: f.fixture.date, id: f.fixture.id, ref: f.fixture.referee || null,
    }))
    .sort((x, y) => x.t - y.t);
}

const blankTeam = () => ({ m: [], gfH: 0, gaH: 0, pH: 0, gfA: 0, gaA: 0, pA: 0 });
const teamRate = (s, lgAll) => {
  const p = s.pH + s.pA;
  if (!p) return { atk: 1, def: 1 };
  return { atk: (s.gfH + s.gfA) / p / lgAll, def: (s.gaH + s.gaA) / p / lgAll };
};

/** Fuerzas de un equipo con la información disponible hasta ese momento. */
function strengthsAt(s, side, t, lgH, lgA, P, state, useRest) {
  const lgAll = (lgH + lgA) / 2;
  const p = side === "home" ? s.pH : s.pA;
  const gf = side === "home" ? s.gfH : s.gfA;
  const ga = side === "home" ? s.gaH : s.gaA;
  const baseF = side === "home" ? lgH : lgA;
  const baseA = side === "home" ? lgA : lgH;
  const pT = s.pH + s.pA;
  const atkT = (s.gfH + s.gfA) / pT / lgAll;
  const defT = (s.gaH + s.gaA) / pT / lgAll;
  const w = p / (p + 6);
  const sAtk = geoBlend(p ? gf / p / baseF : atkT, atkT, w);
  const sDef = geoBlend(p ? ga / p / baseA : defT, defT, w);

  // forma reciente, con decaimiento y ajuste por la calidad del rival
  let wf = 0, wa = 0, wbf = 0, wba = 0, used = 0;
  for (const g of s.m) {
    const days = (t - g.t) / 86400000;
    if (days < 0 || days > 400) continue;
    const w2 = Math.pow(0.5, days / P.halfLife);
    const o = state.get(g.opp);
    const or = o && o.pH + o.pA > 2 ? teamRate(o, lgAll) : { atk: 1, def: 1 };
    wf += w2 * g.gf;
    wa += w2 * g.ga;
    wbf += w2 * (g.home ? lgH : lgA) * clamp(or.def, 0.45, 2.2);
    wba += w2 * (g.home ? lgA : lgH) * clamp(or.atk, 0.45, 2.2);
    used++;
  }
  const fAtk = used >= 3 ? wf / Math.max(0.02, wbf) : null;
  const fDef = used >= 3 ? wa / Math.max(0.02, wba) : null;

  const nEff = pT * 0.7 + used * 0.5;
  let atk = clamp(shrink(fAtk === null ? sAtk : geoBlend(fAtk, sAtk, P.wForm), nEff, P.k), 0.35, 2.6);
  let def = clamp(shrink(fDef === null ? sDef : geoBlend(fDef, sDef, P.wForm), nEff, P.k), 0.35, 2.6);

  if (useRest && s.m.length) {
    const last = Math.max(...s.m.map((g) => g.t));
    const days = (t - last) / 86400000;
    const n14 = s.m.filter((g) => t - g.t <= 14 * 86400000).length;
    let f = 1;
    if (days <= 2) f *= 0.93; else if (days <= 3) f *= 0.97; else if (days >= 8) f *= 1.01;
    if (n14 >= 4) f *= 0.96; else if (n14 === 3) f *= 0.985;
    f = clamp(f, 0.87, 1.03);
    atk *= f; def *= 1 + (1 - f) * 0.6;
  }
  return { atk, def };
}

/** Recorre la temporada en orden y predice cada partido solo con el pasado. */
function runPredictions(list, P, useRest = true) {
  const PRI = P.priorLg || { h: 1.45, a: 1.15, w: 25 };
  const state = new Map();
  let sumH = 0, sumA = 0, n = 0;
  const out = [];
  for (const m of list) {
    // Media de liga encogida hacia un previo: en las primeras jornadas
    // dos goleadas no pueden mover la referencia de toda la competición.
    // El previo puede venir de la temporada anterior.
    const lgH = (sumH + PRI.w * PRI.h) / (n + PRI.w);
    const lgA = (sumA + PRI.w * PRI.a) / (n + PRI.w);
    const H = state.get(m.h), A = state.get(m.a);
    if (H && A && H.pH + H.pA >= P.minGames && A.pH + A.pA >= P.minGames && n >= 20) {
      const sh = strengthsAt(H, "home", m.t, lgH, lgA, P, state, useRest);
      const sa = strengthsAt(A, "away", m.t, lgH, lgA, P, state, useRest);
      out.push({
        lh: clamp(lgH * sh.atk * sa.def, 0.15, 5),
        la: clamp(lgA * sa.atk * sh.def, 0.15, 5),
        gh: m.gh, ga: m.ga, date: m.date, hn: m.hn, an: m.an,
      });
    }
    if (!state.has(m.h)) state.set(m.h, blankTeam());
    if (!state.has(m.a)) state.set(m.a, blankTeam());
    const sH = state.get(m.h), sA = state.get(m.a);
    sH.gfH += m.gh; sH.gaH += m.ga; sH.pH++;
    sA.gfA += m.ga; sA.gaA += m.gh; sA.pA++;
    sH.m.push({ t: m.t, gf: m.gh, ga: m.ga, home: true, opp: m.a });
    sA.m.push({ t: m.t, gf: m.ga, ga: m.gh, home: false, opp: m.h });
    sumH += m.gh; sumA += m.ga; n++;
  }
  return out;
}

/** Núcleo de puntuación: recibe probabilidades ya calculadas.
    Añade RPS (que respeta el orden local-empate-visitante), intervalos
    por remuestreo y desglose por tipo de partido. */
function scoreFromProbs(items) {
  if (!items.length) return null;
  const bins = Array.from({ length: 10 }, () => ({ p: 0, k: 0, n: 0 }));
  let ll = 0, brier = 0, hits = 0, rpsT = 0, llO = 0, brO = 0, brB = 0, llB = 0;
  let baseH = 0, baseD = 0, baseA = 0;
  const rows = [], lls = [], rpss = [];
  for (const q of items) {
    const ps = q.ps;
    const res = q.gh > q.ga ? 0 : q.gh === q.ga ? 1 : 2;
    const li = -Math.log(Math.max(1e-12, ps[res]));
    const ri = rps(ps, res);
    const acierto = ps.indexOf(Math.max(...ps)) === res;
    ll += li; rpsT += ri; lls.push(li); rpss.push(ri);
    brier += ps.reduce((s, v, i) => s + (v - (i === res ? 1 : 0)) ** 2, 0);
    if (acierto) hits++;
    const o = q.gh + q.ga > 2.5 ? 1 : 0, b = q.gh > 0 && q.ga > 0 ? 1 : 0;
    llO += -Math.log(Math.max(1e-12, o ? q.pO : 1 - q.pO));
    brO += (q.pO - o) ** 2;
    llB += -Math.log(Math.max(1e-12, b ? q.pB : 1 - q.pB));
    brB += (q.pB - b) ** 2;
    baseH += res === 0 ? 1 : 0; baseD += res === 1 ? 1 : 0; baseA += res === 2 ? 1 : 0;
    ps.forEach((v, i) => {
      const bi = bins[Math.min(9, Math.floor(v * 10))];
      bi.p += v; bi.k += i === res ? 1 : 0; bi.n++;
    });
    rows.push({ ...q, pH: ps[0], pD: ps[1], pA: ps[2], res, ll: li, rps: ri, acierto });
  }
  const n = items.length;
  const bh = baseH / n, bd = baseD / n, ba = baseA / n;
  const baseLl = -(baseH * Math.log(Math.max(1e-9, bh)) + baseD * Math.log(Math.max(1e-9, bd)) +
    baseA * Math.log(Math.max(1e-9, ba))) / n;
  const baseRps = rows.reduce((a, r) => a + rps([bh, bd, ba], r.res), 0) / n;
  // Tasas base de los otros mercados, para poder compararlos igual que el 1X2.
  const tO = items.filter((q) => q.gh + q.ga > 2.5).length / n;
  const tB = items.filter((q) => q.gh > 0 && q.ga > 0).length / n;
  const baseBin = (t, test) => {
    let ll2 = 0, br2 = 0;
    items.forEach((q) => {
      const v = test(q) ? 1 : 0;
      ll2 += -Math.log(Math.max(1e-9, v ? t : 1 - t));
      br2 += (t - v) ** 2;
    });
    return { ll: ll2 / n, br: br2 / n, tasa: t };
  };
  return {
    n, logloss: ll / n, rps: rpsT / n, brier: brier / n, acc: hits / n,
    lloverU: llO / n, brierOver: brO / n, llBtts: llB / n, brierBtts: brB / n,
    baseLl, baseRps,
    baseOver: baseBin(tO, (q) => q.gh + q.ga > 2.5),
    baseBtts: baseBin(tB, (q) => q.gh > 0 && q.ga > 0),
    baseBrier: (baseH * ((1 - bh) ** 2 + bd * bd + ba * ba) +
      baseD * (bh * bh + (1 - bd) ** 2 + ba * ba) +
      baseA * (bh * bh + bd * bd + (1 - ba) ** 2)) / n,
    ciLl: bootCI(lls), ciRps: bootCI(rpss),
    perdidas: lls, rpsArr: rpss,
    probs: rows.map((r) => [r.pH, r.pD, r.pA]), ys: rows.map((r) => r.res),
    bins: bins.map((b) => ({ ...b, avgP: b.n ? b.p / b.n : 0, obs: b.n ? b.k / b.n : 0 })),
    segmentos: segmentar(rows),
    rows,
  };
}

/** Métricas de un conjunto de goles esperados, construyendo la matriz. */
function scorePredictions(preds, rho, opts = {}) {
  if (!preds.length) return null;
  const items = preds.map((q) => {
    const m = buildMatrix(q.lh, q.la, { rho, ...opts });
    const pH = sumWhere(m, (x, y) => x > y);
    const pD = sumWhere(m, (x, y) => x === y);
    return { ...q, ps: [pH, pD, Math.max(1e-9, 1 - pH - pD)],
      pO: sumWhere(m, (x, y) => x + y > 2.5), pB: sumWhere(m, (x, y) => x > 0 && y > 0) };
  });
  return scoreFromProbs(items);
}

const RHOS = [-0.22, -0.19, -0.16, -0.13, -0.1, -0.07, -0.04, 0];
const GRID_FIT = {
  wForm: [0, 0.15, 0.3, 0.4, 0.55, 0.7, 0.85, 1],
  k: [2, 3, 4, 5, 7, 9, 12],
  halfLife: [25, 40, 60, 75, 100, 150, 250],
};

/** Descenso por coordenadas sobre log-loss del 1X2. rho se optimiza
    aparte porque no cambia los goles esperados, solo la matriz. */
async function fitParams(list, start = P0, onTick = () => {}, opts = {}) {
  const motor = opts.motor || "ratio";
  const objetivo = opts.objetivo || "x1x2";
  const clave = OBJETIVOS[objetivo].key;
  let best = { ...P0, ...start };
  const NUS = opts.ajustarNu ? [0.85, 1, 1.1, 1.25] : [1];
  const evalSet = async (P) => {
    if (motor === "ens" || motor === "elo") {
      const rows = (await runEnsemble(list, P)).filter((r) => r.pOrd);
      if (rows.length < 30) return null;
      const key = motor === "ens" ? "pEns" : "pOrd";
      const s = scoreFromProbs(rows.map((r) => ({ ...r, ps: r[key], pO: 0.5, pB: 0.5 })));
      return { rho: P.rho, theta: P.theta, nu: P.nu, s };
    }
    const preds = motor === "mle" ? runPredictionsMLE(list, P) : runPredictions(list, P);
    if (preds.length < 30) return null;
    let mejor = null;
    const corr = P.corr || "dc";
    const grid = corr === "copula" ? [0, 0.04, 0.08, 0.12, 0.18] : RHOS;
    for (const v of grid) {
      for (const nu of NUS) {
        const o = corr === "copula" ? { corr, theta: v, nu } : { corr, nu };
        const s = scorePredictions(preds, corr === "copula" ? P.rho : v, o);
        if (!mejor || s[clave] < mejor.s[clave])
          mejor = { rho: corr === "copula" ? P.rho : v, theta: corr === "copula" ? v : P.theta, nu, s };
      }
    }
    return mejor;
  };
  let cur = await evalSet(best);
  if (!cur) throw new Error("No hay partidos suficientes en esta temporada para calibrar (hacen falta unos 60 con historial previo).");
  best.rho = cur.rho;
  if (cur.theta !== undefined) best.theta = cur.theta;
  if (cur.nu !== undefined) best.nu = cur.nu;
  let bestScore = cur.s[clave];
  const keys = ["wForm", "k", "halfLife"];
  let total = 0;
  const totalSteps = 2 * keys.reduce((s, k) => s + GRID_FIT[k].length, 0);
  for (let pass = 0; pass < 2; pass++) {
    for (const key of keys) {
      for (const v of GRID_FIT[key]) {
        total++;
        onTick(total / totalSteps);
        await new Promise((r) => setTimeout(r, 0));
        if (v === best[key]) continue;
        const cand = { ...best, [key]: v };
        const r = await evalSet(cand);
        if (r && r.s[clave] < bestScore - 1e-6) {
          bestScore = r.s[clave];
          best = { ...cand, rho: r.rho, theta: r.theta ?? cand.theta, nu: r.nu ?? cand.nu };
        }
      }
    }
  }
  return { params: best, logloss: bestScore, objetivo, motor };
}

