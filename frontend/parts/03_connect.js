/* ============================================================
   Conexión
   ============================================================ */
/** Esqueleto de carga: enseñar la forma de lo que viene se percibe más
    rápido que una rueda girando, y evita el salto al llegar los datos. */
function Skeleton({ filas = 5, alto = 56 }) {
  return (
    <div className="skel" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div className="skel-fila" key={i} style={{ height: alto, animationDelay: i * 90 + "ms" }} />
      ))}
    </div>
  );
}

function Connect({ onConnect, busy, error, initialKey }) {
  const [k, setK] = useState(initialKey || "");
  return (
    <div className="gate">
      <div className="gate-mark">
        <span className="gate-word">ACIERTO</span>
        <span className="gate-sub">terminal de análisis · API-Football v3</span>
      </div>

      <div className="gate-que">
        <p>
          Calcula la probabilidad de cada mercado de un partido a partir de las fuerzas de
          ataque y defensa de los equipos, y te dice qué posibilidades tiene de cumplirse una
          combinada entera, teniendo en cuenta que dentro de un mismo partido las cosas van
          juntas.
        </p>
        <p className="gate-no">
          No da consejos, no conecta con ninguna casa de apuestas y no maneja dinero. Son
          estimaciones de un modelo, con su margen de error, para comparar entre sí.
        </p>
      </div>

      <div className="gate-card">
        <label className="fl" htmlFor="key">
          Clave de API
        </label>
        <input
          id="key"
          className="input mono"
          type="password"
          placeholder="pega tu clave de api-football"
          value={k}
          onChange={(e) => setK(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && k.trim() && onConnect(k.trim())}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="gate-note">
          Hace falta una clave de <b>API-Football</b>: te registras en su web y la copias de
          <b> Account → My Access</b>. El plan gratuito da 100 peticiones al día, que llegan
          para varios partidos porque todo lo descargado se guarda en caché.
        </p>
        <p className="gate-note">
          Se guarda solo en el almacenamiento privado de esta app, nunca se envía a ningún
          otro sitio. Si tu clave ha estado expuesta, regenérala antes de pegarla aquí.
        </p>
        {error && <div className="alert">{error}</div>}
        <button className="btn btn-primary" disabled={!k.trim() || busy} onClick={() => onConnect(k.trim())}>
          {busy ? "Comprobando…" : "Conectar"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Cartelera
   ============================================================ */
/** Una fila de la cartelera. Sale del cuerpo de la lista para poder
    pintarla también en la vista por horas, sin duplicar el marcado. */
const FxRow = React.memo(function FxRow({ f, n, onOpen, onTeam, fav, onFijar, liga }) {
  const st = f.fixture.status.short;
  const enJuego = LIVE_STATES.includes(st);
  const jugado = DONE_STATES.includes(st);
  const raro = ["PST", "CANC", "SUSP", "ABD", "AWD", "WO"].includes(st);
  const [menu, setMenu] = useState(false);
  /* Mantener pulsado el partido abre un atajo a lo que normalmente
     costaría dos toques: ver un equipo, o fijar su liga, sin tener
     que entrar primero al partido. */
  const press = useLongPress(() => setMenu(true));
  return (
    <>
      <button className={"fx" + (n ? " fx-marcada" : "")}
        onContextMenu={(e) => { e.preventDefault(); setMenu(true); }}
        onPointerDown={press.onPointerDown} onPointerMove={press.onPointerMove}
        onPointerUp={press.onPointerUp} onPointerCancel={press.onPointerCancel}
        onClick={(e) => press.onClick(e, () => onOpen(f))}>
        <span className={"fx-estado" + (enJuego ? " fx-estado-vivo" : raro ? " fx-estado-raro" : "")}>
          {enJuego ? (
            <><span className="dot" />{f.fixture.status.elapsed ?? ""}′</>
          ) : jugado ? "Final" : raro ? st : clock(f.fixture.date)}
        </span>
        <span className="fx-teams">
          {liga && <span className="fx-liga">{f.league.name}</span>}
          <span className={"fx-team" + (f.teams.home.winner ? " fx-win" : "")}>
            <Crest src={f.teams.home.logo} alt="" size={20} />
            <span className="fx-name">{f.teams.home.name}</span>
          </span>
          <span className={"fx-team" + (f.teams.away.winner ? " fx-win" : "")}>
            <Crest src={f.teams.away.logo} alt="" size={20} />
            <span className="fx-name">{f.teams.away.name}</span>
          </span>
        </span>
        <span className="fx-score mono">
          <b>{f.goals.home ?? "–"}</b>
          <b>{f.goals.away ?? "–"}</b>
        </span>
        <span className="fx-marcado">
          {n > 0 && <i className="mono fx-chip" title="selecciones tuyas en este partido">{n}</i>}
        </span>
        <span className="fx-go">›</span>
      </button>
      <OverflowMenu trigger={false} open={menu} onOpenChange={setMenu}
        label={`Más opciones — ${f.teams.home.name} contra ${f.teams.away.name}`}
        items={[
          { label: "Abrir partido", onClick: () => onOpen(f) },
          onTeam && { label: `Ver ${f.teams.home.name}`, onClick: () => onTeam(f.teams.home, f.league) },
          onTeam && { label: `Ver ${f.teams.away.name}`, onClick: () => onTeam(f.teams.away, f.league) },
          onFijar && { label: fav ? `Quitar ${f.league.name} de fijadas` : `Fijar ${f.league.name} arriba`, onClick: onFijar },
        ].filter(Boolean)}
      />
    </>
  );
});

