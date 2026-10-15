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
    App: window.capacitorApp && window.capacitorApp.App,
    Bio: window.capacitorBiometricAuth && window.capacitorBiometricAuth.BiometricAuth,
  };
  // Plugin propio del APK (android/.../WidgetPlugin.java) para refrescar el
  // widget de la pantalla de inicio.
  Plat.Widget = Plat.nativo && window.capacitorExports ? window.capacitorExports.registerPlugin("AldiaWidget") : null;

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
        recordatorios: { activos: true, dias: [3, 1, 0], hora: "09:00", corte: true, estado: true },
        ultimoRespaldo: null,
        // IVA sobre intereses: en México los bancos cobran 16% de IVA sobre
        // los intereses; en otros países normalmente no.
        ivaIntereses: null,
        presupuestos: { total: null, categorias: {} },
        seguridad: { pin: null, sal: null, biometria: false, bloquearAlSalir: true },
        respaldosAuto: true,
        ultimoSnapshot: null,
        pospuestos: [],
      },
      tarjetas: [],
    };
  }

  function normalizar(s) {
    const d = porDefecto();
    const out = { ...d, ...s, ajustes: { ...d.ajustes, ...(s.ajustes || {}) } };
    out.ajustes.recordatorios = { ...d.ajustes.recordatorios, ...((s.ajustes || {}).recordatorios || {}) };
    out.ajustes.presupuestos = { ...d.ajustes.presupuestos, ...((s.ajustes || {}).presupuestos || {}) };
    out.ajustes.presupuestos.categorias = { ...((out.ajustes.presupuestos || {}).categorias || {}) };
    out.ajustes.seguridad = { ...d.ajustes.seguridad, ...((s.ajustes || {}).seguridad || {}) };
    if (!Array.isArray(out.ajustes.pospuestos)) out.ajustes.pospuestos = [];
    out.tarjetas = (s.tarjetas || []).map((t) => ({ movimientos: [], estados: {}, recurrentes: [], ...t }));
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

    // IVA efectivo sobre intereses (si no se eligió, 16% para MXN).
    ivaIntereses() {
      const v = this.estado.ajustes.ivaIntereses;
      return typeof v === "number" ? v : this.estado.ajustes.moneda === "MXN" ? 16 : 0;
    },

    // Aplica lo que pasa "solo" con el paso de los días: pagos domiciliados
    // en su fecha límite y cargos recurrentes (suscripciones). Devuelve
    // cuántos movimientos agregó.
    aplicarAutomaticos(hoy) {
      let n = 0;
      for (const t of this.estado.tarjetas) {
        for (const p of Calc.domiciliacionesPendientes(t, hoy)) {
          t.estados[p.corte] = { ...(t.estados[p.corte] || {}), domiciliado: true };
          if (p.mov) { t.movimientos.push({ id: uid(), ...p.mov }); n++; }
        }
        for (const p of Calc.recurrentesPendientes(t, hoy)) {
          for (const mv of p.movs) { t.movimientos.push({ id: uid(), ...mv }); n++; }
          p.rc.ultimo = p.ultimo;
        }
        // Pospuestos ya vencidos: fuera.
      }
      this.estado.ajustes.pospuestos = (this.estado.ajustes.pospuestos || []).filter((x) => x.fecha >= hoy);
      return n;
    },

    // ---------- Respaldos automáticos internos ----------
    // Una copia semanal dentro del propio teléfono (en la app nativa, en su
    // carpeta privada, que Android sube a la copia de seguridad de Google
    // si está activada). Se guardan las 6 más recientes.
    async snapshotSiToca(hoy) {
      const a = this.estado.ajustes;
      if (!a.respaldosAuto || !this.estado.tarjetas.length) return false;
      if (a.ultimoSnapshot && Fechas.diasEntre(a.ultimoSnapshot, hoy) < 7) return false;
      await this.guardarSnapshot(hoy);
      a.ultimoSnapshot = hoy;
      this.guardar(false);
      return true;
    },
    async guardarSnapshot(hoy) {
      const txt = this.exportar();
      if (Plat.nativo && Plat.FS) {
        await Plat.FS.writeFile({ path: `respaldos/aldia-${hoy}.json`, data: txt, directory: Plat.Dir.Data, encoding: Plat.Enc.UTF8, recursive: true });
        const lista = await this.listarSnapshots();
        for (const v of lista.slice(6)) await Plat.FS.deleteFile({ path: `respaldos/${v.nombre}`, directory: Plat.Dir.Data }).catch(() => {});
        return;
      }
      let l = [];
      try { l = JSON.parse(localStorage.getItem("aldia.respaldos") || "[]"); } catch (e) { l = []; }
      l = [{ fecha: hoy, datos: txt }, ...l.filter((x) => x.fecha !== hoy)].slice(0, 3);
      try { localStorage.setItem("aldia.respaldos", JSON.stringify(l)); } catch (e) { /* sin espacio */ }
    },
    async listarSnapshots() {
      if (Plat.nativo && Plat.FS) {
        try {
          const r = await Plat.FS.readdir({ path: "respaldos", directory: Plat.Dir.Data });
          return r.files.map((f) => (typeof f === "string" ? f : f.name)).filter((n) => /^aldia-\d{4}-\d{2}-\d{2}\.json$/.test(n))
            .sort().reverse().map((nombre) => ({ nombre, fecha: nombre.slice(6, 16) }));
        } catch (e) { return []; }
      }
      try { return JSON.parse(localStorage.getItem("aldia.respaldos") || "[]").map((x) => ({ nombre: x.fecha, fecha: x.fecha })); }
      catch (e) { return []; }
    },
    async leerSnapshot(nombre) {
      if (Plat.nativo && Plat.FS) {
        const r = await Plat.FS.readFile({ path: `respaldos/${nombre}`, directory: Plat.Dir.Data, encoding: Plat.Enc.UTF8 });
        return r.data;
      }
      const l = JSON.parse(localStorage.getItem("aldia.respaldos") || "[]");
      const x = l.find((v) => v.fecha === nombre);
      return x ? x.datos : null;
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
