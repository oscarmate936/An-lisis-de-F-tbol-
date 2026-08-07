/* ============================================================
   Piezas de mercado
   ============================================================ */

const ProbBar = React.memo(function ProbBar({ p, tone = "", marca = false }) {
  return (
    <div className={"pbar" + (marca ? " pbar-marca" : "")}>
      <div className={"pfill " + tone} style={{ width: clamp(p * 100, 0, 100) + "%" }} />
    </div>
  );
});

/** Fila estándar: nombre, selección, barra, % y botón de añadir. */
/* Un porcentaje y una cuota son el mismo número dado la vuelta, pero
   comparar con una casa se hace en cuotas. Se elige una vez y manda en
   todas las listas de mercados. */
const ModoProb = React.createContext("pct");
const fmtP = (p, modo) => (modo === "cuota"
  ? (p > 0.001 ? (1 / p).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—")
  : pc(p));

const MRow = React.memo(function MRow({ m, onPick, picked, hideMercado }) {
  if (!m) return null;
  const tone = m.p >= 0.6 ? "pfill-hi" : m.p < 0.33 ? "pfill-lo" : "";
  return (
    <div className={"mrow" + (picked ? " mrow-on" : "")}>
      <button
        className={"addbtn" + (picked ? " addbtn-on" : "")}
        onClick={() => onPick(m)}
        aria-label={picked ? "Quitar del pronóstico" : "Añadir al pronóstico"}
        title={picked ? "Quitar del pronóstico" : "Añadir al pronóstico"}
      >
        {picked ? "−" : "+"}
      </button>
      <div className="mrow-lab">
        {!hideMercado && <span className="mrow-mkt">{m.mercado}</span>}
        <span className="mrow-sel">{m.sel}</span>
        {m.nota && <span className="mrow-note">{m.nota}</span>}
      </div>
      <ProbBar p={m.p} tone={tone} marca />
      <span className="mono mrow-p" title={m.p > 0 ? `1 de cada ${(1 / m.p).toFixed(1)}` : ""}>
        <ModoProb.Consumer>{(modo) => fmtP(m.p, modo)}</ModoProb.Consumer>
      </span>
    </div>
  );
});

/** Escalera divergente: el motivo visual que se repite en goles,
    córners, tarjetas, disparos y totales por equipo. */
const Ladder = React.memo(function Ladder({ rows, onPick, isPicked, leftLabel = "Menos de", rightLabel = "Más de" }) {
  return (
    <div className="ld">
      <div className="ldhead">
        <span className="ldhl">{leftLabel}</span>
        <span className="ldhc">Línea</span>
        <span className="ldhr">{rightLabel}</span>
      </div>
      {rows.map((r) => {
        const u = r.under, o = r.over;
        const lead = u && o ? (u.p > o.p ? "u" : "o") : null;
        return (
          <div className="ldrow" key={r.line}>
            <button
              className={"ldside ldu" + (lead === "u" ? " ldlead" : "") + (u && isPicked(u) ? " ldpicked" : "")}
              onClick={() => u && onPick(u)}
              disabled={!u}
            >
              <span className="mono ldpct">{u ? pc(u.p) : "—"}</span>
              <span className="ldtrack">
                <span className="ldbar" style={{ width: u ? clamp(u.p * 100, 2, 100) + "%" : 0 }} />
              </span>
            </button>
            <span className="mono ldline">{r.line}</span>
            <button
              className={"ldside ldo" + (lead === "o" ? " ldlead" : "") + (o && isPicked(o) ? " ldpicked" : "")}
              onClick={() => o && onPick(o)}
              disabled={!o}
            >
              <span className="ldtrack">
                <span className="ldbar" style={{ width: o ? clamp(o.p * 100, 2, 100) + "%" : 0 }} />
              </span>
              <span className="mono ldpct">{o ? pc(o.p) : "—"}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

/** Barra de tres tramos para 1X2 y similares. */
const TriBar = React.memo(function TriBar({ items, onPick, isPicked }) {
  if (!items || items.some((x) => !x)) return null;
  return (
    <div className="tri">
      <div className="tritrack">
        {items.map((m, i) => (
          <button
            key={i}
            className={"triseg tri" + i + (isPicked && isPicked(m) ? " triseg-on" : "")}
            style={{ width: Math.max(6, m.p * 100) + "%" }}
            onClick={() => onPick && onPick(m)}
            title={`${m.sel} · ${pc(m.p)}`}
          >
            <span className="mono">{pc0(m.p)}</span>
          </button>
        ))}
      </div>
      <div className="trilabels">
        {items.map((m, i) => (
          <span key={i} className={"trilab tl" + i}>{m.sel}</span>
        ))}
      </div>
    </div>
  );
});

function Conf({ level, hint }) {
  return (
    <span className={"conf conf-" + level} title={hint}>
      <i /><i /><i />
      {level === "alta" ? "Muestra sólida" : level === "media" ? "Muestra media" : "Muestra corta"}
    </span>
  );
}

/* ============================================================
   MERCADOS
   ============================================================ */

/* Cuatro siluetas para las cuatro posiciones: en una tabla de treinta
   filas, la forma se distingue antes que la letra. */
function IcoPos({ g }) {
  const d = {
    G: "M9 3.5c-2 0-3.2 1.2-3.2 2.8 0 2.4 3.2 5.2 3.2 5.2s3.2-2.8 3.2-5.2C12.2 4.7 11 3.5 9 3.5z",
    D: "M9 2.6 14 4.4v4.2c0 3.2-2.2 5.4-5 6.4-2.8-1-5-3.2-5-6.4V4.4z",
    M: "M3 9h12M9 3v12",
    F: "M4 13 9 3l5 10-5-2.4z",
  }[g] || "M9 3v12";
  return (
    <svg className="ico-pos" viewBox="0 0 18 18" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
}
const NOMBRE_POS = { todas: "Todas", G: "Porteros", D: "Defensas", M: "Medios", F: "Delanteros" };

const FAMS_BASE = [
  "Resumen", "Resultado", "Goles", "Equipos", "Hándicap", "Mitades",
  "Combinadas", "Córners", "Tarjetas", "Disparos", "Jugadores", "Mercado",
];

