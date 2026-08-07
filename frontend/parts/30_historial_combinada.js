/* ============================================================
   COMBINADA — la pantalla
   Todo lo marcado, de todos los partidos, con la probabilidad de que
   se cumpla entero y el precio que paga cada selección por estar.
   ============================================================ */

const unaDeCada = (p) => {
  if (!(p > 0)) return "—";
  const n = 1 / p;
  return n >= 1e6 ? Math.round(n / 1e6).toLocaleString("es") + " millones"
    : n.toLocaleString("es", { maximumFractionDigits: 0 });
};
const cuotaJusta = (p) => (p > 1e-9 ? (1 / p).toLocaleString("es", { maximumFractionDigits: 2 }) : "—");
const diaCorto = (d) => (d ? new Date(d).toLocaleDateString("es", { day: "numeric", month: "short" }) : "");

/** La combinada en texto plano, para pegarla en una nota o mandarla. */
function textoCombinada(res, nombre) {
  const L = [];
  L.push(`${(nombre || "Combinada").toUpperCase()} · ${pc(res.p)} · cuota justa ${cuotaJusta(res.p)}`);
  L.push(`${res.nPicks} selecciones en ${res.nPartidos} partidos · 1 de cada ${unaDeCada(res.p)}`);
  res.grupos.forEach((g) => {
    if (!g.vivas.length) return;
    const d = g.partido || {};
    L.push("");
    L.push(`${d.home || "?"} — ${d.away || "?"}${d.date ? ` · ${diaCorto(d.date)} ${clock(d.date)}` : ""}`
      + `${g.conjunta && g.cuenta ? ` · ${pc(g.conjunta.p)}` : ""}${g.caducado ? " · ya empezó, fuera del total" : ""}`);
    g.vivas.forEach((p) => L.push(`  · ${p.mercado}: ${p.sel} — ${pc(p.p)}`));
  });
  L.push("");
  L.push("Probabilidades del modelo, no de ninguna casa de apuestas.");
  return L.join("\n");
}

async function alPortapapeles(txt) {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch (e) {
    // Sin permiso de portapapeles queda el truco de siempre.
    try {
      const ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e2) { return false; }
  }
}

/** Lo que ya se jugó, con tu acierto real al lado del que preveía el
    modelo. Calibración mide el modelo sobre ligas enteras; esto mide
    exactamente lo que tú eliges, que no tiene por qué comportarse igual. */
function Historial() {
  const [hist, setHist] = useState(null);

  useEffect(() => {
    let vivo = true;
    histRead().then((h) => { if (vivo) setHist(h); });
    return histOn((h) => setHist(h));
  }, []);

  const cal = useMemo(() => (hist ? calibraPropia(hist) : null), [hist]);

  if (!hist) return <Skeleton filas={2} alto={110} />;
  if (!hist.length)
    return (
      <Empty
        title="Todavía no has archivado ninguna combinada"
        hint="Cuando los partidos de un boleto se juegan, la combinada te deja resolverlo y guardarlo aquí con su resultado. A partir de unas cuantas selecciones verás si aciertas más o menos de lo que el modelo decía."
      />
    );

  const desvio = cal ? cal.acertadas / cal.n - cal.esperadas / cal.n : 0;
  const lectura = !cal ? "" : cal.n < 30
    ? "Con menos de treinta selecciones resueltas cualquier diferencia cabe dentro del azar. Es pronto para sacar conclusiones."
    : Math.abs(desvio) < 0.05
      ? "Aciertas prácticamente lo que el modelo preveía: sus porcentajes te están describiendo bien."
      : desvio < 0
        ? "Aciertas menos de lo previsto. O ha sido mala racha, o eliges mercados donde el modelo va sobrado de confianza; mira el desglose por familia."
        : "Aciertas más de lo previsto. Puede ser buena racha, o que elijas bien dentro de mercados donde el modelo se queda corto.";

  return (
    <>
      {cal && (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Tu acierto</h2>
            <span className="card-note">{cal.n} selecciones resueltas</span>
          </div>
          <div className="card-body">
            <div className="mets">
              <div className="met">
                <span className="metlab">Acierto real</span>
                <b className={"metval" + (cal.n >= 30 ? (desvio >= 0 ? " met-ok" : " met-bad") : "")}>
                  {pc(cal.acertadas / cal.n)}
                </b>
                <i className="metbase">{cal.acertadas} de {cal.n}</i>
              </div>
              <div className="met">
                <span className="metlab">Lo que decía el modelo</span>
                <b className="metval">{pc(cal.esperadas / cal.n)}</b>
                <i className="metbase">{fx(cal.esperadas, 1)} acertadas previstas</i>
              </div>
              <div className="met">
                <span className="metlab">Diferencia</span>
                <b className="metval">{desvio >= 0 ? "+" : ""}{fx(desvio * 100, 1)}</b>
                <i className="metbase">puntos porcentuales</i>
              </div>
              <div className="met">
                <span className="metlab">Brier</span>
                <b className={"metval" + (cal.brier < 0.25 ? " met-ok" : "")}>{fx(cal.brier, 3)}</b>
                <i className="metbase">0.25 es acertar a ciegas</i>
              </div>
            </div>
            <p className="foot">{lectura}</p>
          </div>
        </section>
      )}

      {cal && cal.combis > 0 && (
        <section className="card">
          <div className="card-head"><h2 className="card-title">Combinadas cerradas</h2></div>
          <div className="card-body">
            <p className="hist-frase">
              De <b>{cal.combis}</b> combinadas resueltas enteras salieron <b>{cal.combisOk}</b>.
              Sumando sus probabilidades, cabía esperar <b>{fx(cal.combisEsp, 1)}</b>.
            </p>
            <p className="foot" style={{ marginTop: 10 }}>
              Que casi todas fallen no dice nada malo del modelo: una combinada de varias patas
              falla casi siempre por construcción. Lo que importa es que las dos cuentas de arriba
              se parezcan.
            </p>
          </div>
        </section>
      )}

      {cal && cal.bins.length > 1 && (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Tu calibración</h2>
            <span className="card-note">de lo que marcas, no del modelo entero</span>
          </div>
          <div className="card-body card-flush">
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="tl">Probabilidad que tenían</th><th>Selecciones</th>
                    <th>Media prevista</th><th>Acertaron</th><th>Dif.</th>
                  </tr>
                </thead>
                <tbody>
                  {cal.bins.map((b) => {
                    const real = b.ok / b.n, esp = b.sp / b.n, d = real - esp;
                    return (
                      <tr key={b.a}>
                        <td className="tl mono">{pc0(b.a)} – {pc0(Math.min(1, b.b))}</td>
                        <td className="mono">{b.n}</td>
                        <td className="mono dim">{pc(esp)}</td>
                        <td className="mono">{pc(real)}</td>
                        <td className={"mono" + (b.n >= 10 ? (d >= 0 ? " rate-hi" : " rate-lo") : "")}>
                          {d >= 0 ? "+" : ""}{fx(d * 100, 1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {cal && cal.familias.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Por familia de mercado</h2>
            <span className="card-note">dónde te va mejor y peor</span>
          </div>
          <div className="card-body card-flush">
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="tl">Familia</th><th>Resueltas</th><th>Aciertos</th>
                    <th>Real</th><th>Modelo</th><th>Dif.</th>
                  </tr>
                </thead>
                <tbody>
                  {cal.familias.map((f) => {
                    const real = f.ok / f.n, esp = f.sp / f.n, d = real - esp;
                    return (
                      <tr key={f.fam}>
                        <td className="tl">{f.fam}</td>
                        <td className="mono">{f.n}</td>
                        <td className="mono">{f.ok}</td>
                        <td className="mono">{pc(real)}</td>
                        <td className="mono dim">{pc(esp)}</td>
                        <td className={"mono" + (f.n >= 12 ? (d >= 0 ? " rate-hi" : " rate-lo") : "")}>
                          {d >= 0 ? "+" : ""}{fx(d * 100, 1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Combinadas archivadas</h2>
          <button className="btn btn-quiet" onClick={async () => {
            const previo = await histRead();
            await histWrite([]);
            undoOfrecer([], `Vaciado el historial (${previo.length} combinadas)`,
              async () => { await histWrite(previo); });
          }}>Vaciar historial</button>
        </div>
        <div className="card-body card-flush">
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="tl">Combinada</th><th>Archivada</th><th>Probabilidad</th>
                  <th>Aciertos</th><th>Salió</th><th />
                </tr>
              </thead>
              <tbody>
                {hist.map((h) => {
                  const res = (h.picks || []).filter((p) => p.res === "ok" || p.res === "no");
                  return (
                    <tr key={h.id}>
                      <td className="tl">{h.nombre}</td>
                      <td className="mono dim">
                        {new Date(h.fecha).toLocaleDateString("es", { day: "numeric", month: "short" })}
                      </td>
                      <td className="mono">{fin(h.p) ? pc(h.p) : "—"}</td>
                      <td className="mono">{res.filter((p) => p.res === "ok").length}/{h.n}</td>
                      <td className={h.resultado === "ok" ? "rate-hi" : h.resultado === "no" ? "rate-lo" : "dim"}>
                        {h.resultado === "ok" ? "sí" : h.resultado === "no" ? "no" : "parcial"}
                      </td>
                      <td>
                        <button className="btn btn-quiet" onClick={async () => {
                          const previo = await histRead();
                          await histWrite(previo.filter((x) => x.id !== h.id));
                          undoOfrecer([], `Borrada “${h.nombre}” del historial`,
                            async () => { await histWrite(previo); });
                        }}>Quitar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <p className="foot foot-page">
        Solo cuentan las selecciones que se pueden comprobar. Las de goles salen del marcador y
        las de jugador de sus estadísticas del partido; córners y tarjetas quedan sin resolver en
        vez de darse por buenas.
      </p>
    </>
  );
}

/** Dos variantes del mismo boleto, pata por pata. Los chips ya daban el
    total de cada uno; esto enseña en qué se diferencian. */
function Comparar({ bol, onClose }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const out = [];
      for (const b of bol.lista) {
        const l = await slipRead(b.id);
        if (!vivo) return;
        let r = null;
        try { r = l.length ? combinada(l) : null; } catch (e) { r = null; }
        out.push({ ...b, picks: l.filter((x) => !x.off), total: r ? r.p : null, n: r ? r.nPicks : 0 });
      }
      if (vivo) setDatos(out);
    })();
    return () => { vivo = false; };
  }, [bol]);

  const filas = useMemo(() => {
    if (!datos) return [];
    const m = new Map();
    datos.forEach((b) => b.picks.forEach((p) => {
      if (!m.has(p.key)) m.set(p.key, { key: p.key, pick: p, en: new Set() });
      m.get(p.key).en.add(b.id);
    }));
    return [...m.values()].sort((a, b) => {
      const da = a.en.size === datos.length, db = b.en.size === datos.length;
      return da - db || String(a.pick.mercado).localeCompare(String(b.pick.mercado));
    });
  }, [datos]);

  const comunes = filas.filter((f) => datos && f.en.size === datos.length).length;

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal modal-ancho" role="dialog" aria-label="Comparar boletos"
        onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2 className="card-title">Comparar boletos</h2>
          <button className="cb-x" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="card-body modal-scroll">
          {!datos ? <Skeleton filas={2} alto={70} /> : (
            <>
              <div className="tablewrap">
                <table className="table cmp-tabla">
                  <thead>
                    <tr>
                      <th className="tl">Selección</th>
                      {datos.map((b) => <th key={b.id}>{b.nombre}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.key} className={f.en.size === datos.length ? "" : "cmp-difiere"}>
                        <td className="tl">
                          <b>{f.pick.mercado}</b>
                          <span className="dim"> · {f.pick.sel}</span>
                        </td>
                        {datos.map((b) => (
                          <td key={b.id} className="mono">
                            {f.en.has(b.id) ? <span className="cmp-si">●</span> : <span className="cmp-no">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="tl"><b>Se cumple todo</b></td>
                      {datos.map((b) => (
                        <td key={b.id} className="mono cmp-total">
                          {b.total !== null && b.n ? pc(b.total) : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="tl dim">Selecciones</td>
                      {datos.map((b) => <td key={b.id} className="mono dim">{b.n}</td>)}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="foot">
                {comunes} {comunes === 1 ? "selección común" : "selecciones comunes"} y{" "}
                {filas.length - comunes} en las que se separan, resaltadas. Las probabilidades
                de abajo no se pueden sumar ni restar entre columnas: cada boleto es un suceso
                distinto.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Combinada({ api, onOpen }) {
  const [lista, setLista] = useState(null);
  const [bol, setBol] = useState(null);
  const [totales, setTotales] = useState({});
  const [renombrando, setRenombrando] = useState(null);
  const [abriendo, setAbriendo] = useState(null);
  const [err, setErr] = useState(null);
  const [foco, setFoco] = useState(null);
  const [sug, setSug] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [viejos, setViejos] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [vista, setVista] = useState("actual");
  const [comparar, setComparar] = useState(false);
  const [resueltos, setResueltos] = useState({});
  const [resolviendo, setResolviendo] = useState(false);

  useEffect(() => {
    let vivo = true;
    slipRead().then((l) => { if (vivo) setLista(l); });
    bolRead().then((b) => { if (vivo) setBol(b); });
    const offS = slipOn((l) => setLista(l));
    const offB = bolOn((b) => setBol(b ? { ...b } : b));
    return () => { vivo = false; offS(); offB(); };
  }, []);

  /* El resumen de los demás boletos se calcula aparte para poder
     compararlos sin salir de aquí. */
  useEffect(() => {
    if (!bol) return;
    let vivo = true;
    (async () => {
      const out = {};
      for (const b of bol.lista) {
        const l = b.id === bol.activo ? lista : await slipRead(b.id);
        if (!vivo) return;
        try {
          const r = l && l.length ? combinada(l) : null;
          out[b.id] = r ? { p: r.p, n: r.nPicks } : { p: null, n: 0 };
        } catch (e) { out[b.id] = { p: null, n: 0 }; }
      }
      if (vivo) setTotales(out);
    })();
    return () => { vivo = false; };
  }, [bol, lista]);

  /* Resolver un partido jugado: el marcador pasa por el mismo predicado
     con el que se calculó su probabilidad, y las props por las
     estadísticas reales del jugador. */
  const resolver = useCallback(async (gs) => {
    setResolviendo(true);
    const out = {};
    for (const g of gs) {
      try { out[g.fx] = await resolverGrupo(api, g); }
      catch (e) { out[g.fx] = { error: e.message }; }
    }
    setResueltos((r) => ({ ...r, ...out }));
    setResolviendo(false);
    return out;
  }, [api]);

  const guardar = async (l, deshacer) => {
    setSug(null);
    if (deshacer && lista) undoOfrecer(lista, deshacer);
    await slipWrite(l);
  };

  const res = useMemo(
    () => (lista && lista.length ? combinada(lista, { viejos }) : null),
    [lista, viejos]
  );
  const links = useMemo(() => (res && res.p > 0 ? cadena(res) : []), [res]);
  const grupos = res?.grupos || [];
  const nombreActivo = bol?.lista.find((x) => x.id === bol.activo)?.nombre || "Combinada";

  /* A veces no hay cambio que salve la combinada y lo honesto es quitar
     algo. La selección más cara ya está medida: es la que más sube el
     total al salir. */
  const peor = useMemo(() => {
    if (!res || res.nPicks < 2) return null;
    let cara = null;
    res.grupos.forEach((g) => g.vivas.forEach((p) => {
      if (fin(p.sinEsta) && (!cara || p.sinEsta > cara.sinEsta)) cara = p;
    }));
    return cara && cara.sinEsta > res.p * 1.15 ? cara : null;
  }, [res]);

  const quitarPick = (id) => {
    const p = (lista || []).find((x) => x.id === id);
    guardar((lista || []).filter((x) => x.id !== id), p ? `Quitada: ${p.sel}` : "Selección quitada");
  };
  const quitarPartido = (fx, n) =>
    guardar((lista || []).filter((x) => x.fx !== fx), `Quitado un partido (${n} ${n === 1 ? "selección" : "selecciones"})`);
  /* Archivar ya no es tirar: se resuelve contra el resultado real y se
     guarda, para poder mirar después si aciertas lo que el modelo decía. */
  const archivarViejos = async () => {
    const viejosG = grupos.filter((g) => g.caducado);
    if (!viejosG.length) return;
    const nuevos = await resolver(viejosG.filter((g) => !resueltos[g.fx]));
    const todos = { ...resueltos, ...nuevos };
    const fuera = new Set(viejosG.map((g) => g.fx));

    /* La ficha guarda cada selección con lo que le pasó de verdad. */
    const marcados = {
      ...res,
      grupos: viejosG.map((g) => {
        const r = todos[g.fx];
        return {
          ...g,
          picks: g.picks.map((p) => ({
            ...p,
            res: r && r.res ? r.res[p.id] || "?" : "?",
            marcador: r && r.marcador ? `${r.marcador[0]}-${r.marcador[1]}` : null,
          })),
        };
      }),
    };
    await histGuardar(fichaHistorial(nombreActivo, marcados, lista));
    guardar((lista || []).filter((x) => !fuera.has(x.fx)),
      `Archivados ${fuera.size} ${fuera.size === 1 ? "partido" : "partidos"} en el historial`);
  };

  const alternar = (id) => guardar((lista || []).map((x) => (x.id === id ? { ...x, off: !x.off } : x)));
  const encenderTodo = () => guardar((lista || []).map((x) => ({ ...x, off: false })));
  const vaciar = () => guardar([], `Vaciada “${nombreActivo}” (${(lista || []).length} selecciones)`);

  const aplicar = (s) => guardar((lista || []).map((x) => (x.id === s.pick.id
    ? {
      ...x, id: slipId(x.fx, s.alt.key), key: s.alt.key, fam: s.alt.fam,
      mercado: s.alt.mercado, sel: s.alt.sel, p: s.alt.p,
      nota: s.alt.nota, simRef: s.alt.simRef, ts: Date.now(),
    }
    : x)), `Cambiada: ${s.pick.sel} → ${s.alt.sel}`);

  /* Borrar un boleto entero se lleva sus selecciones del disco, así que
     se guarda una copia para poder rehacerlo si el clic fue un desliz. */
  async function borrarBoleto(b) {
    const picks = await slipRead(b.id);
    const ficha = { ...b };
    await bolBorrar(b.id);
    undoOfrecer([], `Borrado el boleto “${b.nombre}”`, async () => {
      const actual = await bolRead();
      if (!actual.lista.some((x) => x.id === ficha.id)) {
        await bolWrite({ activo: ficha.id, lista: [...actual.lista, ficha] });
      } else {
        await bolActivar(ficha.id);
      }
      await slipWrite(picks, ficha.id);
      slipEmit(picks);
    });
  }

  function buscarCambios() {
    if (!res) return;
    setBuscando(true);
    setTimeout(() => {
      try { setSug(sugerirCambios(res)); } catch (e) { setSug([]); }
      setBuscando(false);
    }, 20);
  }

  async function copiar() {
    if (!res) return;
    const ok = await alPortapapeles(textoCombinada(res, nombreActivo));
    setErr(ok ? null : "No he podido acceder al portapapeles.");
    if (ok) {
      setCopiado(true);
      avisar("Combinada copiada al portapapeles");
      setTimeout(() => setCopiado(false), 2200);
    }
  }

  async function abrir(fx) {
    setAbriendo(fx); setErr(null);
    try {
      const r = await api("fixtures", { id: fx }, TTL.short);
      if (r?.[0]) onOpen(r[0]);
      else setErr("Ese partido ya no está en la API. Puedes quitarlo de la combinada.");
    } catch (e) { setErr(e.message); }
    finally { setAbriendo(null); }
  }

  if (!lista) return <div className="page"><Skeleton filas={3} alto={110} /></div>;

  const vacio = !res || !res.grupos.length;
  const enFoco = foco ? links.find((l) => l.id === foco) : null;

  /* ---------- selector de boletos ---------- */
  const barraBoletos = bol && (
    <div className="bol-bar">
      {bol.lista.map((b) => {
        const t = totales[b.id];
        const activo = b.id === bol.activo;
        if (activo && renombrando === b.id) {
          return (
            <input
              key={b.id} className="input bol-input" autoFocus defaultValue={b.nombre}
              onBlur={(e) => { bolRenombrar(b.id, e.target.value); setRenombrando(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.target.blur();
                if (e.key === "Escape") setRenombrando(null);
              }}
            />
          );
        }
        return (
          <span className={"bolchip" + (activo ? " bolchip-on" : "")} key={b.id}>
            <button className="bolchip-go" onClick={() => (activo ? setRenombrando(b.id) : bolActivar(b.id))}
              title={activo ? "Tocar para renombrar" : "Cambiar a este boleto"}>
              <span className="bolchip-nom">{b.nombre}</span>
              <i className="mono bolchip-p">
                {t ? (t.n ? pc0(t.p) : "vacío") : "…"}
              </i>
            </button>
            {activo && bol.lista.length > 1 && (
              <button className="bolchip-x" aria-label="Borrar este boleto"
                onClick={() => borrarBoleto(b)}>×</button>
            )}
          </span>
        );
      })}
      <button className="btn btn-quiet"
        onClick={async () => { await bolNuevo(); avisar("Boleto nuevo creado"); }}>+ Nuevo</button>
      {!vacio && <button className="btn btn-quiet"
        onClick={async () => { await bolDuplicar(); avisar("Boleto duplicado: ya puedes cambiarlo sin tocar el original"); }}>Duplicar</button>}
      {bol.lista.length > 1 && (
        <button className="btn btn-quiet" onClick={() => setComparar(true)}>Comparar</button>
      )}
    </div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">Combinada</h1>
          <p className="page-sub">
            Lo marcado en cualquier partido, junto. Dentro de un mismo encuentro la probabilidad
            tiene en cuenta la correlación; entre partidos distintos se multiplica.
          </p>
        </div>
        {!vacio && (
          <div className="toolbar">
            {res.nApagadas > 0 && (
              <button className="btn btn-quiet" onClick={encenderTodo}>
                Reactivar {res.nApagadas}
              </button>
            )}
            <button className="btn btn-quiet" onClick={copiar}>
              {copiado ? "Copiado ✓" : "Copiar"}
            </button>
            <button className="btn btn-quiet" onClick={() => downloadText(
              "combinada.csv",
              toCSV(grupos.flatMap((g) => g.picks.map((p) => ({ ...p, g }))), [
                ["fecha", (r) => r.g.partido?.date || ""],
                ["competicion", (r) => r.g.partido?.liga || ""],
                ["local", (r) => r.g.partido?.home || ""],
                ["visitante", (r) => r.g.partido?.away || ""],
                ["familia", (r) => r.fam], ["mercado", (r) => r.mercado],
                ["seleccion", (r) => r.sel],
                ["activa", (r) => (r.off ? "no" : "si")],
                ["ya_empezo", (r) => (r.g.caducado ? "si" : "no")],
                ["probabilidad", (r) => (fin(r.p) ? Number(r.p).toFixed(4) : "")],
                ["conjunta_partido", (r) => (r.g.conjunta ? Number(r.g.conjunta.p).toFixed(4) : "")],
                ["combinada_sin_esta", (r) => (fin(r.sinEsta) ? Number(r.sinEsta).toFixed(4) : "")],
              ]))}>CSV</button>
            <button className="btn btn-ghost" onClick={vaciar}>Vaciar</button>
          </div>
        )}
      </div>

      <div className="vistas">
        <button className={"segbtn" + (vista === "actual" ? " segbtn-on" : "")}
          onClick={() => setVista("actual")}>Combinada</button>
        <button className={"segbtn" + (vista === "historial" ? " segbtn-on" : "")}
          onClick={() => setVista("historial")}>Historial</button>
      </div>

      {vista === "historial" ? <Historial /> : (
      <>
      {barraBoletos}

      {err && <div className="alert">{err}</div>}

      {vacio ? (
        <Empty
          title={`“${nombreActivo}” está vacía`}
          hint="Abre un partido, entra en Mercados y toca el + de lo que quieras estudiar. Puedes mezclar selecciones de partidos distintos: aquí verás la probabilidad de que se cumpla todo."
        />
      ) : (
        <>
          {/* ---------- partidos que ya empezaron ---------- */}
          {res.caducados > 0 && (
            <div className="cb-viejos">
              <span className="cb-viejos-txt">
                <b>{res.caducados} {res.caducados === 1 ? "partido ya empezó" : "partidos ya empezaron"}.</b>{" "}
                {viejos
                  ? "Están contando en el total, pero su probabilidad es la de antes del pitido inicial."
                  : "Quedan fuera del total: un modelo de previa ya no dice nada útil de ellos."}
              </span>
              <button className="btn btn-quiet" onClick={() => setViejos((v) => !v)}>
                {viejos ? "Dejarlos fuera" : "Contarlos igualmente"}
              </button>
              <button className="btn btn-quiet" onClick={archivarViejos}>Archivar en el historial</button>
            </div>
          )}

          {/* ---------- el número ---------- */}
          <section className="card cb-total">
            <div className="cb-cifra" aria-live="polite">
              <span className="cb-eyebrow">{nombreActivo}</span>
              <b className="mono cb-p">
                {res.nPicks === 0 ? "—" : res.incompatible ? "0%"
                  : res.p < 0.0001 ? "<0.01%" : pc(res.p)}
              </b>
              <span className="cb-sub">
                {res.nPicks === 0
                  ? (res.caducados > 0
                    ? "todo lo que queda son partidos ya jugados"
                    : "no hay ninguna selección activa: enciende alguna abajo")
                  : res.incompatible
                  ? "hay selecciones que no pueden darse a la vez"
                  : `1 de cada ${unaDeCada(res.p)} veces`}
              </span>
            </div>
            <div className="cb-datos">
              <div className="cb-dato">
                <span>Selecciones</span>
                <b className="mono">{res.nPicks}</b>
                <i>{res.nPartidos} {res.nPartidos === 1 ? "partido" : "partidos"}</i>
              </div>
              <div className="cb-dato">
                <span><Term id="cuota">Cuota equivalente</Term></span>
                <b className="mono">{res.incompatible || !res.nPicks ? "—" : cuotaJusta(res.p)}</b>
                <i>la que igualaría a esta probabilidad</i>
              </div>
              <div className="cb-dato">
                <span><Term id="ingenua">Multiplicando suelto</Term></span>
                <b className="mono cb-dim">{pc(res.ingenua)}</b>
                <i>
                  {Math.abs(res.p - res.ingenua) / Math.max(1e-9, res.ingenua) > 0.03
                    ? `la correlación mueve ${res.p > res.ingenua ? "+" : ""}${fx((res.p - res.ingenua) * 100, 2)} puntos`
                    : "aquí apenas se solapan"}
                </i>
              </div>
              {res.simulada && (
                <div className="cb-dato">
                  <span>Método</span>
                  <b className="mono">simulación</b>
                  <i>hay props de jugador: se simula el partido entero</i>
                </div>
              )}
            </div>
          </section>

          {/* ---------- la cadena ---------- */}
          {links.length > 1 && (
            <section className="card cb-cadena-card">
              <div className="card-head">
                <h2 className="card-title"><Term id="cadena">La cadena</Term></h2>
                <span className="card-note">cada tramo es lo que esa selección le quita</span>
              </div>
              <div className="card-body">
                <div className="cb-track" role="list">
                  {links.map((l, i) => (
                    <button
                      key={l.id}
                      role="listitem"
                      className={"cb-link" + (foco === l.id ? " cb-link-on" : "")}
                      style={{ flexGrow: Math.max(0.04, l.cuota) }}
                      onClick={() => setFoco(foco === l.id ? null : l.id)}
                    >
                      <span className="mono cb-link-n">{i + 1}</span>
                      {/* El título del navegador tarda un segundo largo en
                          salir; con tramos estrechos no sirve de nada. */}
                      <span className="cb-tip" role="tooltip">
                        <b>{l.pick.mercado}</b>
                        {l.pick.sel}
                        <i className="mono">{pc(l.cond)} una vez dadas las anteriores</i>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="cb-escala">
                  <span>100%</span>
                  <span className="mono">{pc(res.p)}</span>
                </div>

                {/* Cuánto pesa cada partido dentro del total: la suma de
                    los tramos de sus selecciones. */}
                {res.nPartidos > 1 && (() => {
                  const peso = new Map();
                  links.forEach((l) => peso.set(l.fx, (peso.get(l.fx) || 0) + l.cuota));
                  return (
                    <div className="cb-aporte">
                      {[...peso.entries()].sort((a, b) => b[1] - a[1]).map(([fx, w]) => {
                        const g = grupos.find((x) => x.fx === fx);
                        const d = g?.partido || {};
                        return (
                          <div className="cb-aporte-fila" key={fx}>
                            <span className="cb-aporte-eq">{d.home} — {d.away}</span>
                            <span className="cb-aporte-barra">
                              <i style={{ width: clamp(w * 100, 2, 100) + "%" }} />
                            </span>
                            <span className="mono cb-aporte-n">{pc0(w)}</span>
                            <span className="mono cb-aporte-p">{g?.conjunta ? pc(g.conjunta.p) : "—"}</span>
                          </div>
                        );
                      })}
                      <p className="foot" style={{ marginTop: 8 }}>
                        A la izquierda, qué parte de la dificultad pone cada partido; a la derecha,
                        la probabilidad de que salga todo lo suyo.
                      </p>
                    </div>
                  );
                })()}
                {enFoco ? (
                  <div className="cb-foco">
                    <span className="cb-foco-tag">{enFoco.pick.fam}</span>
                    <span className="cb-foco-sel">
                      <b>{enFoco.pick.mercado}</b> · {enFoco.pick.sel}
                    </span>
                    <span className="cb-foco-num mono">{pc(enFoco.cond)}</span>
                    <span className="cb-foco-nota">
                      es lo que multiplica una vez dado lo anterior del mismo partido.
                      Hasta aquí la combinada va por {pc(enFoco.acumulada)}.
                    </span>
                  </div>
                ) : (
                  <p className="foot" style={{ marginTop: 12 }}>
                    Multiplicar probabilidades es sumar sus logaritmos, así que los tramos suman
                    exactamente la combinada. El más ancho es el que más pesa: toca cualquiera.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ---------- partido a partido ---------- */}
          {grupos.map((g) => {
            const d = g.partido || {};
            const pj = g.conjunta && fin(g.conjunta.p) ? g.conjunta.p : null;
            const jugado = g.caducado ? resueltos[g.fx] : null;
            const marc = jugado && jugado.marcador ? jugado.marcador : null;
            return (
              <section className={"card cb-match" + (g.caducado && !viejos ? " cb-match-viejo" : "")} key={g.fx}>
                <div className="card-head cb-match-head">
                  <div className="cb-match-id">
                    <span className="cb-match-eq">{d.home || "?"} <i>—</i> {d.away || "?"}</span>
                    <span className="cb-match-meta">
                      {d.liga || "competición desconocida"}
                      {d.date ? ` · ${diaCorto(d.date)} · ${clock(d.date)}` : ""}
                    </span>
                  </div>
                  {d.conf && (
                    <span className={"conf conf-" + d.conf.level} title={d.conf.hint}>
                      <i /><i /><i />
                      <Term id="conf">{d.conf.level}</Term>
                    </span>
                  )}
                  {g.caducado && (marc ? (() => {
                    const v = veredicto(g.picks.map((p) => ({ ...p, res: jugado.res[p.id] })));
                    return (
                      <span className={"cb-sello cb-sello-fin"
                        + (v === "ok" ? " cb-sello-ok" : v === "no" ? " cb-sello-mal" : "")}>
                        acabó {marc[0]}-{marc[1]}
                        {v === "ok" ? " · salió" : v === "no" ? " · falló" : ""}
                      </span>
                    );
                  })() : (
                    <span className={"cb-sello" + (viejos ? " cb-sello-on" : "")}>
                      {jugado && jugado.error ? "no se pudo resolver" : "ya empezó · fuera"}
                    </span>
                  ))}
                  {g.caducado && !jugado && (
                    <button className="btn btn-quiet" disabled={resolviendo}
                      onClick={() => resolver([g])}>
                      {resolviendo ? "Resolviendo…" : "Resolver"}
                    </button>
                  )}
                  {pj !== null && (
                    <span className={"cb-match-p mono" + (pj < 1e-9 ? " cb-match-p-mal" : "")}
                      title="Probabilidad de que se cumpla todo lo de este partido">
                      {pj < 1e-9 ? "imposible" : pc(pj)}
                    </span>
                  )}
                  <button className="btn btn-quiet" disabled={abriendo === g.fx}
                    onClick={() => abrir(g.fx)}>
                    {abriendo === g.fx ? "Abriendo…" : "Abrir"}
                  </button>
                  <button className="cb-x" aria-label="Quitar este partido"
                    onClick={() => quitarPartido(g.fx, g.picks.length)}>×</button>
                </div>

                <div className="cb-picks">
                  {g.picks.map((p, i) => {
                    const sube = fin(p.sinEsta) && res.p > 0 ? p.sinEsta - res.p : null;
                    const ok = jugado && jugado.res ? jugado.res[p.id] : null;
                    return (
                      <div className={"cb-pick" + (p.off ? " cb-pick-off" : "")
                        + (ok === "ok" ? " cb-pick-ok" : ok === "no" ? " cb-pick-mal" : "")} key={p.id}>
                        <button
                          className={"cb-sw" + (p.off ? "" : " cb-sw-on")}
                          onClick={() => alternar(p.id)}
                          aria-pressed={!p.off}
                          title={p.off ? "Volver a contarla" : "Dejarla fuera del cálculo sin borrarla"}
                        />
                        <span className="cb-pick-fam">{p.fam}</span>
                        <span className="cb-pick-sel">
                          <b>{p.mercado}</b>
                          <span>{p.sel}{p.nota ? ` · ${p.nota}` : ""}</span>
                        </span>
                        <span className="cb-pick-p">
                          <b className="mono">{pc(p.p)}</b>
                          <ProbBar p={p.p} tone={p.p >= 0.6 ? "pfill-hi" : ""} />
                        </span>
                        <span className="cb-pick-coste mono">
                          {jugado && jugado.res
                            ? (ok === "ok" ? <b className="cb-ok">✓ salió</b>
                              : ok === "no" ? <b className="cb-mal">✗ falló</b>
                              : <span className="dim">sin resolver</span>)
                            : p.off ? "fuera"
                            : sube !== null && sube > 0.0005 ? `sin ella ${pc(p.sinEsta)}` : "—"}
                        </span>
                        <button className="cb-x" aria-label="Quitar esta selección"
                          onClick={() => quitarPick(p.id)}>×</button>
                      </div>
                    );
                  })}
                </div>

                {jugado && jugado.error && (
                  <div className="cb-match-pie">{jugado.error}</div>
                )}
                {jugado && jugado.res && g.picks.some((p) => jugado.res[p.id] === "?") && (
                  <div className="cb-match-pie">
                    Alguna selección se queda sin resolver: los córners y las tarjetas no guardan
                    con qué condición se calcularon, y prefiero dejarlas en blanco antes que darlas
                    por buenas.
                  </div>
                )}
                {!jugado && g.conjunta && g.vivas.length > 1 && (
                  <div className="cb-match-pie">
                    {g.conjunta.modo === "exacta"
                      ? `Conjunta exacta sobre la matriz de marcadores. Multiplicando los porcentajes por separado saldría ${pc(g.conjunta.ingenua)}.`
                      : g.conjunta.modo === "simulada"
                        ? `Simulada con ${(g.conjunta.sims || 0).toLocaleString("es")} partidos, porque hay selecciones de jugador. Multiplicando suelto saldría ${pc(g.conjunta.ingenua)}.`
                        : `Los mercados de goles van exactos; córners, tarjetas y jugadores se multiplican aparte. Suelto saldría ${pc(g.conjunta.ingenua)}.`}
                  </div>
                )}
              </section>
            );
          })}

          {/* ---------- cambios sugeridos ---------- */}
          {res.nPicks > 0 && (
          <section className="card cb-sug">
            <div className="card-head">
              <h2 className="card-title">Cambios que suben la combinada</h2>
              <button className="btn btn-quiet" onClick={buscarCambios} disabled={buscando}>
                {buscando ? "Probando variantes…" : sug ? "Volver a buscar" : "Buscar"}
              </button>
            </div>
            <div className="card-body">
              {peor && (
                <div className="cb-quitar">
                  <div className="cb-quitar-txt">
                    <span className="cb-swap-tag"><Term id="coste">la pata más cara</Term></span>
                    <b>{peor.mercado} · {peor.sel}</b>
                    <span>
                      quitarla deja la combinada en <i className="mono">{pc(peor.sinEsta)}</i>,
                      desde {pc(res.p)}
                    </span>
                  </div>
                  <button className="btn btn-quiet" onClick={() => quitarPick(peor.id)}>Quitar</button>
                </div>
              )}
              {!sug && !buscando && (
                <p className="foot" style={{ marginTop: peor ? 14 : 0 }}>
                  Busca los mercados <Term id="implicado"><b>implicados</b></Term> por cada selección: los que se cumplen siempre
                  que ella se cumple, así que son la misma apuesta más floja. Se propone el escalón
                  más corto que ya mueva la combinada, uno por familia.
                </p>
              )}
              {sug && sug.length === 0 && (
                <p className="foot" style={{ marginTop: peor ? 14 : 0 }}>
                  Ninguna selección tiene un mercado implicado que suba la combinada de forma
                  apreciable. Para subirla hay que quitar patas, no cambiarlas.
                </p>
              )}
              {sug && sug.length > 0 && (
                <div className="cb-swaps">
                  {sug.map((s) => (
                    <div className="cb-swap" key={s.pick.id}>
                      <div className="cb-swap-de">
                        <span className="cb-swap-tag">ahora</span>
                        <b>{s.pick.mercado}</b>
                        <span>{s.pick.sel}</span>
                        <i className="mono">{pc(s.pick.p)}</i>
                      </div>
                      <span className="cb-swap-flecha">→</span>
                      <div className="cb-swap-a">
                        <span className="cb-swap-tag">cambio</span>
                        <b>{s.alt.mercado}</b>
                        <span>{s.alt.sel}</span>
                        <i className="mono">
                          {pc(s.alt.p)}
                          {s.alt.asiatico && <em className="cb-swap-nota">neto de devolución</em>}
                        </i>
                      </div>
                      <div className="cb-swap-res">
                        <b className="mono">{pc(s.total)}</b>
                        <span>desde {pc(res.p)}</span>
                      </div>
                      <button className="btn btn-primary cb-swap-btn" onClick={() => aplicar(s)}>
                        Cambiar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
          )}

          <p className="foot foot-page">
            Estas probabilidades salen del modelo, no de ninguna casa de apuestas, y sirven para
            comparar tus propias selecciones entre sí. Una combinada baja no es buena ni mala: solo
            dice cuántas veces saldría. Cada selección que añades multiplica, nunca suma.
          </p>
        </>
      )}
      </>
      )}

      {comparar && bol && <Comparar bol={bol} onClose={() => setComparar(false)} />}
    </div>
  );
}

