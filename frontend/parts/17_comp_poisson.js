/* ============================================================
   CONWAY-MAXWELL-POISSON
   Los goles no son exactamente Poisson: hay algo de subdispersión.
   nu > 1 aprieta la distribución, nu < 1 la abre. nu = 1 es Poisson.
   ============================================================ */

function cmpRaw(lam, nu, n) {
  const out = [];
  let z = 0;
  for (let k = 0; k < n; k++) {
    const v = Math.exp(k * Math.log(Math.max(1e-12, lam)) - nu * LOGFACT[Math.min(k, 40)]);
    out.push(v); z += v;
  }
  return out.map((v) => v / z);
}

const cmpMean = (lam, nu, n) => cmpRaw(lam, nu, n).reduce((s, v, k) => s + v * k, 0);

/** Marginal de cuentas con la media fijada en mu: si nu ≠ 1 hay que
    resolver el parámetro interno para no mover el gol esperado. */
function countMarginal(mu0, nu0 = 1, n = GRID) {
  const mu = lamSano(mu0);
  const nu = typeof nu0 === "number" && isFinite(nu0) ? clamp(nu0, 0.3, 3) : 1;
  if (Math.abs(nu - 1) < 1e-6) {
    const out = [];
    let s = 0;
    for (let k = 0; k < n; k++) { const v = poisPmf(k, mu); out.push(v); s += v; }
    return out.map((v) => v / s);
  }
  let lo = 1e-4, hi = Math.max(20, Math.pow(mu + 3, nu) * 4);
  for (let i = 0; i < 45; i++) {
    const mid = (lo + hi) / 2;
    if (cmpMean(mid, nu, n) < mu) lo = mid; else hi = mid;
  }
  return cmpRaw((lo + hi) / 2, nu, n);
}

/** Punto único de construcción de la matriz para todos los motores. */
function buildMatrix(lh0, la0, { rho = -0.13, corr = "dc", theta = 0.06, nu = 1, n = GRID } = {}) {
  const lh = lamSano(lh0), la = lamSano(la0);
  if (corr === "copula") return copulaMatrix(lh, la, theta, n, nu);
  if (Math.abs(nu - 1) > 1e-6) {
    const mh = countMarginal(lh, nu, n), ma = countMarginal(la, nu, n);
    const m = [];
    let tot = 0;
    for (let x = 0; x < n; x++) {
      m[x] = [];
      for (let y = 0; y < n; y++) {
        let tau = 1;
        if (x === 0 && y === 0) tau = 1 - lh * la * rho;
        else if (x === 0 && y === 1) tau = 1 + lh * rho;
        else if (x === 1 && y === 0) tau = 1 + la * rho;
        else if (x === 1 && y === 1) tau = 1 - rho;
        const v = Math.max(0, tau) * mh[x] * ma[y];
        m[x][y] = v; tot += v;
      }
    }
    if (!(tot > 0) || !isFinite(tot)) return scoreMatrix(lh, la, rho, n);
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) m[x][y] /= tot;
    return m;
  }
  return scoreMatrix(lh, la, rho, n);
}

