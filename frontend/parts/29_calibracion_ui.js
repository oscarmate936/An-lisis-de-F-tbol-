/* ============================================================
   App
   ============================================================ */
/* Red de seguridad: si un panel falla, cae solo ese panel y se puede
   seguir usando la pizarra. Antes, cualquier error dejaba la página en
   negro sin decir nada. */
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("Fallo en la pizarra:", err, info); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-tag">Algo se rompió aquí</div>
        <p>
          Esta parte de la pizarra ha fallado, pero el resto sigue funcionando. Suele pasar cuando
          una competición no publica algún dato que el panel esperaba.
        </p>
        <code className="mono crash-msg">{String(this.state.err?.message || this.state.err)}</code>
        <div className="crash-acts">
          <button className="btn btn-primary" onClick={() => this.setState({ err: null })}>
            Reintentar
          </button>
          {this.props.onBack && (
            <button className="btn btn-ghost" onClick={this.props.onBack}>
              Volver a la cartelera
            </button>
          )}
        </div>
      </div>
    );
  }
}

/* ============================================================
   CALIBRACIÓN
   Corre el modelo sobre una temporada ya jugada y mide si acierta.
   Una sola llamada a la API por temporada.
   ============================================================ */

function ReliabilityPlot({ bins }) {
  const S = 210, pad = 26;
  const px = (v) => pad + v * (S - pad - 8);
  const py = (v) => S - pad - v * (S - pad - 8);
  const pts = bins.filter((b) => b.n >= 8);
  const maxN = Math.max(1, ...pts.map((b) => b.n));
  return (
    <svg className="relplot" viewBox={`0 0 ${S} ${S}`} role="img"
      aria-label="Comparación entre probabilidad prevista y frecuencia observada">
      <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} className="reldiag" />
      <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(0)} className="relaxis" />
      <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(1)} className="relaxis" />
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <text x={px(v)} y={S - 8} className="reltick" textAnchor="middle">{v * 100}</text>
          <text x={pad - 6} y={py(v) + 3} className="reltick" textAnchor="end">{v * 100}</text>
        </g>
      ))}
      {/* Barra de error de Wilson: un punto lejos de la diagonal no dice
          nada si su intervalo la cruza. */}
      {pts.map((b, i) => {
        const z = 1.96, n = b.n, p = b.obs;
        const den = 1 + z * z / n;
        const c = (p + z * z / (2 * n)) / den;
        const h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / den;
        const lo = clamp(c - h, 0, 1), hi = clamp(c + h, 0, 1);
        return (
          <g key={i}>
            <line x1={px(b.avgP)} y1={py(lo)} x2={px(b.avgP)} y2={py(hi)} className="relci" />
            <circle cx={px(b.avgP)} cy={py(b.obs)} r={3 + 4 * Math.sqrt(b.n / maxN)} className="reldot">
              <title>{`previsto ${(b.avgP * 100).toFixed(0)}% · observado ${(b.obs * 100).toFixed(0)}% (${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}) · n=${b.n}`}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

function Metric({ label, value, base, better = "menor", hint, ci }) {
  const nv = parseFloat(value), nb = parseFloat(base);
  const igual = base != null && Math.abs(nv - nb) < 1e-9;
  const good = base != null && !igual && (better === "menor" ? nv < nb : nv > nb);
  return (
    <div className="met" title={hint}>
      <span className="metlab">{label}</span>
      <b className={"mono metval" + (base == null || igual ? "" : good ? " met-ok" : " met-bad")}>
        {value}
      </b>
      {ci && <i className="mono metci">IC 95%: {ci.lo.toFixed(4)} – {ci.hi.toFixed(4)}</i>}
      {base != null && <i className="mono metbase">base {base}</i>}
    </div>
  );
}

function Calibracion({ api, leagues, sel, setSel }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [list, setList] = useState(null);
  const [P, setP] = useState(P0);
  const [fit, setFit] = useState(null);
  const [fitting, setFitting] = useState(false);
  const [prog, setProg] = useState(0);
  const [savedFor, setSavedFor] = useState(null);
  const [useRest, setUseRest] = useState(true);
  const [motorSel, setMotor] = useState("mle");
  const motor = motorSel;
  const [comp, setComp] = useState(null);
  const [compBusy, setCompBusy] = useState(false);
  const [objetivo, setObjetivo] = useState("x1x2");
  const [valSeason, setValSeason] = useState(null);
  const [valList, setValList] = useState(null);
  const [valBusy, setValBusy] = useState(false);
  const [reg, setReg] = useState(null);
  const [regBusy, setRegBusy] = useState(false);

  const league = leagues.find((l) => l.league.id === sel.league);
  const seasons = league ? league.seasons.map((s) => s.year).sort((a, b) => b - a) : [];
  const filtered = useMemo(
    () => leagues.filter((l) => `${l.league.name} ${l.country.name}`.toLowerCase().includes(q.toLowerCase())),
    [leagues, q]
  );

  // parámetros ya guardados para esta competición
  useEffect(() => {
    if (!sel.league) return;
    let dead = false;
    (async () => {
      try {
        const r = await storage.get(paramsKey(sel.league, objetivo));
        if (!dead && r?.value) {
          const saved = JSON.parse(r.value);
          setP({ ...P0, ...saved.params });
          setSavedFor(saved);
        }
      } catch (e) { if (!dead) setSavedFor(null); }
    })();
    return () => { dead = true; };
  }, [sel.league, objetivo]);

  async function analizar() {
    if (!sel.league || !sel.season) return;
    setBusy(true); setErr(null); setList(null); setFit(null);
    try {
      const fx = await api("fixtures", { league: sel.league, season: sel.season }, TTL.daily);
      const ds = leagueDataset(fx);
      if (ds.length < 60)
        throw new Error(`Solo hay ${ds.length} partidos terminados en esta temporada. Hacen falta unos 60 para que la medición signifique algo: prueba con una temporada anterior.`);
      // Previo para la media de liga: lo que marcó esta competición el año
      // pasado. Reduce el ruido de las primeras jornadas del backtest.
      try {
        const ant = await api("fixtures", { league: sel.league, season: sel.season - 1 }, TTL.static);
        const da = leagueDataset(ant);
        if (da.length >= 60) {
          setP((p) => ({ ...p, priorLg: {
            h: da.reduce((a, m) => a + m.gh, 0) / da.length,
            a: da.reduce((a, m) => a + m.ga, 0) / da.length, w: 25 } }));
        }
      } catch (e) { /* sin temporada anterior: previo genérico */ }
      setList(ds);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const correr = useCallback(async (ds, motorX) => {
    if (!ds) return null;
    const motor = motorX || motorSel;
    let s = null;
    if (motor === "ens" || motor === "elo") {
      const rows = (await runEnsemble(ds, P)).filter((r) => r.pOrd);
      if (rows.length < 30) return null;
      const key = motor === "ens" ? "pEns" : "pOrd";
      s = scoreFromProbs(rows.map((r) => ({ ...r, ps: r[key] })));
      s.pesos = rows[rows.length - 1].w;
    } else {
      const preds = motor === "mle" ? runPredictionsMLE(ds, P) : runPredictions(ds, P, useRest);
      if (preds.length < 30) return null;
      s = scorePredictions(preds, P.rho, { corr: P.corr, theta: P.theta, nu: P.nu });
    }
    // Recalibración: una temperatura para todo, o una por resultado.
    let ll = 0;
    const T = (() => {
      let best = { T: 1, ll: Infinity };
      for (let t = 0.7; t <= 1.8001; t += 0.05) {
        ll = 0;
        s.probs.forEach((p, i) => { ll += -Math.log(Math.max(1e-12, applyTemp(p, t)[s.ys[i]])); });
        ll /= s.probs.length;
        if (ll < best.ll) best = { T: Number(t.toFixed(2)), ll };
      }
      return best;
    })();
    return { ...s, temp: T, vector: fitVectorScaling(s.probs, s.ys) };
  }, [motor, P, useRest]);

  /* El backtest ya no se calcula durante el render: se lanza en segundo
     plano y va cediendo el hilo, así la pantalla sigue respondiendo. */
  const [res, setRes] = useState(null);
  const [val, setVal] = useState(null);
  const [midiendo, setMidiendo] = useState(false);
  useEffect(() => {
    let dead = false;
    if (!list) { setRes(null); return; }
    setMidiendo(true);
    correr(list)
      .then((r) => { if (!dead) setRes(r); })
      .catch(() => { if (!dead) setRes(null); })
      .finally(() => { if (!dead) setMidiendo(false); });
    return () => { dead = true; };
  }, [correr, list]);
  useEffect(() => {
    let dead = false;
    if (!valList) { setVal(null); return; }
    correr(valList)
      .then((r) => { if (!dead) setVal(r); })
      .catch(() => { if (!dead) setVal(null); });
    return () => { dead = true; };
  }, [correr, valList]);

  async function validar() {
    if (!sel.league || !valSeason) return;
    setValBusy(true); setErr(null);
    try {
      const fx = await api("fixtures", { league: sel.league, season: valSeason }, TTL.static);
      const ds = leagueDataset(fx);
      if (ds.length < 60) throw new Error(`La temporada ${valSeason} solo tiene ${ds.length} partidos terminados.`);
      setValList(ds);
    } catch (e) { setErr(e.message); }
    finally { setValBusy(false); }
  }

  /* ---------- registro prospectivo ---------- */
  useEffect(() => { logRead().then(setReg); }, []);

  async function actualizarRegistro() {
    setRegBusy(true); setErr(null);
    try {
      const all = await logRead();
      const pend = all.filter((e) => e.gh === undefined || e.gh === null);
      const ids = pend.map((e) => e.fx);
      const nuevos = new Map();
      for (let i = 0; i < ids.length; i += 20) {
        const trozo = ids.slice(i, i + 20);
        const r = await api("fixtures", { ids: trozo.join("-") }, TTL.short);
        (r || []).forEach((f) => {
          if (DONE_STATES.includes(f.fixture?.status?.short))
            nuevos.set(f.fixture.id, { gh: num(f.goals.home), ga: num(f.goals.away) });
        });
      }
      const merged = all.map((e) => (nuevos.has(e.fx) ? { ...e, ...nuevos.get(e.fx) } : e));
      await storage.set(LOG_KEY, JSON.stringify(merged));
      setReg(merged);
    } catch (e) { setErr(e.message); }
    finally { setRegBusy(false); }
  }

  /** Trae los córners y tarjetas reales de los partidos ya jugados que
      tenían pronóstico, para poder puntuar también esos mercados. */
  async function puntuarConteos() {
    setRegBusy(true); setErr(null);
    try {
      const all = await logRead();
      const faltan = all.filter((e) => e.gh !== undefined && e.gh !== null &&
        (e.pC !== undefined || e.pT !== undefined) && e.cAct === undefined).slice(0, 12);
      if (!faltan.length) { setReg(all); return; }
      const merged = [...all];
      for (const e of faltan) {
        const st = await api("fixtures/statistics", { fixture: e.fx }, TTL.static);
        if (!st?.length) continue;
        const suma = (k, mult = 1) => st.reduce((a, b) =>
          a + num((b.statistics || []).find((x) => x.type === k)?.value) * mult, 0);
        const i = merged.findIndex((x) => x.fx === e.fx);
        merged[i] = { ...merged[i], cAct: suma("Corner Kicks"),
          tAct: suma("Yellow Cards") + suma("Red Cards", 2) };
      }
      await storage.set(LOG_KEY, JSON.stringify(merged));
      setReg(merged);
    } catch (e) { setErr(e.message); }
    finally { setRegBusy(false); }
  }

  const regScore = useMemo(() => (reg && reg.length ? scoreLog(reg) : null), [reg]);

  async function ajustar() {
    if (!list) return;
    setFitting(true); setProg(0); setErr(null);
    try {
      const r = await fitParams(list, P, setProg, { motor, objetivo, ajustarNu: true });
      setFit(r);
      setP(r.params);
    } catch (e) { setErr(e.message); }
    finally { setFitting(false); }
  }

  async function guardar() {
    // El escalado vectorial solo se midió sobre el 1X2 (local/empate/
    // visitante): en otros objetivos no significa nada y no se guarda.
    const vector = objetivo === "x1x2" && res?.vector && res.vector.ll < res.logloss - 0.002
      ? { a: res.vector.a, b: res.vector.b } : null;
    const payload = { params: { ...P, vector }, league: sel.league, season: sel.season, objetivo, motor,
      n: res?.n || 0, ts: Date.now(), auto: false };
    try {
      await storage.set(paramsKey(sel.league, objetivo), JSON.stringify(payload));
      setSavedFor(payload);
    } catch (e) { setErr("No se pudieron guardar los parámetros en este navegador."); }
  }

  const f3 = (v) => v.toFixed(4);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="h1">Calibración</h1>
        <div className="toolbar">
          <input className="input input-search" placeholder="Buscar liga o copa"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={sel.league || ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              const lg = leagues.find((l) => l.league.id === id);
              const cur = lg?.seasons.find((s) => s.current)?.year || seasonNow();
              setSel((s) => ({ ...s, league: id, season: cur }));
              setList(null); setFit(null); setP(P0); setSavedFor(null);
            }}>
            <option value="">Elige competición…</option>
            {filtered.slice(0, 400).map((l) => (
              <option key={l.league.id} value={l.league.id}>{l.country.name} · {l.league.name}</option>
            ))}
          </select>
          <select className="input mono" value={sel.season || ""} disabled={!seasons.length}
            onChange={(e) => { setSel((s) => ({ ...s, season: Number(e.target.value) })); setList(null); setFit(null); }}>
            {seasons.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={analizar} disabled={busy || !sel.league}>
            {busy ? "Leyendo temporada…" : "Analizar temporada"}
          </button>
        </div>
      </div>

      {err && <div className="alert">{err}</div>}

      {!list && !busy && (
        <div className="stage">
          <p>
            Elige una competición y una temporada ya jugada. La pizarra vuelve a predecir cada
            jornada usando solo lo que se sabía antes de cada partido y compara con lo que pasó de
            verdad. Cuesta una sola llamada a la API por temporada.
          </p>
          <p>
            Con eso puedes ver si el modelo acierta más que apostar siempre al local, y ajustar sus
            parámetros a esta liga concreta: no se comporta igual la Premier que la liga noruega.
          </p>
        </div>
      )}

      {list && (
        <section className="card card-quiet">
          <div className="motorbar">
          <div className="splitbar">
            {Object.entries(MOTORES).map(([k, l]) => (
              <button key={k} className={"splitbtn" + (motor === k ? " splitbtn-on" : "")}
                onClick={() => { setMotor(k); setFit(null); }}>{l}</button>
            ))}
          </div>
          <button className="btn btn-quiet" disabled={compBusy}
            onClick={() => {
              setCompBusy(true);
              setTimeout(async () => {
                const out = [];
                for (const k of Object.keys(MOTORES)) {
                  try {
                    const r = await correr(list, k);
                    out.push(r ? { k, ll: r.logloss, brier: r.brier, acc: r.acc, n: r.n, base: r.baseLl } : { k, vacio: true });
                  } catch (e) { out.push({ k, vacio: true }); }
                }
                setComp(out);
                setCompBusy(false);
              }, 20);
            }}>
            {compBusy ? "Probando los cuatro…" : "Comparar motores"}
          </button>
          <label className="par">
            <span>Ajustar para acertar en</span>
            <select className="input" value={objetivo}
              onChange={(e) => { setObjetivo(e.target.value); setFit(null); }}>
              {Object.entries(OBJETIVOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          </div>
        </section>
      )}

      {comp && (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Los cuatro motores sobre esta temporada</h2>
            <button className="btn btn-quiet" onClick={() => setComp(null)}>Ocultar</button>
          </div>
          <div className="card-body card-flush">
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="tl">Motor</th><th>Log-loss</th><th>Brier</th>
                    <th>Acierto</th><th>Partidos</th><th />
                  </tr>
                </thead>
                <tbody>
                  {comp.map((c) => {
                    const mejor = comp.filter((x) => !x.vacio).reduce((a, b) => (a.ll <= b.ll ? a : b), { ll: Infinity });
                    return (
                      <tr key={c.k} className={c.k === motor ? "cmp-difiere" : ""}>
                        <td className="tl">{MOTORES[c.k]}{c.k === motor ? " · en uso" : ""}</td>
                        {c.vacio ? <td colSpan={4} className="dim">sin partidos suficientes</td> : (
                          <>
                            <td className={"mono" + (c === mejor ? " rate-hi" : "")}>{fx(c.ll, 4)}</td>
                            <td className="mono">{fx(c.brier, 4)}</td>
                            <td className="mono">{pc(c.acc)}</td>
                            <td className="mono dim">{c.n}</td>
                          </>
                        )}
                        <td>
                          {!c.vacio && c.k !== motor && (
                            <button className="btn btn-quiet"
                              onClick={() => { setMotor(c.k); setFit(null); avisar(`Motor cambiado a ${MOTORES[c.k]}`); }}>
                              Usar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="cb-match-pie">
            Todos con los mismos parámetros y la misma temporada. El log-loss más bajo gana, pero
            una diferencia pequeña sobre unos cientos de partidos puede ser azar: mira también si
            el orden se repite en otra liga.
          </div>
        </section>
      )}

      {list && !res && (
        <Empty title="No hay bastantes partidos con historial previo"
          hint="Con este motor y estos parámetros no se llega a 30 predicciones. Prueba con el otro motor o con una temporada más larga." />
      )}

      {res && (
        <>
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Qué tan bien predice</h2>
            </div>
            <div className="card-body">
          <div className="mets">
            <Metric label="Log-loss 1X2" value={f3(res.logloss)} base={f3(res.baseLl)}
              ci={res.ciLl}
              hint="Penaliza estar seguro y fallar. Más bajo es mejor. La base es predecir siempre las tasas de la liga." />
            <Metric label="RPS" value={f3(res.rps)} base={f3(res.baseRps)} ci={res.ciRps}
              hint="Ranked Probability Score: como el Brier pero respetando que local, empate y visitante están ordenados. Fallar por poco penaliza menos." />
            <Metric label="Brier 1X2" value={f3(res.brier)} base={f3(res.baseBrier)}
              hint="Error cuadrático medio sobre los tres resultados." />
            <Metric label="Acierto del favorito" value={(res.acc * 100).toFixed(1) + "%"} />
            <Metric label="Brier más/menos 2.5" value={f3(res.brierOver)} />
            <Metric label="Brier ambos marcan" value={f3(res.brierBtts)} />
            <Metric label="Partidos medidos" value={String(res.n)} />
            <Metric label="Con recalibración" value={f3(res.temp.ll)} base={f3(res.logloss)}
              hint="Log-loss tras achatar o estirar las probabilidades con la temperatura aprendida." />
          </div>
          <p className="foot">
            {res.ciLl && res.ciLl.hi < res.baseLl
              ? "El intervalo de confianza queda entero por debajo de la base, así que la mejora no es casualidad de la muestra."
              : res.ciLl && res.ciLl.lo > res.baseLl
              ? "El intervalo queda por encima de la base: el modelo es peor que la tabla, y no por poco."
              : "Ojo: el intervalo de confianza cruza la base. Con esta muestra no se puede afirmar que el modelo mejore de verdad."}
          </p>
          {res.pesos && (
            <p className="foot">
              Pesos del ensamble al final de la temporada:{" "}
              <span className="mono">{Math.round(res.pesos[0] * 100)}%</span> Dixon-Coles ·{" "}
              <span className="mono">{Math.round(res.pesos[1] * 100)}%</span> Elo + ordinal. Se
              aprenden solo con partidos anteriores a cada jornada, nunca con los que se miden.
            </p>
          )}
          <p className="foot">
            Temperatura ajustada: <span className="mono">{res.temp.T}</span>.{" "}
            {res.temp.T > 1.05
              ? "Por encima de 1 significa que el modelo va sobrado de confianza y conviene achatar sus porcentajes."
              : res.temp.T < 0.95
              ? "Por debajo de 1 significa que el modelo se queda corto: podría afinar más de lo que dice."
              : "Muy cerca de 1: las probabilidades ya salen bien calibradas de fábrica."}
            {res.vector
              ? ` Con recalibración por resultado (escalado vectorial) baja a ${f3(res.vector.ll)}: ${
                  res.vector.ll < res.temp.ll - 0.002
                    ? "corregir cada resultado por separado sí aporta, y suele ser el empate el que estaba mal calibrado."
                    : "no aporta sobre la temperatura simple, así que no merece la pena."}`
              : " Para la recalibración por resultado hacen falta unos 400 partidos; con menos se sobreajusta."}
          </p>

            </div>
          </section>

          <Collapsible variant="card" title="Rendimiento por mercado" defaultOpen>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="tl">Mercado</th><th>Log-loss</th><th>Base</th>
                  <th>Brier</th><th>Base</th><th>¿Aporta?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Resultado 1X2", res.logloss, res.baseLl, res.brier, res.baseBrier],
                  ["Más/menos 2.5", res.lloverU, res.baseOver?.ll, res.brierOver, res.baseOver?.br],
                  ["Ambos marcan", res.llBtts, res.baseBtts?.ll, res.brierBtts, res.baseBtts?.br],
                ].map(([lab, ll, bll, br, bbr]) => (
                  <tr key={lab}>
                    <td className="tl">{lab}</td>
                    <td className="mono">{f3(ll)}</td>
                    <td className="mono dim">{bll != null ? f3(bll) : "—"}</td>
                    <td className="mono">{f3(br)}</td>
                    <td className="mono dim">{bbr != null ? f3(bbr) : "—"}</td>
                    <td className={"mono " + (bll != null && ll < bll ? "met-ok" : "met-bad")}>
                      {bll != null ? (ll < bll ? `sí, ${((1 - ll / bll) * 100).toFixed(1)}%` : "no") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="foot">
            El modelo puede ser bueno en el 1X2 y flojo en los goles, o al revés. Si un mercado no
            bate a su tasa base, ajusta los parámetros con ese objetivo en el selector de arriba y
            guárdalos aparte.
          </p>
          </Collapsible>

          <Collapsible variant="card" title="Dónde falla" note="por tipo de partido">
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="tl">Tipo de partido</th><th>Partidos</th>
                  <th>Log-loss</th><th>RPS</th><th>Acierto</th>
                </tr>
              </thead>
              <tbody>
                {res.segmentos.map((s2) => (
                  <tr key={s2.label}>
                    <td className="tl">{s2.label}</td>
                    <td className="mono">{s2.n}</td>
                    <td className="mono">{s2.corto ? "—" : f3(s2.logloss)}</td>
                    <td className="mono">{s2.corto ? "—" : f3(s2.rps)}</td>
                    <td className="mono">{s2.corto ? "—" : (s2.acc * 100).toFixed(0) + "%"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="foot">
            Un log-loss global bueno puede esconder que el modelo se rompe en un tipo concreto de
            partido. Aquí es donde se ve qué arreglar: si falla en los partidos parejos, sobra
            confianza en el empate; si falla con favorito claro, las fuerzas están mal estimadas.
            Los segmentos con menos de quince partidos no se puntúan.
          </p>
          <p className="foot">
            {res.logloss < res.baseLl
              ? `El modelo bate a las tasas base de la liga por ${((1 - res.logloss / res.baseLl) * 100).toFixed(1)}% de log-loss. Es la comparación honesta: si no la superara, no aportaría nada sobre mirar la tabla.`
              : "El modelo NO bate a las tasas base en esta temporada. Con esta liga y estos datos, sus pronósticos no son fiables: no los uses como si lo fueran."}
          </p>
          </Collapsible>

          <Collapsible variant="card" title="¿Se puede creer un 70%?" note="fiabilidad" defaultOpen>
          <div className="reliwrap">
            <ReliabilityPlot bins={res.bins} />
            <div className="relside">
              <p className="foot" style={{ marginTop: 0 }}>
                Cada punto agrupa las veces que el modelo dijo un porcentaje parecido. El eje
                horizontal es lo que predijo; el vertical, lo que ocurrió en realidad. Cuanto más
                pegados a la diagonal, más se puede confiar en el número. Puntos por encima de la
                línea significan que el modelo se queda corto; por debajo, que se pasa de confiado.
              </p>
              <table className="table">
                <thead>
                  <tr><th className="tl">Previsto</th><th>Observado</th><th>Casos</th></tr>
                </thead>
                <tbody>
                  {res.bins.filter((b) => b.n >= 8).map((b, i) => (
                    <tr key={i}>
                      <td className="tl mono">{(b.avgP * 100).toFixed(0)}%</td>
                      <td className="mono">{(b.obs * 100).toFixed(0)}%</td>
                      <td className="mono">{b.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </Collapsible>

          <Collapsible variant="card" title="Parámetros del modelo">
          <div className="parbox">
            <div className="pars">
              {[
                // Con cópula el rho no se usa: mostrarlo solo confundiría.
                ...(P.corr === "copula" ? [] : [["rho", "Corrección de empates", RHOS, (v) => v.toFixed(2)]]),
                ["wForm", "Peso de la forma reciente", GRID_FIT.wForm, (v) => Math.round(v * 100) + "%"],
                ["k", "Encogimiento con pocos partidos", GRID_FIT.k, (v) => String(v)],
                ["halfLife", "Vida media del decaimiento", GRID_FIT.halfLife, (v) => v + " d"],
              ].map(([key, label, grid, fmt]) => (
                <label className="par" key={key}>
                  <span>{label}</span>
                  <select className="input mono" value={P[key]}
                    onChange={(e) => { setP((p) => ({ ...p, [key]: Number(e.target.value) })); setFit(null); }}>
                    {grid.map((v) => <option key={v} value={v}>{fmt(v)}</option>)}
                  </select>
                </label>
              ))}
              <label className="par">
                <span>Modelo de dependencia</span>
                <select className="input" value={P.corr || "dc"}
                  onChange={(e) => { setP((p) => ({ ...p, corr: e.target.value })); setFit(null); }}>
                  <option value="dc">Dixon-Coles</option>
                  <option value="copula">Cópula gaussiana</option>
                </select>
              </label>
              {P.corr === "copula" && (
                <label className="par">
                  <span>Dependencia (theta)</span>
                  <select className="input mono" value={P.theta}
                    onChange={(e) => { setP((p) => ({ ...p, theta: Number(e.target.value) })); setFit(null); }}>
                    {[0, 0.04, 0.08, 0.12, 0.18].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              )}
              <label className="par">
                <span>Dispersión de los goles</span>
                <select className="input mono" value={P.nu}
                  onChange={(e) => { setP((p) => ({ ...p, nu: Number(e.target.value) })); setFit(null); }}>
                  <option value={0.85}>0.85 abierta</option>
                  <option value={1}>1 · Poisson</option>
                  <option value={1.1}>1.10</option>
                  <option value={1.25}>1.25 apretada</option>
                </select>
              </label>
              <label className="par">
                <span>Encogimiento automático</span>
                <input type="checkbox" checked={!!P.autoShrink}
                  onChange={(e) => { setP((p) => ({ ...p, autoShrink: e.target.checked })); setFit(null); }} />
              </label>
              <label className="par">
                <span>Ajuste por descanso</span>
                <input type="checkbox" checked={useRest} onChange={(e) => setUseRest(e.target.checked)} />
              </label>
            </div>
            <div className="paract">
              <button className="btn btn-primary" onClick={ajustar} disabled={fitting}>
                {fitting ? `Probando combinaciones… ${Math.round(prog * 100)}%` : "Ajustar automáticamente"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setP(P0); setFit(null); }}>
                Volver a los valores por defecto
              </button>
              <button className="btn btn-ghost" onClick={guardar} disabled={!res}>
                Guardar para {OBJETIVOS[objetivo].label}
              </button>
            </div>
            {fit && (
              <div className="advice">
                <span className="advice-tag">Ajustado</span>
                <span>
                  Log-loss {f3(fit.logloss)} con los parámetros de arriba. La pizarra los usará en
                  todos los partidos de esta competición si los guardas.
                </span>
              </div>
            )}
            {savedFor && (
              <p className="foot">
                {savedFor.auto
                  ? "Ajustados solos por la pizarra"
                  : "Guardados a mano"} el {new Date(savedFor.ts).toLocaleDateString()} para{" "}
                <b>{OBJETIVOS[savedFor.objetivo || "x1x2"]?.label || "el 1X2"}</b> con la temporada{" "}
                <span className="mono">{savedFor.season}</span> ({savedFor.n} partidos). Mercados
                usa los del 1X2 para construir la matriz; los de otros mercados quedan guardados
                aparte para que puedas compararlos aquí.
                {savedFor.auto && " Guarda aquí a mano cuando quieras fijar estos valores y que no se vuelvan a tocar solos."}
              </p>
            )}
          </div>
          </Collapsible>

          <Collapsible variant="card" title="Comprobar en otra temporada" note="validación cruzada">
          <div className="valbox">
            <div className="toolbar">
              <select className="input mono" value={valSeason || ""}
                onChange={(e) => { setValSeason(Number(e.target.value)); setValList(null); }}>
                <option value="">Elige otra temporada…</option>
                {seasons.filter((y) => y !== sel.season).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button className="btn btn-primary" onClick={validar} disabled={valBusy || !valSeason}>
                {valBusy ? "Leyendo…" : "Comprobar con estos parámetros"}
              </button>
            </div>
            {val && (
              <>
                <div className="mets">
                  <Metric label={`Log-loss en ${valSeason}`} value={f3(val.logloss)} base={f3(val.baseLl)} />
                  <Metric label="Brier" value={f3(val.brier)} base={f3(val.baseBrier)} />
                  <Metric label="Acierto" value={(val.acc * 100).toFixed(1) + "%"} />
                  <Metric label="Partidos" value={String(val.n)} />
                </div>
                <p className="foot">
                  {val.logloss < val.baseLl
                    ? `Los parámetros aguantan en una temporada que no se usó para ajustarlos: la mejora es real y no de haber memorizado. Diferencia con la temporada de ajuste: ${(val.logloss - res.logloss).toFixed(4)}.`
                    : "En esta temporada el modelo no bate a la base. Eso apunta a que los parámetros están sobreajustados a la otra temporada: usa valores más conservadores."}
                </p>
              </>
            )}
          </div>
          </Collapsible>

          <p className="foot foot-page">
            Dos avisos honestos. Ajustar sobre la misma temporada que mides infla el resultado: si
            quieres una medición limpia, calibra con una temporada y comprueba con otra distinta.
            Y el backtest usa solo partidos de esta competición, mientras que la pizarra también
            mira la forma en copas, así que los números de aquí son una cota prudente.
          </p>
        </>
      )}

      <Collapsible variant="card" title="Registro de pronósticos" note="medición real">
      <div className="stack">
        <p className="foot" style={{ marginTop: 0 }}>
          Cada vez que abres la pestaña Mercados de un partido que aún no ha empezado, la pizarra
          guarda aquí lo que predijo. Nada de esto se puede retocar después, así que es la única
          medición que no admite trampa. Pulsa el botón cuando hayan pasado unas jornadas.
        </p>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={actualizarRegistro} disabled={regBusy || !reg?.length}>
            {regBusy ? "Buscando resultados…" : "Actualizar con los resultados"}
          </button>
          {reg?.length > 0 && (
            <>
              <button className="btn btn-quiet" onClick={puntuarConteos} disabled={regBusy}>
                Puntuar córners y tarjetas
              </button>
              <button className="btn btn-quiet" onClick={() => downloadText("registro-pizarra.xls",
                toExcel([{ nombre: "Registro", cols: [["Fecha", (r) => r.date], ["Local", (r) => r.home],
                  ["Visitante", (r) => r.away], ["P local", (r) => r.pH], ["P empate", (r) => r.pD],
                  ["P visita", (r) => r.pA], ["P +2.5", (r) => r.pO], ["P ambos", (r) => r.pB],
                  ["Goles local", (r) => r.gh ?? ""], ["Goles visita", (r) => r.ga ?? ""]],
                  filas: reg }]), "application/vnd.ms-excel")}>Exportar Excel</button>
              <button className="btn btn-quiet" onClick={() => downloadText("registro-pizarra.json",
                JSON.stringify(reg, null, 2), "application/json")}>Exportar JSON</button>
              <button className="btn btn-quiet" onClick={() => downloadText("registro-pizarra.csv",
                toCSV(reg, [["fecha", (r) => r.date], ["local", (r) => r.home], ["visitante", (r) => r.away],
                  ["gol_esp_local", (r) => r.lh], ["gol_esp_visita", (r) => r.la],
                  ["p_local", (r) => r.pH], ["p_empate", (r) => r.pD], ["p_visita", (r) => r.pA],
                  ["p_mas25", (r) => r.pO], ["p_ambos", (r) => r.pB],
                  ["goles_local", (r) => r.gh ?? ""], ["goles_visita", (r) => r.ga ?? ""],
                  ["motor", (r) => r.motor || ""]]))}>Exportar CSV</button>
              <button className="btn btn-quiet" onClick={async () => { await logClear(); setReg([]); }}>
                Vaciar registro
              </button>
            </>
          )}
        </div>
        {!reg?.length ? (
          <Empty title="Todavía no hay pronósticos guardados"
            hint="Abre la pestaña Mercados de algún partido que no haya empezado y volverá a aparecer aquí." />
        ) : !regScore ? (
          <p className="foot">{reg.length} pronósticos guardados, ninguno con resultado todavía.</p>
        ) : (
          <>
            <div className="mets">
              <Metric label="Log-loss real" value={f3(regScore.logloss)} base={f3(regScore.baseLl)} />
              <Metric label="Brier" value={f3(regScore.brier)} />
              <Metric label="Acierto del favorito" value={(regScore.acc * 100).toFixed(1) + "%"} />
              <Metric label="RPS" value={f3(regScore.rps)} />
              <Metric label="Brier más/menos 2.5" value={f3(regScore.brierOver)} />
              <Metric label="Brier ambos marcan" value={f3(regScore.brierBtts)} />
              <Metric label="Puntuados" value={String(regScore.n)} />
              <Metric label="Pendientes" value={String(regScore.pend)} />
            </div>
            {regScore.ci && (
              <p className="foot">
                Intervalo del log-loss real:{" "}
                <span className="mono">{regScore.ci.lo.toFixed(4)} – {regScore.ci.hi.toFixed(4)}</span>.{" "}
                {regScore.ci.hi < regScore.baseLl
                  ? "Queda por debajo de la base, así que la ventaja se sostiene."
                  : "Cruza la base: con estos partidos todavía no se puede afirmar que el modelo aporte."}
              </p>
            )}
            {regScore.acum.length >= 10 && (
              <>
                <div className="colhead">Log-loss acumulado</div>
                {(() => {
                  const W = 560, H = 130, pad = 26;
                  const ys = regScore.acum.map((p) => p.ll);
                  const lo = Math.min(...ys, regScore.baseLl) * 0.95;
                  const hi = Math.max(...ys, regScore.baseLl) * 1.05;
                  const px = (i) => pad + (i / Math.max(1, regScore.acum.length - 1)) * (W - pad - 8);
                  const py = (v) => H - 18 - ((v - lo) / Math.max(1e-6, hi - lo)) * (H - 30);
                  const d = regScore.acum.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(p.ll).toFixed(1)}`).join(" ");
                  return (
                    <svg className="curva" viewBox={`0 0 ${W} ${H}`} role="img"
                      aria-label="Evolución del log-loss acumulado">
                      <line x1={pad} y1={py(regScore.baseLl)} x2={W - 8} y2={py(regScore.baseLl)}
                        className="curvabase" />
                      <text x={W - 10} y={py(regScore.baseLl) - 5} className="reltick" textAnchor="end">
                        base {regScore.baseLl.toFixed(3)}
                      </text>
                      <path d={d} className="curvaln" />
                      <text x={pad} y={H - 4} className="reltick">1</text>
                      <text x={W - 8} y={H - 4} className="reltick" textAnchor="end">
                        {regScore.acum.length}
                      </text>
                    </svg>
                  );
                })()}
                <p className="foot">
                  La línea es el log-loss medio acumulado; la de puntos, la tasa base. Al principio
                  salta mucho porque hay pocos partidos: lo que importa es hacia dónde se asienta.
                </p>
              </>
            )}
            {(regScore.brierCorners !== null || regScore.brierCards !== null) && (
              <div className="mets">
                {regScore.brierCorners !== null && (
                  <Metric label="Brier córners 9.5" value={f3(regScore.brierCorners)}
                    hint={`${regScore.nCorners} partidos con córners reales`} />
                )}
                {regScore.brierCards !== null && (
                  <Metric label="Brier tarjetas 4.5" value={f3(regScore.brierCards)}
                    hint={`${regScore.nCards} partidos con tarjetas reales`} />
                )}
              </div>
            )}
            {regScore.semanas.length >= 3 && (
              <>
                <div className="colhead">Cómo evoluciona semana a semana</div>
                <div className="evol">
                  {regScore.semanas.map((s2) => {
                    const alto = Math.max(...regScore.semanas.map((z) => z.ll), 1.4);
                    return (
                      <div className="evolcol" key={s2.k} title={`${s2.k}: ${s2.n} partidos, log-loss ${s2.ll.toFixed(3)}`}>
                        <div className="evolbar" style={{ height: Math.max(4, (s2.ll / alto) * 100) + "%" }} />
                        <span className="mono evoln">{s2.n}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="foot">
                  Cada barra es una semana; más alta significa peor. Si la tendencia sube de forma
                  sostenida, el modelo se está degradando y toca recalibrar: suele pasar cuando
                  cambian entrenadores o llega el mercado de invierno.
                </p>
              </>
            )}
            {regScore.n >= 20 ? (
              <div className="reliwrap">
                <ReliabilityPlot bins={regScore.bins} />
                <p className="foot" style={{ marginTop: 0 }}>
                  Esto es lo que la pizarra ha acertado de verdad, sobre partidos que no había
                  visto cuando los predijo. Es el número que importa: todo lo demás de esta
                  pantalla es un ensayo. Con menos de cien partidos, tómalo como señal provisional.
                </p>
              </div>
            ) : (
              <p className="foot">
                Con {regScore.n} partidos puntuados aún no se puede concluir nada. A partir de unos
                cincuenta el número empieza a significar algo.
              </p>
            )}
          </>
        )}
        </div>
      </Collapsible>
    </div>
  );
}

