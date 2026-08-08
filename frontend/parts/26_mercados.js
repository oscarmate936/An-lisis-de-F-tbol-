function Mercados({ api, fixture, onBoleto }) {
  const home = fixture.teams.home;
  const away = fixture.teams.away;
  const lgId = fixture.league.id;
  const season = fixture.league.season;
  const kickoff = new Date(fixture.fixture.date).getTime();
  // Las competiciones internacionales de selecciones vienen marcadas como
  // país "World" y necesitan otros supuestos: sin ritmo de liga, sin
  // descanso semanal y con menos goles de media.
  const seleccion = (fixture.league.country || "") === "World" ||
    /selecc|national|nations|world cup|euro|copa américa|copa america/i.test(fixture.league.name || "");

  const [base, setBase] = useState(null);
  const [baseErr, setBaseErr] = useState(null);
  const [counts, setCounts] = useState(null);
  const [countsBusy, setCountsBusy] = useState(false);
  const [countsErr, setCountsErr] = useState(null);
  const [props, setProps] = useState(null);
  const [propsBusy, setPropsBusy] = useState(false);
  const [propsErr, setPropsErr] = useState(null);
  const [lineupOk, setLineupOk] = useState(false);
  const [lgM, setLgM] = useState([]);
  const [ens, setEns] = useState(null);
  const [ensProg, setEnsProg] = useState(null);   // 0..1 mientras corre el ensamble
  const [liveStats, setLiveStats] = useState(null);
  const [arb, setArb] = useState(null);
  const [arbBusy, setArbBusy] = useState(false);
  const [sensV, setSensV] = useState(0);
  const [famSheet, setFamSheet] = useState(false);
  const [busca, setBusca] = useState("");
  /* En el móvil la barra ocupaba media pantalla con las fichas y el
     buscador. Se queda en una línea con lo esencial y se despliega. */
  const [barraAbierta, setBarraAbierta] = useState(false);
  const [h2h, setH2h] = useState(null);
  const [otrosRes, setOtrosRes] = useState({ p: 1, n: 0, partidos: 0 });
  const [modoP, setModoP] = useState(() => {
    try { return localStorage.getItem("modoP") || "pct"; } catch (e) { return "pct"; }
  });
  useEffect(() => { try { localStorage.setItem("modoP", modoP); } catch (e) { /* nada */ } }, [modoP]);
  const [fam, setFam] = useState(
    LIVE_STATES.includes(fixture.fixture.status?.short) ? "En vivo" : "Resumen"
  );
  const [picks, setPicks] = useState([]);
  const [adj, setAdj] = useState({ h: 0, a: 0, ref: 1, tension: 1, starters: false, xg: true, ens: true, mkt: 0, api: 0, oddsMetodo: 'mediana' });
  const [sortProps, setSortProps] = useState({ campo: "gol", dir: -1 });
  const [filtroEq, setFiltroEq] = useState("todos");
  const [filtroPos, setFiltroPos] = useState("todas");
  const [buscaJug, setBuscaJug] = useState("");
  /* Pintar dos plantillas enteras de golpe da tirones en el móvil; se
     empieza por los que de verdad se miran y el resto va bajo petición. */
  const [tope, setTope] = useState(30);
  const [soloXI, setSoloXI] = useState(false);
  const [params, setParams] = useState(P0);
  const [paramsInfo, setParamsInfo] = useState(null);
  const [odds, setOdds] = useState(null);
  const [oddsBusy, setOddsBusy] = useState(false);
  const [oddsErr, setOddsErr] = useState(null);
  const [inj, setInj] = useState(null);
  const [injBusy, setInjBusy] = useState(false);
  const [injErr, setInjErr] = useState(null);
  const elapsed = num(fixture.fixture.status?.elapsed, 0);
  const isLive = LIVE_STATES.includes(fixture.fixture.status?.short);

  // Corte un día antes del partido: el propio resultado no entra en el cálculo.
  const cutoff = useMemo(() => {
    const d = new Date(fixture.fixture.date);
    d.setDate(d.getDate() - 1);
    return isoDay(d);
  }, [fixture.fixture.date]);

  // Parámetros calibrados para esta competición, si los hay.
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await storage.get(paramsKey(lgId));
        if (dead || !r?.value) return;
        const saved = JSON.parse(r.value);
        setParams({ ...P0, ...saved.params });
        setParamsInfo(saved);
      } catch (e) { /* sin calibrar: valores por defecto */ }
    })();
    return () => { dead = true; };
  }, [lgId]);

  /* ---------- carga del modelo base ---------- */
  useEffect(() => {
    let dead = false;
    setBase(null);
    setBaseErr(null);
    (async () => {
      try {
        // Si una fuente falla (copas sin clasificación, ligas sin cobertura)
        // el modelo sigue adelante con lo que sí tiene.
        const soft = (p) => p.catch(() => null);
        const [stTab, hs, as, hfx, afx, lgFx] = await Promise.all([
          soft(api("standings", { league: lgId, season }, TTL.hour)),
          soft(api("teams/statistics", { team: home.id, league: lgId, season, date: cutoff }, TTL.hour)),
          soft(api("teams/statistics", { team: away.id, league: lgId, season, date: cutoff }, TTL.hour)),
          soft(api("fixtures", { team: home.id, season, status: "FT" }, TTL.daily)),
          soft(api("fixtures", { team: away.id, season, status: "FT" }, TTL.daily)),
          soft(api("fixtures", { league: lgId, season }, TTL.daily)),
        ]);
        if (dead) return;
        let lgMatches = leagueDataset(lgFx).filter((m) => m.t < kickoff);
        // En agosto la temporada en curso no dice nada: se apoya en la anterior,
        // que el decaimiento temporal se encarga de ir apagando.
        if (lgMatches.length < 80) {
          const prev = await soft(api("fixtures", { league: lgId, season: season - 1 }, TTL.static));
          if (dead) return;
          const pd = leagueDataset(prev).map((m) => ({ ...m, w: 0.6 }));
          lgMatches = [...pd, ...lgMatches];
        }
        setLgM(lgMatches);
        // Entrenador actual de cada equipo: si acaba de llegar, el
        // historial anterior vale menos.
        const coachDe = async (id) => {
          try {
            const r = await api("coachs", { team: id }, TTL.daily);
            const act = (r || []).find((c) => (c.team?.id === id && !c.career?.some((x) => x.team?.id === id && x.end === null))
              ? false : true);
            const car = (r || []).flatMap((c) => (c.career || []).map((x) => ({ ...x, name: c.name })))
              .filter((x) => x.team?.id === id && x.start)
              .sort((a, b) => new Date(b.start) - new Date(a.start));
            const cur = car.find((x) => !x.end || new Date(x.end).getTime() > kickoff) || car[0];
            return cur ? { nombre: cur.name, desde: new Date(cur.start).getTime() } : null;
          } catch (e) { return null; }
        };
        const [coachH, coachA] = await Promise.all([coachDe(home.id), coachDe(away.id)]);
        if (dead) return;
        setBase(computeBase({
          stTab, hs, as, hfx, afx, kickoff, params, lgMatches, seleccion, coachH, coachA,
          homeId: home.id, awayId: away.id,
          homeName: home.name, awayName: away.name,
        }));
      } catch (e) {
        if (!dead) setBaseErr(e.message);
      }
    })();
    return () => { dead = true; };
  }, [api, lgId, season, home.id, away.id, home.name, away.name, cutoff, kickoff, params]);

  // Ensamble: Elo + regresión ordinal, mezclados con el Dixon-Coles.
  useEffect(() => {
    if (!base || lgM.length < 80) { setEns(null); return; }
    let dead = false;
    const id = setTimeout(() => {
      (async () => {
        setEnsProg(0);
        try {
          // El avance solo se publica de vez en cuando: repintar en cada
          // rebanada costaría más que el propio cálculo.
          let ultimo = 0;
          const r = await ensemblePredict(lgM, base.params, home.id, away.id, kickoff, (p) => {
            if (dead || p - ultimo < 0.04) return;
            ultimo = p;
            setEnsProg(p);
          });
          if (!dead) setEns(r);
        } catch (e) { if (!dead) setEns(null); }
        finally { if (!dead) setEnsProg(null); }
      })();
    }, 60);
    return () => { dead = true; clearTimeout(id); };
  }, [base, lgM, home.id, away.id, kickoff]);

  /* ---------- matrices y catálogo ---------- */
  const model = useMemo(() => {
    if (!base) return null;
    // Blindaje: si por lo que sea llega un modelo base sin alguna pieza,
    // el partido se sigue pudiendo mirar en vez de dejar la pantalla vacía.
    const half = base.half && fin(base.half.share) ? base.half : { share: 0.45, n: 0, real: false };
    // Los goles marcados son ruidosos; el xG del propio partido, menos.
    // Cuando la liga lo publica, manda el xG y los goles quedan de apoyo.
    const usaXg = adj.xg && counts?.xg && counts.xg.n >= 10;
    let lh0 = base.lh0, la0 = base.la0;
    if (usaXg) {
      lh0 = geoBlend(counts.xg.eH, base.lh0, 0.55);
      la0 = geoBlend(counts.xg.eA, base.la0, 0.55);
    }
    let lh = clamp(lh0 * (1 + adj.h / 100), 0.1, 6);
    let la = clamp(la0 * (1 + adj.a / 100), 0.1, 6);
    const P = base.params || P0;
    const rho = P.rho ?? -0.13;
    const opts = { rho, corr: P.corr, theta: P.theta, nu: P.nu };
    // Si el ensamble está disponible y activado, se buscan los goles
    // esperados que reproducen su 1X2: así manda sobre TODOS los mercados,
    // no solo sobre el resultado.
    let usaEns = false, usaMkt = 0;
    // Fuentes externas traducidas a goles esperados, para que la mezcla
    // llegue a los 160 mercados y no solo al 1X2.
    const mBase = buildMatrix(lh, la, opts);
    const pH0 = sumWhere(mBase, (x, y) => x > y), pD0 = sumWhere(mBase, (x, y) => x === y);
    // El ensamble ya lleva dentro al Dixon-Coles con su peso aprendido,
    // así que sustituye a la opinión propia en vez de promediarse con ella.
    let propio = adj.ens && ens?.pEns ? ens.pEns : [pH0, pD0, 1 - pH0 - pD0];
    const ext = [];
    if (adj.mkt > 0 && odds?.x1x2) ext.push({ p: odds.x1x2.p, w: adj.mkt / 100 });
    if (adj.api > 0 && odds?.apiPred) ext.push({ p: odds.apiPred, w: adj.api / 100 });
    const wExt = Math.min(0.9, ext.reduce((a, f) => a + f.w, 0));
    let objetivo = propio;
    if (wExt > 0) {
      const media = [0, 1, 2].map((c) =>
        ext.reduce((a, f) => a + f.w * f.p[c], 0) / ext.reduce((a, f) => a + f.w, 0));
      objetivo = [0, 1, 2].map((c) => (1 - wExt) * propio[c] + wExt * media[c]);
    }
    const cambia = Math.abs(objetivo[0] - pH0) + Math.abs(objetivo[2] - (1 - pH0 - pD0));
    if (cambia > 0.002) {
      const t = tiltLambdas(lh, la, objetivo, opts);
      if (t.err < 0.015) {
        lh = t.lh; la = t.la;
        usaEns = adj.ens && !!ens?.pEns;
        usaMkt = Math.round(wExt * 100);
      }
    }
    const sh = half.share;
    const m = buildMatrix(lh, la, { ...opts, n: GRID });
    const hOpts = { ...opts, rho: rho * 0.75, theta: (P.theta ?? 0.06) * 0.75, n: HGRID };
    const dist = diffDist(m, lh, la, opts);
    const m1 = buildMatrix(lh * sh, la * sh, hOpts);
    const m2 = buildMatrix(lh * (1 - sh), la * (1 - sh), hOpts);
    // Partido en juego: solo importa lo que queda por jugar.
    let live = null;
    if (isLive) {
      const rem = clamp((92 - elapsed) / 92, 0, 1);
      const gH = num(fixture.goals?.home), gA = num(fixture.goals?.away);
      // Lo que está pasando en el campo ahora mismo pesa: un equipo que
      // lleva 12 remates en 60 minutos no ataca como decía la previa.
      let fH = 1, fA = 1, ritmo = null;
      if (liveStats && elapsed >= 20) {
        const frac = clamp(elapsed / 90, 0.2, 1);
        const espH = lh * frac * 3.6, espA = la * frac * 3.6; // remates esperados
        if (liveStats.shH !== null && espH > 0.5)
          fH = clamp(Math.pow((liveStats.shH + 1) / (espH + 1), 0.45), 0.65, 1.5);
        if (liveStats.shA !== null && espA > 0.5)
          fA = clamp(Math.pow((liveStats.shA + 1) / (espA + 1), 0.45), 0.65, 1.5);
        ritmo = { fH, fA, shH: liveStats.shH, shA: liveStats.shA,
          posH: liveStats.posH, posA: liveStats.posA };
      }
      const mr = buildMatrix(clamp(lh * rem * fH, 0.02, 6), clamp(la * rem * fA, 0.02, 6), opts);
      live = { rem, gH, gA, mr, elapsed, ritmo };
    }
    // Un partido medio de esta liga, con los mismos parámetros. Sirve de
    // vara de medir: sugerir lo que el modelo ve DISTINTO, no lo que es
    // obvio en cualquier partido.
    const aH = clamp(base.avgH, 0.2, 4), aA = clamp(base.avgA, 0.2, 4);
    const ref = new Map(buildMarkets({
      m: buildMatrix(aH, aA, { ...opts, n: GRID }),
      m1: buildMatrix(aH * sh, aA * sh, hOpts),
      m2: buildMatrix(aH * (1 - sh), aA * (1 - sh), hOpts),
      lh: aH, la: aA, opts,
      homeName: home.name, awayName: away.name,
    }).map((x) => [x.key, x.p]));
    return {
      lh, la, m, m1, m2, usaXg, usaEns, usaMkt, live, half, ref,
      dist,
      markets: buildMarkets({ m, m1, m2, lh, la, opts, dist,
        homeName: home.name, awayName: away.name }),
    };
  }, [base, adj.h, adj.a, adj.xg, adj.ens, adj.mkt, adj.api, ens, odds, counts,
      home.name, away.name, isLive, elapsed, fixture.goals?.home, fixture.goals?.away, liveStats]);

  /* ---------- córners, tarjetas y disparos ---------- */
  async function loadCounts() {
    if (!base) return;
    setCountsBusy(true);
    setCountsErr(null);
    try {
      const blank = () => ({ cf: [], ca: [], kf: [], ka: [], sf: [], sa: [], tf: [], ta: [], xf: [], xa: [], pf: [], pa: [] });
      const per = { [home.id]: blank(), [away.id]: blank() };
      const filas = [];
      const ids = [];
      const jobs = [
        [home.id, base.recentH.slice(0, 10)],
        [away.id, base.recentA.slice(0, 10)],
      ];
      for (const [teamId, list] of jobs) {
        for (const f of list) {
          const st = await api("fixtures/statistics", { fixture: f.fixture.id }, TTL.static);
          ids.push({ id: f.fixture.id, team: teamId });
          if (!st?.length) continue;
          const get = (block, key) => {
            const s = (block?.statistics || []).find((x) => x.type === key);
            if (!s || s.value === null || s.value === undefined) return null;
            // La API devuelve la posesión como "58%" y el xG como texto:
            // sin limpiar el símbolo, Number() daba NaN y contaminaba todo.
            const v = num(String(s.value).replace("%", "").trim());
            return isFinite(v) ? v : null;
          };
          const mine = st.find((b) => b.team.id === teamId);
          const opp = st.find((b) => b.team.id !== teamId);
          if (!mine || !opp) continue;
          const venue = f.teams.home.id === teamId ? "home" : "away";
          const push = (arrF, arrA, vM, vO) => {
            if (vM === null || vO === null) return;
            arrF.push({ v: vM, venue });
            arrA.push({ v: vO, venue });
          };
          push(per[teamId].cf, per[teamId].ca, get(mine, "Corner Kicks"), get(opp, "Corner Kicks"));
          push(per[teamId].kf, per[teamId].ka,
            num(get(mine, "Yellow Cards")) + num(get(mine, "Red Cards")) * 2,
            num(get(opp, "Yellow Cards")) + num(get(opp, "Red Cards")) * 2);
          push(per[teamId].sf, per[teamId].sa, get(mine, "Total Shots"), get(opp, "Total Shots"));
          push(per[teamId].tf, per[teamId].ta, get(mine, "Shots on Goal"), get(opp, "Shots on Goal"));
          push(per[teamId].xf, per[teamId].xa, get(mine, "expected_goals"), get(opp, "expected_goals"));
          const posM = get(mine, "Ball Possession"), posO = get(opp, "Ball Possession");
          push(per[teamId].pf, per[teamId].pa, posM, posO);
          const co = get(mine, "Corner Kicks"), sh2 = get(mine, "Total Shots");
          if (co !== null && sh2 !== null)
            filas.push({ c: co, s: sh2, p: posM === null ? 50 : posM });
        }
      }

      // Tasa con doble peso al campo que toca en este partido.
      const rate = (arr, venue) => {
        if (!arr.length) return null;
        let s = 0, w = 0;
        arr.forEach((x) => {
          const k = x.venue === venue ? 2 : 1;
          s += k * x.v; w += k;
        });
        return s / w;
      };
      const plain = (arr) => (arr.length ? arr.reduce((a, b) => a + b.v, 0) / arr.length : null);
      const resVar = (arr, mu) => {
        if (arr.length < 3 || mu === null) return null;
        return arr.reduce((a, b) => a + (b.v - mu) ** 2, 0) / (arr.length - 1);
      };

      // Modelo multiplicativo ataque × defensa sobre la base del propio muestreo.
      const block = (key, keyAgainst, tune = 1) => {
        const fH = rate(per[home.id][key], "home"), aA = rate(per[away.id][keyAgainst], "away");
        const fA = rate(per[away.id][key], "away"), aH = rate(per[home.id][keyAgainst], "home");
        const pool = [...per[home.id][key], ...per[away.id][key]];
        const bs = plain(pool);
        if (fH === null || aA === null || fA === null || aH === null || !bs) return null;
        const eH = clamp((fH * aA) / bs, 0.2, 30) * tune;
        const eA = clamp((fA * aH) / bs, 0.2, 30) * tune;
        const vH = resVar(per[home.id][key], plain(per[home.id][key]));
        const vA = resVar(per[away.id][key], plain(per[away.id][key]));
        const varTot = ((vH ?? eH) + (vA ?? eA)) * 1.12;
        return {
          eH, eA, tot: eH + eA, rawH: fH, rawA: fA, pool: bs,
          varH: Math.max(vH ?? eH, eH * 1.02),
          varA: Math.max(vA ?? eA, eA * 1.02),
          varTot: Math.max(varTot, (eH + eA) * 1.02),
          n: per[home.id][key].length + per[away.id][key].length,
        };
      };

      const xg = block("xf", "xa");
      const pos = block("pf", "pa");
      // Relación empírica entre córners, remates y posesión en esta muestra.
      const reg = filas.length >= 12
        ? fitOLS(filas.map((f) => [1, f.s, f.p / 100]), filas.map((f) => f.c))
        : null;
      setCounts({
        corners: block("cf", "ca"),
        cards: block("kf", "ka"),
        shots: block("sf", "sa"),
        sot: block("tf", "ta"),
        xg: xg ? { ...xg, n: per[home.id].xf.length + per[away.id].xf.length } : null,
        pos,
        regCorners: reg && reg.r2 > 0.15 ? reg : null,
        ids: ids.map((x) => x.id),
        n: Math.min(per[home.id].cf.length, per[away.id].cf.length),
      });
    } catch (e) {
      setCountsErr(e.message);
    } finally {
      setCountsBusy(false);
    }
  }

  /* ---------- props de jugador ----------
     Estadísticas de toda la temporada (no de diez partidos sueltos) y,
     si ya están, las alineaciones confirmadas. */
  async function loadProps() {
    setPropsBusy(true);
    setPropsErr(null);
    try {
      const soft = (p) => p.catch(() => null);
      // Primero la alineación: si ya está, sabemos a quién buscar y podemos
      // dejar de pedir páginas en cuanto tengamos a los convocados.
      const xi = await soft(api("fixtures/lineups", { fixture: fixture.fixture.id }, TTL.short));
      const titulares = new Map();
      (xi || []).forEach((b) => {
        (b.startXI || []).forEach((p) => titulares.set(p.player.id, { start: true, pos: p.player.pos }));
        (b.substitutes || []).forEach((p) => titulares.set(p.player.id, { start: false, pos: p.player.pos }));
      });
      const paginas = [];
      for (const t of [home, away]) {
        const buscados = [...titulares.keys()];
        for (const page of [1, 2, 3]) {
          const r = await soft(api("players", { team: t.id, season, page }, TTL.daily));
          if (!r?.length) break;
          paginas.push(...r.map((x) => ({ ...x, _team: t })));
          if (r.length < 20) break;
          // Con alineación publicada, en cuanto estén todos los convocados
          // de este equipo no hace falta seguir paginando.
          if (buscados.length) {
            const tengo = new Set(paginas.filter((p) => p._team.id === t.id).map((p) => p.player.id));
            const suyos = buscados.filter((id) => tengo.has(id));
            if (suyos.length >= 15) break;
          }
        }
      }

      const rows = paginas.map((p) => {
        // Sumamos todas las competiciones: más muestra, mismas piernas.
        const st = (p.statistics || []).filter((x) => num(x.games?.minutes) > 0);
        const sum = (f) => st.reduce((a, b) => a + num(f(b)), 0);
        const min = sum((x) => x.games?.minutes);
        const apps = sum((x) => x.games?.appearences);
        const lineups = sum((x) => x.games?.lineups);
        // La API da nota media por partido; algunas ligas añaden xG.
        const rating = (() => {
          const rs = st.filter((x) => num(x.games?.rating) > 0);
          if (!rs.length) return null;
          const w = rs.reduce((a, x) => a + num(x.games?.minutes), 0);
          return w ? rs.reduce((a, x) => a + num(x.games.rating) * num(x.games.minutes), 0) / w : null;
        })();
        const xg = sum((x) => x.goals?.expected ?? x.expected_goals ?? 0) || null;
        return {
          id: p.player.id, name: p.player.name, team: p._team.name, teamId: p._team.id,
          rating, xg,
          pos: titulares.get(p.player.id)?.pos || st[0]?.games?.position,
          min, apps, starts: lineups,
          sot: sum((x) => x.shots?.on), sh: sum((x) => x.shots?.total),
          gl: sum((x) => x.goals?.total), as: sum((x) => x.goals?.assists),
          yc: sum((x) => x.cards?.yellow) + sum((x) => x.cards?.red),
          fl: sum((x) => x.fouls?.committed),
          kp: sum((x) => x.passes?.key),
          xi: titulares.has(p.player.id) ? titulares.get(p.player.id).start : null,
        };
      }).filter((r) => r.min >= 180 && r.apps >= 3);
      setProps(rows);
      setLineupOk(titulares.size > 0);
    } catch (e) {
      setPropsErr(e.message);
    } finally {
      setPropsBusy(false);
    }
  }


  // Lo marcado en los demás partidos se sigue en vivo: la barra de abajo
  // enseña la combinada entera, no solo la de este partido.
  useEffect(() => {
    let dead = false;
    const calc = (l) => {
      if (dead) return;
      try { setOtrosRes(combinadaSalvo(l, fixture.fixture.id)); } catch (e) { /* nada */ }
    };
    slipRead().then(calc);
    const off = slipOn(calc);
    return () => { dead = true; off(); };
  }, [fixture.fixture.id]);

  /* ---------- historial directo entre los dos equipos ---------- */
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await api("fixtures/headtohead",
          { h2h: `${home.id}-${away.id}`, last: 12 }, TTL.daily);
        const prev = (r || []).filter((f) => DONE_STATES.includes(f.fixture?.status?.short) &&
          new Date(f.fixture.date).getTime() < kickoff && f.goals?.home !== null);
        if (dead || !prev.length) return;
        let gf = 0, gc = 0, btts = 0, o25 = 0, vic = 0, emp = 0;
        prev.forEach((f) => {
          const local = f.teams.home.id === home.id;
          const a = num(local ? f.goals.home : f.goals.away);
          const b = num(local ? f.goals.away : f.goals.home);
          gf += a; gc += b;
          if (a > 0 && b > 0) btts++;
          if (a + b > 2.5) o25++;
          if (a > b) vic++; else if (a === b) emp++;
        });
        const n = prev.length;
        setH2h({ n, gf: gf / n, gc: gc / n, btts: btts / n, o25: o25 / n,
          vic: vic / n, emp: emp / n, total: (gf + gc) / n });
      } catch (e) { /* sin historial directo */ }
    })();
    return () => { dead = true; };
  }, [api, home.id, away.id, kickoff]);

  /* ---------- historial de tarjetas del árbitro ---------- */
  async function loadArbitro() {
    const nombre = fixture.fixture.referee;
    if (!nombre) return;
    setArbBusy(true);
    try {
      const suyos = lgM.filter((m) => m.ref && m.ref.split(",")[0].trim() === nombre.split(",")[0].trim())
        .slice(-10);
      if (!suyos.length) { setArb({ nombre, n: 0 }); return; }
      let tot = 0, n = 0;
      for (const f of suyos.slice(-8)) {
        const st = await api("fixtures/statistics", { fixture: f.id }, TTL.static);
        if (!st?.length) continue;
        const car = st.reduce((a, b) => {
          const g = (k) => num((b.statistics || []).find((x) => x.type === k)?.value);
          return a + g("Yellow Cards") + g("Red Cards") * 2;
        }, 0);
        if (car > 0) { tot += car; n++; }
      }
      setArb({ nombre, n, media: n ? tot / n : null, partidos: suyos.length });
    } catch (e) {
      setArb({ nombre, n: 0, err: e.message });
    } finally { setArbBusy(false); }
  }

  /* ---------- cuotas del mercado y pronóstico de la propia API ---------- */
  async function loadOdds() {
    setOddsBusy(true); setOddsErr(null);
    try {
      const [o, pr] = await Promise.all([
        api("odds", { fixture: fixture.fixture.id }, TTL.hour),
        api("predictions", { fixture: fixture.fixture.id }, TTL.hour).catch(() => null),
      ]);
      const mp = marketProbs(o, adj.oddsMetodo || "mediana");
      const p = pr?.[0]?.predictions?.percent;
      mp.apiPred = p ? [pctStr(p.home) / 100, pctStr(p.draw) / 100, pctStr(p.away) / 100] : null;
      if (!mp.x1x2 && !mp.ou25 && !mp.btts && !mp.apiPred)
        throw new Error("No hay cuotas publicadas para este partido. La API solo guarda 7 días y aparecen entre 1 y 14 días antes del inicio.");
      setOdds(mp);
    } catch (e) { setOddsErr(e.message); }
    finally { setOddsBusy(false); }
  }

  /* ---------- bajas y su peso real ---------- */
  async function loadInj() {
    setInjBusy(true); setInjErr(null);
    try {
      const [lista, top] = await Promise.all([
        api("injuries", { fixture: fixture.fixture.id }, TTL.hour),
        api("players/topscorers", { league: lgId, season }, TTL.daily).catch(() => []),
      ]);
      const goles = new Map();
      (top || []).forEach((p) => {
        const st = p.statistics?.[0];
        if (st?.team?.id) goles.set(p.player.id, { g: num(st.goals?.total), a: num(st.goals?.assists), team: st.team.id });
      });
      // Minutos por jugador, si ya se cargaron las props: sirve para pesar
      // también las bajas de atrás, que no salen en la lista de goleadores.
      const perfil = new Map();
      (props || []).forEach((p) => perfil.set(p.id, p));
      const minEquipo = {};
      [home, away].forEach((t) => {
        minEquipo[t.id] = (props || []).filter((p) => p.teamId === t.id)
          .reduce((a, p) => a + p.min, 0) || null;
      });
      const esDefensa = (pos) => ["G", "D", "Goalkeeper", "Defender"].includes(pos);
      const notaMedia = {};
      [home, away].forEach((t) => {
        const con = (props || []).filter((p) => p.teamId === t.id && p.rating);
        notaMedia[t.id] = con.length ? con.reduce((a, p) => a + p.rating, 0) / con.length : null;
      });
      const porEquipo = {};
      [home, away].forEach((t) => {
        const fuera = (lista || []).filter((i) => i.team.id === t.id);
        const total = t.id === home.id ? base?.gfTotalH : base?.gfTotalA;
        let pesoAtk = 0, pesoDef = 0;
        const detalle = fuera.map((i) => {
          const g = goles.get(i.player.id);
          const pl = perfil.get(i.player.id);
          // Aportación ofensiva: goles más media asistencia sobre el total.
          let ap = g && total ? (g.g + g.a * 0.5) / total : 0;
          // La nota media reparte lo que los goles no ven: un medio centro
          // de 7.4 pesa más que su casilla de goleador.
          if (pl?.rating && notaMedia[t.id]) {
            const rel = clamp(pl.rating / notaMedia[t.id], 0.85, 1.25);
            ap *= rel;
          }
          // Aportación defensiva: cuota de minutos de un portero o central.
          let dp = 0;
          if (pl && minEquipo[t.id] && esDefensa(pl.pos)) {
            dp = pl.min / minEquipo[t.id] * (pl.pos === "G" || pl.pos === "Goalkeeper" ? 1.6 : 1.2);
            ap = Math.max(ap, 0);
          }
          pesoAtk += ap; pesoDef += dp;
          return { name: i.player.name, tipo: i.player.type, razon: i.player.reason,
            ap, dp, pos: pl?.pos };
        });
        porEquipo[t.id] = {
          detalle,
          // Nadie es insustituible: se traslada algo más de la mitad del hueco.
          ajuste: -Math.round(Math.min(0.22, pesoAtk * 0.6) * 100),
          // Perder defensas sube los goles del rival, no baja los propios.
          ajusteRival: Math.round(Math.min(0.18, pesoDef * 0.5) * 100),
        };
      });
      setInj(porEquipo);
    } catch (e) { setInjErr(e.message); }
    finally { setInjBusy(false); }
  }

  /* ---------- mercados de conteo ---------- */
  // Un equipo al que el modelo da más goles también suele rematar y
  // sacar más córners: los bloques dejan de ir cada uno por su lado.
  const domFactor = useMemo(() => {
    if (!model || !base) return { h: 1, a: 1 };
    const media = (list, id) => {
      const l = (list || []).slice(0, 10);
      if (!l.length) return null;
      return l.reduce((a, f) => a + num(f.teams.home.id === id ? f.goals.home : f.goals.away), 0) / l.length;
    };
    const gh = media(base.recentH, home.id), ga = media(base.recentA, away.id);
    // La posesión esperada refuerza el mismo efecto: quien tiene el balón
    // remata y saca córners más veces.
    let pH = 1, pA = 1;
    if (counts?.pos) {
      const t = counts.pos.eH + counts.pos.eA;
      if (t > 20) {
        pH = clamp(Math.pow((counts.pos.eH / t) / 0.5, 0.35), 0.88, 1.16);
        pA = clamp(Math.pow((counts.pos.eA / t) / 0.5, 0.35), 0.88, 1.16);
      }
    }
    return {
      h: (gh > 0.15 ? clamp(Math.pow(model.lh / gh, 0.3), 0.85, 1.2) : 1) * pH,
      a: (ga > 0.15 ? clamp(Math.pow(model.la / ga, 0.3), 0.85, 1.2) : 1) * pA,
    };
  }, [model, base, counts, home.id, away.id]);

  // El bloque de córners que de verdad alimenta los mercados, para que la
  // cabecera del panel enseñe el mismo número que la escalera.
  const cornersUsados = useMemo(() => {
    if (!counts?.corners) return counts?.corners ?? null;
    if (!counts.regCorners || !counts.shots || !counts.pos) return counts.corners;
    const R = counts.regCorners;
    const pH = counts.pos.eH, pA = counts.pos.eA, tp = pH + pA;
    if (!isFinite(tp) || tp <= 20) return counts.corners;
    const rH = R.predict([1, counts.shots.eH * domFactor.h, pH / tp]);
    const rA = R.predict([1, counts.shots.eA * domFactor.a, pA / tp]);
    if (!(rH > 0.5 && rA > 0.5 && rH < 15 && rA < 15)) return counts.corners;
    const eH = geoBlend(counts.corners.eH * domFactor.h, rH, 0.5);
    const eA = geoBlend(counts.corners.eA * domFactor.a, rA, 0.5);
    return { ...counts.corners, eH, eA, tot: eH + eA, mezclado: true };
  }, [counts, domFactor]);

  const countMarkets = useMemo(() => {
    if (!counts) return [];
    const out = [];
    const mk = (fam, mercado, sel, p, nota, extra = {}) =>
      out.push({ fam, mercado, sel, p, nota, key: `${fam}|${mercado}|${sel}`,
        concepto: fam.toLowerCase(), ...extra });

    const ladder = (fam, d, tune = 1, dom = false) => {
      if (!d) return;
      const mean = (dom ? d.eH * domFactor.h + d.eA * domFactor.a : d.tot) * tune;
      if (!fin(mean) || mean <= 0) return;
      const { pmf, model } = countPmf(mean, Math.max(d.varTot * tune * tune, mean * 1.02));
      // Referencia: lo que se ve en un partido cualquiera de la muestra.
      const ref = fin(d.pool) && d.pool > 0 ? d.pool * 2 * tune : null;
      const pmfRef = ref ? countPmf(ref, Math.max(d.varTot * tune * tune, ref * 1.02)).pmf : null;
      escalera((L) => pOver(pmf, L)).forEach((L) => {
        const o = pOver(pmf, L);
        const pr = pmfRef ? pOver(pmfRef, L) : undefined;
        const cerca = Math.abs(L - mean) <= 2;
        mk(fam, `Total ${L}`, "Más de", o, model, { prior: pr, core: cerca });
        mk(fam, `Total ${L}`, "Menos de", 1 - o, model,
          { prior: pr === undefined ? undefined : 1 - pr, core: cerca });
      });
      return mean;
    };
    const teamLadder = (fam, d, side, name, tune = 1, dom = false) => {
      if (!d) return;
      const df = dom ? (side === "h" ? domFactor.h : domFactor.a) : 1;
      const mean = (side === "h" ? d.eH : d.eA) * tune * df;
      if (!fin(mean) || mean <= 0) return;
      const v = Math.max((side === "h" ? d.varH : d.varA) * tune * tune, mean * 1.02);
      const { pmf } = countPmf(mean, v);
      const ref = fin(d.pool) && d.pool > 0 ? d.pool * tune : null;
      const pmfRef = ref ? countPmf(ref, Math.max(v, ref * 1.02)).pmf : null;
      escalera((L) => pOver(pmf, L), { min: 4 }).forEach((L) => {
        const o = pOver(pmf, L);
        const pr = pmfRef ? pOver(pmfRef, L) : undefined;
        mk(fam, `${name} · total ${L}`, "Más de", o, undefined, { prior: pr });
        mk(fam, `${name} · total ${L}`, "Menos de", 1 - o, undefined,
          { prior: pr === undefined ? undefined : 1 - pr });
      });
    };

    // Si la regresión explica algo, se mezcla con el modelo de ataque y
    // defensa: dos vías distintas para el mismo número suelen valer más.
    const corners = cornersUsados;
    // Si ya se mezcló con la regresión, el factor de dominio ya está dentro.
    const domCorners = !corners?.mezclado;
    ladder("Córners", corners, 1, domCorners);
    teamLadder("Córners", corners, "h", home.name, 1, domCorners);
    teamLadder("Córners", corners, "a", away.name, 1, domCorners);

    // Si tenemos su historial real, el árbitro deja de ser un deslizador.
    const refReal = arb?.media && counts.cards?.tot
      ? clamp(arb.media / counts.cards.tot, 0.7, 1.45) : null;
    // Quien menos balón tiene, más falta hace: la posesión esperada
    // reparte las tarjetas entre los dos equipos.
    let posH = 1, posA = 1;
    if (counts.pos) {
      const t = counts.pos.eH + counts.pos.eA;
      if (t > 20) {
        posH = clamp(Math.pow(0.5 / (counts.pos.eH / t), 0.35), 0.85, 1.2);
        posA = clamp(Math.pow(0.5 / (counts.pos.eA / t), 0.35), 0.85, 1.2);
      }
    }
    const tuneCards = (refReal ?? adj.ref) * adj.tension;
    const cards = counts.cards ? {
      ...counts.cards,
      eH: counts.cards.eH * posH, eA: counts.cards.eA * posA,
      tot: counts.cards.eH * posH + counts.cards.eA * posA,
    } : null;
    ladder("Tarjetas", cards, tuneCards);
    teamLadder("Tarjetas", cards, "h", home.name, tuneCards);
    teamLadder("Tarjetas", cards, "a", away.name, tuneCards);

    ladder("Disparos", counts.shots, 1, true);
    teamLadder("Disparos", counts.shots, "h", `${home.name} · remates`, 1, true);
    teamLadder("Disparos", counts.shots, "a", `${away.name} · remates`, 1, true);
    ladder("Disparos", counts.sot, 1, true);
    teamLadder("Disparos", counts.sot, "h", `${home.name} · a puerta`, 1, true);
    teamLadder("Disparos", counts.sot, "a", `${away.name} · a puerta`, 1, true);
    return out;
  }, [counts, cornersUsados, home.name, away.name, adj.ref, adj.tension, domFactor, arb]);

  /* ---------- props calculadas ---------- */
  const propRows = useMemo(() => {
    if (!props || !model) return [];
    const sotFactor = (teamId) => {
      if (!counts?.sot) return 1;
      const dom = teamId === home.id ? domFactor.h : domFactor.a;
      const exp = (teamId === home.id ? counts.sot.eH : counts.sot.eA) * dom;
      const avg = teamId === home.id ? counts.sot.rawH : counts.sot.rawA;
      return exp && avg ? clamp(exp / avg, 0.7, 1.4) : 1;
    };
    // Cuánto se espera que marque el equipo en ESTE partido frente a su media.
    const golFactor = (teamId) => {
      const lam = teamId === home.id ? model.lh : model.la;
      const list = teamId === home.id ? base.recentH : base.recentA;
      if (!list?.length) return 1;
      const gm = list.slice(0, 10).reduce((a, f) =>
        a + num(f.teams.home.id === teamId ? f.goals.home : f.goals.away), 0) / Math.min(10, list.length);
      return gm > 0.1 ? clamp(lam / gm, 0.6, 1.6) : 1;
    };
    // Previos aprendidos de la propia muestra y separados por posición:
    // un central y un delantero no comparten la misma expectativa de gol.
    const grupo = (p) => (["G", "Goalkeeper"].includes(p) ? "G"
      : ["D", "Defender"].includes(p) ? "D"
      : ["F", "Attacker"].includes(p) ? "F" : "M");
    const campos = [["sot", 0.55], ["sh", 1.35], ["gl", 0.16], ["as", 0.12], ["yc", 0.18], ["fl", 1.1]];
    const previos = {};
    ["G", "D", "M", "F"].forEach((g) => {
      const sel = props.filter((p) => grupo(p.pos) === g);
      previos[g] = {};
      campos.forEach(([k, fallback]) => {
        const eb = empiricalGamma(sel.map((p) => ({ n: p.min / 90, y: p[k] || 0 })));
        previos[g][k] = eb || { alpha: fallback * 2.5, beta: 2.5, weak: true };
      });
    });
    return props
      .map((r) => {
        const n90 = r.min / 90;
        const pr = previos[grupo(r.pos)];
        // Posterior Gamma-Poisson: (observado + alfa) / (partidos + beta).
        const tasa = (tot, k) => (tot + pr[k].alpha) / (n90 + pr[k].beta);
        const sot90 = tasa(r.sot, "sot"), sh90 = tasa(r.sh, "sh");
        // Con xG disponible manda el xG: marcar tres en dos partidos no
        // convierte a nadie en un goleador de 1.5 por 90 minutos.
        const golBase = r.xg > 0 ? 0.4 * r.gl + 0.6 * r.xg : r.gl;
        const gl90 = tasa(golBase, "gl"), as90 = tasa(r.as, "as");
        const yc90 = tasa(r.yc, "yc"), fl90 = tasa(r.fl, "fl");
        const avgMin = r.min / Math.max(1, r.apps);
        // Con alineación confirmada no hace falta adivinar los minutos.
        const expMin = r.xi === true ? 88 : r.xi === false ? 24
          : adj.starters ? 88 : clamp(avgMin * 1.05, 15, 90);
        const f = expMin / 90;
        const sf = sotFactor(r.teamId), gf = golFactor(r.teamId);
        const lamSot = sot90 * f * sf, lamSh = sh90 * f * sf, lamGl = gl90 * f * gf;
        const lamAs = as90 * f * gf, lamFl = fl90 * f;
        const ge = (lam, k) => 1 - Array.from({ length: k }, (_, i) => poisPmf(i, lam)).reduce((a, b) => a + b, 0);
        return {
          ...r, n90, avgMin, expMin, sot90, sh90, gl90, lamSot, lamSh, lamGl, lamAs,
          sot1: ge(lamSot, 1), sot2: ge(lamSot, 2), sot3: ge(lamSot, 3),
          sh2: ge(lamSh, 2), sh3: ge(lamSh, 3),
          gol: ge(lamGl, 1), asis: ge(lamAs, 1),
          part: ge(lamGl + lamAs, 1),
          tar: 1 - Math.exp(-yc90 * f),
          fal2: ge(lamFl, 2), fal3: ge(lamFl, 3),
          starter: r.xi === true || (r.xi === null && r.starts / Math.max(1, r.apps) >= 0.6),
          banquillo: r.xi === false,
        };
      })
      .sort((a, b) => {
        const k = sortProps?.campo || "gol";
        const dir = sortProps?.dir === 1 ? 1 : -1;
        const va = fin(a[k]) ? a[k] : -1, vb = fin(b[k]) ? b[k] : -1;
        return (va - vb) * dir || (b.gol || 0) - (a.gol || 0);
      });
  }, [props, model, counts, base, adj.starters, sortProps, home.id, domFactor, lineupOk]);

  /** Lo que se ve tras aplicar los filtros de la cabecera. */
  const propsVisibles = useMemo(() => {
    const grupo = (p) => (["G", "Goalkeeper"].includes(p) ? "G"
      : ["D", "Defender"].includes(p) ? "D"
      : ["F", "Attacker"].includes(p) ? "F" : "M");
    const t = String(buscaJug || "").trim().toLowerCase();
    return propRows.filter((r) =>
      (filtroEq === "todos" || (filtroEq === "local" ? r.teamId === home.id : r.teamId === away.id)) &&
      (filtroPos === "todas" || grupo(r.pos) === filtroPos) &&
      (!soloXI || r.xi === true) &&
      (!t || r.name.toLowerCase().includes(t)));
  }, [propRows, filtroEq, filtroPos, soloXI, buscaJug, home.id, away.id]);

  useEffect(() => { setTope(30); }, [filtroEq, filtroPos, soloXI, buscaJug]);

  /** Los tres nombres más probables de cada mercado, para leer de un vistazo. */
  const destacados = useMemo(() => {
    const top = (campo) => [...propsVisibles].sort((a, b) => (b[campo] || 0) - (a[campo] || 0)).slice(0, 3);
    return [
      { titulo: "Marca gol", campo: "gol", lista: top("gol") },
      { titulo: "Da asistencia", campo: "asis", lista: top("asis") },
      { titulo: "1+ disparo a puerta", campo: "sot1", lista: top("sot1") },
      { titulo: "2+ remates", campo: "sh2", lista: top("sh2") },
    ].filter((b) => b.lista.length);
  }, [propsVisibles]);

  /* ---------- catálogo completo, picks y constructor ---------- */
  const all = useMemo(
    () => [...(model?.markets || []), ...countMarkets],
    [model, countMarkets]
  );
  const byKey = useMemo(() => {
    const map = new Map();
    all.forEach((m) => map.set(m.key, m));
    return map;
  }, [all]);
  const g = useCallback((fam, mercado, sel) => byKey.get(`${fam}|${mercado}|${sel}`), [byKey]);

  /** Las líneas de cada escalera salen del propio catálogo, así la
      pantalla siempre enseña exactamente las que se han calculado. */
  const lineasDe = useCallback((fam, pre) => {
    const set = new Set();
    all.forEach((x) => {
      if (x.fam !== fam || !x.mercado.startsWith(pre)) return;
      const v = Number(x.mercado.slice(pre.length));
      if (fin(v)) set.add(v);
    });
    return [...set].sort((a, b) => a - b);
  }, [all]);

  // Registro prospectivo: se guarda lo que dijo el modelo ANTES del partido.
  useEffect(() => {
    if (!model || isLive || DONE_STATES.includes(fixture.fixture.status?.short)) return;
    if (new Date(fixture.fixture.date).getTime() < Date.now()) return;
    const m = model.m;
    const pH = sumWhere(m, (x, y) => x > y), pD = sumWhere(m, (x, y) => x === y);
    logSave({
      fx: fixture.fixture.id, lg: lgId, season, date: fixture.fixture.date,
      home: home.name, away: away.name,
      lh: Number(model.lh.toFixed(3)), la: Number(model.la.toFixed(3)),
      pH: Number(pH.toFixed(4)), pD: Number(pD.toFixed(4)), pA: Number((1 - pH - pD).toFixed(4)),
      pO: Number(sumWhere(m, (x, y) => x + y > 2.5).toFixed(4)),
      pB: Number(sumWhere(m, (x, y) => x > 0 && y > 0).toFixed(4)),
      pC: g("Córners", "Total 9.5", "Más de")?.p
        ? Number(g("Córners", "Total 9.5", "Más de").p.toFixed(4)) : undefined,
      pT: g("Tarjetas", "Total 4.5", "Más de")?.p
        ? Number(g("Tarjetas", "Total 4.5", "Más de").p.toFixed(4)) : undefined,
      motor: base?.motor, ts: Date.now(),
    });
  }, [model, countMarkets, isLive, fixture.fixture.id, fixture.fixture.date,
      fixture.fixture.status?.short, lgId, season, home.name, away.name, base?.motor]);

  // Estadísticas del partido en curso, refrescadas mientras esté en juego.
  useEffect(() => {
    if (!isLive) { setLiveStats(null); return; }
    let dead = false;
    const traer = async () => {
      try {
        const st = await api("fixtures/statistics", { fixture: fixture.fixture.id }, TTL.live);
        if (dead || !st?.length) return;
        const val = (b, k) => {
          const v = (b?.statistics || []).find((x) => x.type === k)?.value;
          return v === null || v === undefined ? null : num(String(v).replace("%", ""));
        };
        const H = st.find((b) => b.team.id === home.id), A = st.find((b) => b.team.id === away.id);
        setLiveStats({
          shH: val(H, "Total Shots"), shA: val(A, "Total Shots"),
          sotH: val(H, "Shots on Goal"), sotA: val(A, "Shots on Goal"),
          posH: val(H, "Ball Possession"), posA: val(A, "Ball Possession"),
        });
      } catch (e) { /* la API no siempre publica estadísticas en vivo */ }
    };
    traer();
    const id = setInterval(traer, 90000);
    return () => { dead = true; clearInterval(id); };
  }, [isLive, api, fixture.fixture.id, home.id, away.id]);


  /* ---------- sugerencias ----------
     Antes se ordenaban por probabilidad, y ganaban siempre las obviedades:
     "menos de 3.5 goles" al 91% no dice nada, pasa en casi cualquier
     partido. Ahora se ordenan por cuánto se aparta el modelo de lo que
     daría un partido medio de esta misma liga, medido en log-odds. */
  // Cuánto puede moverse el pronóstico si las fuerzas están mal por ruido muestral.
  const banda = useMemo(() => {
    if (!model || !base) return null;
    const nH = Math.max(3, (base.mle?.gH ?? base.nSeasonH ?? 0) + (base.nFormH ?? 0));
    const nA = Math.max(3, (base.mle?.gA ?? base.nSeasonA ?? 0) + (base.nFormA ?? 0));
    const [r1, r2, r3] = uncertainty(model.lh, model.la, nH, nA, base.params?.rho ?? -0.13,
      [(x, y) => x > y, (x, y) => x + y > 2.5, (x, y) => x > 0 && y > 0], 140);
    return { x1: r1, ou: r2, btts: r3 };
  }, [model, base]);

  // Qué pasa si los goles esperados se mueven un 15% en cada dirección.
  const sensib = useMemo(() => {
    if (!model || !base) return null;
    const rho = base.params?.rho ?? -0.13;
    const caso = (fh, fa) => {
      const mm = buildMatrix(clamp(model.lh * fh, 0.1, 6), clamp(model.la * fa, 0.1, 6),
        { rho, corr: base.params?.corr, theta: base.params?.theta, nu: base.params?.nu });
      return {
        h: sumWhere(mm, (x, y) => x > y), d: sumWhere(mm, (x, y) => x === y),
        o: sumWhere(mm, (x, y) => x + y > 2.5), b: sumWhere(mm, (x, y) => x > 0 && y > 0),
      };
    };
    return [
      [`${home.name} +15% de ataque`, caso(1.15, 1)],
      [`${home.name} −15% de ataque`, caso(0.85, 1)],
      [`${away.name} +15% de ataque`, caso(1, 1.15)],
      [`${away.name} −15% de ataque`, caso(1, 0.85)],
      ["Partido más abierto (+15% los dos)", caso(1.15, 1.15)],
      ["Partido más cerrado (−15% los dos)", caso(0.85, 0.85)],
    ];
  }, [model, base, home.name, away.name]);

  /** Una sugerencia útil no es la más probable, es la que más se aparta de
      lo normal en esta liga. "Menos de 3.5 goles al 91%" no dice nada si en
      un partido medio ya es el 88%. Se ordena por información esperada:
      cuánto se gana al creer al modelo en vez de a la media. */
  const topPicks = useMemo(() => {
    if (!model) return [];
    const confW = { alta: 1, media: 0.94, baja: 0.85 }[base?.conf?.level] ?? 0.94;
    const pool = all
      .map((x) => {
        if (!x.core || !fin(x.p)) return null;
        const prior = x.prior !== undefined ? x.prior : model.ref?.get(x.key);
        if (!fin(prior) || prior <= 0.001 || prior >= 0.999) return null;
        if (x.p < 0.50 || x.p > 0.94) return null;
        // Información esperada (Kullback-Leibler de un solo suceso).
        const ganancia = x.p * Math.log(x.p / prior) + (1 - x.p) * Math.log((1 - x.p) / (1 - prior));
        return { ...x, prior, p0: prior, ganancia, score: ganancia * confW };
      })
      .filter((x) => x && x.p > x.prior + 0.03 && x.ganancia > 0.008)
      .sort((a, b) => b.score - a.score);
    const seen = new Set();
    const res = [];
    for (const x of pool) {
      if (seen.has(x.concepto)) continue;
      seen.add(x.concepto);
      res.push(x);
      if (res.length === 3) break;
    }
    return res;
  }, [all, model, base]);

  // Tasas por jugador, listas para guardarse junto a una selección suya.
  const lamsPorJugador = useMemo(() => {
    const m = new Map();
    propRows.forEach((r) => m.set(r.id, {
      id: r.id, teamId: r.teamId,
      lamGl: +(r.lamGl || 0).toFixed(5),
      lamSot: +(r.lamSot || 0).toFixed(5),
      lamSh: +(r.lamSh || 0).toFixed(5),
    }));
    return m;
  }, [propRows]);

  // Ficha del partido que se guarda con cada selección: permite volver a
  // montar la matriz más tarde y recalcular la conjunta exacta, en vez de
  // quedarse con un porcentaje suelto.
  const fichaPartido = useMemo(() => {
    if (!model || !base) return null;
    const P = base.params || P0;
    return {
      home: home.name, away: away.name, date: fixture.fixture.date,
      homeId: home.id, awayId: away.id,
      liga: fixture.league.name, pais: fixture.league.country || "",
      lh: +model.lh.toFixed(6), la: +model.la.toFixed(6),
      rho: P.rho ?? -0.13, corr: P.corr || "dc", theta: P.theta ?? 0.06, nu: P.nu ?? 1,
      share: model.half?.share ?? 0.45,
      // Con qué respaldo se calculó: en la combinada importa saber si una
      // pata sale de veinte jornadas o de tres.
      conf: base.conf ? { level: base.conf.level, hint: base.conf.hint } : null,
    };
  }, [model, base, home.name, away.name, fixture]);

  // Al volver a un partido, sus selecciones siguen marcadas.
  const restaurado = useRef(false);
  useEffect(() => {
    if (restaurado.current || !all.length) return;
    restaurado.current = true;
    let dead = false;
    (async () => {
      const todo = await slipRead();
      const mias = todo.filter((x) => x.fx === fixture.fixture.id);
      if (dead || !mias.length) return;
      // Las de jugador no están en el catálogo de mercados, así que se
      // recuperan tal cual quedaron guardadas en vez de perderse.
      const recuperadas = mias.map((p) => {
        const full = byKey.get(p.key);
        return full ? { ...full, off: p.off } : p;
      }).filter(Boolean);
      if (recuperadas.length) setPicks(recuperadas);
    })();
    return () => { dead = true; };
  }, [all.length, byKey, fixture.fixture.id]);

  const isPicked = useCallback((m) => !!m && picks.some((p) => p.key === m.key), [picks]);
  const togglePick = useCallback((m) => {
    if (!m) return;
    setPicks((ps) => {
      const fuera = ps.some((p) => p.key === m.key);
      const next = fuera ? ps.filter((p) => p.key !== m.key) : [...ps, m];
      // Se sincroniza con las selecciones de los demás partidos.
      (async () => {
        const todo = await slipRead();
        const otras = todo.filter((x) => x.fx !== fixture.fixture.id);
        // Con props de jugador hay que guardar también sus tasas: sin
        // ellas, la combinada no puede volver a simular este partido.
        const jugadores = next.filter((p) => p.simRef)
          .map((p) => lamsPorJugador.get(p.simRef.playerId)).filter(Boolean);
        const ficha = fichaPartido && jugadores.length
          ? { ...fichaPartido, players: jugadores } : fichaPartido;
        const mios = next.map((p) => ({
          id: slipId(fixture.fixture.id, p.key), fx: fixture.fixture.id, key: p.key,
          fam: p.fam, mercado: p.mercado, sel: p.sel, p: p.p, nota: p.nota,
          simRef: p.simRef
            ? { ...p.simRef, ...(lamsPorJugador.get(p.simRef.playerId) || {}) }
            : undefined,
          off: p.off || undefined,
          partido: ficha, ts: Date.now(),
        }));
        await slipWrite([...otras, ...mios]);
      })();
      return next;
    });
  }, [fixture.fixture.id, fichaPartido, lamsPorJugador]);

  const joint = useMemo(() => {
    const vivas = picks.filter((p) => !p.off);
    if (!vivas.length || !model) return null;
    const naive = vivas.reduce((a, b) => a * b.p, 1);
    const conJugadores = vivas.some((p) => p.simRef);
    // Con props de jugador no vale multiplicar: los goles del equipo y los
    // remates de sus delanteros van juntos. Se simula el partido entero.
    if (conJugadores && propRows.length) {
      const r = mcJoint({
        m: model.m, lh: model.lh, la: model.la, picks: vivas,
        players: propRows.map((x) => ({ id: x.id, teamId: x.teamId, lamGl: x.lamGl, lamSot: x.lamSot, lamSh: x.lamSh })),
        homeId: home.id, n: recortar() ? 6000 : 20000,
      });
      if (r) return { p: r.p, naive, modo: "simulada", se: r.se };
    }
    const exact = vivas.filter((p) => p.pred);
    const rest = vivas.filter((p) => !p.pred);
    let pj = exact.length ? sumWhere(model.m, (x, y) => exact.every((k) => k.pred(x, y))) : 1;
    pj *= rest.reduce((a, b) => a * b.p, 1);
    return { p: pj, naive, modo: rest.length === 0 ? "exacta" : "aproximada", nExact: exact.length };
  }, [picks, model, propRows, home.id]);



  if (baseErr) return <div className="alert">{baseErr}</div>;
  if (!base || !model) return <Spinner label="Estimando fuerzas de ataque y defensa" />;

  const mkFam = (f) => all.filter((x) => x.fam === f);
  const totalsLadder = lineasDe("Goles", "Total ").map((L) => ({
    line: L,
    over: g("Goles", `Total ${L}`, "Más de"),
    under: g("Goles", `Total ${L}`, "Menos de"),
  }));

  const stage = (label, texto, onClick, busy, err, disabled, hint) => (
    <div className="stage">
      <p>{texto}</p>
      <button className="btn btn-primary" onClick={onClick} disabled={busy || disabled}>
        {busy ? "Consultando la API…" : label}
      </button>
      {err && <div className="alert">{err}</div>}
      {hint && <p className="foot">{hint}</p>}
    </div>
  );

  const countPanel = (famName, d, equipos, tuneNote) => {
    if (!counts)
      return stage(
        "Calcular con los últimos 10 partidos",
        "Córners, tarjetas y disparos se estiman con los diez partidos previos de cada equipo, separando lo que genera cada uno de lo que concede el rival. Son unas 20 llamadas a la API y quedan en caché.",
        loadCounts, countsBusy, countsErr
      );
    if (!d) return <Empty title="Esta competición no publica esta estadística" hint="La API no devuelve el dato en los partidos muestreados." />;
    const rows = lineasDe(famName, "Total ").map((L) => ({
      line: L,
      over: g(famName, `Total ${L}`, "Más de"),
      under: g(famName, `Total ${L}`, "Menos de"),
    }));
    return (
      <>
        <div className="expected">
          <div className="exp">
            <span>Total esperado</span>
            <b className="mono">{fx(d.tot * (famName === "Tarjetas" ? adj.ref * adj.tension : 1))}</b>
            <i className="mono">varianza {fx(d.varTot)} · n={d.n ?? 0}</i>
          </div>
          <div className="exp">
            <span>{home.name}</span>
            <b className="mono">{fx(d.eH * (famName === "Tarjetas" ? adj.ref * adj.tension : 1))}</b>
          </div>
          <div className="exp">
            <span>{away.name}</span>
            <b className="mono">{fx(d.eA * (famName === "Tarjetas" ? adj.ref * adj.tension : 1))}</b>
          </div>
        </div>
        {tuneNote}
        <Rule label="Total del partido" />
        <Ladder rows={rows} onPick={togglePick} isPicked={isPicked} />
        <Rule label="Por equipo" />
        <div className="two">
          {(equipos || []).map((name) => (
            <div key={name}>
              <div className="colhead">{name}</div>
              <Ladder
                rows={lineasDe(famName, `${name} · total `).map((L) => ({
                  line: L,
                  over: g(famName, `${name} · total ${L}`, "Más de"),
                  under: g(famName, `${name} · total ${L}`, "Menos de"),
                }))}
                onPick={togglePick}
                isPicked={isPicked}
              />
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <ModoProb.Provider value={modoP}>
    <div className={"mk" + (picks.length ? " mk-pad" : "")}>
      {/* ---------- columna lateral: el modelo y sus mandos ---------- */}
      <aside className="mk-side">
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">El modelo</h2>
          <Conf level={base.conf?.level || "media"} hint={base.conf?.hint} />
        </div>
        <div className="card-body mk-model">
        <div className="mk-xg">
          <div className="xgside">
            <span className="xglab">{home.name}</span>
            <b className="mono xgval">{fx(model.lh, 2)}</b>
            <span className="mono xgsub">
              atq {fx(base.atkH, 2)} · def {fx(base.defH, 2)}
            </span>
          </div>
          <div className="xgmid">
            <span className="xgtitle">Goles esperados</span>
            <div className="xgtrack">
              <span className="xgfill xgh" style={{ width: (model.lh / (model.lh + model.la)) * 100 + "%" }} />
            </div>
            <span className="mono xgtot">{fx(model.lh + model.la, 2)} en total</span>
          </div>
          <div className="xgside xgright">
            <span className="xglab">{away.name}</span>
            <b className="mono xgval">{fx(model.la, 2)}</b>
            <span className="mono xgsub">
              atq {fx(base.atkA, 2)} · def {fx(base.defA, 2)}
            </span>
          </div>
        </div>
        <div className="mk-meta">
          <Conf level={base.conf?.level || "media"} hint={base.conf?.hint} />
          <span className="chip">
            {base.nSeasonH ?? 0}/{base.nSeasonA ?? 0} PJ temporada · {base.nFormH ?? 0}/{base.nFormA ?? 0} en forma
          </span>
          <span className="chip">{base.ligaOk ? "Media de liga real" : "Media de liga estimada"}</span>
          <span className={"chip" + (base.mle ? " chip-on" : "")} title={
            base.mle
              ? `Ataque y defensa de los ${base.mle.n} partidos de la liga estimados a la vez`
              : "Sin bastantes partidos de liga: se usan cocientes de promedios"}>
            {base.motor === "máxima verosimilitud" ? "Máxima verosimilitud" : "Cocientes de promedios"}
          </span>
          {base.mle && (
            <span className="chip" title="Estimada de los datos de esta liga, no supuesta">
              Ventaja de campo ×{fx(base.mle.gamma, 2)}
            </span>
          )}
          {base.oppAdj && <span className="chip">Forma ajustada por rival</span>}
          {model.half.real && (
            <span className="chip">1ª parte {Math.round(model.half.share * 100)}% de los goles</span>
          )}
          {(base.restH?.days != null || base.restA?.days != null) && (
            <span className="chip" title="Días desde el último partido y partidos en los últimos 14 días">
              Descanso {base.restH?.days ?? "?"}d / {base.restA?.days ?? "?"}d
            </span>
          )}
          {model.usaXg && <span className="chip chip-on">Afinado con xG</span>}
          {ensProg !== null && (
            <span className="chip" title="El ensamble se está entrenando en segundo plano; la pantalla sigue respondiendo">
              Entrenando el ensamble… {Math.round(ensProg * 100)}%
            </span>
          )}
          {model.usaEns && ens && (
            <span className="chip chip-on"
              title={`Mezcla aprendida: ${Math.round(ens.w[0] * 100)}% Dixon-Coles, ${Math.round(ens.w[1] * 100)}% Elo + ordinal, sobre ${ens.n} partidos`}>
              Ensamble {Math.round(ens.w[1] * 100)}% Elo
            </span>
          )}
          {model.usaMkt > 0 && (
            <span className="chip chip-on">Mezclado {model.usaMkt}% con fuentes externas</span>
          )}
          {base.xgFuente && <span className="chip chip-on">xG de {base.xgFuente}</span>}
          {base.mediaFuente && base.mediaFuente !== "clasificación" && (
            <span className="chip" title="La clasificación no daba datos utilizables">
              Media {base.mediaFuente}
            </span>
          )}
          {(base.params?.corr === "copula" || (base.params?.nu ?? 1) !== 1) && (
            <span className="chip">
              {base.params.corr === "copula" ? "Cópula" : "Dixon-Coles"}
              {(base.params?.nu ?? 1) !== 1 ? ` · dispersión ${base.params.nu}` : ""}
            </span>
          )}
          {paramsInfo ? (
            <span className="chip chip-on" title={`Ajustados con la temporada ${paramsInfo.season} sobre ${paramsInfo.n} partidos`}>
              Parámetros calibrados
            </span>
          ) : (
            <span className="chip" title="Puedes ajustarlos en la pestaña Calibración">Parámetros por defecto</span>
          )}
        </div>
        <div className="mk-acts">
          <OverflowMenu label="Exportar" items={[
            {
              label: "Exportar CSV", onClick: () => downloadText(
                `mercados-${home.name}-${away.name}.csv`,
                toCSV(all, [["familia", (r) => r.fam], ["mercado", (r) => r.mercado],
                  ["seleccion", (r) => r.sel], ["probabilidad", (r) => r.p.toFixed(4)],
                  ["nota", (r) => r.nota || ""]])),
            },
            {
              label: "Exportar Excel", onClick: () => downloadText(
                `mercados-${home.name}-${away.name}.xls`,
                toExcel([
                  { nombre: "Mercados", filas: all, cols: [["Familia", (r) => r.fam],
                    ["Mercado", (r) => r.mercado], ["Selección", (r) => r.sel],
                    ["Probabilidad", (r) => Number(r.p.toFixed(4))], ["Nota", (r) => r.nota || ""]] },
                  { nombre: "Modelo", filas: [{}], cols: [
                    ["Local", () => home.name], ["Visitante", () => away.name],
                    ["Goles esperados local", () => Number(model.lh.toFixed(3))],
                    ["Goles esperados visitante", () => Number(model.la.toFixed(3))],
                    ["Motor", () => base.motor],
                    ["Ventaja de campo", () => (base.mle ? Number(base.mle.gamma.toFixed(3)) : "")]] },
                  ...(propRows.length ? [{ nombre: "Jugadores", filas: propRows, cols: [
                    ["Jugador", (r) => r.name], ["Equipo", (r) => r.team],
                    ["Minutos estimados", (r) => Math.round(r.expMin)],
                    ["1+ a puerta", (r) => Number(r.sot1.toFixed(4))],
                    ["Marca", (r) => Number(r.gol.toFixed(4))],
                    ["Tarjeta", (r) => Number(r.tar.toFixed(4))]] }] : []),
                ]), "application/vnd.ms-excel"),
            },
          ]} />
        </div>

        <Collapsible title="Ajustes del modelo">
          <div className="adjbox">
            <label className="adj">
              <span>Ataque {home.name}</span>
              <input type="range" min="-30" max="30" step="5" value={adj.h}
                onChange={(e) => setAdj((a) => ({ ...a, h: Number(e.target.value) }))} />
              <b className="mono">{adj.h > 0 ? "+" : ""}{adj.h}%</b>
            </label>
            <label className="adj">
              <span>Ataque {away.name}</span>
              <input type="range" min="-30" max="30" step="5" value={adj.a}
                onChange={(e) => setAdj((a) => ({ ...a, a: Number(e.target.value) }))} />
              <b className="mono">{adj.a > 0 ? "+" : ""}{adj.a}%</b>
            </label>
            <label className="adj">
              <span>Árbitro</span>
              <select className="input" value={adj.ref}
                onChange={(e) => setAdj((a) => ({ ...a, ref: Number(e.target.value) }))}>
                <option value={0.85}>Permisivo</option>
                <option value={1}>Normal</option>
                <option value={1.2}>Estricto</option>
              </select>
            </label>
            <label className="adj">
              <span>Tensión del partido</span>
              <select className="input" value={adj.tension}
                onChange={(e) => setAdj((a) => ({ ...a, tension: Number(e.target.value) }))}>
                <option value={0.92}>Trámite</option>
                <option value={1}>Normal</option>
                <option value={1.15}>Clásico o final</option>
              </select>
            </label>
            {(odds?.x1x2 || odds?.apiPred) && (
              <div className="adjwide">
                {odds?.x1x2 && (
                  <label className="adj">
                    <span>Peso del mercado</span>
                    <input type="range" min="0" max="80" step="10" value={adj.mkt}
                      onChange={(e) => setAdj((a) => ({ ...a, mkt: Number(e.target.value) }))} />
                    <b className="mono">{adj.mkt}%</b>
                  </label>
                )}
                {odds?.apiPred && (
                  <label className="adj">
                    <span>Peso de la API</span>
                    <input type="range" min="0" max="50" step="10" value={adj.api}
                      onChange={(e) => setAdj((a) => ({ ...a, api: Number(e.target.value) }))} />
                    <b className="mono">{adj.api}%</b>
                  </label>
                )}
                <p className="foot">
                  Mezclar con el mercado casi siempre mejora la precisión, porque las casas ven
                  alineaciones y noticias. Pero entonces dejas de tener una opinión propia: si lo
                  subes mucho, la pizarra solo te devuelve lo que ya dice la cuota.
                </p>
              </div>
            )}
            {ens && (
              <label className="adj adjwide">
                <span>Ensamble</span>
                <label className="switch">
                  <input type="checkbox" checked={adj.ens}
                    onChange={(e) => setAdj((a) => ({ ...a, ens: e.target.checked }))} />
                  <span>
                    Mezclar Dixon-Coles con Elo + regresión ordinal ({Math.round(ens.w[0] * 100)}/
                    {Math.round(ens.w[1] * 100)}). El 1X2 del ensamble se traslada a todos los
                    mercados buscando los goles esperados que lo reproducen.
                  </span>
                </label>
              </label>
            )}
            {counts?.xg && (
              <label className="adj adjwide">
                <span>Usar xG</span>
                <label className="switch">
                  <input type="checkbox" checked={adj.xg}
                    onChange={(e) => setAdj((a) => ({ ...a, xg: e.target.checked }))} />
                  <span>
                    Pesa el xG de los últimos partidos por encima de los goles ({counts.xg.n} muestras)
                  </span>
                </label>
              </label>
            )}
            <div className="adjwide">
              {!inj ? (
                <button className="btn btn-ghost" onClick={loadInj} disabled={injBusy}>
                  {injBusy ? "Consultando bajas…" : "Estimar impacto de las bajas (2 llamadas)"}
                </button>
              ) : (
                <div className="injimpact">
                  {[home, away].map((t) => {
                    const d = inj[t.id];
                    if (!d) return null;
                    return (
                      <div key={t.id} className="injcol">
                        <div className="injhead">
                          {t.name}
                          <span className="mono injadj">{d.ajuste}%</span>
                        </div>
                        {d.detalle.length === 0 ? (
                          <div className="injnone">Sin bajas registradas</div>
                        ) : (
                          d.detalle.slice(0, 8).map((p, i) => (
                            <div key={i} className="injrow">
                              <span>{p.name}</span>
                              <span className={"injtag " + (p.ap > 0.08 || p.dp > 0.08 ? "injout" : "injdoubt")}>
                                {p.ap > 0.01 ? `${Math.round(p.ap * 100)}% del gol`
                                  : p.dp > 0.01 ? `${Math.round(p.dp * 60)}% de la defensa`
                                  : (p.tipo || "duda")}
                              </span>
                            </div>
                          ))
                        )}
                        {d.ajusteRival > 0 && (
                          <div className="injnone">
                            Bajas atrás: el rival marcaría un {d.ajusteRival}% más
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button className="btn btn-quiet injapply"
                    onClick={() => setAdj((a) => ({
                      ...a,
                      h: (inj[home.id]?.ajuste || 0) + (inj[away.id]?.ajusteRival || 0),
                      a: (inj[away.id]?.ajuste || 0) + (inj[home.id]?.ajusteRival || 0),
                    }))}>
                    Aplicar las bajas de los dos equipos
                  </button>
                </div>
              )}
              {injErr && <div className="alert">{injErr}</div>}
            </div>
            <p className="foot">
              Los dos deslizadores mueven los goles esperados. El impacto de las bajas se calcula
              con los goles y asistencias que aporta cada ausente sobre el total del equipo, y se
              traslada solo en parte: nadie es del todo insustituible. Árbitro y tensión solo
              afectan a las tarjetas.
              {fixture.fixture.referee ? ` Árbitro designado: ${fixture.fixture.referee}.` : ""}
            </p>
          </div>
        </Collapsible>
      </div>
      </section>
      </aside>

      {/* ---------- columna principal ---------- */}
      <div className="mk-main">
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Lectura del partido</h2>
          {model.usaEns && <span className="card-note">con ensamble</span>}
        </div>
        <div className="card-body">
      {model.live && (
        <p className="foot" style={{ marginTop: 0, marginBottom: 12 }}>
          Esto es lo que decía el modelo antes del pitido inicial. Para el estado actual del
          partido, mira la pestaña En vivo.
        </p>
      )}
      <TriBar
        items={[g("Resultado", "1X2", home.name), g("Resultado", "1X2", "Empate"), g("Resultado", "1X2", away.name)]}
        onPick={togglePick}
        isPicked={isPicked}
      />
      {odds?.x1x2 && (() => {
        const filas = [[home.name, g("Resultado", "1X2", home.name)?.p, odds.x1x2.p[0]],
          ["el empate", g("Resultado", "1X2", "Empate")?.p, odds.x1x2.p[1]],
          [away.name, g("Resultado", "1X2", away.name)?.p, odds.x1x2.p[2]]];
        const fuerte = filas.filter(([, a, b]) => a != null && Math.abs(a - b) >= 0.10);
        if (!fuerte.length) return null;
        return (
          <div className="alerta">
            <span className="alerta-tag">Discrepancia</span>
            <span>
              El modelo se separa diez puntos o más del mercado en{" "}
              {fuerte.map(([lab, a, b]) => `${lab} (${pc0(a)} frente a ${pc0(b)})`).join(" y ")}.
              Antes de fiarte del modelo, busca qué sabe el mercado que él no: una baja, un
              entrenador nuevo, un partido sin nada en juego.
            </span>
          </div>
        );
      })()}
      {banda && (
        <div className="bandas">
          <span>
            Margen de error del modelo, al 80%:
            <b className="mono"> {pc0(banda.x1.lo)}–{pc0(banda.x1.hi)}</b> gana {home.name} ·
            <b className="mono"> {pc0(banda.ou.lo)}–{pc0(banda.ou.hi)}</b> más de 2.5 ·
            <b className="mono"> {pc0(banda.btts.lo)}–{pc0(banda.btts.hi)}</b> ambos marcan
          </span>
        </div>
      )}
      {topPicks.length === 0 ? (
        <div className="pick pick-weak">
          <span className="pick-tag">Nada que destacar</span>
          <b>Este partido se parece mucho a la media de su liga</b>
          <span className="pick-weak-note">
            El modelo no encuentra ningún mercado donde se aparte de forma
            apreciable de lo que daría un partido cualquiera de esta competición.
            Mira las pestañas si buscas un número concreto, pero no hay una
            lectura propia que ofrecer.
          </span>
        </div>
      ) : (
        <>
          <div className="picks">
            {topPicks.map((p, i) => (
              <button
                key={p.key}
                className={"pickcard" + (i === 0 ? " pickcard-1" : "") + (isPicked(p) ? " pickcard-on" : "")}
                onClick={() => togglePick(p)}
              >
                <span className="pickrank mono">{i + 1}</span>
                <span className="pickmkt">{p.mercado}</span>
                <span className="picksel">
                  {p.fam === "Hándicap" ? `${p.sel} ${p.mercado.replace("Asiático ", "")}` : p.sel}
                </span>
                <span className="mono pickp">{pc(p.p)}</span>
                <ProbBar p={p.p} tone={i === 0 ? "pfill-hi" : ""} />
                <span className="pickwhy">
                  Un partido medio de esta liga daría{" "}
                  <b className="mono">{pc0(p.p0)}</b>
                  <i className="pickup">
                    {fin(p.p0) ? `+${Math.round((p.p - p.p0) * 100)} puntos` : "destacado"}
                  </i>
                </span>
              </button>
            ))}
          </div>
          <p className="foot">
            No están ordenadas por probabilidad, sino por cuánto se separa el modelo de lo que
            daría un partido medio de esta liga. Un 91% en "menos de 3.5 goles" es correcto pero
            no aporta nada: pasa casi siempre. Lo que ves arriba es donde este partido tiene algo
            propio que decir.
          </p>
        </>
      )}

        </div>
      </section>

      {/* ---------- mercados ---------- */}
      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Mercados</h2>
          <div className="card-tools">
            <div className="seg">
              {[["pct", "%"], ["cuota", "Cuota"]].map(([k, l]) => (
                <button key={k} className={"segbtn" + (modoP === k ? " segbtn-on" : "")}
                  onClick={() => setModoP(k)} title={k === "cuota"
                    ? "Ver las probabilidades como la cuota que las igualaría"
                    : "Ver las probabilidades en porcentaje"}>{l}</button>
              ))}
            </div>
            <span className="card-note mono">{all.length} mercados</span>
          </div>
        </div>
        <div className="card-body card-flush">
      {(() => {
        const familias = model.live ? ["En vivo", ...FAMS_BASE] : FAMS_BASE;
        const contarFam = (f) => f === "Jugadores" ? (propRows.length || 0)
          : ["Mercado", "En vivo", "Resumen"].includes(f) ? 0 : mkFam(f).length;
        // Un punto donde ya has marcado algo: con doce familias, sin
        // esto hay que entrar en todas para recordar dónde estabas.
        const marcasFam = (f) => picks.filter((p) => p.fam === f).length;
        return (
          <>
            <div className="famnav">
              {familias.map((f) => (
                <button key={f} className={"fambtn" + (fam === f ? " fambtn-on" : "")} onClick={() => setFam(f)}>
                  {f}
                  {marcasFam(f) > 0 && <em className="fambtn-marca" title={`${marcasFam(f)} seleccionadas aquí`} />}
                  {contarFam(f) > 0 && <i className="mono">{contarFam(f)}</i>}
                </button>
              ))}
              <button className="fambtn fambtn-grid" aria-label="Ver todos los mercados en una rejilla"
                title="Ver todos" onClick={() => setFamSheet(true)}>
                <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.2" />
                  <rect x="10" y="2.5" width="5.5" height="5.5" rx="1.2" />
                  <rect x="2.5" y="10" width="5.5" height="5.5" rx="1.2" />
                  <rect x="10" y="10" width="5.5" height="5.5" rx="1.2" />
                </svg>
              </button>
            </div>

            {famSheet && (
              <div className="modal-fondo" onClick={() => setFamSheet(false)}>
                <div className="modal" role="dialog" aria-label="Todos los mercados" onClick={(e) => e.stopPropagation()}>
                  <div className="card-head">
                    <h2 className="card-title">Todos los mercados</h2>
                    <button className="cb-x" aria-label="Cerrar" onClick={() => setFamSheet(false)}>×</button>
                  </div>
                  <div className="card-body modal-scroll">
                    <div className="league-grid">
                      {familias.map((f) => (
                        <button key={f} className={"league-tile" + (fam === f ? " league-tile-on" : "")}
                          onClick={() => { setFam(f); setFamSheet(false); }}>
                          <span className="fam-tile-n mono">{contarFam(f) || ""}</span>
                          <span className="league-tile-name">
                            {f}{marcasFam(f) > 0 && <i className="fambtn-marca" style={{ marginLeft: 4 }} />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      <div className="fampanel">
        {fam === "Resumen" && (() => {
          const linea = (etiqueta, mkts) => ({ etiqueta, mkts: mkts.filter(Boolean) });
          const mejorHcp = (() => {
            const cands = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5].map((L) => {
              const h = g("Hándicap", `Asiático ${tagAsia(L)}`, home.name);
              const a = g("Hándicap", `Asiático ${tagAsia(-L)}`, away.name);
              return h && a ? { L, tag: tagAsia(L), h, a, d: Math.abs(h.p - 0.5) } : null;
            }).filter(Boolean).sort((a, b) => a.d - b.d);
            return cands[0];
          })();
          const bloques = [
            linea("Resultado", [g("Resultado", "1X2", home.name), g("Resultado", "1X2", "Empate"),
              g("Resultado", "1X2", away.name)]),
            linea("Goles", [g("Goles", "Total 2.5", "Más de"), g("Goles", "Total 2.5", "Menos de")]),
            linea("Ambos marcan", [g("Goles", "Ambos marcan", "Sí"), g("Goles", "Ambos marcan", "No")]),
            mejorHcp ? linea("Hándicap asiático", [mejorHcp.h, mejorHcp.a]) : null,
            counts?.corners ? linea("Córners 9.5", [g("Córners", "Total 9.5", "Más de"),
              g("Córners", "Total 9.5", "Menos de")]) : null,
            counts?.cards ? linea("Tarjetas 4.5", [g("Tarjetas", "Total 4.5", "Más de"),
              g("Tarjetas", "Total 4.5", "Menos de")]) : null,
          ].filter((b) => b && b.mkts.length);
          return (
            <>
              <div className="resumen">
                {bloques.map((b) => (
                  <div className="resblk" key={b.etiqueta}>
                    <div className="resh">{b.etiqueta}</div>
                    {b.mkts.map((mk) => (
                      <button key={mk.key}
                        className={"resrow" + (isPicked(mk) ? " resrow-on" : "")}
                        onClick={() => togglePick(mk)}>
                        <span className="ressel">
                          {mk.fam === "Hándicap" ? `${mk.sel} ${mk.mercado.replace("Asiático ", "")}` : mk.sel}
                        </span>
                        <span className="mono resp">{pc(mk.p)}</span>
                        <ProbBar p={mk.p} tone={mk.p >= 0.55 ? "pfill-hi" : ""} />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {h2h && (
                <Collapsible title="Historial directo" defaultOpen>
                  <p className="foot" style={{ marginTop: 0 }}>
                    En los últimos <span className="mono">{h2h.n}</span> enfrentamientos:{" "}
                    <span className="mono">{fx(h2h.total)}</span> goles por partido,{" "}
                    <span className="mono">{pc0(h2h.btts)}</span> con los dos equipos marcando y{" "}
                    <span className="mono">{pc0(h2h.vic)}</span> de victorias de {home.name}. El
                    modelo ya usa este historial como una variable más del ensamble, encogida:
                    cuatro partidos entre plantillas que han cambiado no son una ley.
                  </p>
                </Collapsible>
              )}
              {!counts && (
                <p className="foot">
                  Córners y tarjetas aparecerán aquí cuando los calcules en sus pestañas.
                </p>
              )}
            </>
          );
        })()}

        {fam === "En vivo" && model.live && (() => {
          const L = model.live;
          const shift = (fn) => sumWhere(L.mr, (x, y) => fn(L.gH + x, L.gA + y));
          const pH = shift((x, y) => x > y), pD = shift((x, y) => x === y);
          const filas = [
            [`Gana ${home.name}`, pH], ["Empate", pD], [`Gana ${away.name}`, 1 - pH - pD],
            ["Más de 2.5 goles", shift((x, y) => x + y > 2.5)],
            ["Menos de 2.5 goles", shift((x, y) => x + y < 2.5)],
            ["Ambos marcan", shift((x, y) => x > 0 && y > 0)],
            ["Habrá otro gol", 1 - sumWhere(L.mr, (x, y) => x + y === 0)],
          ];
          return (
            <>
              <div className="livehead">
                <span className="dot" />
                Minuto {L.elapsed}′ · marcador {L.gH}–{L.gA} · queda el{" "}
                <b className="mono">{Math.round(L.rem * 100)}%</b> del partido
              </div>
              {L.ritmo && (
                <div className="livestats">
                  Remates {L.ritmo.shH ?? "—"}–{L.ritmo.shA ?? "—"} · posesión{" "}
                  {L.ritmo.posH ?? "—"}%–{L.ritmo.posA ?? "—"}% · el ritmo real ajusta los goles
                  que quedan en <b className="mono">{fx((L.ritmo.fH - 1) * 100, 0)}%</b> /{" "}
                  <b className="mono">{fx((L.ritmo.fA - 1) * 100, 0)}%</b>
                </div>
              )}
              <div className="colhead">Probabilidades con el partido en marcha</div>
              {filas.map(([lab, p]) => (
                <div className="mrow" key={lab}>
                  <span />
                  <div className="mrow-lab"><span className="mrow-sel">{lab}</span></div>
                  <ProbBar p={p} tone={p >= 0.6 ? "pfill-hi" : p < 0.33 ? "pfill-lo" : ""} />
                  <span className="mono mrow-p">{pc(p)}</span>
                </div>
              ))}
              <p className="foot">
                Se reparten los goles esperados sobre los minutos que quedan, se corrigen con los
                remates que lleva cada equipo y se suman al marcador actual. Lo que sigue sin ver:
                expulsiones y el hecho de que un equipo que va perdiendo se vuelca. Tómalo como una referencia, no como una
                lectura fina del partido.
              </p>
            </>
          );
        })()}

        {fam === "Mercado" && (
          !odds ? (
            stage("Traer las cuotas y limpiarlas",
              "Compara el modelo con lo que piensan las casas de apuestas. Se les quita el margen con el método de Shin, que reparte la comisión suponiendo que hay apostantes informados, en vez de repartirla en proporción (lo habitual, y lo que infla a los favoritos). Es una llamada a la API.",
              loadOdds, oddsBusy, oddsErr)
          ) : (
            <>
              <div className="colhead">Modelo frente a mercado · mediana de {odds.n} casas</div>
              <div className="cmp">
                <div className="cmphead">
                  <span>Selección</span><span>Modelo</span><span>Mercado</span><span>Diferencia</span>
                </div>
                {[
                  ...(odds.x1x2 ? [
                    [home.name, g("Resultado", "1X2", home.name).p, odds.x1x2.p[0]],
                    ["Empate", g("Resultado", "1X2", "Empate").p, odds.x1x2.p[1]],
                    [away.name, g("Resultado", "1X2", away.name).p, odds.x1x2.p[2]],
                  ] : []),
                  ...(odds.ou25 ? [
                    ["Más de 2.5", g("Goles", "Total 2.5", "Más de").p, odds.ou25.p[0]],
                    ["Menos de 2.5", g("Goles", "Total 2.5", "Menos de").p, odds.ou25.p[1]],
                  ] : []),
                  ...(odds.btts ? [
                    ["Ambos marcan: sí", g("Goles", "Ambos marcan", "Sí").p, odds.btts.p[0]],
                    ["Ambos marcan: no", g("Goles", "Ambos marcan", "No").p, odds.btts.p[1]],
                  ] : []),
                ].map(([lab, pm, po]) => {
                  const d = pm - po;
                  const fuerte = Math.abs(d) >= 0.05;
                  return (
                    <div className="cmprow" key={lab}>
                      <span className="cmplab">{lab}</span>
                      <span className="mono">{pc(pm)}</span>
                      <span className="mono cmpmkt">{pc(po)}</span>
                      <span className={"mono cmpdiff" + (fuerte ? (d > 0 ? " cmpup" : " cmpdown") : "")}>
                        {d > 0 ? "+" : ""}{fx(d * 100)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {ens && (
                <>
                  <div className="colhead">Qué dice cada motor</div>
                  <div className="cmp">
                    <div className="cmphead">
                      <span>Selección</span><span>Dixon-Coles</span><span>Elo + ordinal</span><span>Ensamble</span>
                    </div>
                    {[home.name, "Empate", away.name].map((lab, i) => (
                      <div className="cmprow" key={lab}>
                        <span className="cmplab">{lab}</span>
                        <span className="mono">{pc(ens.pDC[i])}</span>
                        <span className="mono cmpmkt">{pc(ens.pOrd[i])}</span>
                        <span className="mono cmpup">{pc(ens.pEns[i])}</span>
                      </div>
                    ))}
                  </div>
                  <p className="foot">
                    Diferencia Elo entre los dos equipos:{" "}
                    <span className="mono">{Math.round(ens.eloDiff)}</span> puntos, ventaja de
                    campo incluida. Cuando los dos motores se separan mucho es que discrepan sobre
                    cuánto pesa el historial largo frente a los goles recientes.
                  </p>
                </>
              )}
              {odds.apiPred && (
                <>
                  <div className="colhead">Pronóstico de la propia API-Football</div>
                  <div className="cmp">
                    {[[home.name, g("Resultado", "1X2", home.name).p, odds.apiPred[0]],
                      ["Empate", g("Resultado", "1X2", "Empate").p, odds.apiPred[1]],
                      [away.name, g("Resultado", "1X2", away.name).p, odds.apiPred[2]]].map(([lab, pm, po]) => (
                      <div className="cmprow" key={lab}>
                        <span className="cmplab">{lab}</span>
                        <span className="mono">{pc(pm)}</span>
                        <span className="mono cmpmkt">{pc(po)}</span>
                        <span className="mono cmpdiff">{pm - po > 0 ? "+" : ""}{fx((pm - po) * 100)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <p className="foot">
                El mercado es un rival durísimo: incorpora alineaciones, noticias y el dinero de
                mucha gente que sabe. Esto no está para copiarlo ni para buscar "valor"
                automáticamente, sino para lo contrario: donde el modelo se aparta cinco puntos o
                más, lo normal es que se le esté escapando algo (una baja, un cambio de entrenador,
                un partido intrascendente). Úsalo como alarma, y ve a averiguar qué es.
              </p>
            </>
          )
        )}

        {fam === "Resultado" && (
          <>
            <div className="two">
              <div>
                <div className="colhead">Doble oportunidad</div>
                {[`${home.name} o empate`, "Gana alguno", `Empate o ${away.name}`].map((s) => (
                  <MRow key={s} m={g("Resultado", "Doble oportunidad", s)} onPick={togglePick} isPicked={isPicked}
                    picked={isPicked(g("Resultado", "Doble oportunidad", s))} hideMercado />
                ))}
                <div className="colhead">Empate anula</div>
                {[home.name, away.name].map((s) => (
                  <MRow key={s} m={g("Resultado", "Empate anula", s)} onPick={togglePick}
                    picked={isPicked(g("Resultado", "Empate anula", s))} hideMercado />
                ))}
                <div className="colhead">Gana sin encajar</div>
                {[home.name, away.name].map((s) => (
                  <MRow key={s} m={g("Resultado", "Gana sin encajar", s)} onPick={togglePick}
                    picked={isPicked(g("Resultado", "Gana sin encajar", s))} hideMercado />
                ))}
              </div>
              <div>
                <div className="colhead">Margen de victoria</div>
                {mkFam("Resultado").filter((x) => x.mercado === "Margen").map((m) => (
                  <MRow key={m.key} m={m} onPick={togglePick} picked={isPicked(m)} hideMercado />
                ))}
              </div>
            </div>

            <Collapsible title="Qué pasa si me equivoco">
            {(() => {
              const f = 1 + sensV / 100;
              const rho = base.params?.rho ?? -0.13;
              const mm = buildMatrix(clamp(model.lh * f, 0.1, 6), clamp(model.la * f, 0.1, 6),
                { rho, corr: base.params?.corr, theta: base.params?.theta, nu: base.params?.nu });
              const v = {
                h: sumWhere(mm, (x, y) => x > y), d: sumWhere(mm, (x, y) => x === y),
                o: sumWhere(mm, (x, y) => x + y > 2.5), b: sumWhere(mm, (x, y) => x > 0 && y > 0),
              };
              return (
                <div className="sensbox">
                  <label className="adj">
                    <span>Mover los dos ataques</span>
                    <input type="range" min="-30" max="30" step="1" value={sensV}
                      onChange={(e) => setSensV(Number(e.target.value))} />
                    <b className="mono">{sensV > 0 ? "+" : ""}{sensV}%</b>
                  </label>
                  <div className="sensout">
                    {[[`Gana ${home.name}`, v.h], ["Empate", v.d], ["Más de 2.5", v.o],
                      ["Ambos marcan", v.b]].map(([lab, p]) => (
                      <div className="sensc" key={lab}>
                        <span>{lab}</span>
                        <b className="mono">{pc(p)}</b>
                        <ProbBar p={p} tone={p >= 0.55 ? "pfill-hi" : ""} />
                      </div>
                    ))}
                  </div>
                  <p className="foot" style={{ margin: 0 }}>
                    Mueve el deslizador: si un mercado apenas se inmuta, aguanta aunque las fuerzas
                    estén algo mal. Esto no cambia el modelo, solo enseña qué tan firme es.
                  </p>
                </div>
              );
            })()}
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="tl">Escenario</th>
                    <th>Gana {home.name}</th><th>Empate</th>
                    <th>Más de 2.5</th><th>Ambos marcan</th>
                  </tr>
                </thead>
                <tbody>
                  {sensib.map(([lab, v]) => (
                    <tr key={lab}>
                      <td className="tl">{lab}</td>
                      <td className="mono">{pc0(v.h)}</td>
                      <td className="mono">{pc0(v.d)}</td>
                      <td className="mono">{pc0(v.o)}</td>
                      <td className="mono">{pc0(v.b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="foot">
              Si un mercado se mueve poco entre escenarios, el pronóstico aguanta aunque las
              fuerzas estén algo mal. Si se mueve mucho, no te fíes del decimal.
            </p>
            </Collapsible>

            <Collapsible title="Matriz de marcadores" defaultOpen>
            <div className="matrixwrap">
              <div>
                <div className="mataxis mataxis-top">{away.name}</div>
                <div className="matrow">
                  <div className="mataxis mataxis-left"><span>{home.name}</span></div>
                  <table className="matrix">
                    <thead>
                      <tr>
                        <th />
                        {[0, 1, 2, 3, 4, 5].map((y) => <th key={y} className="mono">{y}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4, 5].map((x) => (
                        <tr key={x}>
                          <th className="mono">{x}</th>
                          {[0, 1, 2, 3, 4, 5].map((y) => {
                            const p = model.m[x][y];
                            const res = x > y ? "mc-h" : x === y ? "mc-d" : "mc-a";
                            return (
                              <td key={y} className={"mono mcell " + res}
                                style={{ "--o": fin(p) ? Math.min(0.92, p * 7).toFixed(3) : 0 }}
                                title={`${x}-${y} · ${pc(p)}`}>
                                {fx(p * 100)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="matleg">
                  <span><i className="sw mc-h" /> gana {home.name}</span>
                  <span><i className="sw mc-d" /> empate</span>
                  <span><i className="sw mc-a" /> gana {away.name}</span>
                </div>
              </div>
              <div className="topscores">
                <div className="tshead">Marcadores más probables</div>
                {topScores(model.m).map((s) => (
                  <div key={`${s.x}-${s.y}`} className="tsrow">
                    <span className="mono tsscore">{s.x}–{s.y}</span>
                    <div className="tstrack">
                      <div className="tsfill" style={{ width: Math.min(100, s.p * 500) + "%" }} />
                    </div>
                    <span className="mono tsp">{pc(s.p)}</span>
                  </div>
                ))}
              </div>
            </div>
            </Collapsible>
          </>
        )}

        {fam === "Goles" && (
          <>
            <div className="colhead">Total de goles del partido</div>
            <Ladder rows={totalsLadder} onPick={togglePick} isPicked={isPicked} />
            <div className="two">
              <div>
                <div className="colhead">Ambos marcan</div>
                {["Sí", "No"].map((s) => (
                  <MRow key={s} m={g("Goles", "Ambos marcan", s)} onPick={togglePick}
                    picked={isPicked(g("Goles", "Ambos marcan", s))} hideMercado />
                ))}
                <div className="colhead">Par / impar</div>
                {["Par", "Impar"].map((s) => (
                  <MRow key={s} m={g("Goles", "Par / impar", s)} onPick={togglePick}
                    picked={isPicked(g("Goles", "Par / impar", s))} hideMercado />
                ))}
                <div className="colhead">Rango de goles</div>
                {["0 a 1", "2 a 3", "4 a 6", "7 o más"].map((s) => (
                  <MRow key={s} m={g("Goles", "Rango de goles", s)} onPick={togglePick}
                    picked={isPicked(g("Goles", "Rango de goles", s))} hideMercado />
                ))}
              </div>
              <div>
                <div className="colhead">Goles exactos</div>
                {["0", "1", "2", "3", "4", "5 o más"].map((s) => (
                  <MRow key={s} m={g("Goles", "Goles exactos", s)} onPick={togglePick}
                    picked={isPicked(g("Goles", "Goles exactos", s))} hideMercado />
                ))}
                <div className="colhead">Totales asiáticos</div>
                <div className="asian">
                  {lineasDe("Goles", "Asiático ").map((L) => {
                    const o = g("Goles", `Asiático ${L}`, "Más de");
                    const u = g("Goles", `Asiático ${L}`, "Menos de");
                    if (!o) return null;
                    return (
                      <div className="asrow" key={L}>
                        <span className="mono asline">{L}</span>
                        <button className={"asbtn" + (isPicked(o) ? " asbtn-on" : "")} onClick={() => togglePick(o)}>
                          Más <b className="mono">{pc(o.p)}</b>
                        </button>
                        <button className={"asbtn" + (isPicked(u) ? " asbtn-on" : "")} onClick={() => togglePick(u)}>
                          Menos <b className="mono">{pc(u.p)}</b>
                        </button>
                        <span className="asnote">{o.nota || "sin nulo"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="foot">
              En las líneas asiáticas el porcentaje ya excluye la parte de la apuesta que se
              devuelve: es la probabilidad de ganar el dinero que queda en juego.
            </p>
          </>
        )}

        {fam === "Equipos" && (
          <div className="two">
            {[[home.name, "h"], [away.name, "a"]].map(([name]) => (
              <div key={name}>
                <div className="colhead">{name} · goles</div>
                <Ladder
                  rows={lineasDe("Equipos", `${name} · total `).map((L) => ({
                    line: L,
                    over: g("Equipos", `${name} · total ${L}`, "Más de"),
                    under: g("Equipos", `${name} · total ${L}`, "Menos de"),
                  }))}
                  onPick={togglePick}
                  isPicked={isPicked}
                />
                <MRow m={g("Equipos", "Portería a cero", name)} onPick={togglePick}
                  picked={isPicked(g("Equipos", "Portería a cero", name))} />
                <MRow m={g("Equipos", "No marca", name)} onPick={togglePick}
                  picked={isPicked(g("Equipos", "No marca", name))} />
              </div>
            ))}
          </div>
        )}

        {fam === "Hándicap" && (
          <>
            <div className="colhead">Hándicap asiático · probabilidad neta de cada lado</div>
            <div className="hcp">
              {[-2.5, -2, -1.75, -1.5, -1.25, -1, -0.75, -0.5, -0.25, 0,
                0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5].map((L) => {
                const tag = tagAsia(L);
                const h = g("Hándicap", `Asiático ${tag}`, home.name);
                const a = g("Hándicap", `Asiático ${tagAsia(-L)}`, away.name);
                if (!h || !a) return null;
                return (
                  <div className="hcprow" key={L}>
                    <span className="mono hcpline">{tag}</span>
                    <button className={"hcpside" + (isPicked(h) ? " hcp-on" : "")} onClick={() => togglePick(h)}>
                      <span className="mono">{pc(h.p)}</span>
                      <span className="hcptrack">
                        <span className="hcpbar" style={{ width: clamp(h.p * 100, 2, 100) + "%" }} />
                      </span>
                    </button>
                    <button className={"hcpside hcpside-a" + (isPicked(a) ? " hcp-on" : "")} onClick={() => togglePick(a)}>
                      <span className="hcptrack">
                        <span className="hcpbar hcpbar-a" style={{ width: clamp(a.p * 100, 2, 100) + "%" }} />
                      </span>
                      <span className="mono">{pc(a.p)}</span>
                    </button>
                    <span className="hcpnote">{h.nota || ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="hcplegend">
              <span className="lg-h">{home.name}</span>
              <span className="lg-a">{away.name}</span>
            </div>
            <Collapsible title="Hándicap europeo (tres vías)">
            <div className="two">
              {["Europeo -1", "Europeo -2", "Europeo +1", "Europeo +2"].map((mk) => {
                const items = mkFam("Hándicap").filter((x) => x.mercado === mk);
                if (!items.length) return null;
                return (
                  <div key={mk}>
                    <div className="colhead">{mk}</div>
                    {items.map((m) => (
                      <MRow key={m.key} m={m} onPick={togglePick} picked={isPicked(m)} hideMercado />
                    ))}
                  </div>
                );
              })}
            </div>
            </Collapsible>
          </>
        )}

        {fam === "Mitades" && (
          <>
            <div className="two">
              {["1ª parte", "2ª parte"].map((lab) => (
                <div key={lab}>
                  <div className="colhead">{lab} · total de goles</div>
                  <Ladder
                    rows={lineasDe("Mitades", `${lab} · total `).map((L) => ({
                      line: L,
                      over: g("Mitades", `${lab} · total ${L}`, "Más de"),
                      under: g("Mitades", `${lab} · total ${L}`, "Menos de"),
                    }))}
                    onPick={togglePick}
                    isPicked={isPicked}
                  />
                  <div className="colhead">{lab} · ganador</div>
                  <TriBar
                    items={[
                      g("Mitades", `${lab} · 1X2`, home.name),
                      g("Mitades", `${lab} · 1X2`, "Empate"),
                      g("Mitades", `${lab} · 1X2`, away.name),
                    ]}
                    onPick={togglePick}
                    isPicked={isPicked}
                  />
                </div>
              ))}
            </div>
            <div className="two">
              <div>
                <div className="colhead">Reparto de goles</div>
                {["1ª parte", "2ª parte", "Igualadas"].map((s) => (
                  <MRow key={s} m={g("Mitades", "Mitad con más goles", s)} onPick={togglePick}
                    picked={isPicked(g("Mitades", "Mitad con más goles", s))} hideMercado />
                ))}
              </div>
              <div>
                <div className="colhead">Otros</div>
                <MRow m={g("Mitades", "Gol en ambas mitades", "Sí")} onPick={togglePick}
                  picked={isPicked(g("Mitades", "Gol en ambas mitades", "Sí"))} />
                <MRow m={g("Mitades", "Gol en ambas mitades", "No")} onPick={togglePick}
                  picked={isPicked(g("Mitades", "Gol en ambas mitades", "No"))} />
                <MRow m={g("Mitades", "1ª parte · ambos marcan", "Sí")} onPick={togglePick}
                  picked={isPicked(g("Mitades", "1ª parte · ambos marcan", "Sí"))} />
              </div>
            </div>
            <p className="foot">
              Las mitades se modelan como dos partidos independientes que reparten el 45% y el 55%
              de los goles esperados. Es una aproximación razonable, pero ignora el efecto del
              marcador: son los mercados menos fiables de la pizarra.
            </p>
          </>
        )}

        {fam === "Combinadas" && (
          <>
            <div className="combos">
              {mkFam("Combinadas").sort((a, b) => b.p - a.p).map((m) => (
                <button key={m.key} className={"combo" + (isPicked(m) ? " combo-on" : "")} onClick={() => togglePick(m)}>
                  <span className="combomkt">{m.mercado}</span>
                  <span className="combosel">{m.sel}</span>
                  <b className="mono combop">{pc(m.p)}</b>
                  <ProbBar p={m.p} tone={m.p >= 0.35 ? "pfill-hi" : ""} />
                </button>
              ))}
            </div>
            <p className="foot">
              Estas probabilidades salen de la matriz de marcadores completa, así que ya
              incorporan la correlación entre resultado y goles. Multiplicar los dos mercados por
              separado da un número distinto, y casi siempre equivocado.
            </p>
          </>
        )}

        {fam === "Córners" && countPanel("Córners", cornersUsados,
          [home.name, away.name])}

        {fam === "Tarjetas" && countPanel("Tarjetas", counts?.cards,
          [home.name, away.name],
          <>
          <div className="arbbox">
            {!fixture.fixture.referee ? (
              <p className="foot" style={{ marginTop: 0 }}>
                Todavía no hay árbitro designado. Es el factor que más mueve este mercado, así que
                vuelve a mirar cuando se publique.
              </p>
            ) : !arb ? (
              <>
                <p className="foot" style={{ marginTop: 0 }}>
                  Árbitro designado: <b>{fixture.fixture.referee}</b>. Se puede medir cuántas
                  tarjetas saca de verdad buscándolo entre los partidos ya jugados de esta
                  competición. Cuesta hasta 8 llamadas y queda en caché para toda la temporada.
                </p>
                <button className="btn btn-primary" onClick={loadArbitro} disabled={arbBusy}>
                  {arbBusy ? "Revisando sus partidos…" : "Medir al árbitro"}
                </button>
              </>
            ) : !arb.n || !fin(arb.media) ? (
              <p className="foot" style={{ marginTop: 0 }}>
                No se encontraron partidos previos de {arb.nombre} en esta competición, así que
                queda el ajuste manual de arriba.
              </p>
            ) : (
              <p className="foot" style={{ marginTop: 0 }}>
                <b>{arb.nombre}</b>: <span className="mono">{fx(arb.media)}</span> tarjetas
                por partido en sus últimos {arb.n} encuentros medidos, frente a{" "}
                <span className="mono">{fx(counts?.cards?.tot)}</span>{" "}
                que esperaba el modelo por los dos equipos. El ajuste ya está aplicado y sustituye
                al deslizador manual.
              </p>
            )}
          </div>
          <p className="foot">
            Cada roja cuenta como dos tarjetas.
          </p>
          </>)}

        {fam === "Disparos" && (
          !counts ? countPanel("Disparos", null, []) : (
            <>
              <div className="colhead">Remates totales del partido</div>
              <Ladder
                rows={lineasDe("Disparos", "Total ").map((L) => ({
                  line: L,
                  over: g("Disparos", `Total ${L}`, "Más de"),
                  under: g("Disparos", `Total ${L}`, "Menos de"),
                }))}
                onPick={togglePick} isPicked={isPicked}
              />
              <div className="two">
                {[`${home.name} · remates`, `${away.name} · remates`,
                  `${home.name} · a puerta`, `${away.name} · a puerta`].map((name) => (
                  <div key={name}>
                    <div className="colhead">{name}</div>
                    <Ladder
                      rows={lineasDe("Disparos", `${name} · total `).map((L) => ({
                        line: L,
                        over: g("Disparos", `${name} · total ${L}`, "Más de"),
                        under: g("Disparos", `${name} · total ${L}`, "Menos de"),
                      }))}
                      onPick={togglePick} isPicked={isPicked}
                    />
                  </div>
                ))}
              </div>
            </>
          )
        )}

        {fam === "Jugadores" && (
          !props ? (
            stage("Calcular props de jugador",
              "Usa las estadísticas de toda la temporada de cada plantilla (no una muestra de diez partidos) y, si ya están publicadas, las alineaciones confirmadas para saber quién sale de titular. Son unas 5 llamadas a la API.",
              loadProps, propsBusy, propsErr)
          ) : propRows.length === 0 ? (
            <Empty title="Esta competición no publica estadísticas por jugador" />
          ) : (
            <>
              <div className="jugbar">
                <input className="input input-search" placeholder="Buscar jugador"
                  value={buscaJug} onChange={(e) => setBuscaJug(e.target.value)} />
                <div className="splitbar">
                  {[["todos", "Los dos"], ["local", home.name], ["visita", away.name]].map(([k, l]) => (
                    <button key={k} className={"splitbtn" + (filtroEq === k ? " splitbtn-on" : "")}
                      onClick={() => setFiltroEq(k)}>{l}</button>
                  ))}
                </div>
                <div className="splitbar">
                  {["todas", "G", "D", "M", "F"].map((k) => (
                    <button key={k} className={"splitbtn splitbtn-pos" + (filtroPos === k ? " splitbtn-on" : "")}
                      onClick={() => setFiltroPos(k)} title={NOMBRE_POS[k]}
                      aria-label={NOMBRE_POS[k]} aria-pressed={filtroPos === k}>
                      {k === "todas" ? "Todas" : <><IcoPos g={k} /><span>{NOMBRE_POS[k]}</span></>}
                    </button>
                  ))}
                </div>
                {lineupOk ? (
                  <label className="switch">
                    <input type="checkbox" checked={soloXI}
                      onChange={(e) => setSoloXI(e.target.checked)} />
                    <span>Solo el once</span>
                  </label>
                ) : (
                  <label className="switch">
                    <input type="checkbox" checked={adj.starters}
                      onChange={(e) => setAdj((a) => ({ ...a, starters: e.target.checked }))} />
                    <span>Asumir 90 minutos</span>
                  </label>
                )}
                <span className="jugcount mono">{propsVisibles.length} jugadores</span>
                <button className="btn btn-quiet" onClick={() => downloadText(
                  `props-${home.name}-${away.name}.csv`,
                  toCSV(propsVisibles, [
                    ["jugador", (r) => r.name], ["equipo", (r) => r.team], ["pos", (r) => r.pos],
                    ["min_estimados", (r) => Math.round(r.expMin)], ["min_temporada", (r) => r.min],
                    ["p_gol", (r) => r.gol.toFixed(4)], ["p_asistencia", (r) => r.asis.toFixed(4)],
                    ["p_participa", (r) => r.part.toFixed(4)],
                    ["p_1sot", (r) => r.sot1.toFixed(4)], ["p_2sot", (r) => r.sot2.toFixed(4)],
                    ["p_2tiros", (r) => r.sh2.toFixed(4)], ["p_tarjeta", (r) => r.tar.toFixed(4)],
                    ["p_2faltas", (r) => r.fal2.toFixed(4)],
                  ]))}>CSV</button>
              </div>

              {destacados.length > 0 && (
                <div className="destacados">
                  {destacados.map((b) => (
                    <div className="destblk" key={b.titulo}>
                      <div className="desth">{b.titulo}</div>
                      {b.lista.map((r, i) => (
                        <div className="destrow" key={r.id}>
                          <span className="mono destpos">{i + 1}</span>
                          <span className="destname">{r.name}</span>
                          <span className="mono destp">{pc0(r[b.campo])}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="tablewrap">
                <table className="table table-props">
                  <thead>
                    <tr>
                      <th className="tl">Jugador</th>
                      {[["expMin", "Min"], ["gol", "Marca"], ["asis", "Asiste"], ["part", "Gol o asist."],
                        ["sot1", "1+ a puerta"], ["sot2", "2+ a puerta"], ["sot3", "3+ a puerta"],
                        ["sh2", "2+ remates"], ["sh3", "3+ remates"],
                        ["tar", "Tarjeta"], ["fal2", "2+ faltas"]].map(([k, l]) => (
                        <th key={k}>
                          <button className={"th-sort" + (sortProps?.campo === k ? " th-sort-on" : "")}
                            onClick={() => setSortProps((s2) =>
                              s2?.campo === k ? { campo: k, dir: -(s2.dir || -1) } : { campo: k, dir: -1 })}>
                            {l}
                            {sortProps?.campo === k && (
                              <i>{sortProps.dir === 1 ? "▴" : "▾"}</i>
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {propsVisibles.slice(0, tope).map((r) => {
                      const mk = (mercado, sel, p, simRef) => ({
                        fam: "Jugadores", mercado: `${r.name} · ${mercado}`, sel, p,
                        key: `Jugadores|${r.id}|${mercado}`, concepto: "jugador",
                        simRef: simRef ? { playerId: r.id, teamId: r.teamId, ...simRef } : undefined,
                      });
                      const cell = (label, p, mercado, simRef) => {
                        const m = mk(mercado, label, p, simRef);
                        return (
                          <td className="mono">
                            <button className={"cellbtn" + (isPicked(m) ? " cellbtn-on" : "")}
                              onClick={() => togglePick(m)}
                              title={`${label} · ${pc(p)}`}>
                              {/* La barra detrás del número deja comparar una
                                  columna entera de un vistazo. */}
                              <span className="cellbar" style={{ width: clamp(p * 100, 0, 100) + "%" }} />
                              <span className="cellnum">{pc0(p)}</span>
                            </button>
                          </td>
                        );
                      };
                      return (
                        <tr key={r.id} className={r.banquillo ? "row-bench" : ""}>
                          <td className="tl">
                            <span className="pl-name">{r.name}</span>
                            <span className="pl-pos">
                              {r.team} · {r.pos || "—"}
                              {r.xi === true ? " · titular" : r.xi === false ? " · banquillo"
                                : r.starter ? "" : " · suplente habitual"}
                            </span>
                          </td>
                          <td className="mono">{fin(r.expMin) ? Math.round(r.expMin) : "—"}</td>
                          {cell("Marca en cualquier momento", r.gol, "gol", { kind: "gol", line: 0 })}
                          {cell("Da una asistencia", r.asis, "asistencia")}
                          {cell("Marca o asiste", r.part, "gol o asistencia")}
                          {cell("1+ disparo a puerta", r.sot1, "disparos a puerta", { kind: "sot", line: 0 })}
                          {cell("2+ disparos a puerta", r.sot2, "disparos a puerta 1.5", { kind: "sot", line: 1 })}
                          {cell("3+ disparos a puerta", r.sot3, "disparos a puerta 2.5", { kind: "sot", line: 2 })}
                          {cell("2+ remates", r.sh2, "remates 1.5", { kind: "sh", line: 1 })}
                          {cell("3+ remates", r.sh3, "remates 2.5", { kind: "sh", line: 2 })}
                          {cell("Ve tarjeta", r.tar, "tarjeta")}
                          {cell("2+ faltas cometidas", r.fal2, "faltas 1.5")}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {propsVisibles.length > tope && (
                <div className="masfilas">
                  <span>Mostrando {tope} de {propsVisibles.length}</span>
                  <button className="btn btn-quiet" onClick={() => setTope(propsVisibles.length)}>
                    Ver todos
                  </button>
                </div>
              )}
              {propsVisibles.length === 0 && (
                <Empty title="Ningún jugador con esos filtros"
                  hint="Prueba a quitar el filtro de posición o de equipo." />
              )}
              <p className="foot">
                Las tasas van por 90 minutos sobre toda la temporada y se encogen hacia la media de
                la posición cuando el jugador ha jugado poco, así un gol en 120 minutos no se
                convierte en un pronóstico absurdo. {lineupOk
                  ? "Los minutos salen de la alineación confirmada."
                  : "La columna Min es una estimación: vuelve a calcular cuando salgan las alineaciones y se usarán los titulares reales."}
              </p>
            </>
          )
        )}
      </div>

        </div>
      </section>
      </div>

      <p className="foot mk-foot">
        Las fuerzas se calculan con datos hasta el <span className="mono">{cutoff}</span>, un día
        antes del partido, para que el propio resultado no entre en el cálculo. Mezclan la
        temporada en curso ({Math.round((1 - (base.params?.wForm ?? 0.4)) * 100)}%) con la forma
        reciente ponderada por antigüedad ({Math.round((base.params?.wForm ?? 0.4) * 100)}%),
        ajustada por la calidad de cada rival, y se encogen hacia la media de la liga cuando hay
        pocos partidos.{" "}
        {paramsInfo
          ? "Los pesos vienen de la calibración guardada para esta competición."
          : "Puedes ajustar estos pesos a esta liga en la pestaña Calibración."}
      </p>

      {/* ---------- barra de la combinada ---------- */}
      {picks.length > 0 && joint && (
        <div className={"builder" + (barraAbierta ? " builder-abierta" : "")}>
          <button className="builder-tirador" onClick={() => setBarraAbierta((v) => !v)}
            aria-expanded={barraAbierta}>
            <span className="mono builder-tirador-n">{picks.filter((p) => !p.off).length}</span>
            <span>{barraAbierta ? "Ocultar selecciones" : "Ver selecciones"}</span>
            <span className={"lg-chev" + (barraAbierta ? " lg-chev-on" : "")}>›</span>
          </button>
          <div className="builder-in">
            <div className="bpicks">
              {picks.map((p) => (
                <button key={p.key} className={"bpick" + (p.off ? " bpick-off" : "")}
                  onClick={() => togglePick(p)}
                  title={p.off ? "Desactivada en la combinada · quitar" : "Quitar"}>
                  <span>{p.mercado}: {p.sel}</span>
                  <i className="mono">{pc0(p.p)}</i>
                  <em>×</em>
                </button>
              ))}
            </div>
            <div className="bbuscar">
              <input className="input" placeholder="Buscar mercado…" value={busca}
                onChange={(e) => setBusca(e.target.value)} />
              {String(busca || "").length >= 2 && (
                <div className="bsug">
                  {all.filter((x) => `${x.mercado} ${x.sel}`.toLowerCase().includes(String(busca).toLowerCase()))
                    .slice(0, 8).map((x) => (
                      <button key={x.key} className="bsugrow"
                        onClick={() => { togglePick(x); setBusca(""); }}>
                        <span>{x.mercado}: {x.sel}</span>
                        <i className="mono">{pc0(x.p)}</i>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div className="bres">
              <div className="bres-blk">
                <span className="blab">Este partido · {picks.filter((p) => !p.off).length}</span>
                <b className="mono bp">{joint.p < 0.001 ? "<0.1%" : pc(joint.p)}</b>
                <span className="bnote">
                  {joint.p < 1e-9
                    ? "incompatibles entre sí"
                    : joint.modo === "exacta"
                    ? `conjunta exacta · 1 de cada ${Math.round(1 / joint.p)}`
                    : joint.modo === "simulada"
                    ? `simulada · multiplicando daría ${pc(joint.naive)}`
                    : `aproximada · sin correlación daría ${pc(joint.naive)}`}
                </span>
              </div>
              {otrosRes.n > 0 && (
                <div className="bres-blk bres-total">
                  <span className="blab">Combinada entera</span>
                  <b className="mono bp">{pc(joint.p * otrosRes.p)}</b>
                  <span className="bnote">
                    con {otrosRes.n} {otrosRes.n === 1 ? "selección" : "selecciones"} de otros{" "}
                    {otrosRes.partidos} {otrosRes.partidos === 1 ? "partido" : "partidos"}
                  </span>
                </div>
              )}
              <div className="bacts">
                <button className="btn btn-primary" onClick={onBoleto}>Ver combinada</button>
                <button className="btn btn-quiet" onClick={() => {
                  const n = picks.length;
                  setPicks([]);
                  (async () => {
                    const todo = await slipRead();
                    undoOfrecer(todo, `Quitadas ${n} ${n === 1 ? "selección" : "selecciones"} de este partido`);
                    await slipWrite(todo.filter((x) => x.fx !== fixture.fixture.id));
                  })();
                }}>Vaciar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModoProb.Provider>
  );
}

