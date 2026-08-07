/* ============================================================
   SIMULACIÓN: combinadas con jugadores
   ============================================================ */

function poisSample(l) {
  if (l <= 0) return 0;
  const L = Math.exp(-l);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function matrixSampler(m) {
  const flat = [];
  let c = 0;
  for (let x = 0; x < m.length; x++)
    for (let y = 0; y < m.length; y++) { c += m[x][y]; flat.push({ x, y, c }); }
  return () => {
    const r = Math.random() * c;
    let lo = 0, hi = flat.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (flat[mid].c < r) lo = mid + 1; else hi = mid; }
    return flat[lo];
  };
}

/** Probabilidad conjunta por simulación cuando hay props de jugador:
    los goles del equipo y los remates de sus jugadores no son independientes. */
function mcJoint({ m, lh, la, picks, players, homeId, n = 20000 }) {
  const draw = matrixSampler(m);
  const matrixPicks = picks.filter((p) => p.pred);
  const simPicks = picks.filter((p) => p.simRef);
  const otherPicks = picks.filter((p) => !p.pred && !p.simRef);
  const indep = otherPicks.reduce((a, b) => a * b.p, 1);
  if (!simPicks.length) return null;

  const byTeam = new Map();
  players.forEach((p) => {
    if (!byTeam.has(p.teamId)) byTeam.set(p.teamId, []);
    byTeam.get(p.teamId).push(p);
  });
  const shareOf = (teamId, lam) => {
    const list = byTeam.get(teamId) || [];
    const tot = list.reduce((a, b) => a + b.lamGl, 0);
    const den = Math.max(tot, lam, 1e-6);
    return list.map((p) => ({ p, s: p.lamGl / den }));
  };
  const shares = new Map();
  [...byTeam.keys()].forEach((t) => shares.set(t, shareOf(t, t === homeId ? lh : la)));

  let hit = 0;
  const goals = new Map(), sots = new Map(), shots = new Map();
  for (let i = 0; i < n; i++) {
    const s = draw();
    if (!matrixPicks.every((p) => p.pred(s.x, s.y))) continue;
    goals.clear(); sots.clear(); shots.clear();
    let ok = true;
    for (const [teamId, list] of byTeam) {
      const teamGoals = teamId === homeId ? s.x : s.y;
      const lam = teamId === homeId ? lh : la;
      // reparto de los goles del equipo entre sus jugadores
      const sh = shares.get(teamId);
      for (let gcount = 0; gcount < teamGoals; gcount++) {
        let r = Math.random(), pick = null;
        for (const e of sh) { r -= e.s; if (r <= 0) { pick = e.p; break; } }
        if (pick) goals.set(pick.id, (goals.get(pick.id) || 0) + 1);
      }
      // un partido en el que el equipo marca más suele ser uno en el que remata más
      const boost = 1 + 0.3 * ((teamGoals - lam) / Math.max(1, lam));
      list.forEach((p) => {
        sots.set(p.id, poisSample(Math.max(0, p.lamSot * boost)));
        shots.set(p.id, poisSample(Math.max(0, p.lamSh * boost)));
      });
    }
    for (const p of simPicks) {
      const r = p.simRef;
      const v = r.kind === "gol" ? (goals.get(r.playerId) || 0)
        : r.kind === "sot" ? (sots.get(r.playerId) || 0)
        : (shots.get(r.playerId) || 0);
      if (!(v > r.line)) { ok = false; break; }
    }
    if (ok) hit++;
  }
  const p = (hit / n) * indep;
  return { p, se: Math.sqrt(Math.max(p, 1e-6) * (1 - p) / n), n };
}

