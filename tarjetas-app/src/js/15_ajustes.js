/* Ajustes y bienvenida. */
(function () {
  "use strict";

  const { icono, esc, aviso, confirmar } = UI;
  const F = Fechas;
  const { Plat } = Datos;

  let permiso = null;
  let pendientes = null;

  async function refrescarPermiso() {
    permiso = await Avisos.estadoPermiso();
    pendientes = await Avisos.pendientes();
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
        <button class="btn block ghost" data-act="probarAviso" style="margin-top:14px">${icono("campana", 18)} Enviar notificación de prueba</button>
      </div>

      <div class="section-title">Preferencias</div>
      <div class="panel">
        <label class="field"><span class="lbl">Moneda</span>
          <select class="input" data-aj="moneda">${Datos.MONEDAS.map((m) => `<option value="${m.c}" ${m.c === a.moneda ? "selected" : ""}>${m.c} · ${esc(m.n)}</option>`).join("")}</select></label>
        <div class="field"><span class="lbl">Tema</span>
          <div class="seg">${[["auto", "Automático"], ["light", "Claro"], ["dark", "Oscuro"]].map(([v, n]) => `<button type="button" class="${a.tema === v ? "on" : ""}" data-act="ajTema" data-v="${v}">${n}</button>`).join("")}</div></div>
        <label class="row between"><span class="grow"><b>Modo discreto</b><div class="small muted">Difumina los montos, por si alguien mira tu pantalla. También con el ojo de la portada.</div></span>
          <span class="switch"><input type="checkbox" data-aj="discreto" ${a.discreto ? "checked" : ""}><span></span></span></label>
      </div>

      <div class="section-title">Tus datos</div>
      <div class="panel" style="margin-bottom:10px">
        <div class="row top"><span style="color:var(--good)">${icono("escudo", 22)}</span>
        <div class="grow small"><b>Tus datos no salen de tu teléfono.</b><div class="muted">No hay cuentas, servidores ni conexión con tu banco. Por eso conviene que hagas un respaldo de vez en cuando${a.ultimoRespaldo ? ` (el último fue el ${F.textoFecha(a.ultimoRespaldo, { anio: true })})` : ""}.</div></div></div>
      </div>
      <div class="list">
        <button class="item" data-act="exportar"><span class="ic">${icono("descarga", 20)}</span><span class="grow"><div class="t1">Guardar respaldo</div><div class="t2">Un archivo con todas tus tarjetas y movimientos</div></span></button>
        <button class="item" data-act="importar"><span class="ic">${icono("subir", 20)}</span><span class="grow"><div class="t1">Restaurar respaldo</div><div class="t2">Reemplaza los datos actuales por los del archivo</div></span></button>
        <button class="item" data-act="exportarIcs"><span class="ic">${icono("calendario", 20)}</span><span class="grow"><div class="t1">Exportar fechas al calendario</div><div class="t2">Archivo .ics con tus fechas límite y alarmas</div></span></button>
        <button class="item" data-act="ejemplo"><span class="ic">${icono("chispa", 20)}</span><span class="grow"><div class="t1">Cargar datos de ejemplo</div><div class="t2">Para explorar la app (reemplaza tus datos)</div></span></button>
        <button class="item" data-act="borrarTodo" style="color:var(--bad)"><span class="ic critico">${icono("basura", 20)}</span><span class="grow"><div class="t1">Borrar todos los datos</div></span></button>
      </div>
      <input type="file" id="archivoRespaldo" accept=".json,application/json,text/plain" class="hide">

      <p class="tiny faint center" style="margin-top:22px">Al Día · versión __VERSION__<br>Hecho para ayudarte a pagar a tiempo. Las cifras estimadas son aproximadas: tu estado de cuenta siempre manda.</p>`;
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
