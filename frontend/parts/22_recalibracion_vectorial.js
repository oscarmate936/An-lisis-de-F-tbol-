/* ============================================================
   RECALIBRACIÓN VECTORIAL
   Una sola temperatura mueve las tres clases a la vez; el empate
   suele estar mal calibrado aunque local y visitante estén bien.
   ============================================================ */

/** Aplica un escalado vectorial ya ajustado (a, b) a una terna de
    probabilidades. Separado de fitVectorScaling para poder guardar solo
    los números (a, b) y reconstruir esto mismo en cualquier partido, sin
    tener que rehacer el ajuste ni cargar con la función original. */
function applyVectorScaling(p, { a, b }) {
  const lg = [0, 1, 2].map((c) => a[c] * Math.log(Math.max(1e-9, p[c])) + b[c]);
  const mx = Math.max(...lg);
  const ex = lg.map((v) => Math.exp(v - mx));
  const s = ex.reduce((x, y) => x + y, 0);
  return ex.map((v) => v / s);
}

function fitVectorScaling(ps, ys, { iters = 600, lr = 0.05 } = {}) {
  if (ys.length < 400) return null;
  let a = [1, 1, 1], b = [0, 0, 0];
  const n = ys.length;
  for (let it = 0; it < iters; it++) {
    const ga = [0, 0, 0], gb = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const lg = [0, 1, 2].map((c) => a[c] * Math.log(Math.max(1e-9, ps[i][c])) + b[c]);
      const mx = Math.max(...lg);
      const ex = lg.map((v) => Math.exp(v - mx));
      const s = ex.reduce((x, y) => x + y, 0);
      const q = ex.map((v) => v / s);
      for (let c = 0; c < 3; c++) {
        const e = (ys[i] === c ? 1 : 0) - q[c];
        ga[c] += e * Math.log(Math.max(1e-9, ps[i][c]));
        gb[c] += e;
      }
    }
    for (let c = 0; c < 3; c++) { a[c] += lr * ga[c] / n; b[c] += lr * gb[c] / n; }
  }
  const apply = (p) => applyVectorScaling(p, { a, b });
  let ll = 0;
  for (let i = 0; i < n; i++) ll += -Math.log(Math.max(1e-12, apply(ps[i])[ys[i]]));
  return { a, b, ll: ll / n, apply };
}

