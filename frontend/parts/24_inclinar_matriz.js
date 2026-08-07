/* ============================================================
   INCLINAR LA MATRIZ HACIA OTRO PRONÓSTICO
   Permite que el ensamble mande sobre TODOS los mercados, no solo
   sobre el 1X2: se buscan los goles esperados que lo reproducen.
   ============================================================ */
function tiltLambdas(lh, la, target, opts, iters = 40) {
  let s = 0, t = 0; // s = supremacía, t = ritmo, ambos en logaritmos
  const probs = (s2, t2) => {
    const a = clamp(lh * Math.exp(s2 + t2), 0.08, 7), b = clamp(la * Math.exp(-s2 + t2), 0.08, 7);
    const m = buildMatrix(a, b, opts);
    const pH = sumWhere(m, (x, y) => x > y), pD = sumWhere(m, (x, y) => x === y);
    return { pH, pA: 1 - pH - pD, a, b };
  };
  const h = 0.01;
  for (let i = 0; i < iters; i++) {
    const c = probs(s, t);
    const e1 = c.pH - target[0], e2 = c.pA - target[2];
    if (Math.abs(e1) < 2e-4 && Math.abs(e2) < 2e-4) break;
    const ds = probs(s + h, t), dt = probs(s, t + h);
    const J = [[(ds.pH - c.pH) / h, (dt.pH - c.pH) / h],
               [(ds.pA - c.pA) / h, (dt.pA - c.pA) / h]];
    const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    if (Math.abs(det) < 1e-9) break;
    s -= 0.7 * (J[1][1] * e1 - J[0][1] * e2) / det;
    t -= 0.7 * (-J[1][0] * e1 + J[0][0] * e2) / det;
    s = clamp(s, -1.2, 1.2); t = clamp(t, -0.8, 0.8);
  }
  const f = probs(s, t);
  return { lh: f.a, la: f.b, err: Math.abs(f.pH - target[0]) + Math.abs(f.pA - target[2]) };
}

