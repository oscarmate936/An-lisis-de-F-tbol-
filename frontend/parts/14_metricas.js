/* ============================================================
   MÉTRICAS: RPS, INTERVALOS Y SEGMENTOS
   ============================================================ */

/** Ranked Probability Score: a diferencia del Brier, respeta que
    local, empate y visitante están ordenados. Fallar un local
    poniendo visitante penaliza más que poner empate. */
function rps(ps, res) {
  const c = [ps[0], ps[0] + ps[1]];
  const o = [res === 0 ? 1 : 0, res <= 1 ? 1 : 0];
  return ((c[0] - o[0]) ** 2 + (c[1] - o[1]) ** 2) / 2;
}

/** Intervalo por remuestreo: sin esto es imposible saber si una
    mejora de 0.004 es real o es ruido de la muestra. */
function bootCI(losses, B = 600, alpha = 0.05) {
  const n = losses.length;
  if (n < 10) return null;
  const ms = [];
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += losses[(Math.random() * n) | 0];
    ms.push(s / n);
  }
  ms.sort((a, b) => a - b);
  return { lo: ms[Math.floor(B * alpha / 2)], hi: ms[Math.floor(B * (1 - alpha / 2))] };
}

/** Diferencia entre dos modelos sobre los MISMOS partidos: se
    remuestrean los pares, que es lo que da un intervalo honesto. */
function bootDiff(a, b, B = 600) {
  const n = Math.min(a.length, b.length);
  if (n < 10) return null;
  const ds = [];
  for (let k = 0; k < B; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) { const j = (Math.random() * n) | 0; s += a[j] - b[j]; }
    ds.push(s / n);
  }
  ds.sort((x, y) => x - y);
  return { lo: ds[Math.floor(B * 0.025)], hi: ds[Math.floor(B * 0.975)],
    med: ds[Math.floor(B * 0.5)] };
}

const SEGMENTOS = [
  ["Favorito claro", (r) => Math.max(r.pH, r.pA) >= 0.55],
  ["Partido parejo", (r) => Math.max(r.pH, r.pD, r.pA) < 0.45],
  ["Se espera goleada", (r) => r.lh + r.la >= 3],
  ["Se espera partido cerrado", (r) => r.lh + r.la < 2.4],
  ["Local favorito", (r) => r.pH >= r.pA],
  ["Visitante favorito", (r) => r.pA > r.pH],
];

function segmentar(rows) {
  return SEGMENTOS.map(([label, test]) => {
    const sel = rows.filter(test);
    if (sel.length < 15) return { label, n: sel.length, corto: true };
    const ll = sel.reduce((a, r) => a + r.ll, 0) / sel.length;
    const rp = sel.reduce((a, r) => a + r.rps, 0) / sel.length;
    const ac = sel.filter((r) => r.acierto).length / sel.length;
    return { label, n: sel.length, logloss: ll, rps: rp, acc: ac,
      ci: bootCI(sel.map((r) => r.ll), 300) };
  });
}

