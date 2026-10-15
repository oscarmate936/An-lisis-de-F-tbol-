/* Recordatorios.
 *
 * Dentro del APK se programan notificaciones locales de Android (no hace
 * falta internet ni servidor: el propio teléfono las dispara aunque la
 * app esté cerrada, y el plugin las vuelve a programar si el teléfono se
 * reinicia). Cada vez que cambian los datos o se abre la app, se borran
 * las pendientes y se programan de nuevo con los montos actualizados:
 * así un recordatorio nunca anuncia un monto que ya se pagó.
 *
 * En un navegador no se puede programar nada con la app cerrada; ahí se
 * muestran al abrir los avisos del día (si se dio permiso) y siempre
 * quedan los avisos dentro de la propia app.
 */
(function () {
  "use strict";

  const { Plat } = Datos;
  const CANAL = "pagos";
  let canalCreado = false;
  let temporizador = null;

  async function estadoPermiso() {
    if (Plat.nativo && Plat.LN) {
      try { return (await Plat.LN.checkPermissions()).display; } catch (e) { return "denied"; }
    }
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission === "default" ? "prompt" : Notification.permission;
  }

  async function pedirPermiso() {
    if (Plat.nativo && Plat.LN) {
      try { return (await Plat.LN.requestPermissions()).display; } catch (e) { return "denied"; }
    }
    if (!("Notification" in window)) return "unsupported";
    const r = await Notification.requestPermission();
    return r === "default" ? "prompt" : r;
  }

  function aFecha(fecha, hora) {
    const [y, m, d] = fecha.split("-").map(Number);
    const [hh, mm] = (hora || "09:00").split(":").map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  }

  function plan() {
    return Calc.planNotificaciones(Datos.tarjetas, Datos.ajustes, Fechas.hoy(), (x) => Datos.dinero(x));
  }

  async function crearCanal() {
    if (canalCreado || !Plat.LN) return;
    try {
      await Plat.LN.createChannel({ id: CANAL, name: "Recordatorios de pago", description: "Fechas de pago y de corte de tus tarjetas",
        importance: 4, visibility: 1, vibration: true });
    } catch (e) { /* Android < 8 no tiene canales */ }
    canalCreado = true;
  }

  async function reprogramarNativo() {
    const LN = Plat.LN;
    try {
      const pend = await LN.getPending();
      if (pend.notifications && pend.notifications.length) {
        await LN.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
      }
    } catch (e) { /* nada pendiente */ }
    if (!Datos.ajustes.recordatorios.activos) return 0;
    if ((await estadoPermiso()) !== "granted") return 0;
    await crearCanal();
    const ahora = Date.now();
    const notifs = plan()
      .map((n) => ({ ...n, at: aFecha(n.fecha, n.hora) }))
      .filter((n) => n.at.getTime() > ahora + 30000)
      .slice(0, 60)
      .map((n) => ({
        id: n.id, title: n.titulo, body: n.cuerpo, largeBody: n.cuerpo,
        schedule: { at: n.at, allowWhileIdle: true },
        channelId: CANAL, extra: { tarjetaId: n.tarjetaId },
      }));
    if (notifs.length) await LN.schedule({ notifications: notifs });
    return notifs.length;
  }

  // Navegador: al abrir, enseña una sola vez al día los avisos de hoy.
  function avisosWebDeHoy() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!Datos.ajustes.recordatorios.activos) return;
    const hoy = Fechas.hoy();
    let mostrados = {};
    try { mostrados = JSON.parse(localStorage.getItem("aldia.avisosWeb") || "{}"); } catch (e) { /* vacío */ }
    if (mostrados.dia !== hoy) mostrados = { dia: hoy, ids: [] };
    const ahora = Date.now();
    for (const n of plan()) {
      if (n.fecha !== hoy || aFecha(n.fecha, n.hora).getTime() > ahora || mostrados.ids.includes(n.id)) continue;
      try { new Notification(n.titulo, { body: n.cuerpo, tag: String(n.id) }); } catch (e) { /* algunos móviles exigen service worker */ }
      mostrados.ids.push(n.id);
    }
    try { localStorage.setItem("aldia.avisosWeb", JSON.stringify(mostrados)); } catch (e) { /* bloqueado */ }
  }

  async function reprogramar() {
    try {
      if (Plat.nativo && Plat.LN) return await reprogramarNativo();
      avisosWebDeHoy();
    } catch (e) {
      console.warn("No se pudieron programar los recordatorios", e);
    }
    return 0;
  }

  // Muchos cambios seguidos (p. ej. importar un respaldo) → una sola
  // reprogramación.
  function reprogramarPronto() {
    clearTimeout(temporizador);
    temporizador = setTimeout(reprogramar, 600);
  }

  async function probar() {
    const permiso = await pedirPermiso();
    if (permiso !== "granted") return permiso;
    const titulo = "💳 Así se verán tus recordatorios";
    const cuerpo = "Ejemplo: Pago de Visa •1234 en 3 días. Para no generar intereses: $4,250.00 · Mínimo: $320.00.";
    if (Plat.nativo && Plat.LN) {
      await crearCanal();
      await Plat.LN.schedule({ notifications: [{ id: 7, title: titulo, body: cuerpo, largeBody: cuerpo,
        schedule: { at: new Date(Date.now() + 4000), allowWhileIdle: true }, channelId: CANAL }] });
    } else {
      try { new Notification(titulo, { body: cuerpo }); } catch (e) { return "unsupported"; }
    }
    return "granted";
  }

  async function pendientes() {
    if (!(Plat.nativo && Plat.LN)) return null;
    try { return (await Plat.LN.getPending()).notifications.length; } catch (e) { return null; }
  }

  function alTocar(f) {
    if (!(Plat.nativo && Plat.LN)) return;
    Plat.LN.addListener("localNotificationActionPerformed", (a) => {
      const extra = a && a.notification && a.notification.extra;
      f(extra && extra.tarjetaId);
    });
  }

  // ---------- Calendario (.ics) ----------
  // Para quien prefiera verlo en Google Calendar / Calendario del sistema:
  // eventos de fecha límite de los próximos 12 meses con alarma.
  function ics() {
    const hoy = Fechas.hoy();
    const fin = Fechas.sumarDias(hoy, 366);
    const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Al Dia//Tarjetas//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:Pagos de tarjetas"];
    const limpiar = (s) => String(s).replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    const dias = Datos.ajustes.recordatorios.dias.length ? Math.max(...Datos.ajustes.recordatorios.dias) : 1;
    for (const t of Datos.tarjetas) {
      for (const ev of Calc.eventos(t, hoy, fin, hoy)) {
        if (ev.tipo !== "pago") continue;
        if (ev.ec && (ev.ec.estado === "pagado" || ev.ec.estado === "sin-saldo")) continue;
        const f = ev.fecha.replace(/-/g, "");
        const f2 = Fechas.sumarDias(ev.fecha, 1).replace(/-/g, "");
        const nombre = t.nombre + (t.ultimos4 ? ` •${t.ultimos4}` : "");
        let desc = `Fecha límite de pago de ${nombre} (corte del ${Fechas.textoFecha(ev.corte)}).`;
        if (ev.ec) desc += ` Para no generar intereses: ${Datos.dinero(ev.ec.restante)}. Mínimo: ${Datos.dinero(ev.ec.restanteMin)}.`;
        lineas.push("BEGIN:VEVENT", `UID:${t.id}-${f}@aldia`, `DTSTAMP:${sello}`, `DTSTART;VALUE=DATE:${f}`, `DTEND;VALUE=DATE:${f2}`,
          `SUMMARY:${limpiar("💳 Pagar " + nombre)}`, `DESCRIPTION:${limpiar(desc)}`,
          "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${limpiar("Pagar " + nombre)}`, `TRIGGER:-P${Math.max(1, dias)}D`, "END:VALARM",
          "END:VEVENT");
      }
    }
    lineas.push("END:VCALENDAR");
    return lineas.join("\r\n");
  }

  window.Avisos = { estadoPermiso, pedirPermiso, reprogramar, reprogramarPronto, probar, pendientes, alTocar, ics };
})();
