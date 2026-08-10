/* ============================================================
   Partido: la vista principal
   ============================================================ */
const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "mercados", label: "Mercados" },
  { id: "previa", label: "Previa" },
  { id: "stats", label: "Estadísticas" },
  { id: "once", label: "Alineaciones" },
  { id: "jugadores", label: "Jugadores" },
  { id: "cuotas", label: "Cuotas" },
];

function Match({ api, fixture, onTeam, onBack, onBoleto }) {
  const [tab, setTab] = useState("resumen");
  /* Si siempre entras a Mercados, no tiene sentido pasar por Resumen
     cada vez que abres un partido. */
  useEffect(() => {
    let vivo = true;
    storage.get("ultima-pestana")
      .then((r) => { if (vivo && r?.value && TABS.some((t) => t.id === r.value)) setTab(r.value); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  const [data, setData] = useState({});
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState({});
  /* Copias siempre al día de data/busy para que `need` no cambie de
     identidad en cada fetch que termina: si dependiera de data/busy
     directamente, el efecto de carga por pestaña (que depende de need)
     se repetiría entero cada vez que llega una respuesta, aunque el
     propio guardián de abajo ya evite peticiones duplicadas. */
  const dataRef = useRef(data);
  const busyRef = useRef(busy);

  const refrescar = useCallback(() => {
    cacheOlvidar((k) => k.includes("fixture=" + fixture.fixture.id) || k.includes("id=" + fixture.fixture.id));
    dataRef.current = {};
    busyRef.current = {};
    setData({});
    setErrs({});
  }, [fixture.fixture.id]);

  const irTab = useCallback((id) => {
    setTab(id);
    try { storage.set("ultima-pestana", id).catch(() => {}); } catch (e) { /* nada */ }
  }, []);
  const fx = fixture.fixture;
  const home = fixture.teams.home;
  const away = fixture.teams.away;
  const isLive = LIVE_STATES.includes(fx.status.short);
  const played = isLive || DONE_STATES.includes(fx.status.short);

  const need = useCallback(
    async (slot, path, params, ttl) => {
      if (dataRef.current[slot] !== undefined || busyRef.current[slot]) return;
      busyRef.current = { ...busyRef.current, [slot]: true };
      setBusy((b) => ({ ...b, [slot]: true }));
      try {
        const r = await api(path, params, ttl);
        dataRef.current = { ...dataRef.current, [slot]: r };
        setData((d) => ({ ...d, [slot]: r }));
      } catch (e) {
        setErrs((x) => ({ ...x, [slot]: e.message }));
        dataRef.current = { ...dataRef.current, [slot]: [] };
        setData((d) => ({ ...d, [slot]: [] }));
      } finally {
        busyRef.current = { ...busyRef.current, [slot]: false };
        setBusy((b) => ({ ...b, [slot]: false }));
      }
    },
    [api]
  );

  // Carga perezosa por pestaña: no gastamos cuota en lo que no miras.
  useEffect(() => {
    const id = fx.id;
    if (tab === "resumen" && played) need("events", "fixtures/events", { fixture: id }, isLive ? TTL.live : TTL.daily);
    if (tab === "stats" && played) need("stats", "fixtures/statistics", { fixture: id }, isLive ? TTL.live : TTL.daily);
    if (tab === "once") need("lineups", "fixtures/lineups", { fixture: id }, isLive ? TTL.short : TTL.daily);
    if (tab === "jugadores" && played) need("players", "fixtures/players", { fixture: id }, isLive ? TTL.live : TTL.daily);
    if (tab === "cuotas") need("odds", "odds", { fixture: id }, TTL.hour);
    if (tab === "previa") {
      need("pred", "predictions", { fixture: id }, TTL.hour);
      need("h2h", "fixtures/headtohead", { h2h: `${home.id}-${away.id}`, last: 8 }, TTL.daily);
      need("inj", "injuries", { fixture: id }, TTL.hour);
    }
  }, [tab, fx.id, played, isLive, need, home.id, away.id]);

  return (
    <div className="page">
      <button className="back" onClick={onBack}>
        ← Volver
      </button>

      <header className="card sb">
        <div className="sb-meta">
          <Crest src={fixture.league.logo} alt="" size={18} />
          <span className="sb-liga">{fixture.league.name}</span>
          {fixture.league.round && <span className="sb-round">{fixture.league.round}</span>}
          <span className="sb-fecha">
            {new Date(fx.date).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
            {" · "}{clock(fx.date)}
          </span>
          <span className={"sb-pill" + (isLive ? " sb-pill-live" : played ? " sb-pill-done" : "")}>
            {isLive ? <><span className="dot" />{fx.status.elapsed}′</> : played ? "Finalizado" : "Por jugar"}
          </span>
        </div>

        <div className="sb-main">
          <button className="sb-team sb-h" onClick={() => onTeam(home, fixture.league)}
            title={`Ver ficha de ${home.name}`}>
            <Crest src={home.logo} alt="" size={54} />
            <span className="sb-nombre">{home.name}<i className="sb-ver">Ver equipo</i></span>
          </button>
          <div className="sb-mid">
            <div className="sb-score mono" aria-live={isLive ? "polite" : "off"}
              aria-atomic="true">
              <span>{fx.status.short === "NS" ? "–" : fixture.goals.home ?? "–"}</span>
              <i>:</i>
              <span>{fx.status.short === "NS" ? "–" : fixture.goals.away ?? "–"}</span>
            </div>
            <div className={"sb-state" + (isLive ? " sb-state-live" : "")}>{fx.status.long}</div>
            {fixture.score?.halftime?.home != null && (
              <div className="sb-breaks mono">
                DES {fixture.score.halftime.home}–{fixture.score.halftime.away}
                {fixture.score.extratime?.home != null &&
                  ` · PRÓR ${fixture.score.extratime.home}–${fixture.score.extratime.away}`}
                {fixture.score.penalty?.home != null &&
                  ` · PEN ${fixture.score.penalty.home}–${fixture.score.penalty.away}`}
              </div>
            )}
          </div>
          <button className="sb-team sb-a" onClick={() => onTeam(away, fixture.league)}
            title={`Ver ficha de ${away.name}`}>
            <Crest src={away.logo} alt="" size={54} />
            <span className="sb-nombre">{away.name}<i className="sb-ver">Ver equipo</i></span>
          </button>
        </div>

        <div className="sb-foot">
          {fx.venue?.name && (
            <span>
              {fx.venue.name}
              {fx.venue.city ? `, ${fx.venue.city}` : ""}
            </span>
          )}
          {fx.referee && <span>Árbitro: {fx.referee}</span>}
          <span className="mono sb-id">Partido {fx.id}</span>
        </div>
      </header>

      <nav className="tabs tabs-pill">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab" + (tab === t.id ? " tab-on" : "")}
            onClick={() => irTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button className="tab tab-refresh" onClick={refrescar}
          title="Volver a pedir los datos de este partido">↻</button>
      </nav>

      <div className="tabbody">
        {tab === "resumen" && (
          <Resumen data={data} errs={errs} busy={busy} fixture={fixture} played={played} isLive={isLive} />
        )}
        {tab === "mercados" && <Mercados api={api} fixture={fixture} onBoleto={onBoleto} />}
        {tab === "previa" && <Previa data={data} errs={errs} busy={busy} fixture={fixture} />}
        {tab === "stats" && <Stats data={data} errs={errs} busy={busy} fixture={fixture} played={played} />}
        {tab === "once" && <Alineaciones data={data} errs={errs} busy={busy} fixture={fixture} />}
        {tab === "jugadores" && <Jugadores data={data} errs={errs} busy={busy} played={played} />}
        {tab === "cuotas" && <Cuotas data={data} errs={errs} busy={busy} />}
      </div>
    </div>
  );
}

function Resumen({ data, errs, busy, fixture, played, isLive }) {
  const ev = data.events;
  if (!played)
    return (
      <Empty
        title="El partido aún no ha empezado"
        hint="La pestaña Previa ya tiene el pronóstico, el historial y las bajas."
      />
    );
  if (busy.events || ev === undefined) return <Spinner label="Cargando cronología" />;
  if (errs.events) return <div className="alert">{errs.events}</div>;
  if (!ev.length) return <Empty title="Esta competición no registra eventos por minuto" />;

  const goals = ev.filter((e) => e.type === "Goal");
  return (
    <>
      <Rule label="Cronología" />
      <div className="ribbon-frame">
        <div className="ribbon-side">
          <Crest src={fixture.teams.home.logo} alt="" size={20} />
        </div>
        <MinuteRibbon events={ev} homeId={fixture.teams.home.id} elapsed={isLive ? fixture.fixture.status.elapsed : null} />
        <div className="ribbon-side">
          <Crest src={fixture.teams.away.logo} alt="" size={20} />
        </div>
      </div>
      <div className="legend">
        <span><i className="ev ev-goal">●</i> gol</span>
        <span><i className="ev ev-own">OG</i> en propia</span>
        <span><i className="ev ev-miss">×</i> penal fallado</span>
        <span><i className="ev ev-yellow">▮</i> amarilla</span>
        <span><i className="ev ev-red">▮</i> roja</span>
        <span><i className="ev ev-sub">⇄</i> cambio</span>
      </div>

      <Rule label="Goles" />
      {goals.length === 0 ? (
        <Empty title="Sin goles" />
      ) : (
        <ul className="goals">
          {goals.map((g, i) => (
            <li key={i} className={g.team.id === fixture.teams.home.id ? "gh" : "ga"}>
              <span className="gmin mono">
                {g.time.elapsed}
                {g.time.extra ? `+${g.time.extra}` : ""}′
              </span>
              <span className="gname">{g.player?.name}</span>
              {g.assist?.name && <span className="gassist">asist. {g.assist.name}</span>}
              {g.detail !== "Normal Goal" && <span className="gtag">{g.detail}</span>}
            </li>
          ))}
        </ul>
      )}

      <Rule label="Todos los sucesos" />
      <ul className="timeline">
        {ev.map((e, i) => (
          <li key={i} className={e.team.id === fixture.teams.home.id ? "th" : "ta"}>
            <span className="tmin mono">
              {e.time.elapsed}
              {e.time.extra ? `+${e.time.extra}` : ""}′
            </span>
            <span className="tdet">{e.detail}</span>
            <span className="tply">
              {e.player?.name}
              {e.assist?.name ? ` → ${e.assist.name}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Previa({ data, errs, busy, fixture }) {
  const p = data.pred?.[0];
  const h2h = data.h2h;
  const inj = data.inj;
  const home = fixture.teams.home;
  const away = fixture.teams.away;

  const record = useMemo(() => {
    if (!h2h?.length) return null;
    let h = 0, d = 0, a = 0, gh = 0, ga = 0;
    for (const m of h2h) {
      if (!DONE_STATES.includes(m.fixture.status.short)) continue;
      const hostIsHome = m.teams.home.id === home.id;
      const gf = hostIsHome ? m.goals.home : m.goals.away;
      const gc = hostIsHome ? m.goals.away : m.goals.home;
      gh += num(gf); ga += num(gc);
      if (gf > gc) h++; else if (gf < gc) a++; else d++;
    }
    return { h, d, a, gh, ga, n: h + d + a };
  }, [h2h, home.id]);

  return (
    <>
      <Rule label="Pronóstico del modelo de la API" />
      {busy.pred || data.pred === undefined ? (
        <Spinner />
      ) : errs.pred || !p ? (
        <Empty title="Sin pronóstico para este partido" hint="La cobertura de predicciones varía por competición." />
      ) : (
        <div className="pred">
          <div className="prob">
            {[
              { k: "home", label: home.name, v: pctStr(p.predictions.percent.home), c: "p-h" },
              { k: "draw", label: "Empate", v: pctStr(p.predictions.percent.draw), c: "p-d" },
              { k: "away", label: away.name, v: pctStr(p.predictions.percent.away), c: "p-a" },
            ].map((x) => (
              <div key={x.k} className="probcol">
                <div className="probval mono">{x.v}%</div>
                <div className="probtrack">
                  <div className={"probfill " + x.c} style={{ height: Math.max(2, x.v) + "%" }} />
                </div>
                <div className="problabel">{x.label}</div>
              </div>
            ))}
          </div>
          <div className="advice">
            <span className="advice-tag">Consejo</span>
            {p.predictions.advice}
          </div>
          <div className="chips">
            {p.predictions.under_over && <span className="chip">Línea {p.predictions.under_over}</span>}
            {p.predictions.goals?.home && <span className="chip">Goles local ~{p.predictions.goals.home}</span>}
            {p.predictions.goals?.away && <span className="chip">Goles visita ~{p.predictions.goals.away}</span>}
            {p.predictions.win_or_draw && <span className="chip">Doble oportunidad viable</span>}
          </div>

          <Rule label="Comparativa por métrica" />
          {Object.entries(p.comparison || {}).map(([k, v]) => (
            <VsBar
              key={k}
              label={
                { form: "Forma", att: "Ataque", def: "Defensa", poisson_distribution: "Poisson", h2h: "Historial", goals: "Goles", total: "Global" }[k] || k
              }
              home={pctStr(v.home)}
              away={pctStr(v.away)}
              unit="%"
            />
          ))}
        </div>
      )}

      <Rule label="Historial directo" />
      {busy.h2h || h2h === undefined ? (
        <Spinner />
      ) : !h2h?.length ? (
        <Empty title="No se han enfrentado antes en los registros de la API" />
      ) : (
        <>
          {record && record.n > 0 && (
            <div className="h2hsum">
              <div className="h2hcell">
                <b className="mono">{record.h}</b>
                <span>gana {home.name}</span>
              </div>
              <div className="h2hcell">
                <b className="mono">{record.d}</b>
                <span>empates</span>
              </div>
              <div className="h2hcell">
                <b className="mono">{record.a}</b>
                <span>gana {away.name}</span>
              </div>
              <div className="h2hcell">
                <b className="mono">
                  {record.gh}–{record.ga}
                </b>
                <span>goles acumulados</span>
              </div>
              <div className="h2hcell">
                <b className="mono">{((record.gh + record.ga) / record.n).toFixed(2)}</b>
                <span>goles por partido</span>
              </div>
            </div>
          )}
          <ul className="h2hlist">
            {h2h.map((m) => (
              <li key={m.fixture.id}>
                <span className="mono h2hdate">{m.fixture.date.slice(0, 10)}</span>
                <span className="h2hcomp">{m.league.name}</span>
                <span className="h2hteams">
                  {m.teams.home.name} <b className="mono">{m.goals.home}–{m.goals.away}</b> {m.teams.away.name}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Rule label="Bajas y sancionados" />
      {busy.inj || inj === undefined ? (
        <Spinner />
      ) : !inj?.length ? (
        <Empty title="Sin partes de baja registrados" hint="Comprueba la bandera coverage.injuries de esta liga." />
      ) : (
        <div className="injgrid">
          {[home, away].map((t) => (
            <div key={t.id} className="injcol">
              <div className="injhead">
                <Crest src={t.logo} alt="" size={18} /> {t.name}
              </div>
              {inj.filter((i) => i.team.id === t.id).length === 0 ? (
                <div className="injnone">Plantilla completa</div>
              ) : (
                inj
                  .filter((i) => i.team.id === t.id)
                  .map((i, k) => (
                    <div key={k} className="injrow">
                      <span>{i.player.name}</span>
                      <span className={"injtag " + (i.player.type === "Missing Fixture" ? "injout" : "injdoubt")}>
                        {i.player.reason}
                      </span>
                    </div>
                  ))
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const STAT_ORDER = [
  "Ball Possession",
  "expected_goals",
  "Total Shots",
  "Shots on Goal",
  "Shots off Goal",
  "Blocked Shots",
  "Shots insidebox",
  "Shots outsidebox",
  "Corner Kicks",
  "Offsides",
  "Fouls",
  "Yellow Cards",
  "Red Cards",
  "Goalkeeper Saves",
  "Total passes",
  "Passes accurate",
  "Passes %",
];
const STAT_ES = {
  "Ball Possession": "Posesión",
  expected_goals: "Goles esperados (xG)",
  "Total Shots": "Disparos totales",
  "Shots on Goal": "A puerta",
  "Shots off Goal": "Fuera",
  "Blocked Shots": "Bloqueados",
  "Shots insidebox": "Dentro del área",
  "Shots outsidebox": "Fuera del área",
  "Corner Kicks": "Córners",
  Offsides: "Fuera de juego",
  Fouls: "Faltas",
  "Yellow Cards": "Amarillas",
  "Red Cards": "Rojas",
  "Goalkeeper Saves": "Paradas",
  "Total passes": "Pases",
  "Passes accurate": "Pases precisos",
  "Passes %": "Precisión de pase",
};

function Stats({ data, errs, busy, fixture, played }) {
  if (!played) return <Empty title="Sin estadísticas hasta el pitazo inicial" />;
  if (busy.stats || data.stats === undefined) return <Spinner />;
  if (errs.stats) return <div className="alert">{errs.stats}</div>;
  const s = data.stats;
  if (!s?.length)
    return <Empty title="Esta competición no publica estadísticas de partido" hint="Revisa coverage.statistics_fixtures en /leagues." />;

  const byTeam = (id) => {
    const block = s.find((x) => x.team.id === id);
    const m = {};
    (block?.statistics || []).forEach((st) => (m[st.type] = st.value));
    return m;
  };
  const H = byTeam(fixture.teams.home.id);
  const A = byTeam(fixture.teams.away.id);
  const keys = [...new Set([...STAT_ORDER, ...Object.keys(H), ...Object.keys(A)])].filter(
    (k) => H[k] !== undefined || A[k] !== undefined
  );

  return (
    <>
      <Rule label="Comparativa" />
      <div className="statlegend">
        <span className="lg-h">{fixture.teams.home.name}</span>
        <span className="lg-a">{fixture.teams.away.name}</span>
      </div>
      {keys.map((k) => {
        const isPct = String(H[k]).includes("%") || String(A[k]).includes("%");
        return (
          <VsBar
            key={k}
            label={STAT_ES[k] || k}
            home={isPct ? pctStr(H[k]) : H[k]}
            away={isPct ? pctStr(A[k]) : A[k]}
            unit={isPct ? "%" : ""}
            invert={["Fouls", "Yellow Cards", "Red Cards", "Offsides"].includes(k)}
          />
        );
      })}
      <p className="foot">
        Los valores <span className="mono">null</span> son normales en ligas menores: significa que la API
        no recoge esa métrica ahí, no que el valor sea cero.
      </p>
    </>
  );
}

function Pitch({ side, lineup }) {
  const rows = useMemo(() => {
    const m = new Map();
    (lineup?.startXI || []).forEach((p) => {
      const g = p.player.grid || "1:1";
      const [r] = g.split(":").map(Number);
      if (!m.has(r)) m.set(r, []);
      m.get(r).push(p.player);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [lineup]);

  if (!rows.length) return <Empty title="Sin cuadrícula de posiciones para este partido" />;

  return (
    <div className={"pitch pitch-" + side}>
      <div className="pitch-lines">
        <span className="pl-box" />
        <span className="pl-arc" />
      </div>
      {rows.map((line, i) => (
        <div key={i} className="pline" style={{ [side === "home" ? "left" : "right"]: `${6 + (i / Math.max(1, rows.length - 1)) * 76}%` }}>
          {line.map((p) => (
            <div key={p.id} className="pman" title={p.name}>
              <span className={"pnum mono " + (side === "home" ? "pnum-h" : "pnum-a")}>{p.number}</span>
              <span className="pname">{(p.name || "").split(" ").slice(-1)[0]}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Alineaciones({ data, errs, busy, fixture }) {
  if (busy.lineups || data.lineups === undefined) return <Spinner />;
  if (errs.lineups) return <div className="alert">{errs.lineups}</div>;
  const L = data.lineups;
  if (!L?.length)
    return (
      <Empty
        title="Alineaciones no publicadas todavía"
        hint="Suelen aparecer entre 20 y 40 minutos antes del inicio. En algunas competiciones, solo después del partido."
      />
    );
  const h = L.find((x) => x.team.id === fixture.teams.home.id) || L[0];
  const a = L.find((x) => x.team.id === fixture.teams.away.id) || L[1];

  return (
    <>
      <div className="forms">
        <div className="formbox">
          <Crest src={h.team.logo} alt="" size={22} />
          <b className="mono">{h.formation}</b>
          <span>{h.coach?.name}</span>
        </div>
        <div className="formbox formbox-a">
          <span>{a?.coach?.name}</span>
          <b className="mono">{a?.formation}</b>
          <Crest src={a?.team.logo} alt="" size={22} />
        </div>
      </div>
      <div className="pitchwrap">
        <Pitch side="home" lineup={h} />
        <Pitch side="away" lineup={a} />
        <span className="halfway" />
        <span className="centre" />
      </div>
      <Rule label="Suplentes" />
      <div className="benchgrid">
        {[h, a].map(
          (t, i) =>
            t && (
              <div key={i} className="bench">
                <div className="benchhead">
                  <Crest src={t.team.logo} alt="" size={16} /> {t.team.name}
                </div>
                {(t.substitutes || []).map((s) => (
                  <div key={s.player.id} className="benchrow">
                    <span className="mono benchnum">{s.player.number}</span>
                    {s.player.name}
                    <span className="benchpos">{s.player.pos}</span>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </>
  );
}

function Jugadores({ data, errs, busy, played }) {
  const [sort, setSort] = useState("rating");
  if (!played) return <Empty title="Sin datos individuales hasta que ruede el balón" />;
  if (busy.players || data.players === undefined) return <Spinner />;
  if (errs.players) return <div className="alert">{errs.players}</div>;
  const blocks = data.players;
  if (!blocks?.length) return <Empty title="Esta competición no publica estadísticas por jugador" />;

  const rows = [];
  blocks.forEach((b) =>
    (b.players || []).forEach((p) => {
      const s = p.statistics?.[0] || {};
      rows.push({
        id: p.player.id,
        name: p.player.name,
        photo: p.player.photo,
        team: b.team.name,
        teamLogo: b.team.logo,
        pos: s.games?.position,
        min: num(s.games?.minutes),
        rating: s.games?.rating ? Number(s.games.rating) : null,
        goals: num(s.goals?.total),
        assists: num(s.goals?.assists),
        shots: num(s.shots?.total),
        on: num(s.shots?.on),
        key: num(s.passes?.key),
        passes: num(s.passes?.total),
        acc: s.passes?.accuracy,
        tackles: num(s.tackles?.total),
        duels: num(s.duels?.won),
        drib: num(s.dribbles?.success),
        yc: num(s.cards?.yellow),
        rc: num(s.cards?.red),
      });
    })
  );
  const sorted = [...rows].sort((a, b) => {
    const v = (x) => (x[sort] === null ? -1 : x[sort]);
    return v(b) - v(a);
  });

  const cols = [
    ["rating", "Nota"],
    ["min", "Min"],
    ["goals", "G"],
    ["assists", "A"],
    ["shots", "Tir"],
    ["on", "Puer"],
    ["key", "Clave"],
    ["passes", "Pas"],
    ["tackles", "Ent"],
    ["duels", "Duel"],
    ["drib", "Reg"],
  ];

  return (
    <>
      <Rule label="Rendimiento individual" />
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th className="tl">Jugador</th>
              {cols.map(([k, l]) => (
                <th key={k}>
                  <button className={"sortbtn" + (sort === k ? " sortbtn-on" : "")} onClick={() => setSort(k)}>
                    {l}
                  </button>
                </th>
              ))}
              <th>T</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id + r.team}>
                <td className="tl">
                  <Crest src={r.teamLogo} alt="" size={16} />
                  <span className="pl-name">{r.name}</span>
                  <span className="pl-pos">{r.pos}</span>
                </td>
                {cols.map(([k]) => (
                  <td key={k} className="mono">
                    {k === "rating" ? (
                      r.rating === null ? (
                        "—"
                      ) : (
                        <span className={"rate " + (r.rating >= 7.5 ? "rate-hi" : r.rating < 6.3 ? "rate-lo" : "")}>
                          {r.rating.toFixed(1)}
                        </span>
                      )
                    ) : (
                      r[k]
                    )}
                  </td>
                ))}
                <td className="mono">
                  {r.yc ? <i className="cardpip cy" /> : null}
                  {r.rc ? <i className="cardpip cr" /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Cuotas({ data, errs, busy }) {
  const [book, setBook] = useState(null);
  if (busy.odds || data.odds === undefined) return <Spinner />;
  if (errs.odds) return <div className="alert">{errs.odds}</div>;
  const o = data.odds?.[0];
  if (!o?.bookmakers?.length)
    return (
      <Empty
        title="Sin cuotas para este partido"
        hint="Solo hay 7 días de histórico y aparecen entre 1 y 14 días antes del inicio."
      />
    );
  const active = o.bookmakers.find((b) => b.id === book) || o.bookmakers[0];

  return (
    <>
      <Rule label="Casas de apuestas" />
      <div className="books">
        {o.bookmakers.map((b) => (
          <button
            key={b.id}
            className={"bookbtn" + (b.id === active.id ? " bookbtn-on" : "")}
            onClick={() => setBook(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>
      <div className="betgrid">
        {active.bets.map((bet) => (
          <div key={bet.id} className="betcard">
            <div className="bethead">{bet.name}</div>
            <div className="betvals">
              {bet.values.map((v, i) => (
                <div key={i} className="betval">
                  <span className="betlabel">{v.value}</span>
                  <span className="betodd mono">{v.odd}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="foot">
        Guarda estas cuotas si las quieres para entrenar: la API solo conserva 7 días y las de
        directo se borran a los pocos minutos del pitazo final.
      </p>
    </>
  );
}

