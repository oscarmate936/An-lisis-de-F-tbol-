/* ============================================================
   COMBINADA
   Lo marcado en cualquier partido vive fuera del partido. Dentro de
   un mismo encuentro las selecciones están correlacionadas y la
   conjunta se rehace sobre la matriz de marcadores (o se simula si
   hay jugadores); entre partidos distintos se multiplica, que ahí sí
   son sucesos independientes.
   ============================================================ */

const SLIP_KEY = "seleccion:v1";
const BOL_KEY = "boletos:v1";
const slipSubs = new Set();
const bolSubs = new Set();

/* Varios boletos a la vez. El primero conserva la clave de siempre, así
   que lo que ya hubiera guardado sigue donde estaba. */
const slipKeyDe = (id) => (id === "b1" ? SLIP_KEY : `${SLIP_KEY}:${id}`);
let bolCache = null;

/** Aviso a toda la app cuando cambian las selecciones: la barra
    superior lleva el contador y no puede quedarse desfasada. */
function slipOn(fn) { slipSubs.add(fn); return () => { slipSubs.delete(fn); }; }
function slipEmit(lista) {
  slipSubs.forEach((f) => { try { f(lista); } catch (e) { /* un oyente roto no rompe el resto */ } });
}
function bolOn(fn) { bolSubs.add(fn); return () => { bolSubs.delete(fn); }; }
function bolEmit() {
  bolSubs.forEach((f) => { try { f(bolCache); } catch (e) { /* nada */ } });
}

async function bolRead() {
  if (bolCache) return bolCache;
  try {
    const r = await storage.get(BOL_KEY);
    const j = JSON.parse(r.value);
    if (j && Array.isArray(j.lista) && j.lista.length) {
      bolCache = { activo: j.activo || j.lista[0].id, lista: j.lista };
      return bolCache;
    }
  } catch (e) { /* primera vez: el boleto de siempre */ }
  bolCache = { activo: "b1", lista: [{ id: "b1", nombre: "Combinada 1" }] };
  return bolCache;
}

async function bolWrite(b) {
  bolCache = b;
  try { await storage.set(BOL_KEY, JSON.stringify(b)); } catch (e) { /* sin espacio */ }
  bolEmit();
  avisarOtras("bol");
  return b;
}

const nuevoId = () => "b" + Date.now().toString(36).slice(-6);

async function bolActivar(id) {
  const b = await bolRead();
  if (b.activo === id || !b.lista.some((x) => x.id === id)) return b;
  await bolWrite({ ...b, activo: id });
  slipEmit(await slipRead());
  return bolCache;
}

async function bolNuevo(nombre) {
  const b = await bolRead();
  const id = nuevoId();
  await bolWrite({ activo: id, lista: [...b.lista, { id, nombre: nombre || `Combinada ${b.lista.length + 1}` }] });
  slipEmit([]);
  return id;
}

/** Duplicar sirve para probar una variante sin tocar la original. */
async function bolDuplicar() {
  const b = await bolRead();
  const actual = await slipRead();
  const id = nuevoId();
  const base = b.lista.find((x) => x.id === b.activo)?.nombre || "Combinada";
  await bolWrite({ activo: id, lista: [...b.lista, { id, nombre: `${base} (variante)` }] });
  await slipWrite(actual.map((p) => ({ ...p })));
  return id;
}

async function bolRenombrar(id, nombre) {
  const b = await bolRead();
  const n = String(nombre || "").trim().slice(0, 40) || "Sin nombre";
  await bolWrite({ ...b, lista: b.lista.map((x) => (x.id === id ? { ...x, nombre: n } : x)) });
}

async function bolBorrar(id) {
  const b = await bolRead();
  if (b.lista.length < 2) return b;   // siempre queda uno
  try { await storage.delete(slipKeyDe(id)); } catch (e) { /* ya no estaba */ }
  const lista = b.lista.filter((x) => x.id !== id);
  await bolWrite({ activo: b.activo === id ? lista[0].id : b.activo, lista });
  slipEmit(await slipRead());
  return bolCache;
}

async function slipRead(id) {
  const b = await bolRead();
  try {
    const r = await storage.get(slipKeyDe(id || b.activo));
    const j = JSON.parse(r.value);
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

async function slipWrite(lista, id) {
  const b = await bolRead();
  const l = (lista || []).slice(-160);
  try { await storage.set(slipKeyDe(id || b.activo), JSON.stringify(l)); } catch (e) { /* sin espacio */ }
  if (!id || id === b.activo) slipEmit(l);
  avisarOtras("slip");
  return l;
}

const slipId = (fx, key) => `${fx}|${key}`;
const slipViva = (p) => !!p && !p.off;

/* Un partido que ya empezó no lo predice un modelo de previa: su
   probabilidad es de antes del pitido inicial y mezclarla con partidos
   futuros da un número que no significa nada. Sale del total. */
const empezado = (d) => { const t = Date.parse(d); return isFinite(t) && t < Date.now(); };

/* ---------- deshacer ---------- */

/* Quitar es un solo clic y en el móvil el aspa cae justo bajo el pulgar.
   La lista anterior se guarda unos segundos por si el clic no era ese. */
const undoSubs = new Set();
let undoActual = null;

function undoOn(fn) { undoSubs.add(fn); return () => { undoSubs.delete(fn); }; }

/* Confirmaciones breves: sin ellas, pulsar "Copiar" o "Exportar" no
   devuelve ninguna señal y uno se queda dudando de si pasó algo. */
const avisoSubs = new Set();
let avisoActual = null;
function avisoOn(fn) { avisoSubs.add(fn); return () => { avisoSubs.delete(fn); }; }
function avisar(texto, tono) {
  avisoActual = { texto, tono: tono || "ok", id: Date.now() };
  avisoSubs.forEach((f) => { try { f(avisoActual); } catch (e) { /* nada */ } });
  const mio = avisoActual.id;
  setTimeout(() => {
    if (avisoActual && avisoActual.id === mio) {
      avisoActual = null;
      avisoSubs.forEach((f) => { try { f(null); } catch (e) { /* nada */ } });
    }
  }, 3200);
}
function undoEmit() {
  undoSubs.forEach((f) => { try { f(undoActual); } catch (e) { /* nada */ } });
}
function undoOfrecer(lista, texto, restaurar) {
  undoActual = {
    lista: (lista || []).map((p) => ({ ...p })), texto, restaurar,
    id: Date.now(), bol: bolCache ? bolCache.activo : null,
  };
  undoEmit();
  const mio = undoActual.id;
  setTimeout(() => {
    if (undoActual && undoActual.id === mio) { undoActual = null; undoEmit(); }
  }, 9000);
}
function undoDescartar() { undoActual = null; undoEmit(); }
async function undoAplicar() {
  const u = undoActual;
  if (!u) return;
  undoActual = null;
  undoEmit();
  // Borrar un boleto entero necesita rehacerlo, no solo devolver la lista.
  if (u.restaurar) { try { await u.restaurar(); } catch (e) { /* ya no se puede */ } return; }
  if (u.bol && bolCache && u.bol !== bolCache.activo) await bolActivar(u.bol);
  await slipWrite(u.lista);
}

/* ---------- copia de seguridad ---------- */

/* Todo esto vive en el almacenamiento privado del navegador. Si lo
   limpias o cambias de ordenador, desaparece sin avisar; por eso se
   puede sacar y volver a meter en un archivo. La clave de la API no
   entra en la copia a propósito. */
const CLAVES_COPIA = ["ligas-fav:v1", "ultima-pestana", "ultimo:v1",
  "historial:v1", "resultados:v1"];

async function respaldoExportar() {
  const b = await bolRead();
  const picks = {};
  for (const x of b.lista) picks[x.id] = await slipRead(x.id);
  const ajustes = {};
  for (const k of CLAVES_COPIA) {
    try {
      const r = await storage.get(k);
      if (r?.value) ajustes[k] = r.value;
    } catch (e) { /* esa no estaba */ }
  }
  const aspecto = {};
  try {
    ["tema", "densidad", "letra"].forEach((k) => {
      const v = localStorage.getItem(k);
      if (v) aspecto[k] = v;
    });
  } catch (e) { /* nada */ }
  return { app: "acierto", version: 18, fecha: new Date().toISOString(), boletos: b, picks, ajustes, aspecto };
}

async function respaldoImportar(json) {
  // "pizarra" es el nombre anterior de la app: las copias exportadas antes
  // del cambio de nombre se siguen pudiendo restaurar.
  if (!json || (json.app !== "acierto" && json.app !== "pizarra") || !json.boletos)
    throw new Error("Ese archivo no es una copia de Acierto.");
  const lista = json.boletos.lista;
  if (!Array.isArray(lista) || !lista.length)
    throw new Error("La copia no contiene ningún boleto.");
  for (const [id, picks] of Object.entries(json.picks || {})) {
    try { await storage.set(slipKeyDe(id), JSON.stringify(Array.isArray(picks) ? picks : [])); }
    catch (e) { /* seguimos con el resto */ }
  }
  for (const [k, v] of Object.entries(json.ajustes || {})) {
    try { await storage.set(k, v); } catch (e) { /* idem */ }
  }
  try {
    Object.entries(json.aspecto || {}).forEach(([k, v]) => localStorage.setItem(k, v));
  } catch (e) { /* nada */ }
  await bolWrite({ activo: json.boletos.activo || lista[0].id, lista });
  slipEmit(await slipRead());
  return lista.length;
}

/* ---------- sincronía entre pestañas ---------- */

/* Con la app abierta dos veces, cada copia tenía sus avisos en memoria y
   no se enteraba de lo que marcabas en la otra. */
let canal = null;
try {
  canal = new BroadcastChannel("acierto");
  canal.onmessage = async (e) => {
    const tipo = e && e.data && e.data.tipo;
    if (!tipo) return;
    if (tipo === "hist") { histEmit(await histRead()); return; }
    bolCache = null;              // lo escrito fuera manda
    await bolRead();
    if (tipo === "bol") bolEmit();
    slipEmit(await slipRead());
  };
} catch (e) { canal = null; /* navegador sin canal: se sigue igual, sin sincronía */ }
const avisarOtras = (tipo) => { try { if (canal) canal.postMessage({ tipo }); } catch (e) { /* nada */ } };

/* ---------- resolver lo ya jugado ---------- */

/** Las estadísticas por jugador del partido, en lo que hace falta. */
function statsJugadores(resp) {
  const out = new Map();
  (resp || []).forEach((t) => (t.players || []).forEach((p) => {
    const s = (p.statistics && p.statistics[0]) || {};
    const id = p.player && p.player.id;
    if (id) out.set(id, {
      gol: num(s.goals && s.goals.total),
      sot: num(s.shots && s.shots.on),
      sh: num(s.shots && s.shots.total),
    });
  }));
  return out;
}

/** El marcador real pasa por el mismo predicado con el que se calculó la
    probabilidad: si se cumple, la selección entró. No hay margen de
    interpretación porque es exactamente la misma condición. */
function resolverPick(pick, solver, gh, ga, jugadores) {
  if (pick.simRef) {
    if (!jugadores) return "?";
    const st = jugadores.get(pick.simRef.playerId);
    if (!st) return "?";
    const v = pick.simRef.kind === "gol" ? st.gol : pick.simRef.kind === "sot" ? st.sot : st.sh;
    if (!fin(v)) return "?";
    return v > pick.simRef.line ? "ok" : "no";
  }
  const c = solver ? solver.byKey.get(pick.key) : null;
  if (!c || !c.pred || !fin(gh) || !fin(ga)) return "?";
  const x = clamp(Math.round(gh), 0, GRID - 1);
  const y = clamp(Math.round(ga), 0, GRID - 1);
  return c.pred(x, y) ? "ok" : "no";
}

/** Resuelve todas las selecciones de un partido terminado. Los mercados
    de córners y tarjetas se quedan sin resolver: no se guardó con qué
    condición se calcularon. */
async function resolverGrupo(api, grupo) {
  const r = await api("fixtures", { id: grupo.fx }, TTL.hour);
  const f = r && r[0];
  if (!f) throw new Error("La API ya no devuelve ese partido.");
  const est = f.fixture && f.fixture.status && f.fixture.status.short;
  if (!DONE_STATES.includes(est)) throw new Error("Ese partido todavía no ha terminado.");
  const gh = num(f.goals && f.goals.home);
  const ga = num(f.goals && f.goals.away);
  let jugadores = null;
  if (grupo.picks.some((p) => p.simRef)) {
    try { jugadores = statsJugadores(await api("fixtures/players", { fixture: grupo.fx }, TTL.daily)); }
    catch (e) { /* sin estadísticas de jugador: quedan sin resolver */ }
  }
  const solver = matchSolver(grupo.partido);
  const res = {};
  grupo.picks.forEach((p) => { res[p.id] = resolverPick(p, solver, gh, ga, jugadores); });
  return { marcador: [gh, ga], res };
}

/** Cómo quedó una combinada entera: basta que falle una. */
function veredicto(picks) {
  const vivas = (picks || []).filter(slipViva);
  if (!vivas.length) return "?";
  if (vivas.some((p) => p.res === "no")) return "no";
  if (vivas.every((p) => p.res === "ok")) return "ok";
  return "?";
}

/* ---------- historial ---------- */

const HIST_KEY = "historial:v1";
const histSubs = new Set();
function histOn(fn) { histSubs.add(fn); return () => { histSubs.delete(fn); }; }
function histEmit(l) {
  histSubs.forEach((f) => { try { f(l); } catch (e) { /* nada */ } });
}

async function histRead() {
  try {
    const r = await storage.get(HIST_KEY);
    const j = JSON.parse(r.value);
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

async function histWrite(lista) {
  const l = (lista || []).slice(0, 300);
  try { await storage.set(HIST_KEY, JSON.stringify(l)); } catch (e) { /* sin espacio */ }
  histEmit(l);
  avisarOtras("hist");
  return l;
}

async function histGuardar(entrada) {
  const l = await histRead();
  return histWrite([entrada, ...l]);
}

/** La ficha que se archiva: lo justo para medir el acierto después. */
function fichaHistorial(nombre, res, lista) {
  const picks = [];
  res.grupos.forEach((g) => {
    const d = g.partido || {};
    g.picks.filter(slipViva).forEach((p) => picks.push({
      fam: p.fam, mercado: p.mercado, sel: p.sel, p: p.p, res: p.res || "?",
      home: d.home, away: d.away, date: d.date, liga: d.liga,
      marcador: p.marcador || null,
    }));
  });
  return {
    id: "h" + Date.now().toString(36), nombre,
    fecha: new Date().toISOString(),
    p: res.p, ingenua: res.ingenua, n: picks.length, partidos: res.grupos.length,
    resultado: veredicto(res.grupos.flatMap((g) => g.picks)),
    picks,
  };
}

/** Tu propia calibración, no la del modelo: agrupa TUS selecciones ya
    resueltas por la probabilidad que se les dio y la compara con lo que
    de verdad pasó. Es lo único que dice si eliges bien. */
function calibraPropia(hist) {
  const picks = [];
  (hist || []).forEach((h) => (h.picks || []).forEach((p) => {
    if ((p.res === "ok" || p.res === "no") && fin(p.p)) picks.push(p);
  }));
  if (!picks.length) return null;

  const cortes = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.01]];
  const bins = cortes.map(([a, b]) => ({ a, b, n: 0, ok: 0, sp: 0 }));
  let brier = 0;
  picks.forEach((p) => {
    const y = p.res === "ok" ? 1 : 0;
    brier += (p.p - y) * (p.p - y);
    const bin = bins.find((x) => p.p >= x.a && p.p < x.b) || bins[bins.length - 1];
    bin.n++; bin.ok += y; bin.sp += p.p;
  });

  const cerradas = (hist || []).filter((h) => h.resultado === "ok" || h.resultado === "no");
  const porFamilia = new Map();
  picks.forEach((p) => {
    const f = p.fam || "Otros";
    if (!porFamilia.has(f)) porFamilia.set(f, { fam: f, n: 0, ok: 0, sp: 0 });
    const x = porFamilia.get(f);
    x.n++; x.ok += p.res === "ok" ? 1 : 0; x.sp += p.p;
  });

  return {
    n: picks.length,
    acertadas: picks.filter((p) => p.res === "ok").length,
    esperadas: picks.reduce((a, p) => a + p.p, 0),
    brier: brier / picks.length,
    bins: bins.filter((b) => b.n > 0),
    familias: [...porFamilia.values()].filter((f) => f.n >= 3).sort((a, b) => b.n - a.n),
    combis: cerradas.length,
    combisOk: cerradas.filter((h) => h.resultado === "ok").length,
    combisEsp: cerradas.reduce((a, h) => a + (fin(h.p) ? h.p : 0), 0),
  };
}

/* ---------- el partido, rehecho a partir de la ficha guardada ---------- */

/* Rehacer la matriz y el catálogo cuesta lo suyo y hace falta muchas
   veces seguidas (una por cada "¿y si quito esta?"), así que se guarda
   por firma del partido. */
const solverCache = new Map();

function matchSolver(partido) {
  if (!partido || !fin(partido.lh) || !fin(partido.la)) return null;
  const ck = [partido.home, partido.away, partido.lh, partido.la, partido.rho,
    partido.corr, partido.theta, partido.nu, partido.share].join("|");
  if (solverCache.has(ck)) return solverCache.get(ck);

  const opts = {
    rho: partido.rho ?? -0.13, corr: partido.corr || "dc",
    theta: partido.theta ?? 0.06, nu: partido.nu ?? 1,
  };
  const sh = fin(partido.share) ? partido.share : 0.45;
  const hOpts = { ...opts, rho: opts.rho * 0.75, theta: (opts.theta ?? 0.06) * 0.75, n: HGRID };
  const m = buildMatrix(partido.lh, partido.la, { ...opts, n: GRID });
  const cat = buildMarkets({
    m,
    m1: buildMatrix(partido.lh * sh, partido.la * sh, hOpts),
    m2: buildMatrix(partido.lh * (1 - sh), partido.la * (1 - sh), hOpts),
    lh: partido.lh, la: partido.la, opts,
    homeName: partido.home, awayName: partido.away,
  });
  const solver = { m, cat, byKey: new Map(cat.map((x) => [x.key, x])) };
  solverCache.set(ck, solver);
  if (solverCache.size > 24) solverCache.delete(solverCache.keys().next().value);
  return solver;
}

/* ---------- probabilidad conjunta de un partido ---------- */

/** Probabilidad de que se cumplan a la vez todas las selecciones de UN
    partido. Los mercados de goles salen exactos de la matriz; los de
    jugador exigen simular, porque los remates de un delantero y los
    goles de su equipo van juntos; lo que no encaja en ninguno de los
    dos (córners, tarjetas) se multiplica aparte. */
function jointDe(partido, picks, { sims = 14000 } = {}) {
  const lista = (picks || []).filter(slipViva);
  const ingenua = lista.reduce((a, b) => a * (fin(b.p) ? b.p : 1), 1);
  if (!lista.length) return { p: 1, ingenua: 1, modo: "vacia", exacto: true };

  const s = matchSolver(partido);
  if (!s) return { p: ingenua, ingenua, modo: "producto", exacto: false };

  const conPred = [], props = [], sueltas = [];
  lista.forEach((p) => {
    const full = s.byKey.get(p.key);
    if (full && full.pred) conPred.push(full);
    else if (p.simRef && partido.homeId) props.push(p);
    else sueltas.push(p);
  });
  const resto = sueltas.reduce((a, b) => a * (fin(b.p) ? b.p : 1), 1);

  if (props.length) {
    const ids = new Set(props.map((p) => p.simRef.playerId));
    const guardados = new Map((partido.players || []).map((j) => [j.id, j]));
    const jugadores = [...ids].map((id) => {
      const j = guardados.get(id);
      const ref = props.find((p) => p.simRef.playerId === id).simRef;
      return j || { id, teamId: ref.teamId, lamGl: ref.lamGl || 0, lamSot: ref.lamSot || 0, lamSh: ref.lamSh || 0 };
    }).filter((j) => fin(j.lamGl) || fin(j.lamSot) || fin(j.lamSh));
    if (jugadores.length === ids.size) {
      const r = mcJoint({
        m: s.m, lh: partido.lh, la: partido.la,
        picks: [...conPred, ...props], players: jugadores,
        homeId: partido.homeId, n: sims,
      });
      if (r && fin(r.p)) {
        return { p: r.p * resto, ingenua, modo: "simulada", exacto: false, se: r.se * resto, sims };
      }
    }
  }

  const exacta = conPred.length ? sumWhere(s.m, (x, y) => conPred.every((k) => k.pred(x, y))) : 1;
  return {
    p: exacta * resto, ingenua,
    modo: sueltas.length ? "mixta" : "exacta",
    exacto: sueltas.length === 0,
    nExactas: conPred.length,
  };
}

/* ---------- la combinada entera ---------- */

const RAPIDO = { sims: 5000 };

/** Agrupa por partido, calcula la conjunta de cada uno, multiplica entre
    ellos y mide cuánto cuesta cada selección: qué probabilidad tendría
    la combinada entera si esa se quitara. Ese "coste" es lo único que
    permite decidir cuál sobra. */
function combinada(lista, opciones) {
  const conViejos = !!(opciones && opciones.viejos);
  // Calcular "sin esta" es una simulación de más por cada pata con
  // jugador: quien solo necesita p/nPicks/nPartidos (el resumen de la
  // barra de otros partidos, por ejemplo) puede saltárselo.
  const conCostes = !opciones || opciones.costes !== false;
  const todas = lista || [];
  const porPartido = new Map();
  todas.forEach((s) => {
    if (!porPartido.has(s.fx)) porPartido.set(s.fx, { fx: s.fx, partido: s.partido, picks: [] });
    const g = porPartido.get(s.fx);
    if (!g.partido && s.partido) g.partido = s.partido;
    g.picks.push(s);
  });

  const grupos = [...porPartido.values()]
    .map((g) => {
      const vivas = g.picks.filter(slipViva);
      const caducado = empezado(g.partido && g.partido.date);
      return {
        ...g, vivas, caducado,
        cuenta: vivas.length > 0 && (conViejos || !caducado),
        conjunta: vivas.length ? jointDe(g.partido, vivas) : null,
      };
    })
    .sort((a, b) => new Date(a.partido?.date || 0) - new Date(b.partido?.date || 0));

  if (!grupos.length) return null;

  let p = 1, ingenua = 1, nVivas = 0, aprox = false, simulada = false, incompatible = false;
  grupos.forEach((g) => {
    if (!g.conjunta || !g.cuenta) return;
    const pj = fin(g.conjunta.p) ? g.conjunta.p : g.conjunta.ingenua;
    if (!(pj > 1e-12)) incompatible = true;
    if (!g.conjunta.exacto) aprox = true;
    if (g.conjunta.modo === "simulada") simulada = true;
    p *= pj;
    ingenua *= g.conjunta.ingenua;
    nVivas += g.vivas.length;
  });

  /* Coste de cada selección: la combinada sin ella. Los picks son los
     mismos objetos que vive la combinada guardada, así que si un grupo
     se queda fuera (partido caducado con "viejos" apagado) hay que
     borrar el valor en vez de dejarlo tal cual: si no, se queda pegado
     el coste de la última vez que ese grupo sí contó, calculado sobre
     una combinada distinta a la de ahora. */
  if (conCostes) grupos.forEach((g) => {
    if (!g.conjunta || !g.cuenta) {
      g.vivas.forEach((pick) => { pick.sinEsta = undefined; });
      return;
    }
    const pj = fin(g.conjunta.p) ? g.conjunta.p : g.conjunta.ingenua;
    const fuera = pj > 1e-12 ? p / pj : 0;
    g.vivas.forEach((pick) => {
      const resto = g.vivas.filter((x) => x.id !== pick.id);
      const sin = resto.length ? jointDe(g.partido, resto, RAPIDO) : { p: 1 };
      pick.sinEsta = fuera * (fin(sin.p) ? sin.p : 1);
    });
  });

  return {
    grupos, p, ingenua,
    nPicks: nVivas,
    nApagadas: todas.filter((x) => x.off).length,
    nPartidos: grupos.filter((g) => g.cuenta).length,
    caducados: grupos.filter((g) => g.caducado && g.vivas.length).length,
    aprox, simulada, incompatible,
  };
}

/** La cadena: descomposición exacta de la combinada en eslabones. Cada
    selección aporta -log de lo que multiplica una vez dadas las
    anteriores, así que los tramos suman justo el total. Multiplicar es
    sumar en logaritmos, y eso es lo que la barra dibuja. */
function cadena(res) {
  if (!res || !(res.p > 0)) return [];
  const links = [];
  res.grupos.forEach((g) => {
    if (!g.vivas.length || !g.cuenta) return;
    let previa = 1;
    g.vivas.forEach((pick, i) => {
      const hasta = g.vivas.slice(0, i + 1);
      // Todos los eslabones con el mismo presupuesto de simulación: usar
      // el de g.conjunta (más preciso, pero con otra tirada de números
      // aleatorios) solo para el último dejaba el tramo final comparando
      // dos estimaciones con ruido distinto, y a veces salía "gratis" por
      // pura casualidad del muestreo.
      const j = jointDe(g.partido, hasta, RAPIDO).p;
      const cond = previa > 1e-12 ? clamp(j / previa, 1e-9, 1) : 1e-9;
      previa = j;
      links.push({
        id: pick.id, fx: g.fx, pick, partido: g.partido,
        cond, coste: -Math.log(Math.max(cond, 1e-9)),
      });
    });
  });
  const tot = links.reduce((a, b) => a + b.coste, 0) || 1;
  let acc = 1;
  return links.map((l) => {
    acc *= l.cond;
    return { ...l, cuota: l.coste / tot, acumulada: acc };
  });
}

/* ---------- alternativas ---------- */

const poisCola = (lam, k) => {
  if (!fin(lam) || lam <= 0) return 0;
  let acc = 0;
  for (let i = 0; i < k; i++) acc += poisPmf(i, lam);
  return clamp(1 - acc, 0, 1);
};

const NOMBRE_PROP = { gol: "goles", sot: "disparos a puerta", sh: "remates" };

/* Familia del mercado sin la línea: "Total 2.5" y "Total 1.5" son la
   misma familia, y no tiene sentido proponer tres líneas seguidas. */
const familiaMercado = (m) => String(m || "").replace(/\s*[+-]?\d+(?:[.,]\d+)?\s*$/, "").trim();
/* El porcentaje asiático va neto de la parte que se devuelve, así que no
   se lee igual que el de un mercado normal: a igualdad de cifra, detrás. */
const esAsiatico = (m) => /Asi\u00e1tico/.test(m || "");
const TECHO_ALT = 0.92;
/* Dos rutas de cálculo para el mismo suceso se separan por decimales que
   no se ven en pantalla: por debajo de esto, son la misma apuesta. */
const IGUALES = 1e-5;

/** Mercados implicados por una selección: los que se cumplen siempre que
    ella se cumple. Son, por construcción, la misma apuesta más floja, y
    salen de la propia matriz en vez de una tabla de equivalencias escrita
    a mano; así también tienen alternativa las selecciones que no encajan
    en ninguna familia (ambos marcan, portería a cero, marcador exacto).
    Se ordenan de menor a mayor: interesa el escalón siguiente, no el
    extremo, porque un 92% ya no es un cambio sino rendirse con esa pata. */
function alternativasDe(partido, pick) {
  const out = [];
  const familias = new Set();
  const mete = (a) => {
    const f = familiaMercado(a.mercado);
    if (familias.has(f)) return;
    // Mismo suceso con otro nombre no es otra alternativa.
    if (out.some((o) => Math.abs(o.p - a.p) < IGUALES)) return;
    if (a.p > TECHO_ALT && out.length) return;
    familias.add(f);
    out.push(a);
  };

  const s = matchSolver(partido);
  const A = s ? s.byKey.get(pick.key) : null;
  if (A && A.pred) {
    const base = fin(pick.p) ? pick.p : A.p;
    s.cat
      .filter((B) => {
        if (!B.pred || B.key === pick.key || !(B.p > base + 0.015)) return false;
        for (let x = 0; x < GRID; x++) {
          for (let y = 0; y < GRID; y++) {
            if (A.pred(x, y) && !B.pred(x, y) && s.m[x][y] > 1e-10) return false;
          }
        }
        return true;
      })
      .sort((a, b) => (Math.abs(a.p - b.p) > IGUALES ? a.p - b.p : 0)
        || (esAsiatico(a.mercado) ? 1 : 0) - (esAsiatico(b.mercado) ? 1 : 0))
      .forEach((B) => mete({
        key: B.key, fam: B.fam, mercado: B.mercado, sel: B.sel, p: B.p, nota: B.nota,
        asiatico: esAsiatico(B.mercado),
      }));
  }

  /* En los jugadores, bajar la línea es exactamente lo mismo: quien hace
     dos remates a puerta ha hecho uno. */
  const ref = pick.simRef;
  if (ref && ref.line > 0) {
    const lam = ref.kind === "gol" ? ref.lamGl : ref.kind === "sot" ? ref.lamSot : ref.lamSh;
    for (let L = ref.line - 1; L >= 0; L--) {
      const p = poisCola(lam, L + 1);
      if (!(p > (fin(pick.p) ? pick.p : 0) + 0.015)) continue;
      if (p > TECHO_ALT && out.length) continue;
      const base = String(pick.mercado).split(" \u00b7 ")[0];
      out.push({
        key: `Jugadores|${ref.playerId}|${NOMBRE_PROP[ref.kind]}${L ? " " + (L + 0.5) : ""}`,
        fam: "Jugadores",
        mercado: `${base} \u00b7 ${NOMBRE_PROP[ref.kind]}${L ? " " + (L + 0.5) : ""}`,
        sel: `${L + 1}+ ${NOMBRE_PROP[ref.kind]}`,
        p, simRef: { ...ref, line: L },
      });
    }
  }
  return out.slice(0, 3);
}

/** Para cada selección, el mejor cambio posible y a cuánto dejaría la
    combinada entera. Se pide a mano porque cada candidata obliga a
    rehacer la conjunta del partido. */
function sugerirCambios(res, max = 4) {
  if (!res || !res.grupos) return [];
  const props = [];
  res.grupos.forEach((g) => {
    if (!g.conjunta || !g.cuenta) return;
    const pj = fin(g.conjunta.p) ? g.conjunta.p : g.conjunta.ingenua;
    const fuera = pj > 1e-12 ? res.p / pj : 0;
    g.vivas.forEach((pick) => {
      // Las alternativas vienen de menor a mayor, así que se coge la
      // primera que ya compense: el escalón más corto, no el más flojo.
      for (const alt of alternativasDe(g.partido, pick)) {
        const nuevas = g.vivas.map((x) => (x.id === pick.id
          ? { ...x, key: alt.key, mercado: alt.mercado, sel: alt.sel, p: alt.p, fam: alt.fam, simRef: alt.simRef, nota: alt.nota }
          : x));
        const nueva = jointDe(g.partido, nuevas, RAPIDO);
        const total = fuera * (fin(nueva.p) ? nueva.p : 0);
        if (total > res.p * 1.02) {
          props.push({ fx: g.fx, partido: g.partido, pick, alt, total, gana: total - res.p });
          break;
        }
      }
    });
  });
  return props.sort((a, b) => b.gana - a.gana).slice(0, max);
}

/** Resumen para la barra del partido: cuánto suma el resto de partidos. */
function combinadaSalvo(lista, fxId) {
  const otras = (lista || []).filter((x) => x.fx !== fxId && slipViva(x));
  if (!otras.length) return { p: 1, n: 0, partidos: 0 };
  const r = combinada(otras, { costes: false });
  return r ? { p: r.p, n: r.nPicks, partidos: r.nPartidos } : { p: 1, n: 0, partidos: 0 };
}

/* ---------- exportar ---------- */
function toCSV(rows, cols) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.map((c) => esc(c[0])).join(","),
    ...rows.map((r) => cols.map((c) => esc(c[1](r))).join(","))].join("\n");
}

/** Excel sin librerías: XML de hoja de cálculo, que Excel y LibreOffice
    abren de forma nativa. Un .xlsx de verdad exigiría un compresor ZIP. */
function toExcel(hojas) {
  const esc = (v) => String(v === null || v === undefined ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const celda = (v) => {
    const num2 = typeof v === "number" && isFinite(v);
    return `<Cell><Data ss:Type="${num2 ? "Number" : "String"}">${esc(v)}</Data></Cell>`;
  };
  const hoja = (h) => `<Worksheet ss:Name="${esc(h.nombre).slice(0, 30)}"><Table>` +
    `<Row>${h.cols.map((c) => celda(c[0])).join("")}</Row>` +
    h.filas.map((r) => `<Row>${h.cols.map((c) => celda(c[1](r))).join("")}</Row>`).join("") +
    `</Table></Worksheet>`;
  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${hojas.map(hoja).join("\n")}
</Workbook>`;
}

function downloadText(name, text, tipo = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

