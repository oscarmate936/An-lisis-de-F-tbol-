/* ============================================================
   SKELLAM: diferencia de goles en forma cerrada
   ============================================================ */

function besselI(v, z) {
  let s = 0;
  const lz = Math.log(z / 2);
  for (let m = 0; m < 70; m++) {
    const t = Math.exp((2 * m + v) * lz - LOGFACT[Math.min(m, 40)] -
      (m <= 40 ? lgamma(m + v + 1) : lgamma(m + v + 1)) - (m > 40 ? lgamma(m + 1) - LOGFACT[40] : 0));
    if (!isFinite(t)) break;
    s += t;
    if (m > 5 && t < 1e-14 * s) break;
  }
  return s;
}

/** P(goles local − goles visitante = k). Da hándicaps exactos sin
    depender de dónde cortemos la matriz. */
function skellamPmf(k, l1, l2) {
  if (l1 <= 0 && l2 <= 0) return k === 0 ? 1 : 0;
  if (l2 <= 0) return poisPmf(k, l1);
  if (l1 <= 0) return poisPmf(-k, l2);
  const a = Math.abs(k);
  return Math.exp(-(l1 + l2) + (k / 2) * Math.log(l1 / l2)) * besselI(a, 2 * Math.sqrt(l1 * l2));
}

function skellamDist(l1, l2, lim = 12) {
  const out = new Map();
  for (let k = -lim; k <= lim; k++) out.set(k, skellamPmf(k, l1, l2));
  const s = [...out.values()].reduce((a, b) => a + b, 0);
  out.forEach((v, k) => out.set(k, v / s));
  return out;
}

