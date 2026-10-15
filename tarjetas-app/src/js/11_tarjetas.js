/* Tarjetas: la lista (pestaña) y el detalle de cada una. */
(function () {
  "use strict";

  const { icono, esc, $m, ayuda } = UI;
  const F = Fechas;
  const P = Piezas;

  // ---------- Lista ----------

  function lista() {
    const res = App.resumenes();
    const arch = Datos.archivadas;
    if (!res.length && !arch.length) {
      return `<div class="empty"><div class="art">${icono("tarjeta", 44)}</div><h3>Aún no tienes tarjetas</h3>
        <p>Agrega una con su día de corte y de pago. Tarda menos de un minuto.</p>
        <button class="btn block" data-act="nuevaTarjeta">${icono("mas", 20)} Agregar tarjeta</button></div>`;
    }
    return `
      <div class="stack">
        ${res.map((s) => `
          <div>
            ${P.plastico(s.t, s)}
            <div class="panel" style="margin-top:-14px;padding-top:24px;border-radius:0 0 18px 18px;position:relative;z-index:0">
              <div class="row between small"><span class="muted">Uso del límite</span><span><b>${Math.round(s.uso * 100)}%</b> · ${s.nivel.texto}</span></div>
              <div style="margin:8px 0 12px">${P.medidor(s.uso, s.nivel.tono)}</div>
              <div class="row between small">
                <span class="muted">${s.proximoPago.tipo === "corte" && s.proximoPago.estado !== "pagado" ? `Pagar ${esc(Datos.dinero(s.proximoPago.monto))} antes del ${F.textoFecha(s.proximoPago.fecha)}` : `Próximo corte: ${F.textoFecha(s.proxCorte)}`}</span>
                ${P.insignia(s.proximoPago.estado, s.proximoPago.fecha, App.hoy)}
              </div>
            </div>
          </div>`).join("")}
      </div>
      <button class="btn block sec" data-act="nuevaTarjeta" style="margin-top:16px">${icono("mas", 20)} Agregar otra tarjeta</button>
      ${arch.length ? `
        <div class="section-title">Archivadas</div>
        <div class="list">${arch.map((t) => `<button class="item" data-act="verTarjeta" data-id="${t.id}">${P.puntoColor(t)}<span class="grow t1">${esc(t.nombre)}</span>${icono("derecha", 18)}</button>`).join("")}</div>` : ""}`;
  }

  App.registrar("tarjetas", {
    tab: true,
    titulo: () => "Mis tarjetas",
    acciones: () => `<button class="icon-btn" data-act="nuevaTarjeta" aria-label="Agregar tarjeta">${icono("mas", 24)}</button>`,
    html: lista,
  });

  // ---------- Detalle ----------

  function gastosPorCategoria(t, desde, hasta) {
    const m = new Map();
    for (const mv of t.movimientos) {
      if (mv.tipo === "pago" || mv.fecha <= desde || mv.fecha > hasta) continue;
      const c = mv.tipo === "msi" ? "msi" : (mv.categoria || "otros");
      m.set(c, (m.get(c) || 0) + mv.monto);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  function detalle({ id }) {
    const t = Datos.tarjeta(id);
    if (!t) return `<div class="empty"><h3>Esta tarjeta ya no existe</h3></div>`;
    const s = App.res(id);
    const hoy = App.hoy;
    const ec = s.ec;
    const p = s.proximoPago;

    const cortado = ec.estado !== "sin-saldo";
    const est = (k) => (ec.estimado[k] ? `<span class="badge" style="margin-left:6px">estimado</span>` : "");
    const movs = t.movimientos.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
    const cats = gastosPorCategoria(t, s.ultimoCorte, hoy);
    const maxCat = cats.length ? cats[0][1] : 1;

    // Historial: últimos cortes desde que se registró la tarjeta.
    const hist = [];
    let c = Calc.corteEnOAntes(t, F.sumarDias(s.ultimoCorte, -1));
    // Antes del alta solo se muestran los cortes capturados: de los demás
    // no hay datos con qué estimar.
    for (let i = 0; i < 12 && hist.length < 5; i++) {
      if (c >= t.fechaInicial || t.estados[c]) hist.push(Calc.estadoDeCuenta(t, c, hoy));
      c = Calc.corteEnOAntes(t, F.sumarDias(c, -1));
    }

    const diasLim = F.diasEntre(hoy, ec.limite);

    return `
      ${P.plastico(t, s, { boton: false })}
      ${t.archivada ? `<div class="tip aviso" style="margin-top:12px"><span class="ticon">${icono("archivo", 20)}</span><span class="grow"><div class="ttl">Tarjeta archivada</div><div class="txt">No recibes recordatorios de esta tarjeta. Reactívala desde el menú ⋮.</div></span></div>` : ""}

      <div class="btn-row three" style="margin-top:14px">
        <button class="btn ghost sm" data-act="nuevaCompra" data-id="${id}">${icono("compra", 18)} Compra</button>
        <button class="btn ghost sm" data-act="nuevoPago" data-id="${id}">${icono("pago", 18)} Pago</button>
        <button class="btn ghost sm" data-act="estadoCuenta" data-id="${id}">${icono("recibo", 18)} Estado</button>
      </div>

      <div class="section-title">Estado de cuenta actual</div>
      <div class="panel">
        <div class="row between">
          <div><div class="bold">Corte del ${F.textoFecha(ec.corte, { anio: true })}</div>
          <div class="small muted">${cortado ? `Fecha límite: ${F.textoFecha(ec.limite, { semana: true })} (${diasLim >= 0 ? F.textoRelativo(ec.limite, hoy) : "ya pasó"})` : "No tenías nada que pagar en este corte"}</div></div>
          ${P.insignia(ec.estado, ec.limite, hoy)}
        </div>
        ${cortado ? `
        <div style="margin-top:8px">
          ${P.filaInfo("Pago para no generar intereses", `${$m(ec.noInt)}${est("noInt")}`, { clave: "noIntereses", fuerte: true })}
          ${P.filaInfo("Pago mínimo", `${$m(ec.minimo)}${est("minimo")}`, { clave: "minimo" })}
          ${ec.pendienteMSI > 0 ? P.filaInfo("Compras a meses pendientes", $m(ec.pendienteMSI), { clave: "msi", sub: "No hace falta pagarlas ahora" }) : ""}
          ${P.filaInfo("Ya pagaste", $m(ec.pagado))}
          ${ec.estado !== "pagado" ? P.filaInfo("Te falta para no pagar intereses", $m(ec.restante), { fuerte: true }) : ""}
        </div>
        ${ec.estado !== "pagado" && ec.restanteMin > 0 ? `<div class="small" style="margin:4px 0 10px;color:var(--text-2)">Para no atrasarte necesitas al menos ${$m(ec.restanteMin)}.</div>` : ""}
        ${ec.interesSiMinimo > 0 && ec.estado !== "pagado" ? `<div class="tip aviso" style="box-shadow:none;background:var(--warn-soft);margin:6px 0 12px"><span class="ticon">${icono("alerta", 20)}</span><span class="grow"><div class="ttl">Si pagas solo el mínimo</div><div class="txt">Pagarías alrededor de <b>${esc(Datos.dinero(ec.interesSiMinimo))}</b> de intereses el próximo mes (con tu tasa de ${t.tasaAnual}% anual).</div></span></div>` : ""}
        ${ec.estado !== "pagado" && ec.restante > 0 ? `<button class="btn block" data-act="nuevoPago" data-id="${id}">${icono("pago", 18)} Registrar pago</button>` : ""}
        ${!ec.capturado ? `<button class="link small" data-act="estadoCuenta" data-id="${id}" style="margin-top:8px">${icono("recibo", 15, 'style="vertical-align:-2px"')} Capturar montos reales de tu estado de cuenta</button>` : ""}
        ` : ""}
      </div>

      <div class="section-title">Fechas clave</div>
      <div class="panel">
        ${P.filaInfo("Próximo corte", F.textoFecha(s.proxCorte, { semana: true }), { clave: "corte", sub: F.textoRelativo(s.proxCorte, hoy) })}
        ${P.filaInfo("Se paga hasta", F.textoFecha(Calc.fechaLimite(t, s.proxCorte), { semana: true }), { clave: "limite" })}
        ${P.filaInfo("Mejor día para comprar", F.textoFecha(s.mejorDia, { semana: true }), { clave: "mejorDia", sub: `${s.diasMax} días para pagar`, fuerte: true })}
        <div class="small muted" style="padding-top:6px;border-top:1px solid var(--border);margin-top:4px">
          ${icono("info", 15, 'style="vertical-align:-3px;margin-right:4px"')} Si compras hoy, lo pagas hasta el <b>${F.textoFecha(Calc.fechaLimite(t, Calc.corteDeCompra(t, hoy)))}</b> (${s.diasHoy} días).
        </div>
      </div>

      <div class="section-title">Tu crédito</div>
      <div class="panel">
        <div class="row between"><span class="muted">Uso del límite ${ayuda("uso")}</span><span class="badge ${s.nivel.tono}">${Math.round(s.uso * 100)}% · ${s.nivel.texto}</span></div>
        <div style="margin:10px 0 6px">${P.medidor(s.uso, s.nivel.tono)}</div>
        ${P.filaInfo("Deuda actual", $m(Math.max(0, s.deuda)), { clave: "deuda", fuerte: true })}
        ${s.deuda < 0 ? P.filaInfo("Saldo a favor", $m(-s.deuda)) : ""}
        ${P.filaInfo("Disponible", $m(Math.max(0, s.disponible)))}
        ${P.filaInfo("Límite", $m(t.limite))}
        ${P.filaInfo("Tasa anual", t.tasaAnual != null ? `${t.tasaAnual}%` : `<button class="link" data-act="editarTarjeta" data-id="${id}">Agregar</button>`, { clave: "tasa" })}
      </div>

      ${s.planes.length ? `
      <div class="section-title">Compras a meses</div>
      <div class="list">${s.planes.map((pl) => `
        <button class="item" data-act="verMovimiento" data-id="${id}" data-mid="${pl.id}">
          <span class="ic info">${icono("capas", 20)}</span>
          <span class="grow"><div class="t1 ellipsis">${esc(pl.desc || "Compra a meses")}</div>
            <div class="t2">${pl.facturadas} de ${pl.meses} mensualidades · faltan ${esc(Datos.dinero(pl.pendiente))}</div>
            <div style="margin-top:6px">${P.medidor(pl.facturadas / pl.meses, "bien")}</div></span>
          <span class="amount">${$m(pl.cuota)}<div class="tiny faint right">/mes</div></span>
        </button>`).join("")}</div>` : ""}

      ${cats.length ? `
      <div class="section-title">Gastos desde el corte</div>
      <div class="panel">
        ${cats.map(([c, v]) => {
          const info = c === "msi" ? { e: "🧾", n: "Compras a meses" } : P.cat(c);
          return `<div style="margin-bottom:10px"><div class="row between small"><span>${info.e} ${esc(info.n)}</span><b class="num">${$m(v)}</b></div>
            <div class="meter" style="margin-top:5px;height:6px"><i style="width:${(v / maxCat * 100).toFixed(1)}%;background:var(--series-1)"></i></div></div>`;
        }).join("")}
        <div class="small muted">Total: <b>${$m(s.gastoCiclo)}</b></div>
      </div>` : ""}

      <div class="section-title">Movimientos ${movs.length > 8 ? `<button class="link" data-act="abrir" data-v="movimientos" data-id="${id}">Ver todos (${movs.length})</button>` : ""}</div>
      ${movs.length ? `<div class="list">${movs.slice(0, 8).map((mv) => P.filaMovimiento(mv)).join("").replace(/data-id=""/g, `data-id="${id}"`)}</div>` :
        `<div class="panel small muted center">Aún no registras compras ni pagos. Usa los botones de arriba para que tu deuda esté siempre al día.</div>`}

      ${hist.length ? `
      <div class="section-title">Estados de cuenta anteriores</div>
      <div class="list">${hist.map((h) => `
        <button class="item" data-act="estadoCuenta" data-id="${id}" data-corte="${h.corte}">
          <span class="ic">${icono("recibo", 20)}</span>
          <span class="grow"><div class="t1">Corte del ${F.textoFecha(h.corte, { anio: true })}</div><div class="t2">${h.capturado ? "Capturado" : "Estimado"} · pagado ${esc(Datos.dinero(h.pagado))}</div></span>
          <span class="right"><div class="amount">${$m(h.noInt)}</div><div style="margin-top:3px">${P.insignia(h.estado, h.limite, hoy)}</div></span>
        </button>`).join("")}</div>` : ""}

      <p class="tiny faint center" style="margin-top:18px">Registrada el ${F.textoFecha(t.fechaInicial, { anio: true })} con una deuda de ${esc(Datos.dinero(t.saldoInicial || 0))}.</p>`;
  }

  App.registrar("tarjeta", {
    titulo: ({ id }) => (Datos.tarjeta(id) || {}).nombre || "Tarjeta",
    sub: ({ id }) => { const t = Datos.tarjeta(id); return t ? [t.banco, t.ultimos4 && "•" + t.ultimos4].filter(Boolean).join(" ") : ""; },
    acciones: ({ id }) => `<button class="icon-btn" data-act="menuTarjeta" data-id="${id}" aria-label="Más opciones">${icono("puntos", 22)}</button>`,
    html: detalle,
  });

  // ---------- Todos los movimientos ----------

  App.registrar("movimientos", {
    titulo: () => "Movimientos",
    sub: ({ id }) => (Datos.tarjeta(id) || {}).nombre || "",
    html: ({ id }) => {
      const t = Datos.tarjeta(id);
      if (!t) return "";
      const movs = t.movimientos.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
      const grupos = new Map();
      for (const mv of movs) {
        const k = mv.fecha.slice(0, 7);
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(mv);
      }
      return [...grupos.entries()].map(([k, l]) => {
        const [y, m] = k.split("-").map(Number);
        return `<div class="section-title">${F.MESES[m - 1]} ${y}</div><div class="list">${l.map((mv) => P.filaMovimiento(mv).replace('data-id=""', `data-id="${id}"`)).join("")}</div>`;
      }).join("");
    },
  });
})();
