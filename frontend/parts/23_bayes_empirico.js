/* ============================================================
   BAYES EMPÍRICO
   ============================================================ */

/** Estima el previo Gamma de una tasa por 90 minutos a partir de la
    propia muestra, en vez de fijarlo a ojo. Devuelve alfa y beta. */
function empiricalGamma(obs) {
  const use = obs.filter((o) => o.n > 0.5);
  if (use.length < 6) return null;
  const N = use.reduce((a, o) => a + o.n, 0);
  const Y = use.reduce((a, o) => a + o.y, 0);
  const m = Y / N;
  if (m <= 0) return null;
  // Varianza entre jugadores por encima del ruido de Poisson.
  let sw = 0, sv = 0;
  use.forEach((o) => { const r = o.y / o.n; sw += o.n; sv += o.n * (r - m) ** 2; });
  if (!(sw > 0)) return { alpha: m * 60, beta: 60, weak: true };
  const total = sv / sw;
  const ruido = m / (N / use.length);
  const entre = total - ruido;
  // Sin variación detectable entre jugadores, el previo manda casi del todo.
  if (!(entre > 1e-6)) return { alpha: m * 60, beta: 60, weak: true };
  const beta = m / entre;
  return { alpha: m * beta, beta, weak: false };
}

/** Ajuste con el encogimiento deducido de los propios datos: en vez de
    fijar cuántos partidos hacen falta para creerse a un equipo, se mide
    cuánta variación real hay entre los equipos de esa liga. */
function fitDixonColesEB(matches, opts = {}, rondas = 3) {
  let fit = fitDixonColes(matches, opts);
  if (!fit) return null;
  let prior = opts.prior ?? 4;
  for (let i = 0; i < rondas; i++) {
    const sh = empiricalShrink(fit);
    if (!sh) break;
    if (Math.abs(sh.prior - prior) < 0.15) { fit.eb = sh; break; }
    prior = sh.prior;
    fit = fitDixonColes(matches, { ...opts, prior });
    fit.eb = sh;
  }
  fit.priorUsado = prior;
  return fit;
}

/** Encogimiento del ataque y la defensa deducido de los datos:
    cuánta variación real hay entre equipos de esta liga. */
function empiricalShrink(fit) {
  if (!fit) return null;
  const ids = fit.ids;
  const logs = ids.map((i) => Math.log(Math.max(0.2, fit.atk.get(i))));
  const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
  const varTot = logs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, logs.length - 1);
  const ruido = ids.reduce((a, i) => a + 1 / Math.max(2, fit.goals.get(i) || 2), 0) / ids.length;
  const tau2 = Math.max(1e-4, varTot - ruido);
  return { tau2, prior: clamp(1 / tau2 / 30, 1, 30), varTot, ruido };
}

