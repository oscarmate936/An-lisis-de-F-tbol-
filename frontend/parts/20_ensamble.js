/* ============================================================
   ENSAMBLE APILADO
   Los modelos fallan en sitios distintos: mezclarlos suele ganar
   a cualquiera por separado. Pesos por EM sobre log-verosimilitud.
   ============================================================ */

function fitMixture(sets, ys, iters = 200) {
  const K = sets.length;
  let w = new Array(K).fill(1 / K);
  const n = ys.length;
  if (!n || !K) return w;
  const sano = (v) => (typeof v === "number" && isFinite(v) && v > 0 ? v : 1e-9);
  for (let it = 0; it < iters; it++) {
    const nw = new Array(K).fill(0);
    for (let i = 0; i < n; i++) {
      let den = 0;
      const num = [];
      for (let k = 0; k < K; k++) { const v = w[k] * sano(sets[k]?.[i]?.[ys[i]]); num.push(v); den += v; }
      if (!(den > 0) || !isFinite(den)) continue;
      for (let k = 0; k < K; k++) nw[k] += num[k] / den;
    }
    const s = nw.reduce((a, b) => a + b, 0);
    if (!(s > 0) || !isFinite(s)) return new Array(K).fill(1 / K);
    w = nw.map((v) => v / s);
  }
  return w;
}

const mixProbs = (sets, w, i) =>
  [0, 1, 2].map((c) => sets.reduce((a, s, k) => a + w[k] * s[i][c], 0));

/** Rasgos de un partido calculados solo con lo anterior: Elo, goles
    esperados, descanso, historial directo y puntos por partido. */
function featureState() {
  return { pts: new Map(), pj: new Map(), last: new Map(), h2h: new Map() };
}
const h2hKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function featuresFor(S, m, L) {
  const ppg = (id) => (S.pj.get(id) ? S.pts.get(id) / S.pj.get(id) : 1.3);
  const rest = (id) => (S.last.has(id) ? clamp((m.t - S.last.get(id)) / 86400000, 1, 14) : 7);
  const hh = S.h2h.get(h2hKey(m.h, m.a)) || [];
  // Historial directo, encogido: cuatro partidos no son una ley.
  const margen = hh.length
    ? hh.reduce((a, x) => a + (x.low === m.h ? x.d : -x.d), 0) / (hh.length + 3)
    : 0;
  return {
    x: [
      (m.eloDiff || 0) / 400,
      L.lh - L.la,
      L.lh + L.la - 2.6,
      clamp(margen, -3, 3),
      (rest(m.h) - rest(m.a)) / 7,
      ppg(m.h) - ppg(m.a),
    ],
    ppgDiff: ppg(m.h) - ppg(m.a),
    h2hN: hh.length,
  };
}

function featureUpdate(S, m) {
  const p = (id, v) => { S.pts.set(id, (S.pts.get(id) || 0) + v); S.pj.set(id, (S.pj.get(id) || 0) + 1); };
  p(m.h, m.gh > m.ga ? 3 : m.gh === m.ga ? 1 : 0);
  p(m.a, m.ga > m.gh ? 3 : m.gh === m.ga ? 1 : 0);
  S.last.set(m.h, m.t); S.last.set(m.a, m.t);
  const k = h2hKey(m.h, m.a);
  const low = Math.min(m.h, m.a);
  const d = (low === m.h ? 1 : -1) * (m.gh - m.ga);
  S.h2h.set(k, [...(S.h2h.get(k) || []), { t: m.t, low, d }].slice(-6));
}

/** Recorre la temporada calculando, para cada partido, la predicción
    de cada motor y la mezcla aprendida solo con el pasado. */
/* Un teléfono no tiene el músculo de un portátil y usa el mismo hilo para
   calcular y para pintar: bloquearlo veinte segundos se ve exactamente
   igual que si la app se hubiera colgado. */
const EQUIPO_LENTO = (() => {
  try {
    const nucleos = navigator.hardwareConcurrency || 4;
    const ram = navigator.deviceMemory || 4;
    const tactil = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    return nucleos <= 4 || ram <= 4 || tactil;
  } catch (e) { return false; }
})();

/* Se puede exigir el cálculo entero aunque el aparato sea modesto: mismos
   datos y mismas simulaciones que en un ordenador. Tarda bastante más,
   pero como el hilo se sigue cediendo, la pantalla no se congela. */
let CALCULO_COMPLETO = (() => {
  try { return localStorage.getItem("calculo-completo") === "1"; } catch (e) { return false; }
})();
function ponCalculoCompleto(v) {
  CALCULO_COMPLETO = !!v;
  try { localStorage.setItem("calculo-completo", v ? "1" : "0"); } catch (e) { /* sin espacio */ }
}
/** Recortar o no. Se consulta en cada cálculo, no al cargar la página,
    así el interruptor surte efecto sin recargar. */
const recortar = () => EQUIPO_LENTO && !CALCULO_COMPLETO;

/* Trocea un cálculo largo: cada 40 ms devuelve el control al navegador
   para que pueda pintar y atender a los toques. El backtest tarda algo
   más en total, pero la pantalla nunca deja de responder. */
function rebanador(ms = 40) {
  let t = Date.now();
  return async function ceder() {
    if (Date.now() - t < ms) return;
    t = Date.now();
    await new Promise((r) => setTimeout(r, 0));
  };
}

async function runEnsemble(list, P, block, onAvance) {
  const corto = recortar();
  const paso = block || (corto ? 25 : 10);
  // Arrastrar dos temporadas enteras multiplica el trabajo sin mejorar el
  // ajuste de este partido: en un móvil basta la ventana reciente.
  const datos = corto && list.length > 320 ? list.slice(-320) : list;
  const ceder = rebanador();
  const elo = runElo(datos, { K: P.eloK ?? 20, hfa: P.eloHfa ?? 55 });
  const conElo = elo.rows;
  const S = featureState();
  const out = [];
  let fit = null, ord = null, tab = null, w = null, lastFit = -1;
  const hist = { dc: [], x: [], tab: [], y: [] };
  for (let i = 0; i < datos.length; i++) {
    await ceder();
    if (onAvance) onAvance(i / datos.length);
    const m = conElo[i];
    if (i >= P.minGames * 8 && (fit === null || i - lastFit >= paso)) {
      fit = (P.autoShrink ? fitDixonColesEB : fitDixonColes)(datos.slice(0, i),
        { halfLife: P.halfLife * 2, ref: datos[i].t, prior: P.k });
      if (hist.y.length >= 60) {
        ord = fitOrdinal(hist.y.map((y, j) => ({ x: hist.x[j], y })));
        // Tercer motor: solo puntos por partido. Ignora los goles, así
        // que se equivoca en sitios distintos que los otros dos.
        tab = fitOrdinal(hist.y.map((y, j) => ({ x: hist.tab[j], y })));
        if (ord && tab) {
          w = fitMixture([hist.dc, hist.x.map((x) => ord.predict(x)),
            hist.tab.map((x) => tab.predict(x))], hist.y);
        }
      }
      lastFit = i;
    }
    if (!fit) { featureUpdate(S, datos[i]); continue; }
    const L = lambdasFromFit(fit, m.h, m.a);
    if (!L || (fit.games.get(m.h) || 0) < P.minGames || (fit.games.get(m.a) || 0) < P.minGames) {
      featureUpdate(S, datos[i]);
      continue;
    }
    const F = featuresFor(S, m, L);
    const mat = buildMatrix(L.lh, L.la, { rho: P.rho, corr: P.corr, theta: P.theta, nu: P.nu });
    const pH = sumWhere(mat, (x, y) => x > y), pD = sumWhere(mat, (x, y) => x === y);
    const pDC = [pH, pD, Math.max(1e-6, 1 - pH - pD)];
    const pOrd = ord ? ord.predict(F.x) : null;
    const pTab = tab ? tab.predict([F.ppgDiff]) : null;
    const y = m.gh > m.ga ? 0 : m.gh === m.ga ? 1 : 2;
    const pEns = pOrd && pTab && w
      ? [0, 1, 2].map((c) => w[0] * pDC[c] + w[1] * pOrd[c] + w[2] * pTab[c])
      : pDC;
    out.push({ lh: L.lh, la: L.la, gh: m.gh, ga: m.ga, date: m.date, hn: m.hn, an: m.an,
      pDC, pOrd, pTab, pEns, w: w ? [...w] : null, eloDiff: m.eloDiff, x: F.x, ppgDiff: F.ppgDiff,
      pO: sumWhere(mat, (x, y) => x + y > 2.5), pB: sumWhere(mat, (x, y) => x > 0 && y > 0) });
    hist.dc.push(pDC); hist.x.push(F.x); hist.tab.push([F.ppgDiff]); hist.y.push(y);
    featureUpdate(S, datos[i]);
  }
  return out;
}

/** Ensamble para un partido concreto: entrena los tres motores con todo
    lo anterior y devuelve la mezcla aprendida. */
async function ensemblePredict(previos, P, homeId, awayId, kickoff, onAvance) {
  if (!previos || previos.length < 80) return null;
  const rows = await runEnsemble(previos, P, undefined, onAvance);
  if (rows.length < 60) return null;
  const train = rows.map((r) => ({ x: r.x, tab: [r.ppgDiff],
    y: r.gh > r.ga ? 0 : r.gh === r.ga ? 1 : 2 }));
  const ord = fitOrdinal(train);
  const tab = fitOrdinal(train.map((t) => ({ x: t.tab, y: t.y })));
  if (!ord || !tab) return null;
  const w = fitMixture([rows.map((r) => r.pDC), train.map((t) => ord.predict(t.x)),
    train.map((t) => tab.predict(t.tab))], train.map((t) => t.y));
  const fit = (P.autoShrink ? fitDixonColesEB : fitDixonColes)(previos,
    { halfLife: P.halfLife * 2, ref: kickoff, prior: P.k });
  const L = fit && lambdasFromFit(fit, homeId, awayId);
  if (!L) return null;
  const elo = runElo(previos, { K: P.eloK ?? 20, hfa: P.eloHfa ?? 55 });
  const rh = elo.ratings.get(homeId), ra = elo.ratings.get(awayId);
  if (rh === undefined || ra === undefined) return null;
  // Estado de rasgos al día de hoy
  const S = featureState();
  previos.forEach((m) => featureUpdate(S, m));
  const eloDiff = rh + (P.eloHfa ?? 55) - ra;
  const F = featuresFor(S, { h: homeId, a: awayId, t: kickoff, eloDiff }, L);
  const pOrd = ord.predict(F.x);
  const pTab = tab.predict([F.ppgDiff]);
  const mat = buildMatrix(L.lh, L.la, { rho: P.rho, corr: P.corr, theta: P.theta, nu: P.nu });
  const pH = sumWhere(mat, (x, y) => x > y), pD = sumWhere(mat, (x, y) => x === y);
  const pDC = [pH, pD, Math.max(1e-6, 1 - pH - pD)];
  const pEns = [0, 1, 2].map((c) => w[0] * pDC[c] + w[1] * pOrd[c] + w[2] * pTab[c]);
  const suma = pEns.reduce((a, b) => a + b, 0);
  if (!(suma > 0.99 && suma < 1.01) || pEns.some((v) => !isFinite(v))) return null;
  return { pDC, pOrd, pTab, pEns, w, eloDiff, rh, ra, n: rows.length,
    h2hN: F.h2hN, ppgDiff: F.ppgDiff, h2h: F.x[3] };
}

