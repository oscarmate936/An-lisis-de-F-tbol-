/* ============================================================
   REGRESIÓN LINEAL PEQUEÑA (mínimos cuadrados con regularización)
   ============================================================ */

/** Resuelve (X'X + lambda I) b = X'y por eliminación gaussiana.
    Sirve para relacionar córners con remates y posesión. */
function fitOLS(X, y, lambda = 1e-3) {
  const n = X.length;
  if (!n) return null;
  const d = X[0].length;
  const A = Array.from({ length: d }, (_, i) => Array.from({ length: d + 1 }, () => 0));
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * X[k][j];
      A[i][j] = s + (i === j ? lambda * n : 0);
    }
    let s = 0;
    for (let k = 0; k < n; k++) s += X[k][i] * y[k];
    A[i][d] = s;
  }
  for (let c = 0; c < d; c++) {
    let piv = c;
    for (let r = c + 1; r < d; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-12) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < d; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j <= d; j++) A[r][j] -= f * A[c][j];
    }
  }
  const b = A.map((row, i) => row[d] / row[i]);
  // R² para saber si el ajuste vale algo
  const my = y.reduce((a, v) => a + v, 0) / n;
  let ss = 0, st = 0;
  for (let k = 0; k < n; k++) {
    const p = X[k].reduce((a, v, i) => a + v * b[i], 0);
    ss += (y[k] - p) ** 2; st += (y[k] - my) ** 2;
  }
  return { b, r2: st > 0 ? 1 - ss / st : 0, n, predict: (x) => x.reduce((a, v, i) => a + v * b[i], 0) };
}

