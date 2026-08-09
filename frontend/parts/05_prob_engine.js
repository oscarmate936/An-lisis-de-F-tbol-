/* ============================================================
   MOTOR DE MERCADOS · v2
   Goles: Dixon-Coles sobre fuerzas de temporada + forma reciente
   Mitades: dos matrices independientes (45% / 55% del gol esperado)
   Conteos: binomial negativa con modelo ataque × defensa
   ============================================================ */

const GRID = 11;  // marcadores 0..10 para el partido completo
const HGRID = 7;  // 0..6 por mitad

function lgamma(z) {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < g.length; i++) x += g[i] / (z + i + 1);
  const t = z + g.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

const LOGFACT = (() => {
  const a = [0];
  for (let i = 1; i <= 40; i++) a[i] = a[i - 1] + Math.log(i);
  return a;
})();

function poisPmf(k, l) {
  if (l <= 0) return k === 0 ? 1 : 0;
  const lf = k <= 40 ? LOGFACT[k] : lgamma(k + 1);
  return Math.exp(-l + k * Math.log(l) - lf);
}

/** Conteos: binomial negativa si hay sobredispersión real, Poisson si no. */
function countPmf(mean, variance, n = null) {
  // El alcance se adapta a la media: con 22 remates esperados no basta
  // con llegar hasta 30 para poder dibujar la escalera entera.
  if (n === null) {
    const sd = Math.sqrt(Math.max(variance || mean || 1, 0.01));
    n = Math.min(120, Math.max(30, Math.ceil((mean || 0) + 7 * sd)));
  }
  const out = [];
  if (mean > 0 && variance > mean * 1.05) {
    const r = (mean * mean) / (variance - mean);
    const p = r / (r + mean);
    for (let k = 0; k <= n; k++)
      out.push(
        Math.exp(
          lgamma(k + r) - lgamma(r) - lgamma(k + 1) + r * Math.log(p) + k * Math.log(1 - p)
        )
      );
    const s = out.reduce((a, b) => a + b, 0);
    return { pmf: out.map((v) => v / s), model: "binomial negativa" };
  }
  for (let k = 0; k <= n; k++) out.push(poisPmf(k, mean));
  return { pmf: out, model: "Poisson" };
}

const pOver = (pmf, line) => {
  let s = 0;
  for (let k = Math.floor(line) + 1; k < pmf.length; k++) s += pmf[k];
  return s;
};

/** Un gol esperado siempre tiene que ser un número positivo y razonable:
    NaN, infinito o mil goles vienen de un dato corrupto, no de un partido. */
const lamSano = (v) => (typeof v === "number" && isFinite(v) && v > 0 ? Math.min(v, 25) : 0.01);

/** Matriz de marcadores con corrección Dixon-Coles para resultados bajos. */
function scoreMatrix(lh0, la0, rho = -0.13, n = GRID) {
  const lh = lamSano(lh0), la = lamSano(la0);
  const r = typeof rho === "number" && isFinite(rho) ? clamp(rho, -0.9, 0.9) : -0.13;
  const m = [];
  let tot = 0;
  for (let x = 0; x < n; x++) {
    m[x] = [];
    for (let y = 0; y < n; y++) {
      let tau = 1;
      if (x === 0 && y === 0) tau = 1 - lh * la * r;
      else if (x === 0 && y === 1) tau = 1 + lh * r;
      else if (x === 1 && y === 0) tau = 1 + la * r;
      else if (x === 1 && y === 1) tau = 1 - r;
      const v = Math.max(0, tau) * poisPmf(x, lh) * poisPmf(y, la);
      m[x][y] = isFinite(v) ? v : 0;
      tot += m[x][y];
    }
  }
  // Si la masa se ha ido a cero (lambdas absurdas), todo al 0-0 antes que
  // repartir NaN por los ciento sesenta mercados.
  if (!(tot > 0) || !isFinite(tot)) {
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) m[x][y] = 0;
    m[0][0] = 1;
    return m;
  }
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) m[x][y] /= tot;
  return m;
}

function sumWhere(m, fn) {
  const n = m.length;
  let s = 0;
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) if (fn(x, y)) s += m[x][y];
  return s;
}

/** Marginales reales de la matriz (no Poisson puro: incluyen la corrección DC). */
function marginals(m) {
  const n = m.length;
  const h = new Array(n).fill(0);
  const a = new Array(n).fill(0);
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++) {
      h[x] += m[x][y];
      a[y] += m[x][y];
    }
  return { h, a };
}

/** Distribución del total de goles. */
function totalDist(m) {
  const n = m.length;
  const out = new Array(2 * n - 1).fill(0);
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) out[x + y] += m[x][y];
  return out;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** Mezcla en logaritmos con suavizado tipo Laplace: sumar un épsilon
    conserva el orden de las tasas pequeñas pero reales, mientras que
    recortarlas a un mínimo las distorsionaba (0.02 y 0.04 acababan iguales). */
const EPS = 0.01;
const geoBlend = (a, b, w) =>
  Math.exp(w * Math.log(Math.max(EPS, a) + EPS) + (1 - w) * Math.log(Math.max(EPS, b) + EPS)) - EPS;
/** Encoge una fuerza hacia 1 cuando hay pocos partidos. */
const shrink = (s, n, k = 5) => (isFinite(s) && s > 0 ? 1 + (s - 1) * (n / (n + k)) : 1);

/** Distribución de la diferencia de goles.
    Con marginales Poisson se usa el cierre analítico de Skellam (más la
    corrección Dixon-Coles, que solo toca cuatro marcadores), así el
    hándicap no depende de dónde cortemos la matriz. En cópula o con
    dispersión distinta de 1 se saca de la propia matriz, que ahí es
    la referencia exacta. */
function diffDist(m, lh, la, opts = {}) {
  const d = new Map();
  const corr = opts.corr || "dc";
  const nu = opts.nu ?? 1;
  if (corr === "dc" && Math.abs(nu - 1) < 1e-9 && lh > 0 && la > 0) {
    const lim = 15;
    for (let k = -lim; k <= lim; k++) d.set(k, skellamPmf(k, lh, la));
    const rho = opts.rho ?? -0.13;
    [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([x, y]) => {
      let tau = 1;
      if (x === 0 && y === 0) tau = 1 - lh * la * rho;
      else if (x === 0 && y === 1) tau = 1 + lh * rho;
      else if (x === 1 && y === 0) tau = 1 + la * rho;
      else tau = 1 - rho;
      const base = poisPmf(x, lh) * poisPmf(y, la);
      d.set(x - y, (d.get(x - y) || 0) + base * (Math.max(0, tau) - 1));
    });
  } else {
    const n = m.length;
    for (let x = 0; x < n; x++)
      for (let y = 0; y < n; y++) d.set(x - y, (d.get(x - y) || 0) + m[x][y]);
  }
  let s = 0;
  d.forEach((v) => { s += Math.max(0, v); });
  d.forEach((v, k) => d.set(k, Math.max(0, v) / s));
  return d;
}

/** Hándicap asiático incluyendo líneas de cuarto: reparte el stake. */
function asianSettle(dist, line) {
  const parts = Number.isInteger(line * 2) ? [line] : [line - 0.25, line + 0.25];
  let win = 0, push = 0, lose = 0;
  parts.forEach((L) => {
    let w = 0, p = 0;
    dist.forEach((v, k) => {
      if (k + L > 1e-6) w += v;
      else if (Math.abs(k + L) < 1e-6) p += v;
    });
    win += w / parts.length;
    push += p / parts.length;
    lose += (1 - w - p) / parts.length;
  });
  return { win, push, lose, net: win / Math.max(1e-9, win + lose) };
}

/** Total asiático (líneas enteras y de cuarto) sobre el total de goles. */
function asianTotal(m, line) {
  const parts = Number.isInteger(line * 2) ? [line] : [line - 0.25, line + 0.25];
  let win = 0, push = 0, lose = 0;
  parts.forEach((L) => {
    const o = sumWhere(m, (x, y) => x + y > L);
    const p = sumWhere(m, (x, y) => Math.abs(x + y - L) < 1e-6);
    win += o / parts.length;
    push += p / parts.length;
    lose += (1 - o - p) / parts.length;
  });
  return { win, push, lose, net: win / Math.max(1e-9, win + lose) };
}

/* ---------- fuerzas a partir de la forma reciente ---------- */
/** Goles marcados y encajados frente a lo que marcaría un equipo medio
    en ese mismo campo, con decaimiento exponencial por antigüedad. */
function formStrengths(list, teamId, kickoff, avgH, avgA, halfLife = 75, oppRates = null) {
  let wf = 0, wa = 0, wbf = 0, wba = 0, n = 0, used = 0;
  (list || []).forEach((f) => {
    if (f.goals?.home === null || f.goals?.away === null) return;
    const t = new Date(f.fixture.date).getTime();
    const days = (kickoff - t) / 86400000;
    if (days < 0 || days > 400) return;
    const isHome = f.teams.home.id === teamId;
    const gf = num(isHome ? f.goals.home : f.goals.away);
    const ga = num(isHome ? f.goals.away : f.goals.home);
    const w = Math.pow(0.5, days / halfLife);
    // Marcarle 2 al colista no vale lo mismo que marcarle 2 al líder:
    // cada partido se compara con lo que ese rival concede y genera.
    const oppId = isHome ? f.teams.away.id : f.teams.home.id;
    const o = oppRates ? oppRates.get(oppId) : null;
    const oDef = o ? clamp(o.def, 0.45, 2.2) : 1;
    const oAtk = o ? clamp(o.atk, 0.45, 2.2) : 1;
    wf += w * gf;
    wa += w * ga;
    wbf += w * (isHome ? avgH : avgA) * oDef;
    wba += w * (isHome ? avgA : avgH) * oAtk;
    n += w;
    used++;
  });
  if (used < 3 || n < 0.5) return null;
  return { atk: wf / Math.max(0.02, wbf), def: wa / Math.max(0.02, wba), n, used };
}

/* ---------- modelo base del partido ----------
   Función pura: recibe las respuestas de la API y devuelve las fuerzas.
   Está fuera del componente para poder razonarla (y probarla) por separado. */
/* ---------- parámetros del modelo ----------
   Valores por defecto razonables; la pestaña Calibración los ajusta
   contra resultados reales y los guarda por competición. */
const P0 = {
  rho: -0.13, wForm: 0.40, k: 5, halfLife: 75, minGames: 5,
  corr: "dc", theta: 0.06, nu: 1, eloK: 20, eloHfa: 55, autoShrink: false,
};
// Cada mercado puede querer parámetros distintos: los del 1X2 conservan
// la clave antigua para no perder lo ya guardado.
const paramsKey = (lg, obj = "x1x2") => (obj === "x1x2" ? `params:${lg}` : `params:${lg}:${obj}`);

/* Sin esto, cada liga se queda con los parámetros genéricos hasta que
   alguien entra a mano en Calibración y pulsa Guardar: en la práctica,
   casi ninguna. Activado de fábrica porque no cuesta peticiones aparte
   (reaprovecha la temporada que Mercados ya pide para el modelo base) y
   solo usa CPU que de todas formas se cede al hilo principal en trozos. */
let AUTO_CALIBRACION = (() => {
  try { return localStorage.getItem("auto-calibracion") !== "0"; } catch (e) { return true; }
})();
function ponAutoCalibracion(v) {
  AUTO_CALIBRACION = !!v;
  try { localStorage.setItem("auto-calibracion", v ? "1" : "0"); } catch (e) { /* sin espacio */ }
}
// Recalibrar cada tanto por si el equipo cambió de aires; cambiar de
// temporada también lo dispara porque los parámetros de la anterior ya
// no describen la plantilla actual. Una calibración guardada a mano no
// se toca nunca sola: es una elección deliberada de quien la guardó, y
// pisarla sin avisar sería peor que dejarla algo vieja.
const CAL_STALE_MS = 45 * 24 * 3600e3;
function calibracionCaducada(saved, season) {
  if (!saved) return true;
  if (saved.auto === false) return false;
  if (saved.season != null && season != null && saved.season < season) return true;
  return !saved.ts || Date.now() - saved.ts > CAL_STALE_MS;
}

/** Descanso y acumulación de partidos, a partir del propio historial. */
function restFactor(recent, kickoff, seleccion = false) {
  if (!recent?.length) return { f: 1, days: null, n14: 0 };
  // En selecciones los huecos de dos meses son lo normal, no falta de ritmo.
  if (seleccion) {
    const ts = recent.map((f) => new Date(f.fixture.date).getTime()).filter((t) => t < kickoff);
    const d0 = ts.length ? (kickoff - Math.max(...ts)) / 86400000 : null;
    return { f: 1, days: d0 === null ? null : Math.round(d0), n14: 0, seleccion: true };
  }
  const times = recent.map((f) => new Date(f.fixture.date).getTime()).filter((t) => t < kickoff);
  if (!times.length) return { f: 1, days: null, n14: 0 };
  const days = (kickoff - Math.max(...times)) / 86400000;
  const n14 = times.filter((t) => kickoff - t <= 14 * 86400000).length;
  let f = 1;
  if (days <= 2) f *= 0.93;
  else if (days <= 3) f *= 0.97;
  else if (days >= 8) f *= 1.01;
  if (n14 >= 4) f *= 0.96;
  else if (n14 === 3) f *= 0.985;
  return { f: clamp(f, 0.87, 1.03), days: Math.round(days), n14 };
}

/** Reparto real de goles entre mitades, de los tramos de minutos que da la API. */
function halfShare(...stats) {
  let first = 0, tot = 0;
  const early = ["0-15", "16-30", "31-45"];
  stats.forEach((st) => {
    ["for", "against"].forEach((side) => {
      const mm = st?.goals?.[side]?.minute;
      if (!mm) return;
      Object.entries(mm).forEach(([k, v]) => {
        const t = num(v?.total);
        if (!t) return;
        tot += t;
        if (early.includes(k)) first += t;
      });
    });
  });
  if (tot < 20) return { share: 0.45, n: tot, real: false };
  return { share: clamp(first / tot, 0.36, 0.54), n: tot, real: true };
}

/** Fuerzas de cada rival según la clasificación: sirve para ajustar la forma. */
const NEUTRO = { atk: 1, def: 1 };

function oppRatesFrom(rows, lgAll) {
  const datos = new Map();
  // Una media de liga minúscula (datos incompletos, jornada 1) dispararía
  // las fuerzas al infinito: el suelo lo impide.
  const base = Math.max(num(lgAll), 0.1);
  (rows || []).forEach((r) => {
    const p = num(r.all?.played);
    if (p < 1 || !r.team?.id) return;
    datos.set(r.team.id, {
      atk: clamp(num(r.all.goals?.for) / p / base, 0.2, 4),
      def: clamp(num(r.all.goals?.against) / p / base, 0.2, 4),
    });
  });
  // Recién ascendidos y rivales de otra competición: neutro explícito,
  // nunca undefined, que es de donde salían los fallos por sorpresa.
  return { get: (id) => datos.get(id) || NEUTRO, size: datos.size, datos };
}

/* ---------- modelo base del partido ----------
   Función pura: recibe las respuestas de la API y devuelve las fuerzas.
   Está fuera del componente para poder razonarla (y probarla) por separado. */
function computeBase({ stTab, hs, as, hfx, afx, kickoff, homeId, awayId, homeName, awayName,
                       params = P0, useRest = true, lgMatches = null, histLiga = null,
                       seleccion = false, coachH = null, coachA = null }) {
  const P = { ...P0, ...(params || {}) };
  // Media de la liga por campo, desde la clasificación.
  const rows = (stTab?.[0]?.league?.standings || []).flat();
  let hgf = 0, hp = 0, agf = 0, ap = 0;
  rows.forEach((r) => {
    hgf += num(r.home?.goals?.for); hp += num(r.home?.played);
    agf += num(r.away?.goals?.for); ap += num(r.away?.played);
  });
  const ligaOk = hp > 4 && ap > 4;
  // Sin clasificación utilizable se recurre, por este orden: a la media
  // histórica guardada de esta competición, a la que salga de los propios
  // partidos de liga, y solo al final a un valor genérico.
  let fbH = seleccion ? 1.35 : 1.45, fbA = seleccion ? 1.1 : 1.15;
  let fbFuente = seleccion ? "genérica de selecciones" : "genérica";
  if (histLiga && histLiga.avgH > 0.3 && histLiga.avgA > 0.3) {
    fbH = histLiga.avgH; fbA = histLiga.avgA; fbFuente = "histórica de la liga";
  } else if (lgMatches && lgMatches.length >= 20) {
    const prev = lgMatches.filter((m) => m.t < kickoff);
    if (prev.length >= 20) {
      fbH = prev.reduce((a, m) => a + m.gh, 0) / prev.length;
      fbA = prev.reduce((a, m) => a + m.ga, 0) / prev.length;
      fbFuente = "de los partidos de la temporada";
    }
  }
  const avgH = ligaOk ? hgf / hp : clamp(fbH, 0.6, 3);
  const avgA = ligaOk ? agf / ap : clamp(fbA, 0.4, 3);
  const avgAll = (avgH + avgA) / 2;
  const oppRates = ligaOk ? oppRatesFrom(rows, avgAll) : null;

  // Historial anterior al pitido inicial: nada de lo que pasó después entra aquí.
  const prev = (list) =>
    (list || [])
      .filter((f) => new Date(f.fixture.date).getTime() < kickoff && f.goals?.home !== null && f.goals?.away !== null)
      .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
      .slice(0, 14);
  const recentH = prev(hfx);
  const recentA = prev(afx);

  const formH = formStrengths(recentH, homeId, kickoff, avgH, avgA, P.halfLife, oppRates);
  const formA = formStrengths(recentA, awayId, kickoff, avgH, avgA, P.halfLife, oppRates);

  // Fuerzas de temporada: el split de campo pesa más cuantos más partidos hay en él.
  const seasonStr = (st, side) => {
    if (!st?.goals?.for?.average) return null;
    const nT = num(st.fixtures?.played?.total);
    if (!nT) return null;
    const n = num(st.fixtures?.played?.[side]);
    const gf = num(st.goals.for.average[side]);
    const ga = num(st.goals.against.average[side]);
    const gfT = num(st.goals.for.average.total);
    const gaT = num(st.goals.against.average.total);
    const baseF = side === "home" ? avgH : avgA;
    const baseA = side === "home" ? avgA : avgH;
    const w = n / (n + 6);
    return {
      atk: geoBlend(n ? gf / baseF : gfT / avgAll, gfT / avgAll, w),
      def: geoBlend(n ? ga / baseA : gaT / avgAll, gaT / avgAll, w),
      n, nT,
    };
  };
  const sH = seasonStr(hs, "home");
  const sA = seasonStr(as, "away");

  // Algunas competiciones publican xG en las estadísticas de equipo.
  // Cuando está, es mejor materia prima que los goles: menos ruido.
  const xgDe = (st, side) => {
    const g = st?.goals;
    const cand = [g?.for?.expected?.average?.[side], g?.for?.expected?.average?.total,
      g?.for?.expected?.[side], st?.expected_goals?.[side], st?.expected_goals?.total];
    const c = st?.goals?.against?.expected?.average;
    const contra = [c?.[side], c?.total, st?.expected_goals_against?.[side]];
    const pick = (arr) => { for (const v of arr) { const n2 = num(v); if (n2 > 0.05 && n2 < 6) return n2; } return null; };
    const f = pick(cand), a2 = pick(contra);
    return f || a2 ? { for: f, against: a2 } : null;
  };
  const xgH = xgDe(hs, "home"), xgA = xgDe(as, "away");

  if (!sH && !formH) throw new Error(`No hay partidos previos suficientes de ${homeName} para modelar este encuentro.`);
  if (!sA && !formA) throw new Error(`No hay partidos previos suficientes de ${awayName} para modelar este encuentro.`);

  // Temporada y forma reciente, mezcladas en logaritmos con el peso calibrado.
  const mix = (s, f, key) => (s && f ? geoBlend(f[key], s[key], P.wForm) : (s || f)[key]);
  const nEff = (s, f) => (s ? s.nT : 0) * 0.7 + (f ? f.used : 0) * 0.5;

  const nH = nEff(sH, formH), nA = nEff(sA, formA);
  let atkH = clamp(shrink(mix(sH, formH, "atk"), nH, P.k), 0.35, 2.6);
  let defH = clamp(shrink(mix(sH, formH, "def"), nH, P.k), 0.35, 2.6);
  let atkA = clamp(shrink(mix(sA, formA, "atk"), nA, P.k), 0.35, 2.6);
  let defA = clamp(shrink(mix(sA, formA, "def"), nA, P.k), 0.35, 2.6);

  // Descanso y acumulación: cansado se ataca peor y se defiende algo peor.
  const rH = restFactor(recentH, kickoff, seleccion);
  const rA = restFactor(recentA, kickoff, seleccion);
  if (useRest) {
    atkH *= rH.f; defH *= 1 + (1 - rH.f) * 0.6;
    atkA *= rA.f; defA *= 1 + (1 - rA.f) * 0.6;
  }

  // --- Ajuste conjunto de toda la liga (máxima verosimilitud) ---
  // Estima el ataque y la defensa de los 20 equipos a la vez y saca la
  // ventaja de campo de los datos, en vez de dividir promedios sueltos.
  let mle = null;
  if (lgMatches && lgMatches.length >= 40) {
    const previos = lgMatches.filter((m) => m.t < kickoff);
    if (previos.length >= 40) {
      const fit = (P.autoShrink ? fitDixonColesEB : fitDixonColes)(previos, { halfLife: P.halfLife * 2, ref: kickoff, prior: P.k });
      const L = fit && lambdasFromFit(fit, homeId, awayId);
      const gH = fit?.games.get(homeId) || 0, gA = fit?.games.get(awayId) || 0;
      if (L && gH >= 3 && gA >= 3) mle = { ...L, gamma: fit.gamma, mu: fit.mu, gH, gA, n: previos.length };
    }
  }

  // Goles esperados por cada vía; se mezclan con el peso calibrado.
  let lhRatio = clamp(avgH * atkH * defA, 0.15, 5);
  let laRatio = clamp(avgA * atkA * defH, 0.15, 5);
  let xgFuente = null;
  if (xgH?.for && xgA?.against) {
    const xgLh = clamp(Math.sqrt(xgH.for * (xgA.against || xgH.for)), 0.15, 5);
    lhRatio = geoBlend(xgLh, lhRatio, 0.5);
    xgFuente = "estadísticas de equipo";
  }
  if (xgA?.for && xgH?.against) {
    const xgLa = clamp(Math.sqrt(xgA.for * (xgH.against || xgA.for)), 0.15, 5);
    laRatio = geoBlend(xgLa, laRatio, 0.5);
    xgFuente = "estadísticas de equipo";
  }
  const lhForm = formH && formA ? clamp(avgH * (formH.atk * (useRest ? rH.f : 1)) * formA.def, 0.15, 5) : null;
  const laForm = formH && formA ? clamp(avgA * (formA.atk * (useRest ? rA.f : 1)) * formH.def, 0.15, 5) : null;
  let lh0 = lhRatio, la0 = laRatio, motor = "cocientes";
  if (mle) {
    motor = "máxima verosimilitud";
    let lhM = mle.lh, laM = mle.la;
    if (useRest) { lhM *= rH.f; laM *= rA.f; }
    // La forma en todas las competiciones aporta lo que la liga no ve.
    lh0 = lhForm ? geoBlend(lhForm, lhM, P.wForm * 0.6) : lhM;
    la0 = laForm ? geoBlend(laForm, laM, P.wForm * 0.6) : laM;
    lh0 = clamp(lh0, 0.15, 5); la0 = clamp(la0, 0.15, 5);
  }

  // Entrenador recién llegado: el historial anterior vale menos y hay
  // más incertidumbre, así que las fuerzas se acercan a la media.
  const coachAjuste = (c) => {
    if (!c?.desde) return 1;
    const dias = (kickoff - c.desde) / 86400000;
    if (dias < 0 || dias > 120) return 1;
    return clamp(0.55 + dias / 220, 0.55, 1);
  };
  const cH = coachAjuste(coachH), cA = coachAjuste(coachA);
  if (cH < 1) { atkH = geoBlend(atkH, 1, cH); defH = geoBlend(defH, 1, cH); }
  if (cA < 1) { atkA = geoBlend(atkA, 1, cA); defA = geoBlend(defA, 1, cA); }

  const nMin = mle
    ? Math.min(mle.gH, mle.gA) + Math.min(formH?.used || 0, formA?.used || 0)
    : Math.min(sH?.nT || 0, sA?.nT || 0) + Math.min(formH?.used || 0, formA?.used || 0);
  const level = nMin >= 16 && (ligaOk || mle) ? "alta" : nMin >= 9 ? "media" : "baja";

  return {
    lh0, la0, motor, mle,
    lhRatio, laRatio, lhForm, laForm,
    avgH, avgA, ligaOk,
    atkH, defH, atkA, defA,
    nSeasonH: sH?.nT || 0, nSeasonA: sA?.nT || 0,
    nFormH: formH?.used || 0, nFormA: formA?.used || 0,
    recentH, recentA, restH: rH, restA: rA,
    gfTotalH: num(hs?.goals?.for?.total?.total) || null,
    gfTotalA: num(as?.goals?.for?.total?.total) || null,
    oppAdj: !!oppRates,
    xgFuente, seleccion,
    coach: { h: coachH, a: coachA, fH: cH, fA: cA },
    mediaFuente: ligaOk ? "clasificación" : fbFuente,
    half: halfShare(hs, as),
    params: P,
    conf: { level, hint: `${nMin} partidos previos entre temporada y forma reciente` },
  };
}

/** La línea de un hándicap se escribe con su signo: +1.5, −0.75, 0. */
const tagAsia = (v) => (v > 0 ? `+${v}` : `${v}`);

/** Escalera de líneas consecutivas desde 0.5 hacia arriba. Sube de una en
    una y se detiene cuando la parte de "más de" ya no aporta nada (por
    debajo del umbral), así ningún mercado empieza a mitad de camino ni
    se llena de filas al 0%. */
function escalera(pOver, { min = 6, max = 45, umbral = 0.008 } = {}) {
  const out = [];
  for (let L = 0.5; out.length < max; L += 1) {
    out.push(L);
    if (out.length >= min && pOver(L) < umbral) break;
  }
  return out;
}

/* ---------- catálogo de mercados ---------- */
/** Cada selección lleva, cuando es posible, un predicado sobre la matriz
    de marcadores: eso permite calcular combinadas exactas, con su
    correlación real, en vez de multiplicar probabilidades sueltas. */
function buildMarkets(ctx) {
  const { m, m1, m2, homeName, awayName } = ctx;
  const dist = ctx.dist || diffDist(m, ctx.lh, ctx.la, ctx.opts || {});
  const out = [];
  const add = (fam, mercado, sel, p, o = {}) =>
    out.push({
      fam,
      mercado,
      sel,
      p,
      nota: o.nota,
      pred: o.pred,
      concepto: o.concepto,
      core: !!o.core,
      key: `${fam}|${mercado}|${sel}`,
    });

  let pH = sumWhere(m, (x, y) => x > y);
  let pD = sumWhere(m, (x, y) => x === y);
  let pA = sumWhere(m, (x, y) => x < y);
  // Recalibración por resultado: aprendida en el backtest de esta
  // competición, solo se guarda si de verdad mejora el log-loss del 1X2
  // crudo. Solo toca el marcador 1X2 y lo que sale de él (doble
  // oportunidad, empate anula): el resto de mercados sigue con la matriz
  // sin retocar, que es de donde salen de verdad.
  if (ctx.vector) {
    [pH, pD, pA] = applyVectorScaling([pH, pD, pA], ctx.vector);
  }

  /* --- Resultado --- */
  add("Resultado", "1X2", homeName, pH, { pred: (x, y) => x > y, concepto: "local", core: 1 });
  add("Resultado", "1X2", "Empate", pD, { pred: (x, y) => x === y, concepto: "empate", core: 1 });
  add("Resultado", "1X2", awayName, pA, { pred: (x, y) => x < y, concepto: "visitante", core: 1 });

  add("Resultado", "Doble oportunidad", `${homeName} o empate`, pH + pD, {
    pred: (x, y) => x >= y, concepto: "local", core: 1,
  });
  add("Resultado", "Doble oportunidad", "Gana alguno", pH + pA, {
    pred: (x, y) => x !== y, concepto: "no-empate", core: 1,
  });
  add("Resultado", "Doble oportunidad", `Empate o ${awayName}`, pD + pA, {
    pred: (x, y) => x <= y, concepto: "visitante", core: 1,
  });

  add("Resultado", "Empate anula", homeName, pH / (pH + pA), {
    nota: `nulo si empate · ${(pD * 100).toFixed(0)}%`, concepto: "local", core: 1,
  });
  add("Resultado", "Empate anula", awayName, pA / (pH + pA), {
    nota: `nulo si empate · ${(pD * 100).toFixed(0)}%`, concepto: "visitante", core: 1,
  });

  add("Resultado", "Gana sin encajar", homeName, sumWhere(m, (x, y) => x > y && y === 0), {
    pred: (x, y) => x > y && y === 0, concepto: "local-cs",
  });
  add("Resultado", "Gana sin encajar", awayName, sumWhere(m, (x, y) => y > x && x === 0), {
    pred: (x, y) => y > x && x === 0, concepto: "visitante-cs",
  });

  for (const d of [1, 2, 3]) {
    const lab = d === 3 ? "por 3 o más" : `por ${d}`;
    add("Resultado", "Margen", `${homeName} ${lab}`,
      sumWhere(m, (x, y) => (d === 3 ? x - y >= 3 : x - y === d)),
      { pred: (x, y) => (d === 3 ? x - y >= 3 : x - y === d), concepto: "margen" });
  }
  for (const d of [1, 2, 3]) {
    const lab = d === 3 ? "por 3 o más" : `por ${d}`;
    add("Resultado", "Margen", `${awayName} ${lab}`,
      sumWhere(m, (x, y) => (d === 3 ? y - x >= 3 : y - x === d)),
      { pred: (x, y) => (d === 3 ? y - x >= 3 : y - x === d), concepto: "margen" });
  }

  /* --- Goles --- */
  const tdist = totalDist(m);
  const overTot = (L) => tdist.reduce((s, v, k) => (k > L ? s + v : s), 0);
  for (const L of escalera(overTot)) {
    const o = overTot(L);
    add("Goles", `Total ${L}`, "Más de", o, {
      pred: (x, y) => x + y > L, concepto: "over", core: L >= 1.5 && L <= 3.5,
    });
    add("Goles", `Total ${L}`, "Menos de", 1 - o, {
      pred: (x, y) => x + y < L, concepto: "under", core: L >= 1.5 && L <= 3.5,
    });
  }

  const btts = sumWhere(m, (x, y) => x > 0 && y > 0);
  add("Goles", "Ambos marcan", "Sí", btts, {
    pred: (x, y) => x > 0 && y > 0, concepto: "btts-si", core: 1,
  });
  add("Goles", "Ambos marcan", "No", 1 - btts, {
    pred: (x, y) => x === 0 || y === 0, concepto: "btts-no", core: 1,
  });

  const par = sumWhere(m, (x, y) => (x + y) % 2 === 0);
  add("Goles", "Par / impar", "Par", par, { pred: (x, y) => (x + y) % 2 === 0, concepto: "paridad" });
  add("Goles", "Par / impar", "Impar", 1 - par, { pred: (x, y) => (x + y) % 2 === 1, concepto: "paridad" });

  const rangos = [
    ["0 a 1", (t) => t <= 1],
    ["2 a 3", (t) => t >= 2 && t <= 3],
    ["4 a 6", (t) => t >= 4 && t <= 6],
    ["7 o más", (t) => t >= 7],
  ];
  rangos.forEach(([lab, f]) =>
    add("Goles", "Rango de goles", lab, sumWhere(m, (x, y) => f(x + y)), {
      pred: (x, y) => f(x + y), concepto: "rango",
    })
  );

  const td = totalDist(m);
  for (let k = 0; k <= 4; k++)
    add("Goles", "Goles exactos", String(k), td[k], {
      pred: (x, y) => x + y === k, concepto: "exacto",
    });
  add("Goles", "Goles exactos", "5 o más", td.slice(5).reduce((a, b) => a + b, 0), {
    pred: (x, y) => x + y >= 5, concepto: "exacto",
  });

  /* --- Por equipo (marginales reales de la matriz) --- */
  const mg = marginals(m);
  const overTeam = (arr, L) => arr.reduce((s, v, k) => (k > L ? s + v : s), 0);
  const lineasEq = escalera((L) => Math.max(overTeam(mg.h, L), overTeam(mg.a, L)), { min: 4 });
  for (const L of lineasEq) {
    const oh = overTeam(mg.h, L);
    const oa = overTeam(mg.a, L);
    add("Equipos", `${homeName} · total ${L}`, "Más de", oh, {
      pred: (x) => x > L, concepto: "gol-local", core: L <= 1.5,
    });
    add("Equipos", `${homeName} · total ${L}`, "Menos de", 1 - oh, {
      pred: (x) => x < L, concepto: "gol-local",
    });
    add("Equipos", `${awayName} · total ${L}`, "Más de", oa, {
      pred: (x, y) => y > L, concepto: "gol-visita", core: L <= 1.5,
    });
    add("Equipos", `${awayName} · total ${L}`, "Menos de", 1 - oa, {
      pred: (x, y) => y < L, concepto: "gol-visita",
    });
  }
  add("Equipos", "Portería a cero", homeName, mg.a[0], {
    pred: (x, y) => y === 0, concepto: "cs-local",
  });
  add("Equipos", "Portería a cero", awayName, mg.h[0], {
    pred: (x) => x === 0, concepto: "cs-visita",
  });
  add("Equipos", "No marca", homeName, mg.h[0], { pred: (x) => x === 0, concepto: "cs-visita" });
  add("Equipos", "No marca", awayName, mg.a[0], { pred: (x, y) => y === 0, concepto: "cs-local" });

  /* --- Hándicap --- */
  for (const L of [-2.5, -2, -1.75, -1.5, -1.25, -1, -0.75, -0.5, -0.25, 0,
                   0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5]) {
    const r = asianSettle(dist, L);
    const nulo = r.push > 0.005 ? `nulo ${(r.push * 100).toFixed(0)}%` : undefined;
    const half = Number.isInteger(L + 0.5);
    // Cada lado lleva SU línea: si el local juega con −1.5, el visitante
    // juega con +1.5. Etiquetar los dos igual hacía leer "Chapecoense −1.5"
    // cuando en realidad era "Chapecoense +1.5", que es lo contrario.
    add("Hándicap", `Asiático ${tagAsia(L)}`, homeName, r.net, {
      nota: nulo, concepto: "local",
      core: L >= -1.5 && L <= 1.5,
      pred: half ? (x, y) => x - y + L > 0 : undefined,
    });
    add("Hándicap", `Asiático ${tagAsia(-L)}`, awayName, 1 - r.net, {
      nota: nulo, concepto: "visitante",
      core: L >= -1.5 && L <= 1.5,
      pred: half ? (x, y) => x - y + L < 0 : undefined,
    });
  }
  for (const L of [1, 2]) {
    add("Hándicap", `Europeo -${L}`, homeName, sumWhere(m, (x, y) => x - y > L), {
      pred: (x, y) => x - y > L, concepto: "local",
    });
    add("Hándicap", `Europeo -${L}`, "Empate", sumWhere(m, (x, y) => x - y === L), {
      pred: (x, y) => x - y === L, concepto: "margen",
    });
    add("Hándicap", `Europeo -${L}`, awayName, sumWhere(m, (x, y) => x - y < L), {
      pred: (x, y) => x - y < L, concepto: "visitante",
    });
    add("Hándicap", `Europeo +${L}`, awayName, sumWhere(m, (x, y) => y - x > L), {
      pred: (x, y) => y - x > L, concepto: "visitante",
    });
    add("Hándicap", `Europeo +${L}`, "Empate", sumWhere(m, (x, y) => y - x === L), {
      pred: (x, y) => y - x === L, concepto: "margen",
    });
    add("Hándicap", `Europeo +${L}`, homeName, sumWhere(m, (x, y) => y - x < L), {
      pred: (x, y) => y - x < L, concepto: "local",
    });
  }

  /* --- Totales asiáticos --- */
  const asiaticos = [];
  for (let L = 0.75; L <= 5.25; L += 0.25) {
    if (Number.isInteger(L * 2) && !Number.isInteger(L)) continue; // las .5 ya están arriba
    if (overTot(L) < 0.01 && L > 2.5) break;
    asiaticos.push(Number(L.toFixed(2)));
  }
  for (const L of asiaticos) {
    const r = asianTotal(m, L);
    const nulo = r.push > 0.005 ? `nulo ${(r.push * 100).toFixed(0)}%` : undefined;
    add("Goles", `Asiático ${L}`, "Más de", r.net, { nota: nulo, concepto: "over" });
    add("Goles", `Asiático ${L}`, "Menos de", 1 - r.net, { nota: nulo, concepto: "under" });
  }

  /* --- Mitades (dos matrices independientes) --- */
  const halves = [
    ["1ª parte", m1],
    ["2ª parte", m2],
  ];
  halves.forEach(([lab, mm]) => {
    add("Mitades", `${lab} · 1X2`, homeName, sumWhere(mm, (x, y) => x > y), { concepto: "mitad" });
    add("Mitades", `${lab} · 1X2`, "Empate", sumWhere(mm, (x, y) => x === y), { concepto: "mitad" });
    add("Mitades", `${lab} · 1X2`, awayName, sumWhere(mm, (x, y) => x < y), { concepto: "mitad" });
    const tdm = totalDist(mm);
    const overMitad = (L) => tdm.reduce((s, v, k) => (k > L ? s + v : s), 0);
    for (const L of escalera(overMitad, { min: 3 })) {
      const o = overMitad(L);
      add("Mitades", `${lab} · total ${L}`, "Más de", o, { concepto: "mitad-over" });
      add("Mitades", `${lab} · total ${L}`, "Menos de", 1 - o, { concepto: "mitad-under" });
    }
  });
  const bt1 = sumWhere(m1, (x, y) => x > 0 && y > 0);
  add("Mitades", "1ª parte · ambos marcan", "Sí", bt1, { concepto: "mitad" });

  const g1 = 1 - sumWhere(m1, (x, y) => x + y === 0);
  const g2 = 1 - sumWhere(m2, (x, y) => x + y === 0);
  add("Mitades", "Gol en ambas mitades", "Sí", g1 * g2, { concepto: "mitad" });
  add("Mitades", "Gol en ambas mitades", "No", 1 - g1 * g2, { concepto: "mitad" });

  const t1 = totalDist(m1), t2 = totalDist(m2);
  let more1 = 0, more2 = 0, igual = 0;
  for (let i = 0; i < t1.length; i++)
    for (let j = 0; j < t2.length; j++) {
      const p = t1[i] * t2[j];
      if (i > j) more1 += p; else if (j > i) more2 += p; else igual += p;
    }
  add("Mitades", "Mitad con más goles", "1ª parte", more1, { concepto: "mitad" });
  add("Mitades", "Mitad con más goles", "2ª parte", more2, { concepto: "mitad" });
  add("Mitades", "Mitad con más goles", "Igualadas", igual, { concepto: "mitad" });

  /* --- Combinadas exactas: la correlación ya está dentro --- */
  const combo = (lab, pred, concepto) =>
    add("Combinadas", lab.m, lab.s, sumWhere(m, pred), { pred, concepto, core: 1 });

  combo({ m: `${homeName} + goles`, s: "Gana y más de 2.5" }, (x, y) => x > y && x + y > 2.5, "combo");
  combo({ m: `${homeName} + goles`, s: "Gana y menos de 2.5" }, (x, y) => x > y && x + y < 2.5, "combo");
  combo({ m: `${awayName} + goles`, s: "Gana y más de 2.5" }, (x, y) => x < y && x + y > 2.5, "combo");
  combo({ m: `${awayName} + goles`, s: "Gana y menos de 2.5" }, (x, y) => x < y && x + y < 2.5, "combo");
  combo({ m: "Empate + goles", s: "Empate y menos de 2.5" }, (x, y) => x === y && x + y < 2.5, "combo");
  combo({ m: "Ambos marcan + goles", s: "Sí y más de 2.5" }, (x, y) => x > 0 && y > 0 && x + y > 2.5, "combo");
  combo({ m: "Ambos marcan + goles", s: "Sí y menos de 3.5" }, (x, y) => x > 0 && y > 0 && x + y < 3.5, "combo");
  combo({ m: "Ambos marcan + goles", s: "No y menos de 2.5" }, (x, y) => (x === 0 || y === 0) && x + y < 2.5, "combo");
  combo({ m: `${homeName} + ambos marcan`, s: "Gana y ambos marcan" }, (x, y) => x > y && y > 0, "combo");
  combo({ m: `${awayName} + ambos marcan`, s: "Gana y ambos marcan" }, (x, y) => y > x && x > 0, "combo");
  combo({ m: `${homeName} o empate + goles`, s: "No pierde y más de 1.5" }, (x, y) => x >= y && x + y > 1.5, "combo");
  combo({ m: `${awayName} o empate + goles`, s: "No pierde y más de 1.5" }, (x, y) => x <= y && x + y > 1.5, "combo");
  combo({ m: "Gana alguno + goles", s: "Sin empate y más de 2.5" }, (x, y) => x !== y && x + y > 2.5, "combo");

  return out;
}

function topScores(m, n = 8) {
  const list = [];
  for (let x = 0; x < 7; x++) for (let y = 0; y < 7; y++) list.push({ x, y, p: m[x][y] });
  return list.sort((a, b) => b.p - a.p).slice(0, n);
}

/** Formateadores tolerantes: un dato que falta se enseña como raya,
    nunca como "NaN%", que no le dice nada a nadie. */
const fin = (v) => typeof v === "number" && isFinite(v);
const pc = (p) => (fin(p) ? (p * 100).toFixed(1) + "%" : "—");
const pc0 = (p) => (fin(p) ? Math.round(p * 100) + "%" : "—");
const fx = (v, d = 1) => (fin(v) ? v.toFixed(d) : "—");

