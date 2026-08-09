/* ============================================================
   RECALIBRACIÓN Y OBJETIVOS
   ============================================================ */

/** Temperatura: si el modelo va sobrado de confianza, achata; si se queda
    corto, estira. Se aprende de los propios resultados. */
function applyTemp(ps, T) {
  if (T === 1) return ps;
  const p = ps.map((v) => Math.pow(Math.max(1e-9, v), 1 / T));
  const s = p.reduce((a, b) => a + b, 0);
  return p.map((v) => v / s);
}

function fitTemperature(preds, rho) {
  const cache = preds.map((q) => {
    const m = scoreMatrix(q.lh, q.la, rho);
    const pH = sumWhere(m, (x, y) => x > y);
    const pD = sumWhere(m, (x, y) => x === y);
    return { ps: [pH, pD, 1 - pH - pD], res: q.gh > q.ga ? 0 : q.gh === q.ga ? 1 : 2 };
  });
  let best = { T: 1, ll: Infinity };
  for (let T = 0.7; T <= 1.8001; T += 0.05) {
    let ll = 0;
    cache.forEach((c) => { ll += -Math.log(Math.max(1e-12, applyTemp(c.ps, T)[c.res])); });
    ll /= cache.length;
    if (ll < best.ll) best = { T: Number(T.toFixed(2)), ll };
  }
  return best;
}

const OBJETIVOS = {
  x1x2: { label: "Resultado 1X2 (log-loss)", key: "logloss" },
  rps: { label: "Resultado 1X2 (RPS)", key: "rps" },
  over: { label: "Más/menos 2.5", key: "lloverU" },
  btts: { label: "Ambos marcan", key: "llBtts" },
};

const MOTORES = {
  mle: "Máxima verosimilitud",
  ratio: "Cocientes de promedios",
  elo: "Elo + ordinal",
  ens: "Ensamble apilado",
};
const MOTOR_CANDIDATOS = Object.keys(MOTORES);

