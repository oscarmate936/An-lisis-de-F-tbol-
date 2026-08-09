/* ============================================================
   REGRESIÓN LOGÍSTICA ORDINAL (odds proporcionales)
   Trata local < empate < visitante como lo que son: una escala.
   ============================================================ */

function fitOrdinal(rows, { iters = 400, lr = 0.12, l2 = 0.02 } = {}) {
  if (rows.length < 40) return null;
  const d = rows[0].x.length;
  let beta = new Array(d).fill(0);
  let th1 = -0.4, dlt = Math.log(1.0);
  const sig = (z) => 1 / (1 + Math.exp(-z));
  for (let it = 0; it < iters; it++) {
    const gb = new Array(d).fill(0);
    let g1 = 0, gd2 = 0;
    const th2 = th1 + Math.exp(dlt);
    for (const r of rows) {
      let z = 0;
      for (let j = 0; j < d; j++) z += beta[j] * r.x[j];
      const a = sig(th1 - z), b = sig(th2 - z);
      const p = [a, b - a, 1 - b];
      const y = r.y;
      const P = Math.max(1e-9, p[y]);
      // derivadas de -log p[y]
      const da = a * (1 - a), db = b * (1 - b);
      let d1 = 0, d2 = 0, dz = 0;
      if (y === 0) { d1 = da; dz = -da; }
      else if (y === 1) { d1 = -da; d2 = db; dz = da - db; }
      else { d2 = -db; dz = db; }
      g1 += d1 / P;
      gd2 += (d2 / P) * Math.exp(dlt);
      for (let j = 0; j < d; j++) gb[j] += (dz / P) * r.x[j];
    }
    const n = rows.length;
    for (let j = 0; j < d; j++) beta[j] += lr * (gb[j] / n - l2 * beta[j]);
    th1 += lr * (g1 / n);
    dlt += lr * (gd2 / n);
  }
  const th2 = th1 + Math.exp(dlt);
  // Si el descenso se ha ido a infinito, más vale no tener modelo que
  // tener uno que reparte NaN por toda la app.
  if (![...beta, th1, th2].every((v) => typeof v === "number" && isFinite(v))) return null;
  return {
    beta, th1, th2,
    predict(x) {
      let z = 0;
      for (let j = 0; j < x.length; j++) z += this.beta[j] * x[j];
      if (!isFinite(z)) return [1 / 3, 1 / 3, 1 / 3];
      const a = 1 / (1 + Math.exp(-(this.th1 - z)));
      const b = 1 / (1 + Math.exp(-(this.th2 - z)));
      const p = [a, Math.max(1e-6, b - a), Math.max(1e-6, 1 - b)];
      const s = p.reduce((x, y) => x + y, 0);
      return s > 0 && isFinite(s) ? p.map((v) => v / s) : [1 / 3, 1 / 3, 1 / 3];
    },
  };
}

