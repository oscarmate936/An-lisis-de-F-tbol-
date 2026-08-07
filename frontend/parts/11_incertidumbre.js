/* ============================================================
   INCERTIDUMBRE
   ============================================================ */

/** Cuánto puede moverse una probabilidad si las fuerzas estimadas
    están mal por el ruido normal de una muestra corta. */
function uncertainty(lh, la, nH, nA, rho, fns, draws = 160) {
  const seH = 1 / Math.sqrt(Math.max(3, nH * lh));
  const seA = 1 / Math.sqrt(Math.max(3, nA * la));
  const acc = fns.map(() => []);
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  for (let i = 0; i < draws; i++) {
    const m = scoreMatrix(
      clamp(lh * Math.exp(gauss() * seH), 0.1, 6),
      clamp(la * Math.exp(gauss() * seA), 0.1, 6), rho);
    fns.forEach((f, j) => acc[j].push(sumWhere(m, f)));
  }
  return acc.map((a) => {
    a.sort((x, y) => x - y);
    return { lo: a[Math.floor(draws * 0.1)], hi: a[Math.floor(draws * 0.9)] };
  });
}

