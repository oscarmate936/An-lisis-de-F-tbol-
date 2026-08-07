/* ============================================================
   Competición: tabla y goleadores
   ============================================================ */
function League({ api, leagues, sel, setSel, onTeam }) {
  const [standings, setStandings] = useState(null);
  const [scorers, setScorers] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [split, setSplit] = useState("all");
  const [q, setQ] = useState("");

  const league = leagues.find((l) => l.league.id === sel.league);
  const seasons = league ? league.seasons.map((s) => s.year).sort((a, b) => b - a) : [];
  const cov = league?.seasons.find((s) => s.year === sel.season)?.coverage;

  useEffect(() => {
    if (!sel.league || !sel.season) return;
    let dead = false;
    setBusy(true);
    setErr(null);
    setStandings(null);
    setScorers(null);
    (async () => {
      try {
        const r = await api("standings", { league: sel.league, season: sel.season }, TTL.hour);
        if (!dead) setStandings(r?.[0]?.league?.standings || []);
        const s = await api("players/topscorers", { league: sel.league, season: sel.season }, TTL.hour);
        if (!dead) setScorers(s || []);
      } catch (e) {
        if (!dead) setErr(e.message);
      } finally {
        if (!dead) setBusy(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [api, sel.league, sel.season]);

  const filtered = useMemo(
    () =>
      leagues.filter((l) =>
        `${l.league.name} ${l.country.name}`.toLowerCase().includes(q.toLowerCase())
      ),
    [leagues, q]
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="h1">Competición</h1>
        <div className="toolbar">
          <input
            className="input input-search"
            placeholder="Buscar liga o copa"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="input"
            value={sel.league || ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              const lg = leagues.find((l) => l.league.id === id);
              const cur = lg?.seasons.find((s) => s.current)?.year || seasonNow();
              setSel((s) => ({ ...s, league: id, season: cur }));
            }}
          >
            <option value="">Elige competición…</option>
            {filtered.slice(0, 400).map((l) => (
              <option key={l.league.id} value={l.league.id}>
                {l.country.name} · {l.league.name}
              </option>
            ))}
          </select>
          <select
            className="input mono"
            value={sel.season || ""}
            onChange={(e) => setSel((s) => ({ ...s, season: Number(e.target.value) }))}
            disabled={!seasons.length}
          >
            {seasons.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cov && (
        <>
          <Rule label="Cobertura de datos en esta temporada" />
          <div className="cov">
            {[
              ["standings", "Clasificación"],
              ["players", "Jugadores"],
              ["top_scorers", "Goleadores"],
              ["fixtures.events", "Eventos"],
              ["fixtures.lineups", "Alineaciones"],
              ["fixtures.statistics_fixtures", "Stats de partido"],
              ["fixtures.statistics_players", "Stats de jugador"],
              ["injuries", "Lesiones"],
              ["predictions", "Pronósticos"],
              ["odds", "Cuotas"],
            ].map(([path, label]) => {
              const val = path.split(".").reduce((o, k) => (o ? o[k] : undefined), cov);
              return (
                <span key={path} className={"covchip " + (val ? "cov-yes" : "cov-no")}>
                  {val ? "✓" : "✕"} {label}
                </span>
              );
            })}
          </div>
        </>
      )}

      {err && <div className="alert">{err}</div>}
      {busy && <Spinner />}
      {!sel.league && !busy && (
        <Empty title="Elige una competición" hint="Se cargan solo las que están en curso, para no gastar cuota." />
      )}

      {standings?.map((group, gi) => (
        <section key={gi}>
          <Rule label={standings.length > 1 ? group[0]?.group || `Grupo ${gi + 1}` : "Clasificación"} />
          <div className="splitbar">
            {[
              ["all", "Global"],
              ["home", "Como local"],
              ["away", "Como visitante"],
            ].map(([k, l]) => (
              <button key={k} className={"splitbtn" + (split === k ? " splitbtn-on" : "")} onClick={() => setSplit(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="tablewrap">
            <table className="table table-stand">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="tl">Equipo</th>
                  <th>PJ</th>
                  <th>G</th>
                  <th>E</th>
                  <th>P</th>
                  <th>GF</th>
                  <th>GC</th>
                  <th>DG</th>
                  <th>Pts</th>
                  <th className="tl">Forma</th>
                </tr>
              </thead>
              <tbody>
                {group.map((t) => {
                  const b = t[split] || t.all;
                  const dg = num(b.goals.for) - num(b.goals.against);
                  return (
                    <tr key={t.team.id} className={zoneClass(t.description)}>
                      <td className="mono rank">{t.rank}</td>
                      <td className="tl">
                        <button className="linkteam" onClick={() => onTeam(t.team, { id: sel.league, name: league?.league.name })}>
                          <Crest src={t.team.logo} alt="" size={18} />
                          {t.team.name}
                        </button>
                      </td>
                      <td className="mono">{b.played}</td>
                      <td className="mono">{b.win}</td>
                      <td className="mono">{b.draw}</td>
                      <td className="mono">{b.lose}</td>
                      <td className="mono">{b.goals.for}</td>
                      <td className="mono">{b.goals.against}</td>
                      <td className="mono">{dg > 0 ? "+" + dg : dg}</td>
                      <td className="mono pts">{split === "all" ? t.points : "—"}</td>
                      <td className="tl">
                        <FormPips form={t.form} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {scorers?.length > 0 && (
        <>
          <Rule label="Máximos goleadores" />
          <div className="scorers">
            {scorers.slice(0, 20).map((p, i) => {
              const s = p.statistics[0];
              return (
                <div key={p.player.id} className="scorer">
                  <span className="mono srank">{i + 1}</span>
                  <Crest src={p.player.photo} alt="" size={30} />
                  <div className="sinfo">
                    <b>{p.player.name}</b>
                    <span>{s.team.name}</span>
                  </div>
                  <div className="sgoals mono">
                    <b>{s.goals.total}</b>
                    <span>{s.goals.assists ? `${s.goals.assists} asist.` : "—"}</span>
                  </div>
                  <div className="seff mono">
                    {s.shots.total ? ((num(s.goals.total) / num(s.shots.total)) * 100).toFixed(0) + "%" : "—"}
                    <span>conversión</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function zoneClass(desc = "") {
  const d = (desc || "").toLowerCase();
  if (d.includes("champions")) return "z-ucl";
  if (d.includes("europa") || d.includes("conference")) return "z-uel";
  if (d.includes("relegation")) return "z-rel";
  if (d.includes("promotion")) return "z-pro";
  return "";
}

/* ============================================================
   Equipo: perfil analítico de temporada
   ============================================================ */
function Team({ api, team, league, season, onBack, onSeason }) {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(true);
  const [cut, setCut] = useState("");

  useEffect(() => {
    let dead = false;
    setBusy(true);
    setErr(null);
    (async () => {
      try {
        const r = await api(
          "teams/statistics",
          { team: team.id, league: league.id, season, date: cut || undefined },
          TTL.hour
        );
        if (!dead) setSt(r);
      } catch (e) {
        if (!dead) setErr(e.message);
      } finally {
        if (!dead) setBusy(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [api, team.id, league.id, season, cut]);

  const bands = ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90", "91-105", "106-120"];

  return (
    <div className="page">
      <button className="back" onClick={onBack}>
        ← Volver
      </button>
      <header className="teamhead">
        <Crest src={team.logo} alt="" size={62} />
        <div>
          <h1 className="h1">{team.name}</h1>
          <div className="teamsub">
            {league.name} · temporada <span className="mono">{season}</span>
          </div>
        </div>
        <div className="cutbox">
          <label className="fl" htmlFor="cut">
            Calcular hasta la fecha
          </label>
          <input id="cut" className="input input-date mono" type="date" value={cut} onChange={(e) => setCut(e.target.value)} />
          <span className="cuthint">
            Corta la temporada en un punto: así construyes variables sin filtrar el futuro.
          </span>
        </div>
      </header>

      {err && <div className="alert">{err}</div>}
      {busy && <Spinner label="Calculando temporada" />}

      {st && !busy && (
        <>
          <Rule label="Rendimiento" />
          <div className="kpis">
            <Kpi big={st.form ? <FormPips form={st.form} /> : "—"} label="Últimos resultados" />
            <Kpi big={st.fixtures.played.total} label="Partidos" />
            <Kpi big={`${st.fixtures.wins.total}-${st.fixtures.draws.total}-${st.fixtures.loses.total}`} label="G–E–P" />
            <Kpi big={st.goals.for.average.total} label="Goles a favor / partido" />
            <Kpi big={st.goals.against.average.total} label="Goles en contra / partido" />
            <Kpi big={st.clean_sheet.total} label="Porterías a cero" />
            <Kpi big={st.failed_to_score.total} label="Partidos sin marcar" />
            <Kpi
              big={`${st.penalty.scored.total}/${st.penalty.total}`}
              label="Penales convertidos"
            />
          </div>

          <Rule label="Casa y fuera" />
          <VsBar label="Partidos jugados" home={st.fixtures.played.home} away={st.fixtures.played.away} />
          <VsBar label="Victorias" home={st.fixtures.wins.home} away={st.fixtures.wins.away} />
          <VsBar label="Derrotas" home={st.fixtures.loses.home} away={st.fixtures.loses.away} invert />
          <VsBar label="Goles a favor" home={st.goals.for.total.home} away={st.goals.for.total.away} />
          <VsBar label="Goles en contra" home={st.goals.against.total.home} away={st.goals.against.total.away} invert />
          <div className="statlegend">
            <span className="lg-h">En casa</span>
            <span className="lg-a">Fuera</span>
          </div>

          <Rule label="Cuándo marca y cuándo encaja" />
          <div className="minutebands">
            <div className="mbrow">
              <span className="mblabel">Marca</span>
              <div className="mbtrack">
                {bands.map((b) => {
                  const v = num(st.goals.for.minute[b]?.total);
                  const max = Math.max(
                    1,
                    ...bands.map((x) => num(st.goals.for.minute[x]?.total)),
                    ...bands.map((x) => num(st.goals.against.minute[x]?.total))
                  );
                  return (
                    <div key={b} className="mbcell">
                      <div className="mbbar mbbar-f" style={{ height: (v / max) * 100 + "%" }} />
                      <span className="mbval mono">{v || ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mbaxis">
              {bands.map((b) => (
                <span key={b} className="mono">
                  {b}
                </span>
              ))}
            </div>
            <div className="mbrow">
              <span className="mblabel">Encaja</span>
              <div className="mbtrack mbtrack-down">
                {bands.map((b) => {
                  const v = num(st.goals.against.minute[b]?.total);
                  const max = Math.max(
                    1,
                    ...bands.map((x) => num(st.goals.for.minute[x]?.total)),
                    ...bands.map((x) => num(st.goals.against.minute[x]?.total))
                  );
                  return (
                    <div key={b} className="mbcell">
                      <div className="mbbar mbbar-a" style={{ height: (v / max) * 100 + "%" }} />
                      <span className="mbval mono">{v || ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Rule label="Líneas de goles" />
          <div className="ou">
            {["0.5", "1.5", "2.5", "3.5", "4.5"].map((line) => {
              const f = st.goals.for.under_over?.[line];
              const a = st.goals.against.under_over?.[line];
              if (!f && !a) return null;
              return (
                <div key={line} className="ourow">
                  <span className="ouline mono">{line}</span>
                  <div className="oublock">
                    <span className="oulab">Sus partidos: a favor</span>
                    <span className="mono">
                      +{f?.over ?? 0} / -{f?.under ?? 0}
                    </span>
                  </div>
                  <div className="oublock">
                    <span className="oulab">en contra</span>
                    <span className="mono">
                      +{a?.over ?? 0} / -{a?.under ?? 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Rule label="Extremos de la temporada" />
          <div className="biggest">
            <div>
              <span className="blab">Mayor goleada como local</span>
              <b className="mono">{st.biggest.wins.home || "—"}</b>
            </div>
            <div>
              <span className="blab">Mayor goleada como visitante</span>
              <b className="mono">{st.biggest.wins.away || "—"}</b>
            </div>
            <div>
              <span className="blab">Peor derrota en casa</span>
              <b className="mono">{st.biggest.loses.home || "—"}</b>
            </div>
            <div>
              <span className="blab">Peor derrota fuera</span>
              <b className="mono">{st.biggest.loses.away || "—"}</b>
            </div>
            <div>
              <span className="blab">Racha ganadora</span>
              <b className="mono">{st.biggest.streak.wins}</b>
            </div>
            <div>
              <span className="blab">Racha sin ganar</span>
              <b className="mono">{st.biggest.streak.draws + st.biggest.streak.loses}</b>
            </div>
          </div>

          <Rule label="Formaciones más usadas" />
          <div className="chips">
            {(st.lineups || []).map((l) => (
              <span key={l.formation} className="chip">
                {l.formation} <b className="mono">×{l.played}</b>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ big, label }) {
  return (
    <div className="kpi">
      <div className="kpibig mono">{big}</div>
      <div className="kpilabel">{label}</div>
    </div>
  );
}

