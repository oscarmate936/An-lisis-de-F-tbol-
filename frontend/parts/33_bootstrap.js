
/* Red de seguridad fuera de React: el ErrorBoundary solo atrapa fallos
   durante el renderizado, no los que saltan en manejadores de eventos,
   timers o promesas sueltas. Sin esto, esos fallos solo dejaban rastro en
   la consola del propio dispositivo y quien usaba la app se quedaba sin
   ninguna señal de que algo había ido mal. */
window.addEventListener("error", (e) => {
  console.error("Error sin capturar:", e.error || e.message);
  try { avisar("Ha fallado algo inesperado. Si se repite, prueba a recargar.", "mal"); } catch (e2) { /* nada */ }
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("Promesa rechazada sin capturar:", e.reason);
  try { avisar("Ha fallado algo inesperado. Si se repite, prueba a recargar.", "mal"); } catch (e2) { /* nada */ }
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
