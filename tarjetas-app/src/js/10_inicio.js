/* Pantalla de inicio: el resumen de "cómo voy" en un vistazo. */
(function () {
  "use strict";

  const { icono, esc, $m, ayuda } = UI;
  const F = Fechas;
  const P = Piezas;

  function saludo() {
    const h = new Date().getHours();
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  }

  function vacio() {
    return `
      <div class="empty">
        <div class="art">${icono("tarjeta", 44)}</div>
        <h3>Agrega tu primera tarjeta</h3>
        <p>Con el día de corte y el día de pago te diré cuánto y cuándo pagar, y te mandaré recordatorios para que nunca pagues intereses de más.</p>
        <button class="btn block" data-act="nuevaTarjeta">${icono("mas", 20)} Agregar tarjeta</button>
        <button class="btn block ghost" data-act="ejemplo" style="margin-top:10px">Probar con datos de ejemplo</button>
      </div>
      <div class="panel" style="margin-top:8px">
        <div class="row top">
          <span style="color:var(--primary)">${icono("bombilla", 22)}</span>
          <div class="grow small"><b>¿Nuevo con las tarjetas de crédito?</b><div class="muted">En la sección <b>Aprende</b> te explico con ejemplos qué es la fecha de corte, el pago mínimo y cómo no pagar intereses.</div>
          <button class="link" data-act="tab" data-tab="aprende">Empezar a aprender →</button></div>
        </div>
      </div>`;
  }

  function html() {
    const res = App.resumenes();
    if (!res.length) return vacio();
    const hoy = App.hoy;
    const tot = Calc.totales(res);
    const disc = Datos.ajustes.discreto;

    // Pagos: los del corte ya cerrado primero (por fecha), luego los que
    // aún no cortan.
    const pagos = res.map((s) => s).sort((a, b) => {
      const pa = a.proximoPago, pb = b.proximoPago;
      const peso = (p) => (p.estado === "vencido" ? 0 : p.tipo === "corte" ? 1 : 2);
      return peso(pa) - peso(pb) || (pa.fecha < pb.fecha ? -1 : pa.fecha > pb.fecha ? 1 : 0);
    });
    const urgente = pagos.find((s) => s.proximoPago.tipo === "corte" && s.proximoPago.estado !== "pagado");
    const cs = Calc.consejos(res, hoy, (x) => Datos.dinero(x));

    let destacado = "";
    if (urgente) {
      const p = urgente.proximoPago;
      const t = urgente.t;
      destacado = `
        <div class="section-title">Tu próximo pago</div>
        <div class="panel">
          <div class="due">
            ${P.cajaFecha(p.fecha, P.tonoPago(p, hoy))}
            <div class="grow">
              <div class="row between"><b class="ellipsis">${esc(t.nombre)}</b>${P.insignia(p.estado, p.fecha, hoy)}</div>
              <div class="small muted">${p.estado === "vencido" ? "Venció el" : "Fecha límite:"} ${F.textoFechaLarga(p.fecha)}</div>
            </div>
          </div>
          <div class="grid2" style="margin-top:14px">
            <div class="kpi" style="box-shadow:none;background:var(--surface-2)">
              <div class="k">${urgente.ec.pagado > 0 ? "Te falta para no pagar intereses" : "Para no pagar intereses"} ${ayuda("noIntereses")}</div>
              <div class="v">${$m(p.monto)}</div>
              <div class="s">${p.estimado ? "Estimado" : "De tu estado de cuenta"}</div>
            </div>
            <div class="kpi" style="box-shadow:none;background:var(--surface-2)">
              <div class="k">Pago mínimo ${ayuda("minimo")}</div>
              <div class="v">${p.minimo > 0 ? $m(p.minimo) : `<span style="color:var(--good)">Cubierto ✓</span>`}</div>
              <div class="s">${urgente.ec.interesSiMinimo ? `Si pagas solo esto: ≈${esc(Datos.dinero(urgente.ec.interesSiMinimo, true))} de intereses` : "Solo para emergencias"}</div>
            </div>
          </div>
          <div class="btn-row" style="margin-top:14px">
            <button class="btn sec" data-act="verTarjeta" data-id="${t.id}">Ver detalle</button>
            <button class="btn" data-act="nuevoPago" data-id="${t.id}">Registrar pago</button>
          </div>
        </div>`;
    }

    return `
      <div class="hero">
        <button class="icon-btn eye" data-act="discreto" aria-label="${disc ? "Mostrar montos" : "Ocultar montos"}">${icono(disc ? "ojoNo" : "ojo", 20)}</button>
        <div class="label">Deuda total en ${res.length} tarjeta${res.length === 1 ? "" : "s"}</div>
        <div class="big">${$m(tot.deuda)}</div>
        <div class="split">
          <div><div class="label">Disponible</div><div class="v">${$m(tot.disponible)}</div></div>
          <div><div class="label">Límite total</div><div class="v">${$m(tot.limite, true)}</div></div>
        </div>
        <div class="bar"><i style="width:${Math.min(100, tot.uso * 100).toFixed(1)}%"></i></div>
        <div class="row between small"><span>Usas el ${Math.round(tot.uso * 100)}% de tu crédito</span><span class="badge" style="background:rgba(255,255,255,.2);color:#fff">${tot.nivel.texto}</span></div>
      </div>

      <div class="btn-row" style="margin-top:14px">
        <button class="btn ghost" data-act="nuevaCompra">${icono("compra", 19)} Compra</button>
        <button class="btn ghost" data-act="nuevoPago">${icono("pago", 19)} Pago</button>
      </div>
      ${Extras.panelMejorTarjeta()}

      ${destacado}

      <div class="section-title">Pagos por tarjeta <button class="link" data-act="tab" data-tab="calendario">Calendario</button></div>
      <div class="list">
        ${pagos.map((s) => {
          const p = s.proximoPago;
          const sub = p.tipo === "corte"
            ? (p.estado === "pagado" ? `Corte del ${F.textoFecha(s.ultimoCorte)} pagado ✓` : `Pagar antes del ${F.textoFecha(p.fecha)}`)
            : `Próximo corte ${F.textoFecha(s.proxCorte)} · pagar antes del ${F.textoFecha(p.fecha)}`;
          const monto = p.tipo === "corte" && p.estado !== "pagado" ? p.monto : s.deuda;
          return `<button class="item" data-act="verTarjeta" data-id="${s.t.id}">
            ${P.puntoColor(s.t)}
            <span class="grow"><div class="t1 ellipsis">${esc(s.t.nombre)}</div><div class="t2 ellipsis">${sub}</div></span>
            <span class="right"><div class="amount">${$m(Math.max(0, monto))}</div><div style="margin-top:3px">${P.insignia(p.estado, p.fecha, hoy)}</div></span>
          </button>`;
        }).join("")}
      </div>

      ${cs.length ? `
        <div class="section-title">Para ti ${cs.length > 3 ? `<button class="link" data-act="todosConsejos">Ver ${cs.length}</button>` : ""}</div>
        ${cs.slice(0, 3).map(P.consejo).join("")}` : `
        <div class="section-title">Para ti</div>
        <div class="tip bien"><span class="ticon">${icono("okCirculo", 20)}</span><span class="grow"><div class="ttl">Todo en orden</div><div class="txt">No tienes pagos urgentes ni alertas. ¡Sigue así!</div></span></div>`}

      <div class="section-title">Este periodo <button class="link" data-act="verHistorial">Historial</button></div>
      <div class="kpis">
        <div class="kpi"><div class="k">Gastado desde el último corte</div><div class="v">${$m(res.reduce((a, s) => a + s.gastoCiclo, 0))}</div><div class="s">En todas tus tarjetas</div></div>
        <div class="kpi"><div class="k">Por pagar en cortes cerrados</div><div class="v">${$m(tot.porPagar)}</div><div class="s">Mínimo: ${$m(tot.minimo)}</div></div>
      </div>`;
  }

  function todosConsejos() {
    const cs = Calc.consejos(App.resumenes(), App.hoy, (x) => Datos.dinero(x));
    UI.abrirHoja(`<h2>Recomendaciones</h2><p class="lead">Ordenadas de más a menos urgente.</p>${cs.map(P.consejo).join("")}`);
  }

  App.registrar("inicio", {
    tab: true,
    titulo: () => `${saludo()}`,
    sub: () => F.textoFechaLarga(App.hoy).replace(/^./, (c) => c.toUpperCase()),
    acciones: () => `${Datos.tarjetas.length ? `<button class="icon-btn" data-act="buscar" aria-label="Buscar movimientos">${icono("buscar", 22)}</button>` : ""}<button class="icon-btn" data-act="abrir" data-v="ajustes" aria-label="Ajustes">${icono("ajustes", 22)}</button>`,
    html,
  });
  App.accion("todosConsejos", todosConsejos);
})();
