/* ============================================================
   ELO CON MARGEN DE VICTORIA
   ============================================================ */

function runElo(list, { K = 20, hfa = 55, start = 1500 } = {}) {
  const R = new Map();
  const rows = [];
  const get = (id) => (R.has(id) ? R.get(id) : (R.set(id, start), start));
  for (const m of list) {
    const rh = get(m.h), ra = get(m.a);
    const diff = rh + hfa - ra;
    rows.push({ ...m, eloDiff: diff });
    const E = 1 / (1 + Math.pow(10, -diff / 400));
    const S = m.gh > m.ga ? 1 : m.gh === m.ga ? 0.5 : 0;
    const gd = Math.abs(m.gh - m.ga);
    // Multiplicador de margen al estilo 538: ganar 4-0 vale más que
    // ganar 1-0, pero con rendimientos decrecientes y sin premiar
    // el aplastamiento del que ya era mucho mejor.
    const dAdj = S === 1 ? diff : S === 0 ? -diff : 0;
    const g = gd > 0 ? Math.log(gd + 1) * (2.2 / (0.001 * dAdj + 2.2)) : 1;
    const upd = K * g * (S - E);
    R.set(m.h, rh + upd);
    R.set(m.a, ra - upd);
  }
  return { ratings: R, rows };
}

