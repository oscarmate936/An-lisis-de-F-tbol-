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

/** El menú de tres puntos: agrupa acciones secundarias por fila para
    no llenar la lista de botones sueltos. Se abre como una hoja
    inferior, igual que el resto de menús de la app. */
function OverflowMenu({ label = "Más opciones", items }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button className="overflow-btn" aria-label={label} onClick={() => setAbierto(true)}>
        <svg viewBox="0 0 18 18" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="3.6" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="14.4" r="1.5" />
        </svg>
      </button>
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
                  onClick={() => { setAbierto(false); it.onClick(); }}>
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

