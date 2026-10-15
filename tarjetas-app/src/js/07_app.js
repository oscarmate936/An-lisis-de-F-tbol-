/* Núcleo de la app: navegación, pintado y acciones globales.
 *
 * Se define antes que las pantallas (que se registran con
 * App.registrar) y se arranca al final, en 99_inicio.js. */
(function () {
  "use strict";

  const { icono, esc, aviso, confirmar } = UI;
  const { Plat } = Datos;

  const TABS = [
    ["inicio", "Inicio", "inicio"],
    ["tarjetas", "Tarjetas", "tarjeta"],
    ["calendario", "Calendario", "calendario"],
    ["planear", "Planear", "plan"],
    ["aprende", "Aprende", "aprende"],
  ];

  const App = {
    version: "__VERSION__",
    tab: "inicio",
    pila: [],
    hoy: Fechas.hoy(),
    vistas: {},
    acciones: {},
    _res: null,

    registrar(nombre, vista) { this.vistas[nombre] = vista; },
    accion(nombre, fn) { this.acciones[nombre] = fn; },

    resumenes() {
      if (!this._res) {
        this._res = new Map();
        for (const t of Datos.estado.tarjetas) this._res.set(t.id, Calc.resumen(t, this.hoy));
      }
      return Datos.tarjetas.map((t) => this._res.get(t.id));
    },
    res(id) {
      this.resumenes();
      return this._res.get(id);
    },

    vistaActual() {
      const top = this.pila[this.pila.length - 1];
      return top ? top.v : this.tab;
    },

    ir(tab) {
      this.tab = tab;
      this.pila = [];
      this.render(true);
    },
    abrir(v, params = {}) {
      this.pila.push({ v, ...params });
      this.render(true);
      const vista = this.vistas[v];
      if (vista && vista.alEntrar) vista.alEntrar(params);
    },
    atras() {
      if (UI.hayHoja()) { UI.cerrarHoja(); return true; }
      if (this.pila.length) { this.pila.pop(); this.render(true); return true; }
      if (this.tab !== "inicio") { this.ir("inicio"); return true; }
      return false;
    },

    render(arriba = false) {
      Calc.opciones.ivaIntereses = Datos.ivaIntereses();
      Calc.conMemo(() => this._render(arriba));
    },

    _render(arriba) {
      this.hoy = Fechas.hoy();
      this._res = null;
      const raiz = document.getElementById("app");
      document.body.classList.toggle("discreto", !!Datos.ajustes.discreto);
      if (!Datos.estado.onboarded) {
        raiz.innerHTML = Bienvenida.html();
        return;
      }
      const top = this.pila[this.pila.length - 1];
      const nombre = top ? top.v : this.tab;
      const vista = this.vistas[nombre];
      const p = top || {};
      const conTabs = !top;

      // Conserva el scroll y los desplegables abiertos al repintar la misma
      // pantalla (p. ej. tras guardar un movimiento).
      const misma = raiz.dataset.vista === nombre + (p.id || "");
      const y = misma && !arriba ? window.scrollY : 0;
      const abiertos = misma ? [...raiz.querySelectorAll("main details")].map((d) => d.open) : [];

      const sub = vista.sub ? vista.sub(p) : "";
      raiz.innerHTML = `
        <header class="topbar">
          ${top ? `<button class="icon-btn" data-act="atras" aria-label="Atrás">${icono("atras", 24)}</button>` : ""}
          <h1 class="ellipsis">${esc(vista.titulo(p))}${sub ? `<span class="sub ellipsis">${esc(sub)}</span>` : ""}</h1>
          ${vista.acciones ? vista.acciones(p) : ""}
        </header>
        <main class="view ${conTabs ? "" : "sin-tabs"}">${vista.html(p)}</main>
        ${conTabs ? `<nav class="tabbar" aria-label="Secciones">${TABS.map(([k, n, ic]) => `
          <button class="${k === this.tab ? "on" : ""}" data-act="tab" data-tab="${k}" aria-current="${k === this.tab ? "page" : "false"}">
            <span class="pill">${icono(ic, 22)}</span>${n}</button>`).join("")}</nav>` : ""}`;
      raiz.dataset.vista = nombre + (p.id || "");
      if (abiertos.length) raiz.querySelectorAll("main details").forEach((d, i) => { if (abiertos[i]) d.open = true; });
      if (vista.montar) vista.montar(raiz, p);
      window.scrollTo(0, y);
    },

    aplicarTema() {
      const tema = Datos.ajustes.tema;
      const html = document.documentElement;
      if (tema === "auto") html.removeAttribute("data-theme");
      else html.setAttribute("data-theme", tema);
      const oscuro = tema === "dark" || (tema === "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
      const fondo = getComputedStyle(document.body).backgroundColor;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", oscuro ? "#0b1020" : "#f3f5fa");
      if (Plat.StatusBar) {
        Plat.StatusBar.setStyle({ style: oscuro ? Plat.StatusStyle.Dark : Plat.StatusStyle.Light }).catch(() => {});
        Plat.StatusBar.setBackgroundColor({ color: oscuro ? "#0b1020" : "#f3f5fa" }).catch(() => {});
      }
      return fondo;
    },

    async ofrecerAvisos() {
      const estado = await Avisos.estadoPermiso();
      if (estado === "granted" || estado === "unsupported" || estado === "denied") { Avisos.reprogramar(); return; }
      const ok = await confirmar({
        titulo: "¿Te aviso antes de cada pago?",
        texto: `Te mandaré una notificación ${Datos.ajustes.recordatorios.dias.map((d) => (d === 0 ? "el mismo día" : d === 1 ? "1 día antes" : `${d} días antes`)).join(", ")} de cada fecha límite, con el monto a pagar. Puedes cambiarlo en Ajustes.`,
        ok: "Sí, avísame",
      });
      if (!ok) return;
      const r = await Avisos.pedirPermiso();
      if (r === "granted") { await Avisos.reprogramar(); aviso("Recordatorios activados ✓"); }
      else aviso("Sin permiso no puedo avisarte. Puedes activarlo en Ajustes.", 4000);
    },

    async cargarEjemplo(sinPreguntar) {
      if (!sinPreguntar && Datos.estado.tarjetas.length) {
        const ok = await confirmar({ titulo: "¿Cargar datos de ejemplo?", texto: "Reemplazarán tus tarjetas actuales. Si quieres conservarlas, guarda antes un respaldo.", ok: "Cargar ejemplo", peligro: true });
        if (!ok) return;
      }
      Datos.estado.tarjetas = Ejemplo.generar();
      Datos.estado.onboarded = true;
      Datos.guardar();
      this.ir("inicio");
      aviso("Datos de ejemplo cargados. Bórralos en Ajustes cuando quieras.", 3500);
    },

    async compartirArchivo(nombre, contenido, tipo) {
      if (Plat.nativo && Plat.FS && Plat.Share) {
        const r = await Plat.FS.writeFile({ path: nombre, data: contenido, directory: Plat.Dir.Cache, encoding: Plat.Enc.UTF8 });
        await Plat.Share.share({ title: nombre, files: [r.uri], dialogTitle: "Guardar o enviar" });
        return;
      }
      const blob = new Blob([contenido], { type: tipo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
  };

  // ---------- Acciones globales (data-act) ----------
  const A = App.acciones;
  A.tab = (el) => { UI.vibrar(6); App.ir(el.dataset.tab); };
  A.atras = () => App.atras();
  A.abrir = (el) => App.abrir(el.dataset.v, el.dataset.id ? { id: el.dataset.id } : {});
  A.verTarjeta = (el) => App.abrir("tarjeta", { id: el.dataset.id });
  A.nuevaTarjeta = () => Formularios.formTarjeta();
  A.editarTarjeta = (el) => Formularios.formTarjeta(el.dataset.id);
  A.menuTarjeta = (el) => Formularios.menuTarjeta(el.dataset.id);
  A.nuevaCompra = (el) => Formularios.formMovimiento({ tarjetaId: el.dataset.id, tipo: "cargo" });
  A.nuevoPago = (el) => {
    // Desde la portada, sin tarjeta concreta: la que tenga el pago más urgente.
    let id = el.dataset.id;
    if (!id) {
      const urg = App.resumenes().filter((s) => s.proximoPago.tipo === "corte" && s.proximoPago.monto > 0)
        .sort((a, b) => (a.proximoPago.fecha < b.proximoPago.fecha ? -1 : 1))[0];
      id = urg ? urg.t.id : undefined;
    }
    Formularios.formMovimiento({ tarjetaId: id, tipo: "pago" });
  };
  A.estadoCuenta = (el) => Formularios.formEstado(el.dataset.id, el.dataset.corte);
  A.verMovimiento = (el) => Formularios.formMovimiento({ tarjetaId: el.dataset.id, mid: el.dataset.mid });
  A.ayuda = (el) => Formularios.verAyuda(el.dataset.clave);
  A.buscar = () => App.abrir("buscar");
  A.mejorTarjeta = () => Extras.mejorTarjeta();
  A.meta = (el) => Extras.formMeta(el.dataset.id);
  A.recurrente = (el) => Extras.formRecurrente(el.dataset.id, el.dataset.rid);
  A.importarEstado = (el) => Importar.abrir(el.dataset.id, el.dataset.corte);
  A.discreto = () => { Datos.ajustes.discreto = !Datos.ajustes.discreto; Datos.guardar(); };
  A.ejemplo = () => App.cargarEjemplo(false);
  A.consejo = (el) => {
    const id = el.dataset.id, acc = el.dataset.accion;
    if (acc === "estado" && id) Formularios.formEstado(id);
    else if (acc === "editar" && id) Formularios.formTarjeta(id);
    else if (acc === "plan") App.ir("planear");
    else if (id) { UI.cerrarHoja(true); App.abrir("tarjeta", { id }); }
  };
  A.exportar = async () => {
    try {
      await App.compartirArchivo(`al-dia-respaldo-${App.hoy}.json`, Datos.exportar(), "application/json");
      Datos.ajustes.ultimoRespaldo = App.hoy;
      Datos.guardar();
    } catch (e) { if (!/cancel/i.test(String(e && e.message))) aviso("No se pudo crear el respaldo"); }
  };
  A.exportarIcs = async () => {
    try { await App.compartirArchivo("pagos-tarjetas.ics", Avisos.ics(), "text/calendar"); }
    catch (e) { if (!/cancel/i.test(String(e && e.message))) aviso("No se pudo crear el archivo de calendario"); }
  };

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const fn = App.acciones[el.dataset.act];
    if (!fn) return;
    ev.preventDefault();
    fn(el, ev);
  });

  window.App = App;
})();
