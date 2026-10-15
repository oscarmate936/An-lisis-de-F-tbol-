/* Calendario: cortes, fechas límite y mejores días de compra del mes. */
(function () {
  "use strict";

  const { icono, esc, $m } = UI;
  const F = Fechas;
  const P = Piezas;

  const estado = { mes: null, sel: null };

  function eventosEntre(desde, hasta) {
    const out = [];
    for (const t of Datos.tarjetas) out.push(...Calc.eventos(t, desde, hasta, App.hoy));
    const orden = { pago: 0, corte: 1, mejor: 2 };
    return out.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : orden[a.tipo] - orden[b.tipo]));
  }

  function pagadoEv(ev) {
    return ev.ec && (ev.ec.estado === "pagado" || ev.ec.estado === "sin-saldo");
  }

  function filaEvento(ev) {
    const t = ev.t;
    const hoy = App.hoy;
    let ic, tono, titulo, sub, monto = "";
    if (ev.tipo === "pago") {
      const pag = pagadoEv(ev);
      ic = pag ? "okCirculo" : "cartera";
      tono = pag ? "bien" : ev.ec && ev.ec.estado === "vencido" ? "critico" : "aviso";
      titulo = `Fecha límite · ${t.nombre}`;
      sub = ev.ec ? `Corte del ${F.textoFecha(ev.corte)} · ${P.ESTADOS[ev.ec.estado].texto}` : `Del corte del ${F.textoFecha(ev.corte)} (aún no corta)`;
      if (ev.ec && !pag) monto = $m(ev.ec.restante);
    } else if (ev.tipo === "corte") {
      ic = "tijera"; tono = "info";
      titulo = `Corte · ${t.nombre}`;
      sub = `Lo que compres después se paga hasta el ${F.textoFecha(Calc.fechaLimite(t, Calc.corteDespues(t, ev.fecha)))}`;
    } else {
      ic = "estrella"; tono = "bien";
      titulo = `Mejor día para comprar · ${t.nombre}`;
      sub = `${Calc.diasParaPagarCompra(t, ev.fecha)} días para pagar sin intereses`;
    }
    return `<button class="item" data-act="verTarjeta" data-id="${t.id}">
      <span class="ic ${tono}">${icono(ic, 20)}</span>
      <span class="grow"><div class="t1 ellipsis">${esc(titulo)}</div><div class="t2">${esc(sub)}</div>
      <div class="tiny faint">${F.textoFecha(ev.fecha, { semana: true })} · ${F.textoRelativo(ev.fecha, hoy)}</div></span>
      ${monto ? `<span class="amount">${monto}</span>` : ""}
    </button>`;
  }

  function html() {
    const hoy = App.hoy;
    if (!Datos.tarjetas.length) {
      return `<div class="empty"><div class="art">${icono("calendario", 44)}</div><h3>Tu calendario de pagos</h3>
        <p>Cuando agregues una tarjeta, aquí verás sus fechas de corte, de pago y los mejores días para comprar.</p>
        <button class="btn block" data-act="nuevaTarjeta">${icono("mas", 20)} Agregar tarjeta</button></div>`;
    }
    if (!estado.mes) estado.mes = hoy.slice(0, 7);
    if (!estado.sel) estado.sel = hoy;
    const [y, m] = estado.mes.split("-").map(Number);
    const primero = F.iso(y, m, 1);
    const ultimo = F.iso(y, m, F.diasDelMes(y, m));
    // La semana empieza en lunes.
    const offset = (F.diaSemana(primero) + 6) % 7;
    const inicio = F.sumarDias(primero, -offset);
    const fin = F.sumarDias(inicio, 41);
    const evs = eventosEntre(inicio, fin);
    const porDia = new Map();
    for (const ev of evs) {
      if (!porDia.has(ev.fecha)) porDia.set(ev.fecha, []);
      porDia.get(ev.fecha).push(ev);
    }

    let celdas = "";
    for (let i = 0; i < 42; i++) {
      const f = F.sumarDias(inicio, i);
      const d = porDia.get(f) || [];
      const marcas = [];
      if (d.some((e) => e.tipo === "pago" && !pagadoEv(e))) marcas.push("m-pago");
      else if (d.some((e) => e.tipo === "pago")) marcas.push("m-pagado");
      if (d.some((e) => e.tipo === "corte")) marcas.push("m-corte");
      if (d.some((e) => e.tipo === "mejor")) marcas.push("m-mejor");
      const cls = [f < primero || f > ultimo ? "otro" : "", f === hoy ? "hoy" : "", f === estado.sel ? "sel" : ""].join(" ");
      celdas += `<button class="${cls}" data-act="calDia" data-f="${f}" aria-label="${F.textoFechaLarga(f)}${d.length ? `, ${d.length} evento${d.length > 1 ? "s" : ""}` : ""}">
        <span class="num">${F.partes(f).d}</span><span class="marks">${marcas.map((c) => `<i class="${c}"></i>`).join("")}</span></button>`;
    }

    const delDia = porDia.get(estado.sel) || [];
    const prox = eventosEntre(hoy, F.sumarDias(hoy, 35)).filter((e) => e.tipo !== "mejor" || e.fecha === hoy);

    return `
      <div class="panel">
        <div class="cal-head">
          <button class="icon-btn" data-act="calMes" data-d="-1" aria-label="Mes anterior">${icono("izquierda", 22)}</button>
          <h3>${F.MESES[m - 1]} ${y}</h3>
          <button class="icon-btn" data-act="calMes" data-d="1" aria-label="Mes siguiente">${icono("derecha", 22)}</button>
        </div>
        <div class="cal">
          ${["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => `<div class="dow">${d}</div>`).join("")}
          ${celdas}
        </div>
        <div class="legend">
          <span><i class="m-pago"></i>Fecha límite</span>
          <span><i class="m-pagado"></i>Pagado</span>
          <span><i class="m-corte"></i>Corte</span>
          <span><i class="m-mejor"></i>Mejor día para comprar</span>
        </div>
      </div>

      <div class="section-title">${estado.sel === hoy ? "Hoy" : F.textoFechaLarga(estado.sel).replace(/^./, (c) => c.toUpperCase())}</div>
      ${delDia.length ? `<div class="list">${delDia.map(filaEvento).join("")}</div>` : `<div class="panel small muted center">Nada este día.</div>`}

      <div class="section-title">Próximas 5 semanas</div>
      ${prox.length ? `<div class="list">${prox.map(filaEvento).join("")}</div>` : `<div class="panel small muted center">Sin eventos próximos.</div>`}

      <button class="btn block ghost" data-act="exportarIcs" style="margin-top:16px">${icono("descarga", 19)} Añadir fechas a mi calendario (.ics)</button>
      <p class="tiny faint center">Crea eventos con alarma en Google Calendar o el calendario de tu teléfono para los próximos 12 meses.</p>`;
  }

  App.registrar("calendario", {
    tab: true,
    titulo: () => "Calendario",
    sub: () => "Cortes y fechas de pago",
    acciones: () => `<button class="icon-btn" data-act="calHoy" aria-label="Ir a hoy">${icono("calendario", 22)}</button>`,
    html,
  });

  App.accion("calDia", (el) => { estado.sel = el.dataset.f; if (el.dataset.f.slice(0, 7) !== estado.mes) estado.mes = el.dataset.f.slice(0, 7); App.render(); });
  App.accion("calMes", (el) => {
    const [y, m] = estado.mes.split("-").map(Number);
    const n = F.fechaConDia(y, m + Number(el.dataset.d), 1);
    estado.mes = n.slice(0, 7);
    estado.sel = estado.mes === App.hoy.slice(0, 7) ? App.hoy : n;
    App.render();
  });
  App.accion("calHoy", () => { estado.mes = App.hoy.slice(0, 7); estado.sel = App.hoy; App.render(); });
})();
