/* Un toque háptico brevísimo para las acciones que de verdad cambian
   algo (confirmar, borrar, la acción central). No todos los
   navegadores lo dejan —sobre todo fuera de Android— así que falla
   en silencio donde no exista. */
function toque(ms = 10) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* sin soporte */ }
}

/** Mantener pulsado abre un menú rápido, sin quitarle el toque normal
    a lo que ya hacía el elemento. Se apoya en el `onClick` nativo del
    propio elemento (que ya entiende ratón, dedo Y teclado) y solo
    añade el temporizador por encima; si la pulsación larga ya
    disparó, el click que llega justo después se descarta. Se cancela
    solo si el dedo se mueve más de unos píxeles, para no confundir
    un scroll con una pulsación larga. */
function useLongPress(onLongPress, ms = 480) {
  const timer = useRef(null);
  const disparado = useRef(false);
  const inicio = useRef(null);

  const limpiar = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    inicio.current = { x: e.clientX, y: e.clientY };
    /* Sin esto, en cuanto la pulsación larga abre algo por encima de
       el dedo, el navegador puede dejar de mandarle a este mismo
       elemento el pointerup y el click que vienen después. */
    e.currentTarget.setPointerCapture?.(e.pointerId);
    limpiar();
    timer.current = setTimeout(() => {
      disparado.current = true;
      toque(15);
      onLongPress(e);
    }, ms);
  };
  const onPointerMove = (e) => {
    if (!inicio.current) return;
    const dx = e.clientX - inicio.current.x, dy = e.clientY - inicio.current.y;
    if (Math.hypot(dx, dy) > 10) limpiar();
  };
  const onPointerUp = () => {
    limpiar();
    /* Si lo que abrió la pulsación larga tapa el elemento antes de
       levantar el dedo, el click nativo puede no llegar a disparar
       aquí, y el `onClick` de abajo —que es quien limpia
       `disparado`— nunca se ejecutaría. Se limpia también aquí, con
       un pelín de margen para que, si el click SÍ llega, le dé
       tiempo a leerlo primero y descartarlo como corresponde. */
    if (disparado.current) setTimeout(() => { disparado.current = false; }, 0);
  };
  const onPointerCancel = () => limpiar();
  const onClick = (e, real) => {
    if (disparado.current) { disparado.current = false; e.preventDefault(); e.stopPropagation(); return; }
    real && real(e);
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick };
}

const TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; }
  catch (e) { return null; }
})();
const conTZ = (params) => (TZ ? { ...params, timezone: TZ } : params);
const clock = (iso) => {
  const d = new Date(iso);
  // Una fecha que la API manda mal no debe salir en pantalla como NaN:NaN.
  if (isNaN(d.getTime())) return "--:--";
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
};
const LIVE_STATES = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"];
const DONE_STATES = ["FT", "AET", "PEN"];

/* ============================================================
   Piezas visuales
   ============================================================ */

function Rule({ label }) {
  return (
    <div className="rule">
      {label ? <span className="rule-label">{label}</span> : null}
      <span className="rule-line" />
    </div>
  );
}

function Spinner({ label = "Cargando" }) {
  return (
    <div className="spinner">
      <span className="ball" />
      <span>{label}…</span>
    </div>
  );
}

function Empty({ title, hint }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}

/** Una sección que se pliega: en pantallas con mucho contenido
    opcional —el "qué pasa si me equivoco" de Mercados, por ejemplo—
    deja a la vista lo que casi todos quieren y esconde el resto de
    un toque, en vez de obligar a pasar de largo con el dedo. */
function Collapsible({ title, note, defaultOpen = false, variant = "acc", children }) {
  const [abierto, setAbierto] = useState(defaultOpen);
  if (variant === "card") {
    return (
      <section className={"card" + (abierto ? " acc-on" : "")}>
        <button className="card-head card-head-toggle" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
          <span className="card-head-toggle-label">
            <h2 className="card-title">{title}</h2>
            {note && <span className="card-note">{note}</span>}
          </span>
          <svg className="acc-chev" viewBox="0 0 18 18" width="14" height="14" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 7l4 4 4-4" />
          </svg>
        </button>
        {abierto && <div className="card-body">{children}</div>}
      </section>
    );
  }
  return (
    <div className={"acc" + (abierto ? " acc-on" : "")}>
      <button className="acc-head" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        <span>{title}</span>
        <svg className="acc-chev" viewBox="0 0 18 18" width="14" height="14" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 7l4 4 4-4" />
        </svg>
      </button>
      {abierto && <div className="acc-body">{children}</div>}
    </div>
  );
}

/** El menú de tres puntos: agrupa acciones secundarias por fila para
    no llenar la lista de botones sueltos. Se abre como una hoja
    inferior, igual que el resto de menús de la app. Con `trigger`
    a false no dibuja el botón de los tres puntos y deja que otra
    cosa —una pulsación larga, por ejemplo— controle si está abierto
    a través de `open`/`onOpenChange`. */
function OverflowMenu({ label = "Más opciones", items, trigger = true, open, onOpenChange }) {
  const [abiertoLocal, setAbiertoLocal] = useState(false);
  const abierto = open !== undefined ? open : abiertoLocal;
  const setAbierto = onOpenChange || setAbiertoLocal;
  /* Las demás hojas de la app se cierran con Escape porque cuelgan
     del atajo global de App(); esta vive suelta en cualquier fila,
     así que se las apaña sola para no ser la única que no obedece. */
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);
  return (
    <>
      {trigger && (
        <button className="overflow-btn" aria-label={label} aria-haspopup="menu" aria-expanded={abierto}
          onClick={() => setAbierto(true)}>
          <svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="3.6" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="14.4" r="1.5" />
          </svg>
        </button>
      )}
      {abierto && ReactDOM.createPortal(
        /* La fila que lo abre puede vivir dentro de una tabla con
           content-visibility (para no pintar lo que no se ve), y eso
           convierte a esa fila en el "contenedor" del position:fixed
           de la hoja — se quedaría atrapada dentro de la tabla en vez
           de cubrir la pantalla. Un portal a <body> lo evita siempre,
           esté el botón donde esté. */
        <div className="modal-fondo" onClick={() => setAbierto(false)}>
          <div className="modal" role="menu" aria-label={label} onClick={(e) => e.stopPropagation()}>
            <div className="card-body modal-scroll">
              {items.map((it, i) => (
                <button key={i} role="menuitem" className={"ofitem" + (it.danger ? " ofitem-mal" : "")}
                  onClick={() => { toque(it.danger ? 18 : 8); setAbierto(false); it.onClick(); }}>
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/** Deslizar para actuar: un atajo de gesto sobre lo que ya se puede
    hacer desde el menú de tres puntos, no una alternativa que haga
    falta usar. Se agarra con el puntero, no con listeners de touch a
    pelo, para que ratón y dedo se comporten igual. */
function Swipeable({ children, actionLabel, onAction, danger = true }) {
  const [dx, setDx] = useState(0);
  const arrastre = useRef(null);
  const MAX = 92;
  const UMBRAL_ARRASTRE = 4;

  /* Capturar el puntero de golpe en cuanto se apoya el dedo se lleva
     por delante el toque en cualquier botón de dentro de la fila (el
     menú de tres puntos, por ejemplo): mousedown y mouseup dejan de
     compartir objetivo y el clic nunca llega. Se difiere la captura
     hasta que el movimiento cruza un umbral mínimo, así un toque
     normal sobre lo que sea que haya dentro sigue funcionando y el
     gesto de deslizar arranca igual de fluido. */
  const onDown = (e) => {
    arrastre.current = { x: e.clientX, dx0: dx, id: e.pointerId, capturado: false, el: e.currentTarget };
  };
  const onMove = (e) => {
    if (!arrastre.current) return;
    const delta = e.clientX - arrastre.current.x;
    if (!arrastre.current.capturado) {
      if (Math.abs(delta) < UMBRAL_ARRASTRE) return;
      arrastre.current.capturado = true;
      arrastre.current.el.setPointerCapture?.(arrastre.current.id);
    }
    setDx(Math.max(-MAX - 28, Math.min(0, arrastre.current.dx0 + delta)));
  };
  const soltar = () => {
    if (!arrastre.current) return;
    arrastre.current = null;
    setDx((v) => (v < -MAX * 0.55 ? -MAX : 0));
  };

  return (
    <div className="swipe-wrap">
      <button className={"swipe-action" + (danger ? " swipe-action-mal" : "")}
        style={{ opacity: Math.min(1, -dx / MAX) }}
        onClick={() => { toque(18); setDx(0); onAction(); }}>
        {actionLabel}
      </button>
      <div className="swipe-front" style={{
        transform: `translateX(${dx}px)`,
        transition: arrastre.current ? "none" : "transform .2s cubic-bezier(.2,.8,.2,1)",
      }}
        onPointerDown={onDown} onPointerMove={onMove}
        onPointerUp={soltar} onPointerCancel={soltar}>
        {children}
      </div>
    </div>
  );
}

/** Tirar hacia abajo para refrescar, el gesto de Android para "esto
    puede estar desactualizado, pídelo otra vez" sin ir a buscar un
    botón. Solo se activa si ya se está arriba del todo: si hay algo
    que desplazar, tirar hacia abajo es simplemente hacer scroll. */
function PullToRefresh({ onRefresh, children }) {
  const [dy, setDy] = useState(0);
  const [estado, setEstado] = useState("reposo");
  const arranque = useRef(null);
  const UMBRAL = 64;

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse") return;
    if ((document.scrollingElement?.scrollTop || 0) > 2 || estado === "cargando") return;
    arranque.current = { y: e.clientY };
  };
  const onPointerMove = (e) => {
    if (!arranque.current) return;
    const delta = e.clientY - arranque.current.y;
    if (delta <= 0) { setDy(0); setEstado("reposo"); return; }
    const avance = delta * 0.5;
    setDy(Math.min(UMBRAL * 1.3, avance));
    setEstado(avance >= UMBRAL ? "listo" : "reposo");
  };
  const soltar = async () => {
    if (!arranque.current) return;
    const listo = estado === "listo";
    arranque.current = null;
    if (listo) {
      setEstado("cargando");
      toque(10);
      try { await onRefresh(); } finally { setEstado("reposo"); setDy(0); }
    } else {
      setEstado("reposo"); setDy(0);
    }
  };

  const activo = estado === "cargando" || dy > 4;
  return (
    <div onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={soltar} onPointerCancel={soltar}>
      <div
        className={"ptr" + (activo ? " ptr-on" : "") + (estado === "listo" ? " ptr-listo" : "")
          + (estado === "cargando" ? " ptr-cargando" : "")}
        style={{ height: estado === "cargando" ? 52 : Math.min(52, dy) }}
        aria-hidden="true"
      >
        <svg className="ptr-ico" viewBox="0 0 18 18" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2.5v9M9 11.5 5.8 8.3M9 11.5l3.2-3.2" />
        </svg>
      </div>
      {children}
    </div>
  );
}

/** Dos toques guiados la primera vez que se entra, señalando dónde vive
    el menú y dónde se arma la combinada: lo mínimo para no dejar a
    nadie mirando la pantalla en blanco preguntándose por dónde empezar.
    No exige tocar el elemento real —solo lo enmarca—, así que
    funciona igual si el objetivo aún no ha terminado su animación de
    entrada. */
function Coachmarks({ pasos, onSalir }) {
  const [paso, setPaso] = useState(0);
  const [rect, setRect] = useState(null);
  const primerBtn = useRef(null);

  useEffect(() => {
    const medir = () => {
      const el = pasos[paso]?.ref?.current;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [paso, pasos]);

  // El foco de teclado sigue al paso: sin esto, Tab seguiría recorriendo
  // lo que hay debajo del cristal en vez del propio aviso.
  useEffect(() => { primerBtn.current?.focus(); }, [paso]);

  if (!rect) return null;
  const s = pasos[paso];
  const ultimo = paso === pasos.length - 1;

  const siguiente = () => (ultimo ? terminar() : setPaso((p) => p + 1));
  const terminar = () => {
    try { localStorage.setItem("onboarding:v1", "1"); } catch (e) { /* nada */ }
    onSalir();
  };

  const pad = 8;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const r = Math.max(rect.width, rect.height) / 2 + pad;
  const arriba = rect.top > window.innerHeight / 2;
  const ANCHO = 258;
  const left = Math.min(Math.max(12, cx - ANCHO / 2), window.innerWidth - ANCHO - 12);

  return (
    <div className="coach-fondo" onClick={siguiente} role="dialog" aria-label={s.titulo}>
      <div className="coach-hueco" style={{ left: cx - r, top: cy - r, width: r * 2, height: r * 2 }} />
      <div className="coach-card" style={{ width: ANCHO, left,
        ...(arriba ? { bottom: window.innerHeight - rect.top + 14 } : { top: rect.bottom + 14 }) }}
        onClick={(e) => e.stopPropagation()}>
        <div className="coach-step">{paso + 1} / {pasos.length}</div>
        <div className="coach-title">{s.titulo}</div>
        <p className="coach-text">{s.texto}</p>
        <div className="coach-acts">
          <button className="btn btn-ghost" onClick={terminar}>Saltar</button>
          <button ref={primerBtn} className="btn btn-primary" onClick={siguiente}>
            {ultimo ? "Entendido" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Crest({ src, alt, size = 26 }) {
  return src ? (
    <img className="crest" src={src} alt={alt} width={size} height={size} loading="lazy" />
  ) : (
    <span className="crest crest-blank" style={{ width: size, height: size }} />
  );
}

/* --- LA CINTA DEL MINUTO: elemento firma ---
   Todo lo que ocurre en un partido se indexa por minuto.
   Esta cinta 0–90+ es la misma geometría en toda la app. */
function MinuteRibbon({ events = [], homeId, elapsed = null, max = 90, dense = false }) {
  const cap = Math.max(max, ...events.map((e) => num(e?.time?.elapsed)), 90);
  const pos = (m, extra = 0) =>
    Math.min(99.4, Math.max(0.6, ((m + (extra || 0) * 0.6) / cap) * 100));
  const marks = cap > 90 ? [15, 30, 45, 60, 75, 90, 105, 120] : [15, 30, 45, 60, 75];

  const glyph = (e) => {
    const d = (e.detail || "").toLowerCase();
    if (e.type === "Goal") return d.includes("own") ? "OG" : d.includes("penalty") && d.includes("missed") ? "×" : "●";
    if (e.type === "Card") return "▮";
    if (e.type === "subst") return "⇄";
    return "•";
  };
  const cls = (e) => {
    if (e.type === "Goal") {
      const d = (e.detail || "").toLowerCase();
      if (d.includes("missed")) return "ev-miss";
      if (d.includes("own")) return "ev-own";
      return "ev-goal";
    }
    if (e.type === "Card")
      return (e.detail || "").toLowerCase().includes("yellow") &&
        !(e.detail || "").toLowerCase().includes("red")
        ? "ev-yellow"
        : "ev-red";
    return "ev-sub";
  };

  return (
    <div className={"ribbon" + (dense ? " ribbon-dense" : "")}>
      <div className="ribbon-lane ribbon-home">
        {events
          .filter((e) => e.team?.id === homeId)
          .map((e, i) => (
            <span
              key={i}
              className={"ev " + cls(e)}
              style={{ left: pos(num(e.time?.elapsed), e.time?.extra) + "%" }}
              title={`${e.time?.elapsed}'${e.time?.extra ? "+" + e.time.extra : ""} · ${
                e.player?.name || ""
              } · ${e.detail || e.type}`}
            >
              {glyph(e)}
            </span>
          ))}
      </div>

      <div className="ribbon-track">
        {marks.map((m) => (
          <span key={m} className="tick" style={{ left: (m / cap) * 100 + "%" }}>
            <i />
            <b>{m}</b>
          </span>
        ))}
        {elapsed !== null && elapsed !== undefined && (
          <span className="now" style={{ left: pos(elapsed) + "%" }} />
        )}
      </div>

      <div className="ribbon-lane ribbon-away">
        {events
          .filter((e) => e.team?.id !== homeId)
          .map((e, i) => (
            <span
              key={i}
              className={"ev " + cls(e)}
              style={{ left: pos(num(e.time?.elapsed), e.time?.extra) + "%" }}
              title={`${e.time?.elapsed}'${e.time?.extra ? "+" + e.time.extra : ""} · ${
                e.player?.name || ""
              } · ${e.detail || e.type}`}
            >
              {glyph(e)}
            </span>
          ))}
      </div>
    </div>
  );
}

/* --- barra comparativa local vs visitante --- */
function VsBar({ label, home, away, unit = "", invert = false }) {
  const h = num(home),
    a = num(away);
  const tot = h + a;
  const hp = tot === 0 ? 50 : (h / tot) * 100;
  const better = invert ? h < a : h > a;
  return (
    <div className="vsrow">
      <span className={"vsval" + (tot && better ? " vsval-lead" : "")}>
        {home ?? "—"}
        {unit}
      </span>
      <div className="vsbody">
        <div className="vslabel">{label}</div>
        <div className="vstrack">
          <div className="vsfill vsfill-h" style={{ width: hp + "%" }} />
          <div className="vsfill vsfill-a" style={{ width: 100 - hp + "%" }} />
        </div>
      </div>
      <span className={"vsval vsval-a" + (tot && !better && h !== a ? " vsval-lead" : "")}>
        {away ?? "—"}
        {unit}
      </span>
    </div>
  );
}

function FormPips({ form = "", size = "md" }) {
  return (
    <span className={"form form-" + size}>
      {(form || "").slice(-6).split("").map((c, i) => (
        <i key={i} className={"pip pip-" + c} title={c}>
          {c}
        </i>
      ))}
    </span>
  );
}

