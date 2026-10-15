/* Arranque. */
(function () {
  "use strict";

  const { Plat } = Datos;
  const AppPlugin = Plat.App;
  const F = Fechas;

  // Lo que ocurre solo con el paso de los días (pagos domiciliados, cargos
  // recurrentes) y la copia de seguridad semanal.
  function alDia() {
    const hoy = F.hoy();
    if (Datos.aplicarAutomaticos(hoy) > 0) Datos.guardar(false);
    Datos.snapshotSiToca(hoy).catch(() => {});
  }

  // ---------- Botones de la notificación ----------
  function manejarNotificacion(d) {
    if (!d || d.prueba) return;
    const t = d.tarjetaId && Datos.tarjeta(d.tarjetaId);
    if (!t) return;
    const hoy = F.hoy();
    App.tab = "inicio";
    App.pila = [];
    if (d.accion === "pague") {
      const corte = d.corte && d.corte <= hoy ? d.corte : Calc.corteEnOAntes(t, hoy);
      const ec = Calc.estadoDeCuenta(t, corte, hoy);
      App.abrir("tarjeta", { id: t.id });
      if (ec.restante > 0) {
        const mv = Datos.agregarMovimiento(t.id, { tipo: "pago", monto: ec.restante, fecha: hoy, desc: "Pago (desde la notificación)" });
        UI.aviso(`Registré tu pago de ${Datos.dinero(ec.restante)} en ${t.nombre}`, 7000, {
          accion: "Deshacer", alAccionar: () => { Datos.borrarMovimiento(t.id, mv.id); UI.aviso("Pago deshecho"); },
        });
      } else {
        UI.aviso("Ese estado de cuenta ya estaba pagado ✓");
      }
      return;
    }
    if (d.accion === "manana") {
      const manana = F.sumarDias(hoy, 1);
      const hora = Datos.ajustes.recordatorios.hora || "09:00";
      Datos.ajustes.pospuestos = (Datos.ajustes.pospuestos || []).concat({
        id: Calc.idNotif(`${t.id}|pospuesto|${manana}|${d.titulo || ""}`), fecha: manana, hora,
        titulo: d.titulo || `💳 Pago de ${t.nombre}`, cuerpo: d.cuerpo || "Recuerda hacer tu pago.",
        tarjetaId: t.id, corte: d.corte, tipo: "pago", acciones: true,
      });
      Datos.guardar();
      App.abrir("tarjeta", { id: t.id });
      UI.aviso(`Te lo recuerdo mañana a las ${hora}`);
      return;
    }
    App.abrir("tarjeta", { id: t.id });
    if (d.tipo === "estado") Formularios.formEstado(t.id, d.corte && d.corte <= hoy ? d.corte : undefined);
  }

  // ---------- Autoprueba (aldia://autoprueba) ----------
  // La usa la prueba en emulador de CI para comprobar, dentro del APK real,
  // que la interfaz y los plugins nativos responden. No modifica los datos
  // de la persona: trabaja con tarjetas de ejemplo en memoria.
  async function autoprueba() {
    const r = { version: App.version, nativo: Plat.nativo, plugins: {}, errores: [] };
    const paso = async (nombre, fn) => {
      try { r.plugins[nombre] = (await fn()) ?? "ok"; } catch (e) { r.plugins[nombre] = "ERROR"; r.errores.push(`${nombre}: ${e && e.message}`); }
    };
    await paso("ui", () => !!document.querySelector("#app").children.length);
    await paso("calculos", () => {
      const ts = Ejemplo.generar();
      const hoy = F.hoy();
      const res = ts.map((t) => Calc.resumen(t, hoy));
      Calc.consejos(res, hoy);
      Calc.planNotificaciones(ts, Datos.ajustes, hoy, (x) => Datos.dinero(x));
      Calc.historial(ts, hoy, 6);
      return res.length === 3;
    });
    await paso("notificaciones", async () => Plat.LN ? (await Plat.LN.checkPermissions()).display : "sin plugin");
    await paso("alarmasExactas", async () => (await Avisos.estadoAlarmasExactas()) || "n/a");
    await paso("preferencias", async () => {
      await Plat.Prefs.set({ key: "aldia.autoprueba", value: "1" });
      const v = (await Plat.Prefs.get({ key: "aldia.autoprueba" })).value;
      await Plat.Prefs.remove({ key: "aldia.autoprueba" });
      return v === "1";
    });
    await paso("archivos", async () => {
      await Plat.FS.writeFile({ path: "autoprueba.txt", data: "ok", directory: Plat.Dir.Cache, encoding: Plat.Enc.UTF8 });
      const v = (await Plat.FS.readFile({ path: "autoprueba.txt", directory: Plat.Dir.Cache, encoding: Plat.Enc.UTF8 })).data;
      await Plat.FS.deleteFile({ path: "autoprueba.txt", directory: Plat.Dir.Cache });
      return v === "ok";
    });
    await paso("widget", async () => { await Avisos.actualizarWidget(); return !!Plat.Widget; });
    await paso("biometria", async () => (Plat.Bio ? (await Plat.Bio.checkBiometry()).isAvailable : "sin plugin"));
    await paso("importador", async () => Importar.disponible());
    console.log("ALDIA_AUTOPRUEBA " + JSON.stringify(r));
    return r;
  }
  window.AldiaAutoprueba = autoprueba;

  function abrirUrl(url) {
    if (!url) return;
    if (/^aldia:\/\/autoprueba/.test(url)) autoprueba();
  }

  async function iniciar() {
    Datos.cargar();
    await Datos.recuperarNativo();
    // Si hay PIN, la pantalla de bloqueo va antes que cualquier dato.
    if (Bloqueo.configurado()) Bloqueo.mostrar();
    alDia();
    App.aplicarTema();
    App.render();

    Datos.alCambiar(() => {
      if (Datos.aplicarAutomaticos(F.hoy()) > 0) Datos.guardar(false);
      Datos.snapshotSiToca(F.hoy()).catch(() => {});
      App.aplicarTema();
      App.render();
      Avisos.reprogramarPronto();
    });

    if (window.matchMedia) {
      const mq = matchMedia("(prefers-color-scheme: dark)");
      const f = () => { if (Datos.ajustes.tema === "auto") App.aplicarTema(); };
      if (mq.addEventListener) mq.addEventListener("change", f);
    }

    // Botón "atrás" de Android: cierra hojas y pantallas antes de salir.
    if (AppPlugin) {
      AppPlugin.addListener("backButton", () => { if (!App.atras()) AppPlugin.exitApp(); });
      // Al volver a la app (p. ej. al día siguiente) se recalcula "hoy" y
      // se reprograman los recordatorios con los montos al día.
      AppPlugin.addListener("resume", () => { alDia(); App.render(); Avisos.reprogramarPronto(); });
      AppPlugin.addListener("appStateChange", (e) => Bloqueo.alCambiarEstado(e.isActive));
      AppPlugin.addListener("appUrlOpen", (e) => abrirUrl(e && e.url));
      AppPlugin.getLaunchUrl().then((r) => abrirUrl(r && r.url)).catch(() => {});
    }
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") App.atras(); });
    document.addEventListener("visibilitychange", () => {
      if (!Plat.nativo) Bloqueo.alCambiarEstado(document.visibilityState === "visible");
      if (document.visibilityState === "visible" && F.hoy() !== App.hoy) { alDia(); App.render(); }
    });

    Avisos.alTocar(manejarNotificacion);
    Avisos.reprogramar();

    if (Plat.nativo && window.capacitorSplashScreen) window.capacitorSplashScreen.SplashScreen.hide().catch(() => {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
