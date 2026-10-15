/* Ajustes y bienvenida. */
(function () {
  "use strict";

  const { icono, esc, aviso, confirmar } = UI;
  const F = Fechas;
  const { Plat } = Datos;

  let permiso = null;
  let pendientes = null;
  let exactas = null;
  let huellaDisp = false;
  let snapshots = [];

  async function refrescarPermiso() {
    permiso = await Avisos.estadoPermiso();
    pendientes = await Avisos.pendientes();
    exactas = await Avisos.estadoAlarmasExactas();
    huellaDisp = await Bloqueo.biometriaDisponible();
    snapshots = await Datos.listarSnapshots();
    if (App.vistaActual() === "ajustes") App.render();
  }

  function textoPermiso() {
    if (permiso === "granted") return Plat.nativo ? `Activados${pendientes !== null ? ` · ${pendientes} programado${pendientes === 1 ? "" : "s"}` : ""}` : "Permitidos en este navegador";
    if (permiso === "denied") return "Bloqueados en el sistema";
    if (permiso === "unsupported") return "Este navegador no los admite";
    return "Sin permiso todavía";
  }

  function html() {
    const a = Datos.ajustes;
    const r = a.recordatorios;
    const nRec = (n) => r.dias.includes(n);
    return `
      <div class="section-title">Recordatorios</div>
      <div class="panel">
        <label class="row between"><span class="grow"><b>Recordatorios de pago</b><div class="small muted">${esc(textoPermiso())}</div></span>
          <span class="switch"><input type="checkbox" data-aj="activos" ${r.activos ? "checked" : ""}><span></span></span></label>
        ${permiso !== "granted" && r.activos ? `<button class="btn block sec" data-act="pedirPermiso" style="margin-top:12px">${icono("campana", 18)} Permitir notificaciones</button>` : ""}
        ${permiso === "denied" ? `<p class="small muted" style="margin:10px 0 0">Las bloqueaste antes. Actívalas en Ajustes del teléfono → Apps → Al Día → Notificaciones.</p>` : ""}
        ${!Plat.nativo ? `<p class="small muted" style="margin:10px 0 0">${icono("info", 14, 'style="vertical-align:-2px"')} En el navegador los avisos solo llegan al abrir la app. Instala el APK de Android para recibirlos aunque esté cerrada, o añade las fechas a tu calendario.</p>` : ""}
        <div class="field" style="margin:16px 0 12px"><span class="lbl">Avisarme antes de la fecha límite</span>
          <div class="chips">${[7, 5, 3, 2, 1, 0].map((n) => `<button class="chip ${nRec(n) ? "on" : ""}" data-act="ajDia" data-n="${n}">${n === 0 ? "El mismo día" : n === 1 ? "1 día antes" : `${n} días antes`}</button>`).join("")}</div></div>
        <label class="field"><span class="lbl">Hora del aviso</span><input class="input" type="time" data-aj="hora" value="${esc(r.hora)}"></label>
        <label class="row between"><span class="grow"><b>Avisar el día de corte</b><div class="small muted">Para saber que desde mañana tus compras tienen más días para pagarse.</div></span>
          <span class="switch"><input type="checkbox" data-aj="corte" ${r.corte ? "checked" : ""}><span></span></span></label>
        <label class="row between" style="margin-top:12px"><span class="grow"><b>Recordarme capturar el estado de cuenta</b><div class="small muted">3 días después de cada corte, para que los montos sean exactos.</div></span>
          <span class="switch"><input type="checkbox" data-aj="estado" ${r.estado !== false ? "checked" : ""}><span></span></span></label>
        ${exactas && exactas !== "granted" ? `<div class="tip aviso" style="box-shadow:none;background:var(--warn-soft);margin-top:12px"><span class="ticon">${icono("reloj", 20)}</span><span class="grow">
          <div class="ttl">Avisos a la hora exacta</div><div class="txt">Android puede retrasar los recordatorios unos minutos u horas. Permite las "alarmas y recordatorios" para que lleguen puntuales.</div>
          <button class="btn sm sec" data-act="alarmasExactas" style="margin-top:8px">Permitir</button></span></div>` : ""}
        ${exactas === "granted" ? `<p class="small muted" style="margin:10px 0 0">${icono("okCirculo", 15, 'style="vertical-align:-3px;color:var(--good)"')} Los avisos llegan a la hora exacta.</p>` : ""}
        <button class="btn block ghost" data-act="probarAviso" style="margin-top:14px">${icono("campana", 18)} Enviar notificación de prueba</button>
        ${Plat.nativo ? `<p class="small muted" style="margin:12px 0 0">${icono("info", 14, 'style="vertical-align:-2px"')} <b>Widget:</b> mantén presionada tu pantalla de inicio → Widgets → Al Día, para ver tu próximo pago sin abrir la app.</p>` : ""}
      </div>

      <div class="section-title">Preferencias</div>
      <div class="panel">
        <label class="field"><span class="lbl">Moneda</span>
          <select class="input" data-aj="moneda">${Datos.MONEDAS.map((m) => `<option value="${m.c}" ${m.c === a.moneda ? "selected" : ""}>${m.c} · ${esc(m.n)}</option>`).join("")}</select></label>
        <div class="field"><span class="lbl">Tema</span>
          <div class="seg">${[["auto", "Automático"], ["light", "Claro"], ["dark", "Oscuro"]].map(([v, n]) => `<button type="button" class="${a.tema === v ? "on" : ""}" data-act="ajTema" data-v="${v}">${n}</button>`).join("")}</div></div>
        <label class="field"><span class="lbl">IVA sobre intereses (%)</span>
          <input class="input num" data-aj="iva" inputmode="decimal" value="${Datos.ivaIntereses()}">
          <div class="hint">En México los bancos cobran 16% de IVA sobre los intereses. Se usa en los intereses estimados.</div></label>
        <label class="row between"><span class="grow"><b>Modo discreto</b><div class="small muted">Difumina los montos, por si alguien mira tu pantalla. También con el ojo de la portada.</div></span>
          <span class="switch"><input type="checkbox" data-aj="discreto" ${a.discreto ? "checked" : ""}><span></span></span></label>
      </div>

      <div class="section-title">Seguridad</div>
      <div class="panel">
        <label class="row between"><span class="grow"><b>Bloqueo con PIN</b><div class="small muted">${a.seguridad.pin ? "Activado" : "Pide un PIN de 4 números al abrir la app."}</div></span>
          <span class="switch"><input type="checkbox" data-aj="pin" ${a.seguridad.pin ? "checked" : ""}><span></span></span></label>
        ${a.seguridad.pin ? `
          ${huellaDisp ? `<label class="row between" style="margin-top:14px"><span class="grow"><b>Desbloquear con huella</b><div class="small muted">O con el reconocimiento facial de tu teléfono.</div></span>
            <span class="switch"><input type="checkbox" data-aj="biometria" ${a.seguridad.biometria ? "checked" : ""}><span></span></span></label>` : ""}
          <label class="row between" style="margin-top:14px"><span class="grow"><b>Bloquear al salir</b><div class="small muted">Si dejas la app más de 30 segundos.</div></span>
            <span class="switch"><input type="checkbox" data-aj="bloquearAlSalir" ${a.seguridad.bloquearAlSalir ? "checked" : ""}><span></span></span></label>
          <button class="btn block ghost sm" data-act="cambiarPin" style="margin-top:14px">Cambiar PIN</button>` : ""}
      </div>

      <div class="section-title">Tus datos</div>
      <div class="panel" style="margin-bottom:10px">
        <div class="row top"><span style="color:var(--good)">${icono("escudo", 22)}</span>
        <div class="grow small"><b>Tus datos no salen de tu teléfono.</b><div class="muted">No hay cuentas, servidores ni conexión con tu banco. Por eso conviene que hagas un respaldo de vez en cuando${a.ultimoRespaldo ? ` (el último fue el ${F.textoFecha(a.ultimoRespaldo, { anio: true })})` : ""}.</div></div></div>
      </div>
      <div class="list">
        <div class="item"><span class="ic">${icono("archivo", 20)}</span><span class="grow"><div class="t1">Respaldos automáticos</div>
          <div class="t2">Una copia semanal dentro del teléfono${Plat.nativo ? ", que Android sube a tu copia de seguridad de Google si la tienes activada" : ""}.${snapshots.length ? ` Última: ${F.textoFecha(snapshots[0].fecha, { anio: true })}.` : ""}</div></span>
          <span class="switch"><input type="checkbox" data-aj="respaldosAuto" ${a.respaldosAuto ? "checked" : ""}><span></span></span></div>
        ${snapshots.length ? `<button class="item" data-act="verSnapshots"><span class="ic">${icono("repetir", 20)}</span><span class="grow"><div class="t1">Restaurar una copia automática</div><div class="t2">${snapshots.length} disponible${snapshots.length === 1 ? "" : "s"}</div></span>${icono("derecha", 18)}</button>` : ""}
        <button class="item" data-act="exportar"><span class="ic">${icono("descarga", 20)}</span><span class="grow"><div class="t1">Guardar respaldo</div><div class="t2">Un archivo con todas tus tarjetas y movimientos</div></span></button>
        <button class="item" data-act="importar"><span class="ic">${icono("subir", 20)}</span><span class="grow"><div class="t1">Restaurar respaldo</div><div class="t2">Reemplaza los datos actuales por los del archivo</div></span></button>
        <button class="item" data-act="exportarIcs"><span class="ic">${icono("calendario", 20)}</span><span class="grow"><div class="t1">Exportar fechas al calendario</div><div class="t2">Archivo .ics con tus fechas límite y alarmas</div></span></button>
        <button class="item" data-act="ejemplo"><span class="ic">${icono("chispa", 20)}</span><span class="grow"><div class="t1">Cargar datos de ejemplo</div><div class="t2">Para explorar la app (reemplaza tus datos)</div></span></button>
        <button class="item" data-act="borrarTodo" style="color:var(--bad)"><span class="ic critico">${icono("basura", 20)}</span><span class="grow"><div class="t1">Borrar todos los datos</div></span></button>
      </div>
      <input type="file" id="archivoRespaldo" accept=".json,application/json,text/plain" class="hide">

      <p class="tiny faint center" style="margin-top:22px">Al Día · versión ${esc(App.version)}<br>Hecho para ayudarte a pagar a tiempo. Las cifras estimadas son aproximadas: tu estado de cuenta siempre manda.</p>`;
  }

  function montar(raiz) {
    const a = Datos.ajustes;
    raiz.querySelectorAll("[data-aj]").forEach((el) => {
      el.addEventListener("change", async () => {
        const k = el.dataset.aj;
        if (k === "activos") {
          a.recordatorios.activos = el.checked;
          if (el.checked && permiso !== "granted") { permiso = await Avisos.pedirPermiso(); }
        } else if (k === "hora") a.recordatorios.hora = el.value || "09:00";
        else if (k === "corte") a.recordatorios.corte = el.checked;
        else if (k === "moneda") a.moneda = el.value;
        else if (k === "discreto") a.discreto = el.checked;
        else if (k === "estado") a.recordatorios.estado = el.checked;
        else if (k === "iva") { const v = parseFloat(String(el.value).replace(",", ".")); a.ivaIntereses = v >= 0 && v <= 100 ? v : null; }
        else if (k === "biometria") {
          if (el.checked && !(await Bloqueo.pedirBiometria("Confirma tu huella"))) { el.checked = false; return; }
          a.seguridad.biometria = el.checked;
        }
        else if (k === "bloquearAlSalir") a.seguridad.bloquearAlSalir = el.checked;
        else if (k === "respaldosAuto") { a.respaldosAuto = el.checked; if (el.checked) { a.ultimoSnapshot = null; Datos.snapshotSiToca(App.hoy).then(refrescarPermiso); } }
        else if (k === "pin") {
          el.checked = !el.checked; // lo decide el flujo, no el interruptor
          if (a.seguridad.pin) await Bloqueo.quitarPin(); else await Bloqueo.crearPin();
          App.render();
          return;
        }
        Datos.guardar();
        setTimeout(refrescarPermiso, 900);
      });
    });
    const archivo = raiz.querySelector("#archivoRespaldo");
    archivo.addEventListener("change", () => {
      const f = archivo.files && archivo.files[0];
      if (!f) return;
      const lector = new FileReader();
      lector.onload = async () => {
        archivo.value = "";
        if (!(await confirmar({ titulo: "¿Restaurar este respaldo?", texto: "Tus datos actuales se reemplazarán por los del archivo.", ok: "Restaurar" }))) return;
        try {
          Datos.importar(String(lector.result));
          aviso("Respaldo restaurado ✓");
          App.ir("inicio");
        } catch (e) {
          aviso(e.message || "No se pudo leer el archivo", 4000);
        }
      };
      lector.readAsText(f);
    });
  }

  App.registrar("ajustes", {
    titulo: () => "Ajustes",
    html,
    montar,
    alEntrar: refrescarPermiso,
  });

  App.accion("ajDia", (el) => {
    const r = Datos.ajustes.recordatorios;
    const n = +el.dataset.n;
    r.dias = r.dias.includes(n) ? r.dias.filter((x) => x !== n) : [...r.dias, n].sort((x, y) => y - x);
    Datos.guardar();
  });
  App.accion("alarmasExactas", async () => { await Avisos.pedirAlarmasExactas(); setTimeout(refrescarPermiso, 1500); });
  App.accion("cambiarPin", () => Bloqueo.cambiarPin());
  App.accion("verSnapshots", async () => {
    const lista = await Datos.listarSnapshots();
    UI.abrirHoja(`<h2>Copias automáticas</h2><p class="lead">Se guarda una por semana. Restaurar una reemplaza tus datos actuales por los de esa fecha.</p>
      <div class="list" style="box-shadow:none;background:var(--surface-2)">${lista.map((x) => `<button class="item" data-snap="${esc(x.nombre)}"><span class="ic">${icono("archivo", 20)}</span><span class="grow t1">${F.textoFechaLarga(x.fecha)}</span>${icono("derecha", 18)}</button>`).join("")}</div>`, {
      alMontar(el) {
        el.addEventListener("click", async (e) => {
          const b = e.target.closest("[data-snap]");
          if (!b) return;
          if (!(await confirmar({ titulo: "¿Restaurar esta copia?", texto: "Tus datos actuales se reemplazarán por los de esa fecha.", ok: "Restaurar", peligro: true }))) return;
          try {
            const txt = await Datos.leerSnapshot(b.dataset.snap);
            Datos.importar(txt);
            aviso("Copia restaurada ✓");
            App.ir("inicio");
          } catch (err) { aviso("No se pudo leer esa copia", 3500); }
        });
      },
    });
  });
  App.accion("ajTema", (el) => { Datos.ajustes.tema = el.dataset.v; Datos.guardar(); });
  App.accion("pedirPermiso", async () => {
    permiso = await Avisos.pedirPermiso();
    if (permiso === "granted") { await Avisos.reprogramar(); aviso("Notificaciones activadas ✓"); }
    else if (permiso === "denied") aviso("Permiso denegado. Puedes activarlo en los ajustes del teléfono.", 4000);
    refrescarPermiso();
  });
  App.accion("probarAviso", async () => {
    const r = await Avisos.probar();
    if (r === "granted") aviso(Plat.nativo ? "Te llegará en unos segundos" : "Notificación enviada");
    else if (r === "unsupported") aviso("Este navegador no admite notificaciones", 3500);
    else aviso("Primero permite las notificaciones", 3500);
    refrescarPermiso();
  });
  App.accion("borrarTodo", async () => {
    if (await confirmar({ titulo: "¿Borrar todo?", texto: "Se eliminarán todas tus tarjetas, movimientos y ajustes de este teléfono. Si no tienes un respaldo, no podrás recuperarlos.", ok: "Borrar todo", peligro: true })) {
      Datos.borrarTodo();
      aviso("Datos borrados");
      App.ir("inicio");
    }
  });
  App.accion("importar", () => document.getElementById("archivoRespaldo").click());

  // ---------- Bienvenida ----------

  function bienvenida() {
    const a = Datos.ajustes;
    return `
      <div class="welcome">
        <div class="logo">${icono("tarjeta", 34)}</div>
        <h1>Tus tarjetas de crédito, siempre al día</h1>
        <p class="muted" style="margin:0 0 8px">Te digo cuánto y cuándo pagar, te aviso antes de cada fecha límite y te enseño a no pagar intereses de más.</p>
        <div class="feat"><span class="ic">${icono("campana", 22)}</span><div><b>Recordatorios de pago</b><div class="small muted">Con el monto exacto para no generar intereses y el mínimo.</div></div></div>
        <div class="feat"><span class="ic">${icono("calendario", 22)}</span><div><b>Cortes y fechas límite claros</b><div class="small muted">Y el mejor día para hacer compras grandes.</div></div></div>
        <div class="feat"><span class="ic">${icono("plan", 22)}</span><div><b>Plan para salir de deudas</b><div class="small muted">Simula cuánto ahorras pagando más que el mínimo.</div></div></div>
        <div class="feat"><span class="ic">${icono("escudo", 22)}</span><div><b>Privado</b><div class="small muted">Sin cuentas ni conexión con tu banco: todo se queda en tu teléfono.</div></div></div>
        <label class="field" style="margin-top:8px"><span class="lbl">Tu moneda</span>
          <select class="input" id="monedaInicial">${Datos.MONEDAS.map((m) => `<option value="${m.c}" ${m.c === a.moneda ? "selected" : ""}>${m.c} · ${esc(m.n)}</option>`).join("")}</select></label>
        <div style="margin-top:auto;padding-top:16px">
          <button class="btn block" data-act="empezar" data-modo="nueva">${icono("mas", 20)} Agregar mi primera tarjeta</button>
          <button class="btn block ghost" data-act="empezar" data-modo="ejemplo" style="margin-top:10px">Explorar con datos de ejemplo</button>
          <button class="link block center" data-act="empezar" data-modo="aprender" style="width:100%;margin-top:10px">Primero quiero entender cómo funcionan</button>
        </div>
      </div>`;
  }

  App.accion("empezar", (el) => {
    const sel = document.getElementById("monedaInicial");
    if (sel) Datos.ajustes.moneda = sel.value;
    Datos.estado.onboarded = true;
    Datos.guardar();
    const modo = el.dataset.modo;
    if (modo === "nueva") { App.ir("inicio"); Formularios.formTarjeta(); }
    else if (modo === "ejemplo") App.cargarEjemplo(true);
    else App.ir("aprende");
  });

  window.Bienvenida = { html: bienvenida };
})();
