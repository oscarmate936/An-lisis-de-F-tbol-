function Fixtures({ api, onOpen, onTeam, leagues }) {
  const [date, setDate] = useState(isoDay(new Date()));
  const [live, setLive] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cerradas, setCerradas] = useState(() => new Set());
  const [marcados, setMarcados] = useState(() => new Map());
  const [filtro, setFiltro] = useState("todos");
  const [vistaLista, setVistaLista] = useState("ligas");
  const [favs, setFavs] = useState(() => new Set());
  const [buscando, setBuscando] = useState(false);
  const [recientes, setRecientes] = useState(() => recientesLeer());

  /* La combinada ya sabía de la cartelera; faltaba que la cartelera
     supiera de la combinada. */
  useEffect(() => {
    const cuenta = (l) => {
      const m = new Map();
      (l || []).filter((x) => !x.off).forEach((x) => m.set(x.fx, (m.get(x.fx) || 0) + 1));
      setMarcados(m);
    };
    slipRead().then(cuenta);
    return slipOn(cuenta);
  }, []);

  useEffect(() => {
    let vivo = true;
    storage.get("ligas-fav:v1")
      .then((r) => { if (vivo) setFavs(new Set(JSON.parse(r.value) || [])); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const fijar = (id) => setFavs((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    try { storage.set("ligas-fav:v1", JSON.stringify([...n])).catch(() => {}); } catch (e) { /* nada */ }
    return n;
  });

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const base = live ? { live: "all" } : { date };
      let r;
      try {
        r = await api("fixtures", conTZ(base), TTL.short);
      } catch (e) {
        // Si la API no reconoce la zona del navegador, se pide sin ella
        // antes que dejar la cartelera vacía.
        if (!/timezone/i.test(e.message)) throw e;
        r = await api("fixtures", base, TTL.short);
      }
      setRows(r);
    } catch (e) {
      setErr(e.message);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [api, date, live]);

  const [edad, setEdad] = useState(null);
  useEffect(() => {
    load();
    // Con qué antigüedad se está mirando: la caché ahorra cuota, pero no
    // debe hacerte creer que un marcador de hace tres horas es de ahora.
    const mirar = () => {
      const base = live ? { live: "all" } : { date };
      const e = cacheEdad("fixtures", conTZ(base));
      setEdad(e !== null ? e : cacheEdad("fixtures", base));
    };
    const t = setInterval(mirar, 15000);
    mirar();
    return () => clearInterval(t);
  }, [load, live, date]);

  const refrescar = useCallback(() => {
    cacheOlvidar((k) => k.startsWith("fixtures?"));
    load();
  }, [load]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [live, load]);

  /* Una sola caja de búsqueda para todo: equipo, liga o país. Buscar por
     el nombre del equipo es como la gente encuentra su partido. */
  const grouped = useMemo(() => {
    if (!rows) return [];
    const t = q.trim().toLowerCase();
    const f = t
      ? rows.filter((r) =>
          `${r.teams.home.name} ${r.teams.away.name} ${r.league.name} ${r.league.country}`
            .toLowerCase().includes(t))
      : rows;
    // Filtros rápidos: lo que de verdad se busca en una cartelera de
    // trescientos partidos es "los míos" o "los de mis ligas".
    const pasa = (r) => {
      const st = r.fixture.status.short;
      if (filtro === "mios") return marcados.has(r.fixture.id);
      if (filtro === "favs") return favs.has(r.league.id);
      if (filtro === "vivos") return LIVE_STATES.includes(st);
      if (filtro === "pendientes") return !LIVE_STATES.includes(st) && !DONE_STATES.includes(st);
      return true;
    };
    const m = new Map();
    for (const r of f.filter(pasa)) {
      const k = r.league.id + "|" + r.league.name + "|" + r.league.country;
      if (!m.has(k)) m.set(k, { key: k, league: r.league, items: [], vivos: 0 });
      const g = m.get(k);
      g.items.push(r);
      if (LIVE_STATES.includes(r.fixture.status.short)) g.vivos++;
    }
    // Lo que está en juego primero, después tus ligas fijadas y por
    // último el orden alfabético por país.
    return [...m.values()]
      .map((g) => ({
        ...g,
        fav: favs.has(g.league.id),
        marcados: g.items.filter((f) => marcados.has(f.fixture.id)).length,
        items: g.items.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)),
      }))
      .sort((a, b) => (b.vivos > 0) - (a.vivos > 0) || b.fav - a.fav ||
        (a.league.country + a.league.name).localeCompare(b.league.country + b.league.name));
  }, [rows, q, favs, marcados, filtro]);

  /* Sugerencias mientras se escribe: equipos y ligas que coinciden, para
     no tener que escribir el nombre entero ni adivinar cómo lo llama la
     API. Tocar una la escribe entera y la lista de abajo hace el resto. */
  const sugerencias = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!rows || t.length < 2) return [];
    const vistos = new Set();
    const out = [];
    for (const r of rows) {
      for (const [tipo, nombre, sub] of [
        ["equipo", r.teams.home.name, r.league.name],
        ["equipo", r.teams.away.name, r.league.name],
        ["liga", r.league.name, r.league.country],
      ]) {
        const key = tipo + ":" + nombre;
        if (vistos.has(key) || !nombre.toLowerCase().includes(t)) continue;
        vistos.add(key);
        out.push({ tipo, nombre, sub, empieza: nombre.toLowerCase().startsWith(t) });
      }
    }
    return out
      .sort((a, b) => b.empieza - a.empieza || a.nombre.localeCompare(b.nombre))
      .slice(0, 6)
      .filter((s) => s.nombre.toLowerCase() !== t);
  }, [rows, q]);

  /* Vista por horas: la cartelera cronológica de todo el día, que es como
     se mira cuando lo que importa es a qué hora empieza cada cosa. */
  const porHora = useMemo(
    () => grouped.flatMap((g) => g.items).sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)),
    [grouped]
  );

  const total = grouped.reduce((a, g) => a + g.items.length, 0);
  const vivos = grouped.reduce((a, g) => a + g.vivos, 0);

  const shift = (n) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + n);
    setDate(isoDay(d));
    setLive(false);
  };

  // Tira de días alrededor del elegido: un clic en vez de un calendario.
  const dias = useMemo(() => {
    const hoy = isoDay(new Date());
    const centro = new Date(date + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(centro);
      d.setDate(d.getDate() + i - 2);
      const iso = isoDay(d);
      const diff = Math.round((new Date(iso + "T12:00:00") - new Date(hoy + "T12:00:00")) / 86400000);
      return {
        iso,
        dow: d.toLocaleDateString("es", { weekday: "short" }).replace(".", ""),
        num: d.getDate(),
        etiqueta: diff === 0 ? "Hoy" : diff === -1 ? "Ayer" : diff === 1 ? "Mañana" : null,
      };
    });
  }, [date]);

  const alternar = (k) =>
    setCerradas((s2) => {
      const n = new Set(s2);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  return (
    <PullToRefresh onRefresh={async () => { cacheOlvidar((k) => k.startsWith("fixtures?")); await load(); }}>
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">Partidos</h1>
          <p className="page-sub">
            Elige un día o mira lo que se está jugando ahora. Toca cualquier partido para abrir su
            análisis completo.
          </p>
        </div>
        <div className="toolbar">
          <div className="fx-search-wrap">
            <input
              className="input input-search"
              placeholder="Buscar equipo, liga o país"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setBuscando(true)}
              onBlur={() => setTimeout(() => setBuscando(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setBuscando(false); e.currentTarget.blur(); return; }
                if (e.key === "Enter" && q.trim()) {
                  setRecientes(recientesGuardar(q.trim()));
                  setBuscando(false);
                  e.currentTarget.blur();
                }
              }}
              role="combobox" aria-expanded={buscando && sugerencias.length > 0} aria-autocomplete="list"
            />
            {buscando && q.trim().length === 0 && recientes.length > 0 && (
              <div className="fx-sug" role="listbox">
                <div className="fx-sug-titulo">Búsquedas recientes</div>
                {recientes.map((r) => (
                  <button key={r} className="fx-sug-item" role="option"
                    onClick={() => { toque(); setQ(r); setRecientes(recientesGuardar(r)); setBuscando(false); }}>
                    <span className="fx-sug-tag">Reciente</span>
                    <span className="fx-sug-nombre">{r}</span>
                  </button>
                ))}
              </div>
            )}
            {buscando && sugerencias.length > 0 && (
              <div className="fx-sug" role="listbox">
                {sugerencias.map((s, i) => (
                  <button key={s.tipo + s.nombre} className="fx-sug-item" role="option"
                    onClick={() => {
                      toque(); setQ(s.nombre); setRecientes(recientesGuardar(s.nombre)); setBuscando(false);
                    }}>
                    <span className={"fx-sug-tag" + (s.tipo === "equipo" ? " fx-sug-tag-eq" : " fx-sug-tag-lg")}>
                      {s.tipo === "equipo" ? "Equipo" : "Liga"}
                    </span>
                    <span className="fx-sug-nombre">{s.nombre}</span>
                    <span className="fx-sug-sub">{s.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {q && (
            <button className="btn btn-quiet" onClick={() => setQ("")} aria-label="Limpiar búsqueda">
              Limpiar
            </button>
          )}
          <button
            className={"btn " + (live ? "btn-live-on" : "btn-ghost")}
            onClick={() => setLive((v) => !v)}
          >
            <span className="dot" /> En vivo
          </button>
        </div>
      </div>

      <div className="daybar">
        <button className="dayarrow" onClick={() => shift(-1)} aria-label="Día anterior">‹</button>
        <div className="daystrip">
          {dias.map((d) => (
            <button
              key={d.iso}
              className={"day" + (d.iso === date && !live ? " day-on" : "") + (d.etiqueta === "Hoy" ? " day-hoy" : "")}
              onClick={() => { setDate(d.iso); setLive(false); }}
            >
              <span className="day-dow">{d.etiqueta || d.dow}</span>
              <span className="mono day-num">{d.num}</span>
            </button>
          ))}
        </div>
        <button className="dayarrow" onClick={() => shift(1)} aria-label="Día siguiente">›</button>
        <input
          className="input input-date mono dayjump"
          type="date"
          value={date}
          aria-label="Ir a una fecha"
          onChange={(e) => { setDate(e.target.value); setLive(false); }}
        />
      </div>

      {err && <div className="alert">{err}</div>}
      {busy && !rows && <Skeleton filas={4} alto={104} />}

      {rows && (
        <div className="fx-filtros">
          <div className="seg">
            {[["todos", "Todos", total],
              ["mios", "Con selecciones", null],
              ["favs", "Mis ligas", null],
              ["vivos", "En juego", null],
              ["pendientes", "Sin empezar", null]].map(([k, l]) => (
              <button key={k} className={"segbtn" + (filtro === k ? " segbtn-on" : "")}
                onClick={() => setFiltro(k)}>{l}</button>
            ))}
          </div>
          <div className="seg fx-orden">
            {[["ligas", "Por liga"], ["hora", "Por hora"]].map(([k, l]) => (
              <button key={k} className={"segbtn" + (vistaLista === k ? " segbtn-on" : "")}
                onClick={() => setVistaLista(k)}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {rows && total > 0 && (
        <div className="fx-resumen">
          <span><b className="mono">{total}</b> partidos</span>
          <span><b className="mono">{grouped.length}</b> competiciones</span>
          {vivos > 0 && <span className="fx-vivos"><span className="dot" />{vivos} en juego</span>}
          {marcados.size > 0 && (
            <span className="fx-conmarca">
              <i className="fx-punto" />
              {[...marcados.keys()].filter((id) => grouped.some((g) => g.items.some((f) => f.fixture.id === id))).length} con selecciones
            </span>
          )}
          <span className="fx-frescura">
            {busy ? "actualizando…" : edad !== null && edad > 45000 ? `datos de ${hace(edad)}` : "datos al día"}
            <button className="btn btn-quiet" onClick={refrescar} disabled={busy}>Actualizar</button>
          </span>
          {q && <span className="fx-filtro">filtrando por “{q}”</span>}
        </div>
      )}

      {rows && grouped.length === 0 && !busy && (
        <Empty
          title={
            q ? `Nada coincide con “${q}”`
              : filtro === "mios" ? "Ningún partido de este día está en tu combinada"
              : filtro === "favs" ? "Ninguna de tus ligas fijadas juega este día"
              : filtro === "vivos" ? "Nada en juego ahora mismo"
              : filtro === "pendientes" ? "No queda nada por empezar este día"
              : live ? "Ningún partido en juego ahora mismo"
              : "No hay partidos ese día"
          }
          hint={
            q ? "Prueba con el nombre de un equipo, o borra la búsqueda para ver todo el día."
              : filtro !== "todos" ? "Quita el filtro para ver el día entero."
              : live ? "Vuelve a la vista por días para ver los que ya se jugaron o están por venir."
              : "Usa la tira de días o el calendario para moverte a otra fecha."
          }
        />
      )}

      {vistaLista === "hora" && porHora.length > 0 && (
        <section className="card lg-card">
          <div className="card-head">
            <h2 className="card-title">Todo el día, por hora</h2>
            <span className="card-note mono">{porHora.length}</span>
          </div>
          <div className="fx-list">
            {porHora.map((f) => (
              <FxRow key={f.fixture.id} f={f} n={marcados.get(f.fixture.id)} onOpen={onOpen} onTeam={onTeam}
                fav={favs.has(f.league.id)} onFijar={() => fijar(f.league.id)} liga />
            ))}
          </div>
        </section>
      )}

      {vistaLista === "ligas" && grouped.map((g) => {
        const abierta = !cerradas.has(g.key);
        return (
          <section key={g.key} className="card lg-card">
            <div className="card-head lg-toggle">
              <button className="lg-abrir" onClick={() => alternar(g.key)} aria-expanded={abierta}>
                <Crest src={g.league.logo} alt="" size={20} />
                <span className="lg-name">{g.league.name}</span>
                <span className="lg-country">{g.league.country}</span>
                {g.vivos > 0 && <span className="lg-vivo"><span className="dot" />{g.vivos}</span>}
                {g.marcados > 0 && (
                  <span className="lg-marca" title="partidos con selecciones tuyas">
                    <i className="fx-punto" />{g.marcados}
                  </span>
                )}
                <span className="lg-count mono">{g.items.length}</span>
                <span className={"lg-chev" + (abierta ? " lg-chev-on" : "")}>›</span>
              </button>
              <button className={"lg-fav" + (g.fav ? " lg-fav-on" : "")}
                onClick={() => fijar(g.league.id)} aria-pressed={g.fav}
                aria-label={g.fav ? "Quitar de fijadas" : "Fijar arriba"}
                title={g.fav ? "Quitar de fijadas" : "Fijar arriba"}>★</button>
            </div>
            {abierta && (
              <div className="fx-list">
                {g.items.map((f) => (
                  <FxRow key={f.fixture.id} f={f} n={marcados.get(f.fixture.id)} onOpen={onOpen} onTeam={onTeam}
                    fav={favs.has(g.league.id)} onFijar={() => fijar(g.league.id)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
    </PullToRefresh>
  );
}

