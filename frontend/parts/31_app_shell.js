/* ============================================================
   Iconos de navegación
   Cuatro trazos, ninguno decorativo: la cartelera es una lista de
   partidos, la competición una tabla, la combinada dos eslabones y
   la calibración una diana.
   ============================================================ */
function Ico({ name }) {
  const p = {
    fixtures: <><rect x="2.5" y="3.5" width="13" height="11" rx="2" /><path d="M2.5 7h13M6 3v-1.5M12 3v-1.5" /></>,
    league: <><path d="M3 4.5h11M3 9h7.5M3 13.5h9.5" /></>,
    combinada: <><rect x="1.8" y="5.6" width="8.2" height="6.8" rx="3.4" /><rect x="8" y="3.6" width="8.2" height="6.8" rx="3.4" /></>,
    calibracion: <><circle cx="9" cy="9" r="6" /><circle cx="9" cy="9" r="2" /><path d="M9 1.6v2M9 14.4v2M1.6 9h2M14.4 9h2" /></>,
  }[name];
  return (
    <svg className="ico" viewBox="0 0 18 18" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p}
    </svg>
  );
}

/* La combinada no vive aquí: es la acción central acoplada en la
   barra inferior (ver FAB_SECCION), no una pestaña más. */
const SECCIONES = [
  ["fixtures", "Cartelera"],
  ["league", "Competición"],
  ["calibracion", "Calibración"],
];
const FAB_SECCION = ["combinada", "Combinada"];

/* ============================================================
   Glosario
   La jerga se explica donde aparece, no en un manual aparte: si una
   palabra necesita explicación, se toca y se lee ahí mismo.
   ============================================================ */
const GLOSARIO = {
  conjunta: ["Probabilidad conjunta",
    "Que se cumplan todas las selecciones a la vez. Dentro de un mismo partido no es multiplicar: si el local gana, es más probable que se hayan marcado goles, y eso sube la conjunta."],
  cuota: ["Cuota equivalente",
    "La cuota que igualaría exactamente a esa probabilidad: uno dividido entre ella. Sirve para comparar con lo que ofrezca una casa; no es una recomendación."],
  ingenua: ["Multiplicando suelto",
    "Lo que saldría multiplicando los porcentajes uno a uno, como si cada selección fuera independiente. Dentro de un partido casi nunca lo son."],
  cadena: ["La cadena",
    "Cada selección dibujada como un tramo proporcional a lo que le quita a la combinada. Multiplicar es sumar logaritmos, así que los tramos suman el total exacto."],
  implicado: ["Mercado implicado",
    "Uno que se cumple siempre que se cumple el tuyo: si el equipo gana 2-0, también se cumple “gana o empata”. Es la misma apuesta, más floja."],
  conf: ["Confianza del modelo",
    "Cuántos partidos previos hay detrás de la estimación. Con pocos datos los porcentajes se mueven mucho de una jornada a otra."],
  asiatico: ["Línea asiática",
    "Devuelve parte de lo apostado en ciertos resultados. Su porcentaje va neto de esa devolución, así que no se lee igual que el de un mercado normal."],
  xg: ["Goles esperados (xG)",
    "Los goles que cabría esperar según la calidad de las ocasiones creadas, en vez de los que acabaron entrando. Suele predecir mejor el futuro que el marcador real."],
  coste: ["Coste de una selección",
    "En cuánto quedaría la combinada entera si quitaras esa pata. Cuanto más suba al quitarla, más cara está saliendo."],
  lambda: ["Goles esperados del modelo (λ)",
    "El número medio de goles que el modelo le da a cada equipo en ese partido. Toda la matriz de marcadores sale de esos dos números."],
  dixon: ["Corrección Dixon-Coles",
    "Un retoque a la Poisson clásica: los resultados cortos (0-0, 1-0, 0-1, 1-1) pasan más veces de lo que predice la fórmula simple, y esta corrección los ajusta."],
  copula: ["Cópula",
    "Una forma de atar los goles de los dos equipos para que se muevan juntos, en vez de tratarlos como si fueran independientes. Un partido loco suele serlo por los dos lados."],
  brier: ["Brier",
    "Mide a la vez si aciertas y si repartes bien la confianza: penaliza estar muy seguro y fallar. Cuanto más bajo, mejor; 0.25 es lo que sacaría alguien diciendo siempre 50%."],
  logloss: ["Log-loss",
    "Otra nota del mismo examen, más severa con los fallos rotundos. Sirve para comparar motores entre sí, no para leerla en absoluto."],
  calibracion: ["Calibración",
    "Que cuando dices 70% pase el 70% de las veces. Un modelo puede ordenar bien los partidos y aun así estar mal calibrado, diciendo 80% donde debería decir 65%."],
  doble: ["Doble oportunidad",
    "Vale con que ocurra una de dos cosas: gana o empata. Es el mismo pronóstico que un 1X2 pero con una vía más, así que siempre es más probable."],
  temperatura: ["Temperatura",
    "Un mando que achata o afila los porcentajes del modelo. Por encima de 1 significa que iba sobrado de confianza y conviene suavizarlo."],
  shrink: ["Encogimiento",
    "Con pocos minutos jugados, las tasas de un jugador se acercan a la media de su posición. Evita que un gol en veinte minutos se convierta en un pronóstico absurdo."],
};

/** Una palabra que se puede tocar para saber qué significa. */
function Term({ id, children }) {
  const [abierto, setAbierto] = useState(false);
  const g = GLOSARIO[id];
  const idPop = "term-" + id;

  /* Se cierra con Escape y tocando fuera: si no, en el móvil el cartel
     se queda tapando justo lo que ibas a leer. */
  useEffect(() => {
    if (!abierto) return;
    const fuera = () => setAbierto(false);
    const tecla = (e) => { if (e.key === "Escape") { e.stopPropagation(); setAbierto(false); } };
    document.addEventListener("click", fuera);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("click", fuera);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [abierto]);

  if (!g) return <>{children}</>;
  return (
    <span className="term-wrap">
      <button className="term" aria-expanded={abierto} aria-controls={idPop}
        aria-label={`${typeof children === "string" ? children : g[0]}: ver definición`}
        onClick={(e) => { e.stopPropagation(); setAbierto((v) => !v); }}>
        {children}
      </button>
      {abierto && (
        <span className="term-pop" role="note" id={idPop} onClick={(e) => e.stopPropagation()}>
          <b>{g[0]}</b>
          {g[1]}
          <button className="term-x" aria-label="Cerrar definición"
            onClick={() => setAbierto(false)}>×</button>
        </span>
      )}
    </span>
  );
}

const ATAJOS = [
  ["1 – 3", "Ir a Cartelera, Competición o Calibración"],
  ["4", "Abrir la combinada"],
  ["P", "Volver al partido abierto"],
  ["E", "Volver al equipo abierto"],
  ["B", "Buscar en la cartelera"],
  ["Ctrl/⌘ + K", "Buscador global: ir a cualquier sitio o repetir una búsqueda"],
  ["M", "Abrir y cerrar el menú"],
  ["T", "Cambiar entre tema claro y oscuro"],
  ["Z", "Deshacer lo último que hayas quitado"],
  ["?", "Abrir y cerrar esta ayuda"],
  ["Esc", "Cerrar lo que esté abierto"],
];

function Ayuda({ onClose }) {
  const [q, setQ] = useState("");
  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Ayuda" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2 className="card-title">Ayuda</h2>
          <button className="cb-x" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="card-body modal-scroll">
          <div className="rule"><span className="rule-label">Atajos de teclado</span><span className="rule-line" /></div>
          <dl className="atajos">
            {ATAJOS.map(([k, d]) => (
              <React.Fragment key={k}>
                <dt><kbd>{k}</kbd></dt>
                <dd>{d}</dd>
              </React.Fragment>
            ))}
          </dl>
          <p className="foot">No funcionan mientras escribes en una caja de texto.</p>

          <div className="rule"><span className="rule-label">Glosario</span><span className="rule-line" /></div>
          <input className="input input-search glos-buscar" placeholder="Buscar un término"
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en el glosario" />
          <dl className="glos">
            {Object.entries(GLOSARIO)
              .filter(([, [t, d]]) => !q.trim() ||
                `${t} ${d}`.toLowerCase().includes(q.trim().toLowerCase()))
              .map(([k, [t, d]]) => (
                <React.Fragment key={k}>
                  <dt>{t}</dt>
                  <dd>{d}</dd>
                </React.Fragment>
              ))}
          </dl>
          {q.trim() && !Object.values(GLOSARIO).some(([t, d]) =>
            `${t} ${d}`.toLowerCase().includes(q.trim().toLowerCase())) && (
            <p className="foot" style={{ marginTop: 0 }}>Ningún término coincide con “{q}”.</p>
          )}

          <div className="rule"><span className="rule-label">Privacidad</span><span className="rule-line" /></div>
          <p className="foot" style={{ marginTop: 0 }}>
            Tu clave de API-Football, los boletos y tus preferencias se guardan solo en el
            almacenamiento privado de este dispositivo (nunca en un servidor propio: esta app no
            tiene backend). Cada búsqueda o partido que consultas se pide directamente a
            api-sports.io usando esa clave, para poder mostrarte los datos — es el único tercero
            al que se envía algo.
          </p>
          <p className="foot">
            Lo ya descargado (partidos, equipos, cuotas) queda en caché hasta 24 horas para no
            gastar peticiones de más, y se poda solo con el tiempo. "Salir y olvidar la clave", en
            Ajustes, borra la clave y toda esa caché del dispositivo de una vez.
          </p>
        </div>
      </div>
    </div>
  );
}

/** El cajón lateral: todo lo que no es "una sección" de la app pero
    tampoco merece pelearse por sitio en la barra superior — ayuda,
    ajustes, tema y el atajo a las ligas fijadas. Los cuatro accesos
    más usados van en tarjetas grandes (menú rectangular); lo demás,
    en una lista simple debajo. */
function Drawer({ onClose, account, tema, cambiarTema, onAyuda, onAjustes, onLigas, onBuscar }) {
  const tile = (name, label, onClick) => (
    <button className="drawer-tile" onClick={() => { onClick(); onClose(); }}>
      <span className="drawer-tile-icon"><AjIco name={name} /></span>
      <span>{label}</span>
    </button>
  );
  return (
    <div className="drawer-fondo" onClick={onClose}>
      <div className="drawer" role="dialog" aria-label="Menú" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-txt">
            <span className="brand-word">Acierto</span>
            <span className="drawer-email">{account?.account?.email || ""}</span>
          </span>
        </div>
        <div className="drawer-tiles">
          {tile("buscar", "Buscar", onBuscar)}
          {tile("ajustes", "Ajustes", onAjustes)}
          {tile("ayuda", "Ayuda", onAyuda)}
          {tile("ligas", "Mis ligas", onLigas)}
          {tile("tema", tema === "oscuro" ? "Tema claro" : "Tema oscuro", cambiarTema)}
        </div>
        <button className="drawer-x" aria-label="Cerrar menú" onClick={onClose}>×</button>
      </div>
    </div>
  );
}

/** Los iconos de la lista de ajustes y del cajón lateral: el mismo
    trazo fino que el resto de la app, solo que aquí cada uno vive en
    su círculo tonal. */
function AjIco({ name }) {
  const p = {
    tema: <><circle cx="9" cy="9" r="3.6" /><path d="M9 1.8v2M9 14.2v2M2.6 9h2M13.4 9h2M4.5 4.5l1.4 1.4M12.1 12.1l1.4 1.4M13.5 4.5l-1.4 1.4M5.9 12.1l-1.4 1.4" /></>,
    densidad: <><path d="M2.5 5h13M2.5 9h13M2.5 13h8" /></>,
    letra: <><path d="M4 14 8 3l4 11M5.4 10.5h5.2" /><path d="M12.5 14v-5.2c0-1.1.9-1.6 2-1.6s2 .6 2 1.6V14" /></>,
    calculo: <><rect x="2.5" y="2.5" width="13" height="13" rx="3" /><path d="M6 9h6M9 6v6" /></>,
    calibracion: <><path d="M9 2.5v3M9 12.5v3M2.5 9h3M12.5 9h3" /><circle cx="9" cy="9" r="3.6" /></>,
    copia: <><path d="M9 2.5v9M9 11.5 5.8 8.3M9 11.5l3.2-3.2" /><path d="M3 12.5v1.6c0 .8.7 1.4 1.5 1.4h9c.8 0 1.5-.6 1.5-1.4v-1.6" /></>,
    cuenta: <><circle cx="9" cy="6.2" r="3.2" /><path d="M2.8 15.2c.9-3 3.2-4.6 6.2-4.6s5.3 1.6 6.2 4.6" /></>,
    ajustes: <><path d="M9 2v2.2M9 13.8V16M16 9h-2.2M4.2 9H2M13.5 4.5l-1.5 1.5M5.5 12l-1.5 1.5M13.5 13.5 12 12M5.5 6 4 4.5" /><circle cx="9" cy="9" r="3" /></>,
    ayuda: <><circle cx="9" cy="9" r="6.5" /><path d="M6.9 7.1c.2-1.2 1.1-2 2.3-2 1.3 0 2.3.9 2.3 2 0 1.6-2.1 1.7-2.1 3.4" /><circle cx="9" cy="13" r=".2" fill="currentColor" /></>,
    ligas: <><path d="M5 2.5h8v5.2c0 2.2-1.8 4-4 4s-4-1.8-4-4V2.5Z" /><path d="M5 4H2.7c0 2 1 3.3 2.6 3.6M13 4h2.3c0 2-1 3.3-2.6 3.6" /><path d="M9 11.7V15M6.3 15.5h5.4" /></>,
    buscar: <><circle cx="8" cy="8" r="5.2" /><path d="M11.8 11.8 16 16" /></>,
  }[name];
  return (
    <svg className="ico" viewBox="0 0 18 18" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p}
    </svg>
  );
}

/** Un interruptor de Android: nada de casillas, un botón que se
    desliza y dice de un vistazo si algo está activado. */
function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={"switch" + (on ? " switch-on" : "")} onClick={() => { toque(6); onChange(!on); }} />
  );
}

/** Ajustes: aspecto, copia de seguridad y cuenta. En el móvil es
    además el único sitio desde donde se puede salir. */
function Ajustes({ onClose, account, meta, tema, temaAplicado, setTema, aspecto, setAspecto, onSalir }) {
  const [completo, setCompleto] = useState(CALCULO_COMPLETO);
  const [autoCal, setAutoCal] = useState(AUTO_CALIBRACION);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const file = useRef(null);

  async function exportar() {
    setErr(null);
    try {
      const j = await respaldoExportar();
      const dia = new Date().toISOString().slice(0, 10);
      downloadText(`acierto-copia-${dia}.json`, JSON.stringify(j, null, 1));
      setMsg("Copia descargada. Guárdala donde no dependa de este navegador.");
      avisar("Copia de seguridad descargada");
    } catch (e) { setErr("No he podido preparar la copia: " + e.message); }
  }

  async function importar(f) {
    setErr(null); setMsg(null);
    try {
      const txt = await f.text();
      let json;
      try { json = JSON.parse(txt); }
      catch (e) {
        throw new Error("Ese archivo no es un JSON válido. Elige el archivo de copia (.json) que descargaste desde aquí.");
      }
      const n = await respaldoImportar(json);
      setMsg(`Restaurados ${n} ${n === 1 ? "boleto" : "boletos"}. El aspecto se aplica al recargar.`);
      avisar(`Restaurados ${n} ${n === 1 ? "boleto" : "boletos"}`);
    } catch (e) { setErr(e.message); }
  }

  const opcion = (campo, valor, etiqueta, size, aria) => (
    <button key={valor}
      className={"segbtn" + (aspecto[campo] === valor ? " segbtn-on" : "")}
      style={size ? { fontSize: size } : undefined}
      aria-label={aria || etiqueta} onClick={() => setAspecto(campo, valor)}>{etiqueta}</button>
  );

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Ajustes" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2 className="card-title">Ajustes</h2>
          <button className="cb-x" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="card-body modal-scroll">
          <div className="rule"><span className="rule-label">Aspecto</span><span className="rule-line" /></div>
          <div className="list-row">
            <span className="list-row-icon"><AjIco name="tema" /></span>
            <span className="list-row-text">
              <span className="list-row-title">Tema</span>
            </span>
            <span className="list-row-end">
              <div className="seg">
                <button className={"segbtn" + (tema === "claro" ? " segbtn-on" : "")}
                  onClick={() => setTema("claro")}>Claro</button>
                <button className={"segbtn" + (tema === "oscuro" ? " segbtn-on" : "")}
                  onClick={() => setTema("oscuro")}>Oscuro</button>
                <button className={"segbtn" + (tema === "auto" ? " segbtn-on" : "")}
                  onClick={() => setTema("auto")}>Auto</button>
              </div>
            </span>
          </div>
          {tema === "auto" && (
            <p className="foot" style={{ marginTop: 0 }}>
              Ahora mismo se ve en {temaAplicado === "oscuro" ? "oscuro" : "claro"}, según lo que
              tenga configurado este aparato.
            </p>
          )}
          <div className="list-row">
            <span className="list-row-icon"><AjIco name="densidad" /></span>
            <span className="list-row-text">
              <span className="list-row-title">Densidad cómoda</span>
              <span className="list-row-sub">Más aire entre filas y tarjetas</span>
            </span>
            <span className="list-row-end">
              <Switch on={aspecto.densidad === "comoda"} label="Densidad cómoda"
                onChange={(v) => setAspecto("densidad", v ? "comoda" : "compacta")} />
            </span>
          </div>
          <div className="list-row">
            <span className="list-row-icon"><AjIco name="letra" /></span>
            <span className="list-row-text">
              <span className="list-row-title">Tamaño de letra</span>
            </span>
            <span className="list-row-end">
              <div className="seg">
                {opcion("letra", "pequena", "A", "12px", "Letra pequeña")}
                {opcion("letra", "normal", "A", "16px", "Letra normal")}
                {opcion("letra", "grande", "A", "20px", "Letra grande")}
              </div>
            </span>
          </div>

          <div className="rule"><span className="rule-label">Cálculo</span><span className="rule-line" /></div>
          <div className="list-row">
            <span className="list-row-icon"><AjIco name="calculo" /></span>
            <span className="list-row-text">
              <span className="list-row-title">Precisión completa</span>
              <span className="list-row-sub">
                {EQUIPO_LENTO
                  ? (completo
                    ? "Ensamble con todo el historial y 20.000 simulaciones: puede tardar entre veinte y cuarenta segundos en este aparato, sin bloquear la pantalla."
                    : "Ensamble con las últimas 320 jornadas y 6.000 simulaciones. El 1X2 puede moverse unas seis décimas frente al cálculo completo.")
                  : "Este equipo va sobrado: ya se usa el cálculo entero en los dos modos."}
              </span>
            </span>
            <span className="list-row-end">
              <Switch on={completo} label="Precisión completa"
                onChange={(v) => { ponCalculoCompleto(v); setCompleto(v); }} />
            </span>
          </div>
          <div className="list-row">
            <span className="list-row-icon"><AjIco name="calibracion" /></span>
            <span className="list-row-text">
              <span className="list-row-title">Calibración automática</span>
              <span className="list-row-sub">
                Ajusta sola los parámetros de cada competición con la última temporada jugada, sin
                pedir peticiones nuevas a la API. Lo que guardes a mano en Calibración no se toca.
              </span>
            </span>
            <span className="list-row-end">
              <Switch on={autoCal} label="Calibración automática"
                onChange={(v) => { ponAutoCalibracion(v); setAutoCal(v); }} />
            </span>
          </div>

          <div className="rule"><span className="rule-label">Copia de seguridad</span><span className="rule-line" /></div>
          <p className="foot" style={{ marginTop: 0 }}>
            Los boletos, las ligas fijadas y las preferencias viven solo en el almacenamiento
            privado de este navegador. Si lo limpias o cambias de equipo, se pierden. La copia
            no incluye la clave de la API.
          </p>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={exportar}>Exportar copia</button>
            <button className="btn btn-ghost" onClick={() => file.current && file.current.click()}>
              Restaurar copia
            </button>
            <input ref={file} type="file" accept="application/json,.json" className="oculto"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ""; }} />
          </div>
          <div className="toolbar" style={{ marginTop: 8 }}>
            <button className="btn btn-quiet" onClick={() => {
              const n = cacheOlvidar(() => true);
              setMsg(`Vaciada la caché (${n} respuestas). Se volverán a pedir según haga falta.`);
            }}>Vaciar la caché de datos</button>
          </div>
          {msg && <div className="ok">{msg}</div>}
          {err && <div className="alert">{err}</div>}

          <div className="rule"><span className="rule-label">Cuenta</span><span className="rule-line" /></div>
          <div className="list-row">
            <span className="list-row-icon"><AjIco name="cuenta" /></span>
            <span className="list-row-text">
              <span className="list-row-title">{account?.account?.email || "—"}</span>
              <span className="list-row-sub">
                Plan {account?.subscription?.plan || "—"} · {meta.calls} peticiones a la API ·{" "}
                {meta.hits} servidas desde la caché
              </span>
            </span>
          </div>
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={onSalir}>Salir y olvidar la clave</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** El aviso de deshacer. Vive fuera de las pantallas porque la acción
    que hay que deshacer puede haber pasado en cualquiera de ellas. */
function Aviso() {
  const [a, setA] = useState(null);
  useEffect(() => avisoOn(setA), []);
  if (!a) return null;
  return (
    <div className={"aviso-flotante aviso-" + a.tono} role="status" aria-live="polite">
      {a.texto}
    </div>
  );
}

function Deshacer() {
  const [u, setU] = useState(null);
  useEffect(() => undoOn(setU), []);
  if (!u) return null;
  return (
    <div className="undo" role="status" aria-live="polite">
      <span className="undo-txt">{u.texto}</span>
      <button className="undo-btn" onClick={() => undoAplicar()}>Deshacer</button>
      <button className="undo-x" aria-label="Descartar" onClick={() => undoDescartar()}>×</button>
    </div>
  );
}

/** Buscador global (Ctrl/Cmd+K): un mismo cajón para saltar a
    cualquier sección, repetir una búsqueda reciente o escribir un
    equipo nuevo directamente — sin tener que ir primero a la
    cartelera para buscar ahí. */
function Paleta({ onClose, acciones, recientes, onBuscar }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const t = q.trim().toLowerCase();
  const accionesFiltradas = t ? acciones.filter((a) => a.etiqueta.toLowerCase().includes(t)) : acciones;
  const recientesFiltrados = t ? recientes.filter((r) => r.toLowerCase().includes(t)) : recientes;
  const nada = t && accionesFiltradas.length === 0 && recientesFiltrados.length === 0;

  return (
    <div className="modal-fondo paleta-fondo" onClick={onClose} role="dialog" aria-label="Buscador">
      <div className="paleta" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef} className="input paleta-input" placeholder="Ir a una sección o buscar un equipo…"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { onClose(); return; }
            if (e.key === "Enter" && q.trim()) { onBuscar(q.trim()); onClose(); }
          }}
        />
        <div className="paleta-lista">
          {recientesFiltrados.length > 0 && (
            <>
              <div className="paleta-grupo">Recientes</div>
              {recientesFiltrados.map((r) => (
                <button key={r} className="paleta-item" onClick={() => { onBuscar(r); onClose(); }}>
                  <span className="paleta-item-ico" aria-hidden="true">↺</span>{r}
                </button>
              ))}
            </>
          )}
          {accionesFiltradas.length > 0 && (
            <>
              <div className="paleta-grupo">Ir a</div>
              {accionesFiltradas.map((a) => (
                <button key={a.etiqueta} className="paleta-item" onClick={() => { a.onClick(); onClose(); }}>
                  <span className="paleta-item-ico" aria-hidden="true">{a.tecla || "→"}</span>{a.etiqueta}
                </button>
              ))}
            </>
          )}
          {nada && <div className="paleta-vacio">Nada coincide con “{q}”. Pulsa Intro para buscarlo en la cartelera.</div>}
        </div>
      </div>
    </div>
  );
}

function App() {
  /* "auto" sigue al sistema operativo; oscuro/claro son elecciones
     explícitas que lo pisan. Lo que de verdad pinta la pantalla es
     `temaAplicado`, no `tema` — la diferencia solo importa para saber
     qué marcar en Ajustes. */
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem("tema") || "auto"; } catch (e) { return "auto"; }
  });
  const [prefiereOscuro, setPrefiereOscuro] = useState(() => {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { return true; }
  });
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia("(prefers-color-scheme: dark)"); } catch (e) { return; }
    const onChange = (e) => setPrefiereOscuro(e.matches);
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange));
  }, []);
  const temaAplicado = tema === "auto" ? (prefiereOscuro ? "oscuro" : "claro") : tema;
  useEffect(() => { document.documentElement.dataset.tema = temaAplicado; }, [temaAplicado]);
  const [apiKey, setApiKey] = useState("");
  const [account, setAccount] = useState(null);
  const [gateErr, setGateErr] = useState(null);
  const [gateBusy, setGateBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState("fixtures");
  const [leagues, setLeagues] = useState([]);
  const [sel, setSel] = useState({ league: null, season: seasonNow() });
  const [fixture, setFixture] = useState(null);
  const [teamCtx, setTeamCtx] = useState(null);
  const [meta, setMeta] = useState({ calls: 0, hits: 0, dailyRemaining: null, dailyLimit: null });
  const [slipN, setSlipN] = useState(0);
  const [ayuda, setAyuda] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const menuBtnRef = useRef(null);
  const fabBtnRef = useRef(null);
  /* Copia siempre al día de fixture/teamCtx para poder escribirlos en
     el historial en el mismo instante en que se navega, sin esperar a
     que el efecto que los sincroniza vuelva a correr (para entonces
     ya sería tarde: el paso de historial se habría guardado con el
     valor viejo). navDepth cuenta cuántos peldaños ha empujado esta
     sesión, para que el botón "Volver" en pantalla nunca saque a
     quien lo usa de la propia app cuando ya no queda nada que deshacer. */
  const fixtureRef = useRef(null);
  const teamCtxRef = useRef(null);
  const navDepth = useRef(0);
  const [coach, setCoach] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [recientes, setRecientes] = useState(() => recientesLeer());
  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator === "undefined" || navigator.onLine !== false);
  const [aspecto, setAspectoRaw] = useState(() => {
    try {
      return {
        densidad: localStorage.getItem("densidad") || "compacta",
        letra: localStorage.getItem("letra") || "normal",
      };
    } catch (e) { return { densidad: "compacta", letra: "normal" }; }
  });

  useEffect(() => {
    document.documentElement.dataset.densidad = aspecto.densidad;
    document.documentElement.dataset.letra = aspecto.letra;
  }, [aspecto]);

  const setAspecto = useCallback((campo, valor) => {
    setAspectoRaw((a) => {
      const n = { ...a, [campo]: valor };
      try { localStorage.setItem(campo, valor); } catch (e) { /* sin espacio */ }
      return n;
    });
  }, []);

  /* Perder la conexión no debería parecer que la app está rota. */
  useEffect(() => {
    const arriba = () => setEnLinea(true);
    const abajo = () => setEnLinea(false);
    window.addEventListener("online", arriba);
    window.addEventListener("offline", abajo);
    return () => {
      window.removeEventListener("online", arriba);
      window.removeEventListener("offline", abajo);
    };
  }, []);

  /* El contador de la combinada tiene que verse desde cualquier
     pantalla, así que escucha los cambios en vez de leerlos al entrar. */
  useEffect(() => {
    const cuenta = (l) => setSlipN((l || []).filter((x) => !x.off).length);
    slipRead().then(cuenta);
    return slipOn(cuenta);
  }, []);

  const elegirTema = useCallback((v) => {
    setTema(v);
    try { localStorage.setItem("tema", v); } catch (e) { /* sin espacio */ }
  }, []);
  /* El atajo rápido (tecla T, o el icono del cajón) siempre deja un
     tema explícito — nunca vuelve a "auto" por sí solo. */
  const cambiarTema = useCallback(() => {
    elegirTema(temaAplicado === "claro" ? "oscuro" : "claro");
  }, [elegirTema, temaAplicado]);

  const onMeta = useCallback((m) => {
    setMeta((x) => ({
      calls: x.calls + (m.cached ? 0 : 1),
      hits: x.hits + (m.cached ? 1 : 0),
      dailyRemaining: m.dailyRemaining ?? x.dailyRemaining,
      dailyLimit: m.dailyLimit ?? x.dailyLimit,
    }));
  }, []);

  const api = useMemo(() => makeApi(apiKey, onMeta), [apiKey, onMeta]);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("apikey");
        if (r?.value) {
          setApiKey(r.value);
          connect(r.value, true);
          return;
        }
      } catch (e) {
        /* sin clave guardada */
      }
      setBooting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Recargar no debería costarte el sitio donde estabas. */
  useEffect(() => {
    if (!account) return;
    const t = setTimeout(() => {
      try {
        storage.set("ultimo:v1", JSON.stringify({ view, fixture, teamCtx })).catch(() => {});
      } catch (e) { /* nada */ }
    }, 500);
    return () => clearTimeout(t);
  }, [account, view, fixture, teamCtx]);

  /* La primera vez que se entra, dos toques rápidos señalan el menú y
     la combinada antes de dejar a la persona sola con la pantalla. Una
     marca en localStorage evita repetirlo en cada visita. */
  useEffect(() => {
    if (!account) return;
    let visto = true;
    try { visto = localStorage.getItem("onboarding:v1") === "1"; } catch (e) { return; }
    if (visto) return;
    const t = setTimeout(() => setCoach(true), 600);
    return () => clearTimeout(t);
  }, [account]);

  /* Vigilancia de degradación: como mucho una vez al día, se ponen al
     día con resultados reales los pronósticos pendientes del registro
     prospectivo (lo único que no se puede trampear, porque queda escrito
     antes del partido) y se mira si alguna liga se ha desviado de su
     tasa base. Las que estén autoajustadas se marcan caducadas para que
     Mercados las recalibre solas la próxima vez; lo calibrado a mano no
     se toca nunca por aquí. */
  useEffect(() => {
    if (!account) return;
    let dead = false;
    (async () => {
      try {
        const REFRESH_KEY = "registro-refresh-ts";
        let last = 0;
        try { last = Number(localStorage.getItem(REFRESH_KEY)) || 0; } catch (e) { /* nada */ }
        if (Date.now() - last < 20 * 3600e3) return;
        const all = await logRead();
        const pend = all.filter((e) => e.gh === undefined || e.gh === null);
        if (pend.length) {
          const ids = pend.map((e) => e.fx);
          const nuevos = new Map();
          for (let i = 0; i < ids.length; i += 20) {
            if (dead) return;
            const trozo = ids.slice(i, i + 20);
            const r = await api("fixtures", { ids: trozo.join("-") }, TTL.short).catch(() => null);
            (r || []).forEach((f) => {
              if (DONE_STATES.includes(f.fixture?.status?.short))
                nuevos.set(f.fixture.id, { gh: num(f.goals.home), ga: num(f.goals.away) });
            });
          }
          if (dead) return;
          if (nuevos.size) {
            const merged = all.map((e) => (nuevos.has(e.fx) ? { ...e, ...nuevos.get(e.fx) } : e));
            await storage.set(LOG_KEY, JSON.stringify(merged));
          }
        }
        // Córners y tarjetas reales de los partidos ya puntuados: igual
        // que el botón "Puntuar córners y tarjetas" de Calibración, pero
        // solo, y con el mismo tope de 12 por pasada para no disparar la
        // cuota.
        if (dead) return;
        const conGoles = await logRead();
        const faltanConteos = conGoles.filter((e) => e.gh !== undefined && e.gh !== null &&
          (e.pC !== undefined || e.pT !== undefined) && e.cAct === undefined).slice(0, 12);
        if (faltanConteos.length) {
          const conConteos = [...conGoles];
          for (const e of faltanConteos) {
            if (dead) return;
            const st = await api("fixtures/statistics", { fixture: e.fx }, TTL.static).catch(() => null);
            if (!st?.length) continue;
            const suma = (k, mult = 1) => st.reduce((a, b) =>
              a + num((b.statistics || []).find((x) => x.type === k)?.value) * mult, 0);
            const i = conConteos.findIndex((x) => x.fx === e.fx);
            if (i >= 0) conConteos[i] = { ...conConteos[i], cAct: suma("Corner Kicks"),
              tAct: suma("Yellow Cards") + suma("Red Cards", 2) };
          }
          await storage.set(LOG_KEY, JSON.stringify(conConteos));
        }
        try { localStorage.setItem(REFRESH_KEY, String(Date.now())); } catch (e) { /* sin espacio */ }
        if (dead) return;
        const fresh = await logRead();
        const degr = logDegradados(fresh);
        try { localStorage.setItem("registro:degradados:v1", JSON.stringify(degr)); } catch (e) { /* sin espacio */ }
        for (const d of degr) {
          try {
            const r = await storage.get(paramsKey(d.lg));
            if (!r?.value) continue;
            const saved = JSON.parse(r.value);
            if (saved.auto === false) continue;
            await storage.delete(paramsKey(d.lg));
          } catch (e) { /* nada guardado para esta liga */ }
        }
      } catch (e) { /* sin red: se prueba otro día */ }
    })();
    return () => { dead = true; };
  }, [account, api]);

  async function connect(k, silent = false) {
    setGateBusy(true);
    setGateErr(null);
    try {
      const call = makeApi(k, onMeta);
      const s = await call("status", {}, 60e3);
      if (!s?.account) throw new Error("La API no reconoció esa clave.");
      setApiKey(k);
      setAccount(s);
      try {
        await storage.set("apikey", k);
      } catch (e) {
        /* seguimos sin guardar */
      }
      const lg = await call("leagues", { current: "true" }, TTL.daily);
      setLeagues(lg || []);
      try {
        const r = await storage.get("ultimo:v1");
        const u = JSON.parse(r.value);
        if (u && typeof u === "object") {
          if (u.fixture?.fixture?.id) setFixture(u.fixture);
          if (u.teamCtx?.team) setTeamCtx(u.teamCtx);
          const valida = ["fixtures", "league", "combinada", "calibracion",
            u.fixture ? "match" : null, u.teamCtx ? "team" : null].filter(Boolean);
          if (valida.includes(u.view)) setView(u.view);
        }
      } catch (e) { /* primera visita */ }
    } catch (e) {
      setGateErr(e.message);
      setApiKey("");
      setAccount(null);
    } finally {
      setGateBusy(false);
      setBooting(false);
    }
  }

  async function disconnect() {
    try {
      await storage.delete("apikey");
    } catch (e) {
      /* nada */
    }
    await cacheBorrarTodo();
    setApiKey("");
    setAccount(null);
    setLeagues([]);
    setFixture(null);
    setTeamCtx(null);
    setView("fixtures");
  }

  /* El gesto de retroceso del móvil sacaba de la app entera. Cada
     sección entra en el historial para que atrás signifique atrás —
     y con ella, qué partido o equipo estaba abierto en ese momento:
     antes solo se guardaba el nombre de la sección, así que volver
     atrás podía dejarte en "Mercados" sin ningún partido cargado, y
     el botón "Volver" siempre mandaba a la cartelera sin importar de
     dónde vinieras. `ctx` deja fijar explícitamente fixture/teamCtx en
     el mismo paso (para cuando se abre un partido o un equipo nuevos);
     si no se da, se usa lo que haya ahora mismo. */
  const irA = useCallback((v, ctx) => {
    const fx = ctx && "fixture" in ctx ? ctx.fixture : fixtureRef.current;
    const tc = ctx && "teamCtx" in ctx ? ctx.teamCtx : teamCtxRef.current;
    fixtureRef.current = fx;
    teamCtxRef.current = tc;
    setView(v);
    try {
      const st = { v, fixture: fx, teamCtx: tc };
      if (!history.state || history.state.v !== v) { history.pushState(st, ""); navDepth.current++; }
      else history.replaceState(st, "");
    } catch (e) { /* en file:// puede no dejar; se sigue navegando igual */ }
  }, []);

  /* El botón "Volver" en pantalla hace lo mismo que el gesto de
     retroceso del sistema: deshace un paso del historial propio de la
     app. Nunca saca de la app —si no queda nada que deshacer (por
     ejemplo, tras recargar la página a medio navegar), cae a la
     cartelera, que es un sitio seguro conocido. */
  const atras = useCallback(() => {
    if (navDepth.current > 0) {
      try { history.back(); return; } catch (e) { /* cae al valor seguro de abajo */ }
    }
    irA("fixtures", { fixture: null });
  }, [irA]);

  useEffect(() => {
    if (!account) return;
    fixtureRef.current = fixture;
    teamCtxRef.current = teamCtx;
    try {
      if (!history.state || !history.state.v) history.replaceState({ v: view, fixture, teamCtx }, "");
    } catch (e) { /* nada */ }
    const onPop = (e) => {
      navDepth.current = Math.max(0, navDepth.current - 1);
      const st = e.state || {};
      fixtureRef.current = st.fixture ?? null;
      teamCtxRef.current = st.teamCtx ?? null;
      setView(st.v || "fixtures");
      setFixture(st.fixture ?? null);
      setTeamCtx(st.teamCtx ?? null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const openTeam = (team, league) => {
    const tc = { team, league: { id: league.id, name: league.name }, season: sel.season || seasonNow() };
    setTeamCtx(tc);
    irA("team", { teamCtx: tc });
  };
  const openFixture = (f) => { setFixture(f); irA("match", { fixture: f }); };

  /* Ir a la cartelera y dejar ya escrita la búsqueda, tanto desde el
     buscador global como desde una reciente: la caja de Fixtures es
     la dueña de su propio estado, así que se le escribe el valor por
     fuera con el mismo truco que ya usaba el atajo "B" para enfocarla. */
  const irYBuscar = useCallback((termino) => {
    setRecientes(recientesGuardar(termino));
    irA("fixtures");
    setTimeout(() => {
      const caja = document.querySelector(".input-search");
      if (!caja) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(caja, termino);
      caja.dispatchEvent(new Event("input", { bubbles: true }));
      caja.focus();
    }, 40);
  }, [irA]);

  /* Atajos: en escritorio se navega mucho más rápido con una tecla que
     buscando el ratón, y esta app se usa saltando entre partidos. */
  useEffect(() => {
    if (!account) return;
    const onKey = (e) => {
      /* El buscador global funciona desde cualquier sitio, igual que
         en cualquier app o editor con paleta de comandos, incluso con
         el foco metido en un campo de texto. */
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaleta((v) => !v);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (e.key === "Escape") {
        setAyuda(false); setAjustes(false); setDrawer(false); setPaleta(false);
        if (coach) { try { localStorage.setItem("onboarding:v1", "1"); } catch (er) { /* nada */ } setCoach(false); }
        return;
      }
      if (e.key === "?") { e.preventDefault(); setAyuda((v) => !v); return; }
      if (e.key === "4") { irA("combinada"); return; }
      const n = ["1", "2", "3"].indexOf(e.key);
      if (n >= 0) { irA(SECCIONES[n][0]); return; }
      const k = e.key.toLowerCase();
      if (k === "p" && fixture) irA("match");
      else if (k === "e" && teamCtx) irA("team");
      else if (k === "t") cambiarTema();
      else if (k === "z") undoAplicar();
      else if (k === "m") setDrawer((v) => !v);
      else if (k === "b") {
        irA("fixtures");
        setTimeout(() => {
          const caja = document.querySelector(".input-search");
          if (caja) caja.focus();
        }, 40);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [account, fixture, teamCtx, cambiarTema, irA, coach]);

  /* Todos los hooks van antes de cualquier return: booting y "sin
     cuenta" también son renders de este mismo componente, y saltarse
     hooks entre uno y otro rompe el orden que React necesita. */
  const paletaAcciones = useMemo(() => [
    { etiqueta: "Ir a Cartelera", tecla: "1", onClick: () => irA("fixtures") },
    { etiqueta: "Ir a Competición", tecla: "2", onClick: () => irA("league") },
    { etiqueta: "Ir a Calibración", tecla: "3", onClick: () => irA("calibracion") },
    { etiqueta: "Ir a Combinada", tecla: "4", onClick: () => irA("combinada") },
    { etiqueta: "Abrir menú", tecla: "M", onClick: () => setDrawer(true) },
    { etiqueta: "Abrir ajustes", onClick: () => setAjustes(true) },
    { etiqueta: "Ayuda y atajos", tecla: "?", onClick: () => setAyuda(true) },
    { etiqueta: temaAplicado === "claro" ? "Cambiar a tema oscuro" : "Cambiar a tema claro", tecla: "T", onClick: cambiarTema },
  ], [irA, temaAplicado, cambiarTema]);

  /* Entre Cartelera, Competición y Calibración se puede deslizar en
     horizontal, como entre pestañas de cualquier app de Android; la
     Combinada no entra en el gesto porque no es una pestaña más,
     igual que tampoco lo es en la barra inferior. */
  const swipe = useSwipeTabs(["fixtures", "league", "calibracion"], view, irA);

  if (booting)
    return (
      <>
        <Styles />
        <div className="shell">
          <Spinner label="Abriendo" />
        </div>
      </>
    );

  if (!account)
    return (
      <>
        <Styles />
        <div className="shell shell-gate">
          <Connect onConnect={connect} busy={gateBusy} error={gateErr} initialKey={apiKey} />
        </div>
      </>
    );

  const remaining = meta.dailyRemaining !== null ? Number(meta.dailyRemaining) : null;
  const limit = meta.dailyLimit !== null ? Number(meta.dailyLimit) : account?.requests?.limit_day ?? null;
  const usedPct = remaining !== null && limit ? 100 - (remaining / limit) * 100 : null;
  const hayContexto = !!fixture || !!teamCtx;

  return (
    <>
      <Styles />
      <div className={"app" + (hayContexto ? " app-ctx" : "")}>
        <header className="topbar">
          <div className="topbar-in">
            <button ref={menuBtnRef} className="iconbtn" title="Menú (M)" aria-label="Abrir menú"
              onClick={() => setDrawer(true)}>
              <svg className="ico" viewBox="0 0 18 18" fill="none" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M2.5 5h13M2.5 9h13M2.5 13h13" />
              </svg>
            </button>
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-txt">
                <span className="brand-word">Acierto</span>
                <span className="brand-sub">terminal de análisis</span>
              </span>
            </div>

            <div className="topbar-right">
              <div className="qpill" title={`Plan ${account.subscription?.plan || "—"} · ${account.account?.email || ""}\n${meta.calls} llamadas hechas · ${meta.hits} servidas desde la caché`}>
                <div className="qpill-top">
                  <span>Cuota</span>
                  <b className="mono">{remaining !== null ? remaining : "—"}{limit ? `/${limit}` : ""}</b>
                </div>
                <div className="qtrack">
                  <div className={"qfill" + (usedPct !== null && usedPct > 85 ? " qfill-hot" : "")}
                    style={{ width: usedPct !== null ? Math.min(100, usedPct) + "%" : "0%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Lo que está abierto no es una sección: vive en su propia
              tira y se puede cerrar sin perder dónde estabas. */}
          {hayContexto && (
            <div className="ctxbar">
              <div className="ctxbar-in">
                {fixture && (
                  <span className={"ctx" + (view === "match" ? " ctx-on" : "")}>
                    <button className="ctx-go" onClick={() => irA("match")}>
                      <em>Partido</em>
                      {fixture.teams.home.name} — {fixture.teams.away.name}
                    </button>
                    <button className="ctx-x" aria-label="Cerrar partido"
                      onClick={() => {
                        setFixture(null);
                        irA(view === "match" ? "fixtures" : view, { fixture: null });
                      }}>×</button>
                  </span>
                )}
                {teamCtx && (
                  <span className={"ctx" + (view === "team" ? " ctx-on" : "")}>
                    <button className="ctx-go" onClick={() => irA("team")}>
                      <em>Equipo</em>
                      {teamCtx.team.name}
                    </button>
                    <button className="ctx-x" aria-label="Cerrar equipo"
                      onClick={() => {
                        setTeamCtx(null);
                        irA(view === "team" ? "fixtures" : view, { teamCtx: null });
                      }}>×</button>
                  </span>
                )}
              </div>
            </div>
          )}
        </header>

        {(!enLinea || remaining === 0) && (
          <div className={"aviso" + (enLinea ? " aviso-cuota" : "")} role="alert">
            <div className="aviso-in">
              {!enLinea ? (
                <>
                  <b>Sin conexión.</b> Todo lo que ya habías consultado se sigue viendo y la
                  combinada se calcula igual; solo no se pueden pedir datos nuevos.
                </>
              ) : (
                <>
                  <b>Se acabó la cuota de peticiones del día.</b> Lo descargado sigue disponible
                  desde la caché. La cuota se renueva cada día según tu plan de API-Football.
                </>
              )}
            </div>
          </div>
        )}

        <main className="main" style={swipe.style}
          onPointerDown={swipe.onPointerDown} onPointerMove={swipe.onPointerMove}
          onPointerUp={swipe.onPointerUp} onPointerCancel={swipe.onPointerCancel}>
          <ErrorBoundary key={view + (fixture ? ":" + fixture.fixture.id : "")}
            onBack={() => { setFixture(null); irA("fixtures", { fixture: null }); }}>
          {view === "fixtures" && (
            <Fixtures api={api} leagues={leagues} onOpen={openFixture} onTeam={openTeam} />
          )}
          {view === "match" && fixture && (
            <Match api={api} fixture={fixture} onBack={atras} onTeam={openTeam}
              onBoleto={() => irA("combinada")} />
          )}
          {view === "league" && (
            <League api={api} leagues={leagues} sel={sel} setSel={setSel} onTeam={openTeam} />
          )}
          {view === "combinada" && <Combinada api={api} onOpen={openFixture} />}
          {view === "calibracion" && (
            <Calibracion api={api} leagues={leagues} sel={sel} setSel={setSel} />
          )}
          {view === "team" && teamCtx && (
            <Team
              api={api}
              team={teamCtx.team}
              league={teamCtx.league}
              season={teamCtx.season}
              onBack={atras}
            />
          )}
          </ErrorBoundary>
        </main>

        <Deshacer />
        <Aviso />
        <VolverArriba />
        {ayuda && (
          <ErrorBoundary onBack={() => setAyuda(false)} backLabel="Cerrar">
            <Ayuda onClose={() => setAyuda(false)} />
          </ErrorBoundary>
        )}
        {ajustes && (
          <ErrorBoundary onBack={() => setAjustes(false)} backLabel="Cerrar">
            <Ajustes
              onClose={() => setAjustes(false)}
              account={account} meta={meta}
              tema={tema} temaAplicado={temaAplicado} setTema={elegirTema}
              aspecto={aspecto} setAspecto={setAspecto}
              onSalir={() => { setAjustes(false); disconnect(); }}
            />
          </ErrorBoundary>
        )}
        {drawer && (
          <ErrorBoundary onBack={() => setDrawer(false)} backLabel="Cerrar">
            <Drawer
              onClose={() => setDrawer(false)}
              account={account} tema={temaAplicado} cambiarTema={cambiarTema}
              onAyuda={() => setAyuda(true)}
              onAjustes={() => setAjustes(true)}
              onLigas={() => irA("league")}
              onBuscar={() => setPaleta(true)}
            />
          </ErrorBoundary>
        )}
        {paleta && (
          <ErrorBoundary onBack={() => setPaleta(false)} backLabel="Cerrar">
            <Paleta onClose={() => setPaleta(false)} acciones={paletaAcciones}
              recientes={recientes} onBuscar={irYBuscar} />
          </ErrorBoundary>
        )}

        {/* La navegación vive siempre abajo, al pulgar: tres secciones
            y, en el centro, la combinada acoplada como acción central
            (timón). No es una pestaña más — es LA acción de la app. */}
        <nav className="tabbar tabbar-rudder" aria-label="Secciones">
          {SECCIONES.slice(0, 2).map(([k, l]) => (
            <button key={k} className={"tabbtn" + (view === k ? " tabbtn-on" : "")}
              onClick={() => irA(k)} aria-current={view === k ? "page" : undefined}>
              <Ico name={k} />
              <span>{l}</span>
            </button>
          ))}
          <button ref={fabBtnRef} className={"fab-dock" + (view === FAB_SECCION[0] ? " fab-dock-on" : "")}
            title={`${FAB_SECCION[1]} · tecla 4`} aria-label={FAB_SECCION[1]}
            onClick={() => { toque(12); irA(FAB_SECCION[0]); }}>
            <Ico name={FAB_SECCION[0]} />
            {slipN > 0 && <i className="mono fabbadge">{slipN}</i>}
          </button>
          {SECCIONES.slice(2).map(([k, l]) => (
            <button key={k} className={"tabbtn" + (view === k ? " tabbtn-on" : "")}
              onClick={() => irA(k)} aria-current={view === k ? "page" : undefined}>
              <Ico name={k} />
              <span>{l}</span>
            </button>
          ))}
        </nav>

        {coach && (
          <ErrorBoundary onBack={() => setCoach(false)} backLabel="Cerrar">
            <Coachmarks
              pasos={[
                { ref: menuBtnRef, titulo: "Tu menú",
                  texto: "Ajustes, ayuda y tus ligas fijadas viven aquí. La tecla M lo abre y lo cierra." },
                { ref: fabBtnRef, titulo: "Arma tu combinada",
                  texto: "Añade selecciones desde cualquier partido y ciérrala aquí en el centro. La tecla 4 salta directo." },
              ]}
              onSalir={() => setCoach(false)}
            />
          </ErrorBoundary>
        )}
      </div>
    </>
  );
}

