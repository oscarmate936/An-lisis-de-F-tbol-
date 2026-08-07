/* ============================================================
   CÓPULA GAUSSIANA
   Dixon-Coles solo corrige cuatro marcadores. Una cópula ata las
   dos marginales en todo el rango, también en partidos de muchos goles.
   ============================================================ */

const normCdf = (x) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 +
    t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
};

const GL20 = [
  [-0.9931286, 0.0176140], [-0.9639719, 0.0406014], [-0.9122344, 0.0626720],
  [-0.8391170, 0.0832767], [-0.7463319, 0.1019301], [-0.6360537, 0.1181945],
  [-0.5108670, 0.1316886], [-0.3737061, 0.1420961], [-0.2277859, 0.1491730],
  [-0.0765265, 0.1527534], [0.0765265, 0.1527534], [0.2277859, 0.1491730],
  [0.3737061, 0.1420961], [0.5108670, 0.1316886], [0.6360537, 0.1181945],
  [0.7463319, 0.1019301], [0.8391170, 0.0832767], [0.9122344, 0.0626720],
  [0.9639719, 0.0406014], [0.9931286, 0.0176140],
];

/** Normal bivariante por cuadratura sobre la fórmula de Plackett. */
function biNormCdf(a, b, r) {
  if (Math.abs(r) < 1e-9) return normCdf(a) * normCdf(b);
  let s = 0;
  const half = r / 2;
  for (const [x, w] of GL20) {
    const rr = half * (x + 1);
    const d = 1 - rr * rr;
    s += w * Math.exp(-(a * a - 2 * rr * a * b + b * b) / (2 * d)) / Math.sqrt(d);
  }
  return normCdf(a) * normCdf(b) + (half / (2 * Math.PI)) * s;
}

const probit = (p) => {
  const q = clamp(p, 1e-9, 1 - 1e-9);
  let lo = -8, hi = 8;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (normCdf(m) < q) lo = m; else hi = m; }
  return (lo + hi) / 2;
};

/** Matriz de marcadores con marginales Poisson (o CMP) unidas por una
    cópula gaussiana. theta positivo empuja los dos marcadores a moverse
    juntos, que es lo que infla el empate (el papel del rho de Dixon-Coles). */
function copulaMatrix(lh0, la0, theta = 0.06, n = GRID, nu = 1) {
  const lh = lamSano(lh0), la = lamSano(la0);
  const th = typeof theta === "number" && isFinite(theta) ? clamp(theta, -0.95, 0.95) : 0;
  const mh = countMarginal(lh, nu, n), ma = countMarginal(la, nu, n);
  const Fh = [], Fa = [];
  let ch = 0, ca = 0;
  for (let i = 0; i < n; i++) { ch += mh[i]; ca += ma[i]; Fh.push(ch); Fa.push(ca); }
  const zh = Fh.map(probit), za = Fa.map(probit);
  const m = [];
  let tot = 0;
  for (let x = 0; x < n; x++) {
    m[x] = [];
    for (let y = 0; y < n; y++) {
      const A = biNormCdf(zh[x], za[y], th);
      const B = x > 0 ? biNormCdf(zh[x - 1], za[y], th) : 0;
      const C = y > 0 ? biNormCdf(zh[x], za[y - 1], th) : 0;
      const D = x > 0 && y > 0 ? biNormCdf(zh[x - 1], za[y - 1], th) : 0;
      const v = Math.max(0, A - B - C + D);
      m[x][y] = isFinite(v) ? v : 0; tot += m[x][y];
    }
  }
  if (!(tot > 0) || !isFinite(tot)) return scoreMatrix(lh, la, 0, n);
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) m[x][y] /= tot;
  return m;
}

