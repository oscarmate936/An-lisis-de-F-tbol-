/* Arranque. */
(function () {
  "use strict";

  const { Plat } = Datos;
  const AppPlugin = window.capacitorApp && window.capacitorApp.App;

  async function iniciar() {
    Datos.cargar();
    await Datos.recuperarNativo();
    App.aplicarTema();
    App.render();

    Datos.alCambiar(() => {
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
      AppPlugin.addListener("resume", () => { App.render(); Avisos.reprogramarPronto(); });
    }
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") App.atras(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && Fechas.hoy() !== App.hoy) App.render();
    });

    Avisos.alTocar((id) => {
      if (id && Datos.tarjeta(id)) { App.tab = "inicio"; App.pila = []; App.abrir("tarjeta", { id }); }
    });
    Avisos.reprogramar();

    if (Plat.nativo && window.capacitorSplashScreen) window.capacitorSplashScreen.SplashScreen.hide().catch(() => {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
