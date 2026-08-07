/* ============================================================
   REGISTRO PROSPECTIVO
   La única validación que no se puede trampear: se guarda el
   pronóstico ANTES del partido y se puntúa después.
   ============================================================ */

const LOG_KEY = "registro:v1";

async function logRead() {
  try {
    const r = await storage.get(LOG_KEY);
    const j = JSON.parse(r.value);
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

async function logSave(entry) {
  const all = await logRead();
  if (all.some((x) => x.fx === entry.fx)) return all;
  const next = [...all, entry].slice(-400);
  try { await storage.set(LOG_KEY, JSON.stringify(next)); } catch (e) { /* sin espacio */ }
  return next;
}

async function logClear() {
  try { await storage.delete(LOG_KEY); } catch (e) { /* ya estaba vacío */ }
}

/** Puntúa las entradas cuyo partido ya terminó. */
function scoreLog(entries) {
  const done = entries.filter((e) => e.gh !== undefined && e.gh !== null);
  if (!done.length) return null;
  let ll = 0, br = 0, hits = 0, llO = 0, brO = 0, brB = 0, base = 0, rpsT = 0;
  let brC = 0, nC = 0, brT = 0, nT = 0;
  const acum = [];
  const bins = Array.from({ length: 10 }, () => ({ p: 0, k: 0, n: 0 }));
  const bh = done.filter((e) => e.gh > e.ga).length / done.length;
  const bd = done.filter((e) => e.gh === e.ga).length / done.length;
  const ba = 1 - bh - bd;
  done.forEach((e) => {
    const ps = [e.pH, e.pD, e.pA];
    const res = e.gh > e.ga ? 0 : e.gh === e.ga ? 1 : 2;
    ll += -Math.log(Math.max(1e-12, ps[res]));
    br += ps.reduce((s, v, i) => s + (v - (i === res ? 1 : 0)) ** 2, 0);
    if (ps.indexOf(Math.max(...ps)) === res) hits++;
    rpsT += rps(ps, res);
    const o = e.gh + e.ga > 2.5 ? 1 : 0;
    llO += -Math.log(Math.max(1e-12, o ? e.pO : 1 - e.pO));
    brO += (e.pO - o) ** 2;
    if (e.pB !== undefined) {
      const b2 = e.gh > 0 && e.ga > 0 ? 1 : 0;
      brB += (e.pB - b2) ** 2;
    }
    if (e.pC !== undefined && e.cAct !== undefined && e.cAct !== null) {
      nC++; brC += (e.pC - (e.cAct > 9.5 ? 1 : 0)) ** 2;
    }
    if (e.pT !== undefined && e.tAct !== undefined && e.tAct !== null) {
      nT++; brT += (e.pT - (e.tAct > 4.5 ? 1 : 0)) ** 2;
    }
    base += -Math.log(Math.max(1e-9, [bh, bd, ba][res]));
    ps.forEach((v, i) => {
      const b = bins[Math.min(9, Math.floor(v * 10))];
      b.p += v; b.k += i === res ? 1 : 0; b.n++;
    });
  });
  const n = done.length;
  // Evolución semanal: si el modelo se degrada con el tiempo, aquí se ve.
  const semanas = new Map();
  done.forEach((e) => {
    const d = new Date(e.date);
    const k = `${d.getFullYear()}-S${String(Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + 1) / 7)).padStart(2, "0")}`;
    if (!semanas.has(k)) semanas.set(k, { k, n: 0, ll: 0, acc: 0 });
    const s = semanas.get(k);
    const ps = [e.pH, e.pD, e.pA];
    const res = e.gh > e.ga ? 0 : e.gh === e.ga ? 1 : 2;
    s.n++; s.ll += -Math.log(Math.max(1e-12, ps[res]));
    s.acc += ps.indexOf(Math.max(...ps)) === res ? 1 : 0;
  });
  // Curva acumulada: cómo se ha ido asentando el log-loss partido a partido.
  let run = 0;
  done.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((e, i) => {
    const ps = [e.pH, e.pD, e.pA];
    const res = e.gh > e.ga ? 0 : e.gh === e.ga ? 1 : 2;
    run += -Math.log(Math.max(1e-12, ps[res]));
    acum.push({ i: i + 1, ll: run / (i + 1) });
  });
  return {
    n, pend: entries.length - n,
    logloss: ll / n, brier: br / n, acc: hits / n, rps: rpsT / n,
    brierCorners: nC ? brC / nC : null, nCorners: nC,
    brierCards: nT ? brT / nT : null, nCards: nT,
    acum,
    lloverU: llO / n, brierOver: brO / n, brierBtts: brB / n, baseLl: base / n,
    ci: bootCI(done.map((e) => {
      const ps = [e.pH, e.pD, e.pA];
      const res = e.gh > e.ga ? 0 : e.gh === e.ga ? 1 : 2;
      return -Math.log(Math.max(1e-12, ps[res]));
    }), 400),
    semanas: [...semanas.values()].sort((a, b) => a.k.localeCompare(b.k))
      .map((s) => ({ ...s, ll: s.ll / s.n, acc: s.acc / s.n })),
    bins: bins.map((b) => ({ ...b, avgP: b.n ? b.p / b.n : 0, obs: b.n ? b.k / b.n : 0 })),
  };
}

