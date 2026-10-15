/* Datos: estado de la app, guardado local y plataforma (Capacitor/web).
 *
 * Todo vive en el propio teléfono: localStorage como copia principal
 * (síncrona) y, dentro del APK, una segunda copia en Preferences
 * (SharedPreferences de Android), que sobrevive aunque el sistema limpie
 * el almacenamiento de la WebView. Nunca se pide ni se guarda el número
 * completo de la tarjeta: solo un apodo y, si se quiere, los 4 últimos
 * dígitos para reconocerla.
 */
(function () {
  "use strict";

  const cap = window.Capacitor;
  const Plat = {
    nativo: !!(cap && cap.isNativePlatform && cap.isNativePlatform()),
    LN: window.capacitorLocalNotifications && window.capacitorLocalNotifications.LocalNotifications,
    Prefs: window.capacitorPreferences && window.capacitorPreferences.Preferences,
    FS: window.capacitorFilesystem && window.capacitorFilesystem.Filesystem,
    Dir: window.capacitorFilesystem && window.capacitorFilesystem.Directory,
    Enc: window.capacitorFilesystem && window.capacitorFilesystem.Encoding,
    Share: window.capacitorShare && window.capacitorShare.Share,
    StatusBar: window.capacitorStatusBar && window.capacitorStatusBar.StatusBar,
    StatusStyle: window.capacitorStatusBar && window.capacitorStatusBar.Style,
  };

  const MONEDAS = [
    { c: "MXN", n: "Peso mexicano", l: "es-MX" },
    { c: "USD", n: "Dólar estadounidense", l: "es-US" },
    { c: "COP", n: "Peso colombiano", l: "es-CO", d: 0 },
    { c: "EUR", n: "Euro", l: "es-ES" },
    { c: "ARS", n: "Peso argentino", l: "es-AR" },
    { c: "CLP", n: "Peso chileno", l: "es-CL", d: 0 },
    { c: "PEN", n: "Sol peruano", l: "es-PE" },
    { c: "GTQ", n: "Quetzal", l: "es-GT" },
    { c: "HNL", n: "Lempira", l: "es-HN" },
    { c: "NIO", n: "Córdoba", l: "es-NI" },
    { c: "CRC", n: "Colón costarricense", l: "es-CR", d: 0 },
    { c: "DOP", n: "Peso dominicano", l: "es-DO" },
    { c: "BOB", n: "Boliviano", l: "es-BO" },
    { c: "PYG", n: "Guaraní", l: "es-PY", d: 0 },
    { c: "UYU", n: "Peso uruguayo", l: "es-UY" },
  ];

  const POR_REGION = { MX: "MXN", US: "USD", CO: "COP", ES: "EUR", AR: "ARS", CL: "CLP", PE: "PEN",
    GT: "GTQ", HN: "HNL", NI: "NIO", CR: "CRC", DO: "DOP", BO: "BOB", PY: "PYG", UY: "UYU",
    SV: "USD", EC: "USD", PA: "USD", PR: "USD" };

  function adivinarMoneda() {
    const langs = navigator.languages || [navigator.language || ""];
    for (const l of langs) {
      const m = /-([A-Z]{2})$/i.exec(l || "");
      if (m && POR_REGION[m[1].toUpperCase()]) return POR_REGION[m[1].toUpperCase()];
    }
    return "MXN";
  }

  const CLAVE = "aldia.v1";

  function porDefecto() {
    return {
      version: 1,
      onboarded: false,
      ajustes: {
        moneda: adivinarMoneda(),
        tema: "auto",
        discreto: false,
        recordatorios: { activos: true, dias: [3, 1, 0], hora: "09:00", corte: true },
        ultimoRespaldo: null,
      },
      tarjetas: [],
    };
  }

  function normalizar(s) {
    const d = porDefecto();
    const out = { ...d, ...s, ajustes: { ...d.ajustes, ...(s.ajustes || {}) } };
    out.ajustes.recordatorios = { ...d.ajustes.recordatorios, ...((s.ajustes || {}).recordatorios || {}) };
    out.tarjetas = (s.tarjetas || []).map((t) => ({ movimientos: [], estados: {}, ...t }));
    return out;
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const Datos = {
    Plat, MONEDAS, uid,
    estado: null,
    oyentes: [],

    cargar() {
      let crudo = null;
      try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* almacenamiento bloqueado */ }
      try { this.estado = crudo ? normalizar(JSON.parse(crudo)) : porDefecto(); }
      catch (e) { this.estado = porDefecto(); }
      return this.estado;
    },

    // Si la WebView perdió su localStorage pero Preferences conserva la
    // copia, se restaura sola al abrir.
    async recuperarNativo() {
      if (!Plat.Prefs) return false;
      try {
        const vacio = !this.estado.tarjetas.length && !this.estado.onboarded;
        if (!vacio) return false;
        const { value } = await Plat.Prefs.get({ key: CLAVE });
        if (!value) return false;
        this.estado = normalizar(JSON.parse(value));
        this.guardar(false);
        return true;
      } catch (e) { return false; }
    },

    guardar(avisar = true) {
      const txt = JSON.stringify(this.estado);
      try { localStorage.setItem(CLAVE, txt); } catch (e) { /* sin espacio o bloqueado */ }
      if (Plat.Prefs) Plat.Prefs.set({ key: CLAVE, value: txt }).catch(() => {});
      if (avisar) for (const f of this.oyentes) f();
    },

    alCambiar(f) { this.oyentes.push(f); },

    get ajustes() { return this.estado.ajustes; },
    get tarjetas() { return this.estado.tarjetas.filter((t) => !t.archivada); },
    get archivadas() { return this.estado.tarjetas.filter((t) => t.archivada); },
    tarjeta(id) { return this.estado.tarjetas.find((t) => t.id === id); },

    agregarTarjeta(t) {
      const nueva = { id: uid(), creada: new Date().toISOString(), movimientos: [], estados: {}, ...t };
      this.estado.tarjetas.push(nueva);
      this.guardar();
      return nueva;
    },
    editarTarjeta(id, cambios) {
      const t = this.tarjeta(id);
      if (t) Object.assign(t, cambios);
      this.guardar();
    },
    borrarTarjeta(id) {
      this.estado.tarjetas = this.estado.tarjetas.filter((t) => t.id !== id);
      this.guardar();
    },
    agregarMovimiento(id, mv) {
      const t = this.tarjeta(id);
      const nuevo = { id: uid(), ...mv };
      t.movimientos.push(nuevo);
      this.guardar();
      return nuevo;
    },
    editarMovimiento(id, mid, cambios) {
      const mv = this.tarjeta(id).movimientos.find((m) => m.id === mid);
      if (mv) Object.assign(mv, cambios);
      this.guardar();
    },
    borrarMovimiento(id, mid) {
      const t = this.tarjeta(id);
      t.movimientos = t.movimientos.filter((m) => m.id !== mid);
      this.guardar();
    },
    guardarEstado(id, corte, datos) {
      const t = this.tarjeta(id);
      const limpio = {};
      for (const [k, v] of Object.entries(datos)) if (v !== null && v !== undefined && v !== false) limpio[k] = v;
      if (Object.keys(limpio).length) t.estados[corte] = limpio;
      else delete t.estados[corte];
      this.guardar();
    },

    reemplazar(nuevo) {
      this.estado = normalizar(nuevo);
      this.estado.onboarded = true;
      this.guardar();
    },
    borrarTodo() {
      const moneda = this.estado.ajustes.moneda;
      this.estado = porDefecto();
      this.estado.ajustes.moneda = moneda;
      this.guardar();
    },

    exportar() {
      return JSON.stringify({ app: "Al Día", formato: 1, exportado: new Date().toISOString(), datos: this.estado }, null, 2);
    },
    importar(texto) {
      const j = JSON.parse(texto);
      const d = j && j.datos ? j.datos : j;
      if (!d || !Array.isArray(d.tarjetas)) throw new Error("El archivo no parece un respaldo de Al Día.");
      for (const t of d.tarjetas) {
        if (!t.id || typeof t.diaCorte !== "number") throw new Error("El respaldo tiene una tarjeta incompleta.");
      }
      this.reemplazar(d);
    },
  };

  // ---------- Formato de dinero ----------
  let fmtCache = null;
  function formateador() {
    const c = Datos.ajustes.moneda;
    if (fmtCache && fmtCache.c === c) return fmtCache;
    const m = MONEDAS.find((x) => x.c === c) || MONEDAS[0];
    const dec = m.d === 0 ? 0 : 2;
    let nf, nfr;
    try {
      nf = new Intl.NumberFormat(m.l, { style: "currency", currency: m.c, minimumFractionDigits: dec, maximumFractionDigits: dec });
      nfr = new Intl.NumberFormat(m.l, { style: "currency", currency: m.c, maximumFractionDigits: 0 });
    } catch (e) {
      nf = nfr = { format: (x) => "$" + Number(x).toFixed(dec) };
    }
    fmtCache = { c, nf, nfr, dec };
    return fmtCache;
  }
  Datos.dinero = (x, redondo = false) => {
    const f = formateador();
    const v = Number(x) || 0;
    return (redondo ? f.nfr : f.nf).format(Math.abs(v) < 0.005 ? 0 : v);
  };
  Datos.decimales = () => formateador().dec;

  // Acepta "1,234.50", "1.234,50", "1234", "$ 1 234,5"...
  Datos.leerMonto = (txt) => {
    if (typeof txt === "number") return txt;
    let s = String(txt || "").replace(/[^\d.,-]/g, "");
    if (!s) return null;
    const ultimaComa = s.lastIndexOf(","), ultimoPunto = s.lastIndexOf(".");
    if (ultimaComa > -1 && ultimoPunto > -1) {
      const dec = ultimaComa > ultimoPunto ? "," : ".";
      s = s.split(dec === "," ? "." : ",").join("");
      s = s.replace(dec, ".");
    } else if (ultimaComa > -1) {
      const tras = s.length - ultimaComa - 1;
      s = (s.split(",").length === 2 && tras <= 2) ? s.replace(",", ".") : s.split(",").join("");
    } else if (ultimoPunto > -1) {
      const tras = s.length - ultimoPunto - 1;
      if (s.split(".").length > 2 || tras === 3) s = s.split(".").join("");
    }
    const n = parseFloat(s);
    return isFinite(n) ? Math.round(n * 100) / 100 : null;
  };

  window.Datos = Datos;
})();
