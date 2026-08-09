const storage = {
  async get(k){ const v = localStorage.getItem(k); if(v===null) throw new Error("vacio"); return {value:v}; },
  async set(k,v){ localStorage.setItem(k,v); },
  async delete(k){ localStorage.removeItem(k); }
};
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- búsquedas recientes ---------- */
const RECIENTES_KEY = "recientes:v1";
function recientesLeer() {
  try {
    const j = JSON.parse(localStorage.getItem(RECIENTES_KEY) || "[]");
    return Array.isArray(j) ? j.filter((x) => typeof x === "string") : [];
  } catch (e) { return []; }
}
function recientesGuardar(termino) {
  const t = (termino || "").trim();
  if (!t) return recientesLeer();
  try {
    const l = [t, ...recientesLeer().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    localStorage.setItem(RECIENTES_KEY, JSON.stringify(l));
    return l;
  } catch (e) { return recientesLeer(); }
}

/* ============================================================
   ACIERTO — Terminal de análisis de partidos
   Fuente de datos: API-Football (API-Sports v3)
   ============================================================ */

const BASE = "https://v3.football.api-sports.io";
const cache = new Map();

/* La caché sobrevive a recargar la página. IndexedDB aguanta mucho más
   que localStorage (que se quedaba en 1.4 MB y obligaba a tirar entradas
   grandes como los 380 partidos de una liga), y se cae con elegancia a
   localStorage si el navegador no la deja usar. */
const CACHE_KEY = "cache:v3";
let idb = null;
const idbListo = new Promise((resolve) => {
  try {
    const req = indexedDB.open("acierto", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
    };
    req.onsuccess = () => { idb = req.result; resolve(true); };
    req.onerror = () => resolve(false);
    setTimeout(() => resolve(false), 2500);
  } catch (e) { resolve(false); }
});

function idbOp(modo, fn) {
  return new Promise((resolve, reject) => {
    if (!idb) return reject(new Error("sin idb"));
    const tx = idb.transaction("cache", modo);
    const req = fn(tx.objectStore("cache"));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function restoreCache() {
  const ok = await idbListo;
  const ahora = Date.now();
  if (ok && idb) {
    try {
      const todo = await idbOp("readonly", (st) => st.getAll());
      const claves = await idbOp("readonly", (st) => st.getAllKeys());
      todo.forEach((v, i) => {
        if (v && ahora - v.t < 24 * 3600e3) cache.set(claves[i], v);
      });
      return;
    } catch (e) { /* sigue por localStorage */ }
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    Object.entries(JSON.parse(raw)).forEach(([k, v]) => {
      if (v && ahora - v.t < 24 * 3600e3) cache.set(k, v);
    });
  } catch (e) { /* caché ilegible: se empieza de cero */ }
}
const cacheLista = restoreCache();

let porGuardar = new Map();
let cacheTimer = null;
function persistCache(id, val) {
  if (id !== undefined) porGuardar.set(id, val);
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(async () => {
    const lote = porGuardar;
    porGuardar = new Map();
    if (idb) {
      try {
        await Promise.all([...lote].map(([k, v]) => idbOp("readwrite", (st) => st.put(v, k))));
        return;
      } catch (e) { /* prueba localStorage */ }
    }
    try {
      const entries = [...cache.entries()].sort((a, b) => b[1].t - a[1].t);
      const out = {};
      let size = 0;
      for (const [k, v] of entries) {
        const s = JSON.stringify(v);
        if (size + s.length > 1.4e6) break;
        size += s.length;
        out[k] = v;
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(out));
    } catch (e) {
      try { localStorage.removeItem(CACHE_KEY); } catch (e2) { /* nada que hacer */ }
    }
  }, 900);
}

/* La API contesta en inglés y en su propia jerga. Aquí se traduce a algo
   que diga qué ha pasado y, sobre todo, qué se puede hacer. */
function errorClaro(txt) {
  const t = String(txt || "").toLowerCase();
  if (/request limit|requests limit|reached the request|limit for the day|daily limit/.test(t))
    return {
      msg: "Se ha agotado la cuota de peticiones del día. Lo que ya está descargado se sigue viendo; para datos nuevos hay que esperar a que se renueve.",
      cuota: true,
    };
  if (/rate limit|per minute|too many/.test(t))
    return { msg: "Demasiadas peticiones seguidas. Espera un minuto y vuelve a intentarlo." };
  if (/token|api[- ]?key|application key|invalid key|not subscribed/.test(t))
    return { msg: "La API no acepta esa clave: falta o no es válida. Cópiala otra vez desde tu cuenta de API-Football, en Account → My Access." };
  if (/subscription|plan|not allowed/.test(t))
    return { msg: "Tu plan de API-Football no incluye este dato." };
  if (/season/.test(t))
    return { msg: "La temporada pedida no es válida o no entra en tu plan (el gratuito solo cubre algunas)." };
  if (/bug|maintenance/.test(t))
    return { msg: "La API está en mantenimiento. Vuelve a intentarlo dentro de un rato." };
  return { msg: txt };
}

/* Cuánto hace que se descargó algo, para que nunca mires un dato viejo
   creyendo que es de ahora. */
const hace = (ms) => {
  if (!isFinite(ms) || ms < 0) return "";
  const s = Math.round(ms / 1000);
  if (s < 45) return "hace unos segundos";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
};

const cacheId = (path, params = {}) => {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return path + "?" + new URLSearchParams(clean).toString();
};
const cacheEdad = (path, params) => {
  const c = cache.get(cacheId(path, params));
  return c ? Date.now() - c.t : null;
};
/** Olvidar lo que cumpla el filtro, para pedirlo otra vez de verdad. */
function cacheOlvidar(filtro) {
  let n = 0;
  [...cache.keys()].forEach((k) => {
    if (!filtro(k)) return;
    cache.delete(k);
    n++;
    if (idb) { try { idbOp("readwrite", (st) => st.delete(k)).catch(() => {}); } catch (e) { /* nada */ } }
  });
  return n;
}

const TTL = {
  static: 24 * 3600e3,
  daily: 6 * 3600e3,
  hour: 3600e3,
  live: 20e3,
  short: 120e3,
};

function makeApi(key, onMeta) {
  return async function api(path, params = {}, ttl = TTL.short) {
    const clean = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    );
    const qs = new URLSearchParams(clean).toString();
    const id = path + "?" + qs;
    await cacheLista;
    const now = Date.now();
    const c = cache.get(id);
    if (c && now - c.t < ttl) {
      onMeta({ cached: true, edad: now - c.t });
      return c.d;
    }
    // Sin red no tiene sentido intentarlo: lo cacheado ya se ha servido arriba.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const e = new Error("Sin conexión. Lo que ya esté descargado se sigue viendo, pero no se pueden pedir datos nuevos.");
      e.offline = true;
      throw e;
    }
    /* Un corte de red de medio segundo no debería convertirse en un
       error para quien mira la pantalla: se reintenta un par de veces
       con espera creciente antes de rendirse. Los fallos que no
       mejoran reintentando (clave inválida, cuota agotada, límite por
       minuto) se resuelven más abajo, fuera de este bucle. */
    let res;
    for (let intento = 1; ; intento++) {
      try {
        res = await fetch(`${BASE}/${path}${qs ? "?" + qs : ""}`, {
          headers: { "x-apisports-key": key },
        });
      } catch (e) {
        if (intento >= 3) {
          throw new Error(
            "No se pudo alcanzar la API. Revisa tu conexión o si el navegador está bloqueando la petición."
          );
        }
        await esperar(400 * 2 ** (intento - 1));
        continue;
      }
      if (res.status >= 500 && res.status !== 501 && intento < 3) {
        await esperar(400 * 2 ** (intento - 1));
        continue;
      }
      break;
    }
    onMeta({
      cached: false,
      edad: 0,
      dailyRemaining: res.headers.get("x-ratelimit-requests-remaining"),
      dailyLimit: res.headers.get("x-ratelimit-requests-limit"),
      minuteRemaining: res.headers.get("x-ratelimit-remaining"),
    });
    if (res.status === 429)
      throw new Error("Tope de peticiones por minuto alcanzado. Espera 60 segundos.");
    if (res.status === 499 || res.status >= 500)
      throw new Error("La API no respondió a tiempo. Vuelve a intentarlo.");
    let j;
    try {
      j = await res.json();
    } catch (e) {
      // A veces llega una página de error HTML en vez de JSON.
      throw new Error(
        res.status === 401 || res.status === 403
          ? "La API rechazó la clave. Revísala en los ajustes."
          : `La API devolvió una respuesta que no se entiende (código ${res.status}).`
      );
    }
    if (!j || typeof j !== "object") throw new Error("La API devolvió una respuesta vacía.");
    const errs = j.errors;
    const bad = Array.isArray(errs)
      ? errs.length > 0
      : errs && Object.keys(errs).length > 0;
    if (bad) {
      const crudo = (Array.isArray(errs) ? errs : Object.values(errs)).join(" · ");
      const claro = errorClaro(crudo);
      const e = new Error(claro.msg);
      e.cuota = !!claro.cuota;
      e.crudo = crudo;
      throw e;
    }
    const entrada = { t: now, d: j.response ?? [] };
    cache.set(id, entrada);
    persistCache(id, entrada);
    return j.response;
  };
}

/* ---------- utilidades ---------- */
const num = (v, d = 0) => (v === null || v === undefined || v === "" ? d : Number(v));
const pctStr = (v) => (typeof v === "string" ? num(v.replace("%", "")) : num(v));
const two = (n) => String(n).padStart(2, "0");
const seasonNow = () => {
  const d = new Date();
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
};
const isoDay = (d) =>
  `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;

/* La API interpreta las fechas en horario UTC salvo que se le diga la zona.
   Sin esto, un partido de las 21:00 en Argentina cae ya en el día siguiente
   en UTC: aparecía en la fecha de mañana, y los de anoche seguían saliendo
   hoy. Mandamos la zona del navegador para que "hoy" signifique lo mismo
   a los dos lados. */
