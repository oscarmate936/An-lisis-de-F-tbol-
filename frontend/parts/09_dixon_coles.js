/* ============================================================
   MÁXIMA VEROSIMILITUD
   Dixon-Coles de verdad: estima el ataque y la defensa de TODOS los
   equipos a la vez, más la ventaja de campo de la liga, en vez de
   dividir promedios equipo a equipo.
   ============================================================ */

/** Ajuste por coordenadas de un Poisson bivariante con decaimiento temporal.
    matches: [{t, h, a, gh, ga, w}] · ref: fecha desde la que se decae. */
function fitDixonColes(matches, { halfLife = 120, ref = null, prior = 4, iters = 40 } = {}) {
  if (!matches.length) return null;
  const t0 = ref ?? Math.max(...matches.map((m) => m.t));
  const rows = matches.map((m) => ({
    ...m,
    w: (m.w ?? 1) * Math.pow(0.5, Math.max(0, (t0 - m.t) / 86400000) / halfLife),
  })).filter((m) => m.w > 0.02);
  if (rows.length < 20) return null;

  const ids = [...new Set(rows.flatMap((m) => [m.h, m.a]))];
  const atk = new Map(ids.map((i) => [i, 1]));
  const def = new Map(ids.map((i) => [i, 1]));
  let gamma = 1.25;
  let W = 0, G = 0;
  rows.forEach((m) => { W += m.w * 2; G += m.w * (m.gh + m.ga); });
  let mu = G / W;

  for (let it = 0; it < iters; it++) {
    // ataque
    const numA = new Map(ids.map((i) => [i, prior * mu]));
    const denA = new Map(ids.map((i) => [i, prior * mu]));
    rows.forEach((m) => {
      numA.set(m.h, numA.get(m.h) + m.w * m.gh);
      denA.set(m.h, denA.get(m.h) + m.w * mu * def.get(m.a) * gamma);
      numA.set(m.a, numA.get(m.a) + m.w * m.ga);
      denA.set(m.a, denA.get(m.a) + m.w * mu * def.get(m.h));
    });
    ids.forEach((i) => atk.set(i, clamp(numA.get(i) / Math.max(1e-9, denA.get(i)), 0.25, 3.2)));
    // defensa
    const numD = new Map(ids.map((i) => [i, prior * mu]));
    const denD = new Map(ids.map((i) => [i, prior * mu]));
    rows.forEach((m) => {
      numD.set(m.a, numD.get(m.a) + m.w * m.gh);
      denD.set(m.a, denD.get(m.a) + m.w * mu * atk.get(m.h) * gamma);
      numD.set(m.h, numD.get(m.h) + m.w * m.ga);
      denD.set(m.h, denD.get(m.h) + m.w * mu * atk.get(m.a));
    });
    ids.forEach((i) => def.set(i, clamp(numD.get(i) / Math.max(1e-9, denD.get(i)), 0.25, 3.2)));
    // ventaja de campo
    let gn = 0, gd = 0;
    rows.forEach((m) => { gn += m.w * m.gh; gd += m.w * mu * atk.get(m.h) * def.get(m.a); });
    gamma = clamp(gn / Math.max(1e-9, gd), 0.85, 1.9);
    // normalización: el ataque medio vale 1 y el resto se reescala
    const mA = ids.reduce((s, i) => s + atk.get(i), 0) / ids.length;
    ids.forEach((i) => { atk.set(i, atk.get(i) / mA); def.set(i, def.get(i) * mA); });
    let n2 = 0, d2 = 0;
    rows.forEach((m) => {
      n2 += m.w * (m.gh + m.ga);
      d2 += m.w * (atk.get(m.h) * def.get(m.a) * gamma + atk.get(m.a) * def.get(m.h));
    });
    mu = clamp(n2 / Math.max(1e-9, d2), 0.3, 3.5);
  }

  const games = new Map(ids.map((i) => [i, 0]));
  const goals = new Map(ids.map((i) => [i, 0]));
  matches.forEach((m) => {
    games.set(m.h, games.get(m.h) + 1); games.set(m.a, games.get(m.a) + 1);
    goals.set(m.h, goals.get(m.h) + m.gh); goals.set(m.a, goals.get(m.a) + m.ga);
  });
  return { atk, def, gamma, mu, games, goals, n: rows.length, ids };
}

/** Log-verosimilitud Dixon-Coles de un ajuste, para elegir rho. */
function dcLogLik(fit, matches, rho, halfLife = 120, ref = null) {
  const t0 = ref ?? Math.max(...matches.map((m) => m.t));
  let ll = 0, W = 0;
  for (const m of matches) {
    const A = fit.atk.get(m.h), B = fit.def.get(m.a), C = fit.atk.get(m.a), D = fit.def.get(m.h);
    if (!A || !B || !C || !D) continue;
    const lh = fit.mu * A * B * fit.gamma, la = fit.mu * C * D;
    const w = Math.pow(0.5, Math.max(0, (t0 - m.t) / 86400000) / halfLife);
    let tau = 1;
    if (m.gh === 0 && m.ga === 0) tau = 1 - lh * la * rho;
    else if (m.gh === 0 && m.ga === 1) tau = 1 + lh * rho;
    else if (m.gh === 1 && m.ga === 0) tau = 1 + la * rho;
    else if (m.gh === 1 && m.ga === 1) tau = 1 - rho;
    ll += w * (Math.log(Math.max(1e-9, tau)) + Math.log(Math.max(1e-12, poisPmf(m.gh, lh))) +
      Math.log(Math.max(1e-12, poisPmf(m.ga, la))));
    W += w;
  }
  return W ? ll / W : -1e9;
}

function bestRhoFor(fit, matches, halfLife, ref) {
  let best = { rho: -0.13, ll: -1e9 };
  for (const rho of RHOS) {
    const ll = dcLogLik(fit, matches, rho, halfLife, ref);
    if (ll > best.ll) best = { rho, ll };
  }
  return best;
}

/** Goles esperados de un enfrentamiento según el ajuste. */
function lambdasFromFit(fit, homeId, awayId) {
  const A = fit.atk.get(homeId), B = fit.def.get(awayId);
  const C = fit.atk.get(awayId), D = fit.def.get(homeId);
  if (!A || !B || !C || !D) return null;
  return {
    lh: clamp(fit.mu * A * B * fit.gamma, 0.15, 5),
    la: clamp(fit.mu * C * D, 0.15, 5),
    atkH: A, defH: D, atkA: C, defA: B,
  };
}

/** Backtest con el motor de máxima verosimilitud. Reajusta cada bloque
    de partidos usando solo lo anterior al bloque: sin filtraciones. */
function runPredictionsMLE(list, P, block = 10) {
  const out = [];
  let fit = null, fitUpTo = -1;
  for (let i = 0; i < list.length; i++) {
    if (i >= P.minGames * 8 && (fit === null || i - fitUpTo >= block)) {
      const prior = list.slice(0, i);
      fit = (P.autoShrink ? fitDixonColesEB : fitDixonColes)(prior, { halfLife: P.halfLife * 2, ref: list[i].t, prior: P.k });
      fitUpTo = i;
    }
    if (!fit) continue;
    const L = lambdasFromFit(fit, list[i].h, list[i].a);
    const gh = fit.games.get(list[i].h) || 0, ga = fit.games.get(list[i].a) || 0;
    if (!L || gh < P.minGames || ga < P.minGames) continue;
    out.push({ lh: L.lh, la: L.la, gh: list[i].gh, ga: list[i].ga, date: list[i].date,
      hn: list[i].hn, an: list[i].an });
  }
  return out;
}

