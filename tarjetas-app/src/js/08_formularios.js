/* Hojas con formularios: tarjeta, movimiento, estado de cuenta y ayuda. */
(function () {
  "use strict";

  const { icono, esc, $m, ayuda, abrirHoja, salirHoja, aviso, confirmar, campoDinero, vibrar } = UI;
  const F = Fechas;
  const P = Piezas;
  const leer = (v) => Datos.leerMonto(v);

  function opcionesDias(sel) {
    let s = "";
    for (let d = 1; d <= 31; d++) s += `<option value="${d}" ${d === sel ? "selected" : ""}>Día ${d}</option>`;
    return s;
  }

  function seg(nombre, opciones, valor) {
    return `<div class="seg" data-seg="${nombre}">${opciones.map(([v, t]) =>
      `<button type="button" data-v="${v}" class="${v === valor ? "on" : ""}">${t}</button>`).join("")}</div>
      <input type="hidden" name="${nombre}" value="${esc(valor)}">`;
  }

  // Controles segmentados y chips de selección única dentro de un formulario.
  function cablearSegmentos(el, alCambiar) {
    el.querySelectorAll("[data-seg]").forEach((g) => {
      g.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-v]");
        if (!b) return;
        g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        const input = el.querySelector(`input[name="${g.dataset.seg}"]`);
        input.value = b.dataset.v;
        vibrar(6);
        if (alCambiar) alCambiar(g.dataset.seg, b.dataset.v);
      });
    });
  }

  // ---------- Tarjeta ----------

  function formTarjeta(id) {
    const t = id ? Datos.tarjeta(id) : null;
    const nueva = !t;
    const v = t || { nombre: "", banco: "", ultimos4: "", red: "visa", color: P.COLORES[Datos.tarjetas.length % P.COLORES.length],
      limite: null, diaCorte: 15, diaPago: 5, modoPago: "dia", diasParaPagar: 20, tasaAnual: null, minimoPct: Calc.MINIMO_PCT_DEFECTO, minimoFijo: null };
    const hoy = App.hoy;

    abrirHoja(`
      <form id="fTar" novalidate>
        <h2>${nueva ? "Agregar tarjeta" : "Editar tarjeta"}</h2>
        <p class="lead">${nueva ? "Solo lo necesario para recordarte tus pagos. Nunca te pediremos el número completo de la tarjeta." : "Los cambios se aplican a todos los cálculos."}</p>

        <div id="prev" style="max-width:300px;margin:0 auto 18px"></div>

        <label class="field"><span class="lbl">Nombre de la tarjeta</span>
          <input class="input" name="nombre" maxlength="30" placeholder="Ej. Visa Oro, Clásica, Nu" value="${esc(v.nombre)}" ${nueva ? "autofocus" : ""}></label>
        <div class="grid2">
          <label class="field"><span class="lbl">Banco</span><input class="input" name="banco" maxlength="24" placeholder="Opcional" value="${esc(v.banco || "")}"></label>
          <label class="field"><span class="lbl">Últimos 4 dígitos</span><input class="input num" name="ultimos4" inputmode="numeric" maxlength="4" placeholder="1234" value="${esc(v.ultimos4 || "")}"></label>
        </div>
        <div class="field"><span class="lbl">Red</span>${seg("red", [["visa", "Visa"], ["mastercard", "Mastercard"], ["amex", "Amex"], ["otra", "Otra"]], v.red || "otra")}</div>
        <div class="field"><span class="lbl">Color</span>
          <div class="swatches" data-seg="color">${P.COLORES.map((c) => `<button type="button" data-v="${c}" class="swatch g-${c} ${c === v.color ? "on" : ""}" aria-label="${c}"></button>`).join("")}</div>
          <input type="hidden" name="color" value="${esc(v.color)}"></div>

        <label class="field"><span class="lbl">Límite de crédito ${ayuda("limiteCredito")}</span>${campoDinero("limite", v.limite)}
          <div class="hint">Lo máximo que el banco te deja gastar. Está en la app del banco o en tu estado de cuenta.</div></label>

        <div class="section-title" style="margin-top:6px">Fechas</div>
        <label class="field"><span class="lbl">Día de corte ${ayuda("corte")}</span>
          <select class="input" name="diaCorte">${opcionesDias(v.diaCorte)}</select></label>
        <div class="field"><span class="lbl">¿Cómo se fija tu fecha límite de pago? ${ayuda("limite")}</span>
          ${seg("modoPago", [["dia", "Un día fijo del mes"], ["dias", "Días después del corte"]], v.modoPago || "dia")}</div>
        <label class="field" id="campoDiaPago"><span class="lbl">Día límite de pago</span><select class="input" name="diaPago">${opcionesDias(v.diaPago)}</select></label>
        <label class="field" id="campoDias"><span class="lbl">Días para pagar después del corte</span>
          <input class="input num" name="diasParaPagar" inputmode="numeric" value="${esc(v.diasParaPagar || 20)}"></label>
        <div class="panel" style="background:var(--primary-soft);box-shadow:none;margin-bottom:14px" id="resumenFechas"></div>

        ${nueva ? `
        <div class="section-title">Tu deuda hoy</div>
        <label class="field"><span class="lbl">¿Cuánto debes hoy en esta tarjeta? ${ayuda("deuda")}</span>${campoDinero("saldoInicial", null)}
          <div class="hint">Es el "saldo actual" que ves en la app de tu banco. Si no debes nada, déjalo vacío.</div></label>
        <div class="panel" style="box-shadow:none;background:var(--surface-2);margin-bottom:14px">
          <div class="bold" id="tituloUltimo">Tu último estado de cuenta</div>
          <div class="small muted" style="margin:2px 0 12px">Opcional, pero hace que los montos sean exactos. Si no lo tienes a mano, lo estimamos.</div>
          <label class="field"><span class="lbl">Pago para no generar intereses ${ayuda("noIntereses")}</span>${campoDinero("ecNoInt", null)}</label>
          <label class="field"><span class="lbl">Pago mínimo ${ayuda("minimo")}</span>${campoDinero("ecMin", null)}</label>
          <label class="row between" style="margin:0"><span>Ya pagué ese estado de cuenta</span>
            <span class="switch"><input type="checkbox" name="ecPagado"><span></span></span></label>
        </div>` : ""}

        <div class="section-title">Intereses</div>
        <label class="field"><span class="lbl">Tasa de interés anual (%) ${ayuda("tasa")}</span>
          <input class="input num" name="tasaAnual" inputmode="decimal" placeholder="Ej. 45" value="${v.tasaAnual ?? ""}">
          <div class="hint">Opcional. Sirve para calcular cuánto te costaría pagar solo el mínimo.</div></label>

        <details class="acc" style="box-shadow:none;background:var(--surface-2);margin-bottom:16px">
          <summary>Opciones avanzadas <span class="chev">${icono("abajo", 18)}</span></summary>
          <div class="body">
            <p>Cuando no has capturado tu estado de cuenta, el pago mínimo se estima como un porcentaje de lo que debes. Si conoces la regla de tu banco, ajústala.</p>
            <div class="grid2">
              <label class="field"><span class="lbl">Mínimo (% del saldo)</span><input class="input num" name="minimoPct" inputmode="decimal" value="${v.minimoPct ?? Calc.MINIMO_PCT_DEFECTO}"></label>
              <label class="field"><span class="lbl">Mínimo fijo</span>${campoDinero("minimoFijo", v.minimoFijo, { placeholder: "Opcional" })}</label>
            </div>
            <label class="row between"><span>Avisarme el día de corte</span>
              <span class="switch"><input type="checkbox" name="recordatorioCorte" ${v.recordatorioCorte === false ? "" : "checked"}><span></span></span></label>
          </div>
        </details>

        <div class="btn-row">
          <button type="button" class="btn ghost" data-cerrar>Cancelar</button>
          <button class="btn" type="submit">${nueva ? "Agregar tarjeta" : "Guardar"}</button>
        </div>
      </form>`, {
      alMontar(el) {
        const f = el.querySelector("form");
        const val = (n) => f.elements[n].value;
        const actualizar = () => {
          const modo = val("modoPago");
          el.querySelector("#campoDiaPago").classList.toggle("hide", modo !== "dia");
          el.querySelector("#campoDias").classList.toggle("hide", modo !== "dias");
          const tmp = { diaCorte: +val("diaCorte"), diaPago: +val("diaPago"), modoPago: modo, diasParaPagar: parseInt(val("diasParaPagar"), 10) || 20 };
          const ult = Calc.corteEnOAntes(tmp, hoy);
          const prox = Calc.corteDespues(tmp, hoy);
          const limUlt = Calc.fechaLimite(tmp, ult);
          const limProx = Calc.fechaLimite(tmp, prox);
          el.querySelector("#resumenFechas").innerHTML = `
            <div class="small" style="color:var(--text)">${icono("calendario", 16, 'style="vertical-align:-3px;margin-right:6px"')}
            Tu último corte fue el <b>${F.textoFecha(ult)}</b> y se paga hasta el <b>${F.textoFecha(limUlt)}</b>.
            El próximo corte es el <b>${F.textoFecha(prox)}</b> (se paga hasta el ${F.textoFecha(limProx)}).</div>`;
          const tu = el.querySelector("#tituloUltimo");
          if (tu) tu.textContent = `Tu último estado de cuenta (corte del ${F.textoFecha(ult)})`;
          const tmpT = { ...v, nombre: val("nombre") || "Mi tarjeta", banco: val("banco"), ultimos4: val("ultimos4"), red: val("red"), color: val("color") };
          const lim = leer(val("limite")) || 0;
          const deuda = f.elements.saldoInicial ? leer(val("saldoInicial")) || 0 : (t ? App.res(t.id).deuda : 0);
          el.querySelector("#prev").innerHTML = P.plastico(tmpT, { deuda, disponible: lim - deuda }, { boton: false });
        };
        cablearSegmentos(el, actualizar);
        f.addEventListener("input", actualizar);
        f.addEventListener("change", actualizar);
        actualizar();
        el.querySelector("[data-cerrar]").addEventListener("click", salirHoja);

        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const nombre = val("nombre").trim();
          if (!nombre) { aviso("Ponle un nombre a la tarjeta"); f.elements.nombre.focus(); return; }
          const u4 = val("ultimos4").replace(/\D/g, "");
          if (u4 && u4.length !== 4) { aviso("Los últimos dígitos deben ser 4 números"); return; }
          const modo = val("modoPago");
          const dias = parseInt(val("diasParaPagar"), 10);
          if (modo === "dias" && !(dias >= 1 && dias <= 60)) { aviso("Los días para pagar deben estar entre 1 y 60"); return; }
          const tasaTxt = val("tasaAnual").trim().replace(",", ".");
          const tasa = tasaTxt === "" ? null : parseFloat(tasaTxt);
          if (tasa !== null && !(tasa >= 0 && tasa < 1000)) { aviso("Revisa la tasa de interés"); return; }
          const pct = parseFloat(val("minimoPct").replace(",", "."));
          const datos = {
            nombre, banco: val("banco").trim(), ultimos4: u4, red: val("red"), color: val("color"),
            limite: leer(val("limite")) || 0,
            diaCorte: +val("diaCorte"), diaPago: +val("diaPago"), modoPago: modo, diasParaPagar: modo === "dias" ? dias : null,
            tasaAnual: tasa, minimoPct: pct >= 0 && pct <= 100 ? pct : Calc.MINIMO_PCT_DEFECTO,
            minimoFijo: leer(val("minimoFijo")), recordatorioCorte: f.elements.recordatorioCorte.checked,
          };
          if (nueva) {
            datos.fechaInicial = hoy;
            datos.saldoInicial = leer(val("saldoInicial")) || 0;
            const ult = Calc.corteEnOAntes(datos, hoy);
            const est = { pagoNoIntereses: leer(val("ecNoInt")), pagoMinimo: leer(val("ecMin")), pagadoManual: f.elements.ecPagado.checked || null };
            datos.estados = {};
            for (const k of Object.keys(est)) if (est[k] === null) delete est[k];
            if (Object.keys(est).length) datos.estados[ult] = est;
            const primera = Datos.tarjetas.length === 0;
            const nuevaT = Datos.agregarTarjeta(datos);
            salirHoja();
            aviso("Tarjeta agregada");
            App.abrir("tarjeta", { id: nuevaT.id });
            if (primera) setTimeout(() => App.ofrecerAvisos(), 500);
          } else {
            Datos.editarTarjeta(t.id, datos);
            salirHoja();
            aviso("Cambios guardados");
          }
        });
      },
    });
  }

  // ---------- Movimiento (compra, compra a meses, pago) ----------

  function formMovimiento({ tarjetaId, tipo = "cargo", mid } = {}) {
    const tarjetas = Datos.tarjetas;
    if (!tarjetas.length) { aviso("Primero agrega una tarjeta"); return; }
    let t = tarjetaId ? Datos.tarjeta(tarjetaId) : tarjetas[0];
    const mv = mid ? t.movimientos.find((m) => m.id === mid) : null;
    if (mv) tipo = mv.tipo === "pago" ? "pago" : mv.tipo === "msi" ? "msi" : "cargo";
    const v = mv || { monto: null, fecha: App.hoy, desc: "", categoria: tipo === "pago" ? null : "compras", meses: 12 };

    abrirHoja(`
      <form id="fMov" novalidate>
        <h2>${mv ? "Editar movimiento" : "Registrar movimiento"}</h2>
        <div class="field" style="margin-top:12px">${seg("tipo", [["cargo", "Compra"], ["msi", "A meses"], ["pago", "Pago"]], tipo)}</div>
        ${tarjetas.length > 1 && !mv ? `<label class="field"><span class="lbl">Tarjeta</span>
          <select class="input" name="tarjeta">${tarjetas.map((x) => `<option value="${x.id}" ${x.id === t.id ? "selected" : ""}>${esc(x.nombre)}${x.ultimos4 ? " •" + esc(x.ultimos4) : ""}</option>`).join("")}</select></label>`
          : `<input type="hidden" name="tarjeta" value="${t.id}">`}
        <label class="field"><span class="lbl" id="lblMonto">Monto</span>${campoDinero("monto", v.monto, { autofocus: !mv })}</label>
        <div class="chips field" id="atajos"></div>
        <div class="field" id="campoMeses"><span class="lbl">¿A cuántos meses?</span>
          ${seg("meses", [3, 6, 9, 12, 18, 24].map((n) => [String(n), String(n)]), String(v.meses || 12))}
          <div class="hint" id="cuota"></div></div>
        <div class="grid2">
          <label class="field"><span class="lbl">Fecha</span><input class="input" type="date" name="fecha" value="${v.fecha}" max="${F.sumarDias(App.hoy, 365)}"></label>
          <label class="field"><span class="lbl">Descripción</span><input class="input" name="desc" maxlength="40" placeholder="Opcional" value="${esc(v.desc || "")}"></label>
        </div>
        <div class="field" id="campoCat"><span class="lbl">Categoría</span>
          <div class="chips" data-seg="categoria">${P.CATEGORIAS.map((c) => `<button type="button" class="chip ${c.c === v.categoria ? "on" : ""}" data-v="${c.c}">${c.e} ${c.n}</button>`).join("")}</div>
          <input type="hidden" name="categoria" value="${esc(v.categoria || "compras")}"></div>
        <div class="panel small" style="background:var(--surface-2);box-shadow:none;margin-bottom:16px" id="pista"></div>
        <div class="btn-row">
          ${mv ? `<button type="button" class="btn danger" data-borrar>${icono("basura", 18)} Borrar</button>` : `<button type="button" class="btn ghost" data-cerrar>Cancelar</button>`}
          <button class="btn" type="submit">Guardar</button>
        </div>
      </form>`, {
      alMontar(el) {
        const f = el.querySelector("form");
        const val = (n) => f.elements[n].value;
        const actualizar = () => {
          t = Datos.tarjeta(val("tarjeta"));
          const tp = val("tipo");
          const s = App.res(t.id);
          el.querySelector("#campoMeses").classList.toggle("hide", tp !== "msi");
          el.querySelector("#campoCat").classList.toggle("hide", tp === "pago");
          el.querySelector("#lblMonto").textContent = tp === "pago" ? "¿Cuánto pagaste?" : tp === "msi" ? "Precio total de la compra" : "¿Cuánto gastaste?";
          const at = el.querySelector("#atajos");
          if (tp === "pago" && !mv) {
            const ops = [];
            const p = s.proximoPago;
            if (p.tipo === "corte" && p.monto > 0) ops.push(["Para no generar intereses", p.monto]);
            if (p.tipo === "corte" && p.minimo > 0 && p.minimo < p.monto) ops.push(["Mínimo", p.minimo]);
            if (s.deuda > 0 && !ops.some((o) => Math.abs(o[1] - s.deuda) < 0.01)) ops.push(["Toda la deuda", s.deuda]);
            at.innerHTML = ops.map(([n, x]) => `<button type="button" class="chip" data-monto="${x}">${n}: ${esc(Datos.dinero(x))}</button>`).join("");
            at.classList.toggle("hide", !ops.length);
          } else at.classList.add("hide");
          const monto = leer(val("monto")) || 0;
          const fecha = val("fecha") || App.hoy;
          const pista = el.querySelector("#pista");
          if (tp === "pago") {
            pista.innerHTML = `${icono("info", 16, 'style="vertical-align:-3px;margin-right:6px"')}El pago reduce tu deuda y se aplica a tu estado de cuenta del corte del <b>${F.textoFecha(Calc.corteEnOAntes(t, fecha))}</b>.`;
          } else {
            const corte = Calc.corteDeCompra(t, fecha);
            const lim = Calc.fechaLimite(t, corte);
            pista.innerHTML = `${icono("calendario", 16, 'style="vertical-align:-3px;margin-right:6px"')}Entra en tu corte del <b>${F.textoFecha(corte)}</b> y ${tp === "msi" ? "la primera mensualidad" : "se paga"} hasta el <b>${F.textoFecha(lim)}</b> (${F.diasEntre(fecha, lim)} días).`;
            if (tp === "cargo" && monto > Math.max(0, s.disponible) && t.limite > 0) pista.innerHTML += `<div style="color:var(--bad);margin-top:6px">Ojo: supera tu crédito disponible (${esc(Datos.dinero(s.disponible))}).</div>`;
          }
          const meses = +val("meses");
          el.querySelector("#cuota").textContent = monto > 0 ? `Pagarás ${Datos.dinero(monto / meses)} al mes durante ${meses} meses.` : "";
        };
        cablearSegmentos(el, actualizar);
        f.addEventListener("input", actualizar);
        f.addEventListener("change", actualizar);
        el.querySelector("#atajos").addEventListener("click", (e) => {
          const b = e.target.closest("[data-monto]");
          if (!b) return;
          f.elements.monto.value = Number(b.dataset.monto).toFixed(Datos.decimales());
          vibrar(6);
          actualizar();
        });
        actualizar();
        const cerrar = el.querySelector("[data-cerrar]");
        if (cerrar) cerrar.addEventListener("click", salirHoja);
        const borrar = el.querySelector("[data-borrar]");
        if (borrar) borrar.addEventListener("click", async () => {
          if (await confirmar({ titulo: "¿Borrar este movimiento?", texto: "Se recalcularán tu deuda y tus pagos.", ok: "Borrar", peligro: true })) {
            Datos.borrarMovimiento(t.id, mv.id);
            aviso("Movimiento borrado");
          }
        });

        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const monto = leer(val("monto"));
          if (!(monto > 0)) { aviso("Escribe un monto mayor que cero"); f.elements.monto.focus(); return; }
          const fecha = val("fecha");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { aviso("Elige una fecha"); return; }
          const tp = val("tipo");
          const datos = { tipo: tp, monto, fecha, desc: val("desc").trim() };
          if (tp !== "pago") datos.categoria = val("categoria");
          if (tp === "msi") datos.meses = +val("meses");
          if (fecha < t.fechaInicial) {
            aviso("Esa fecha es anterior a cuando registraste la tarjeta: ya está incluida en tu deuda inicial", 4200);
            return;
          }
          if (mv) {
            if (tp !== "msi") datos.meses = undefined;
            if (tp === "pago") datos.categoria = undefined;
            Datos.editarMovimiento(t.id, mv.id, datos);
            salirHoja();
            aviso("Movimiento actualizado");
          } else {
            Datos.agregarMovimiento(t.id, datos);
            salirHoja();
            vibrar(15);
            if (tp === "pago") {
              const s = App.res(t.id);
              aviso(s.ec.estado === "pagado" ? "¡Pago registrado! Estado de cuenta cubierto ✓" : "Pago registrado");
            } else aviso(tp === "msi" ? "Compra a meses registrada" : "Compra registrada");
          }
        });
      },
    });
  }

  // ---------- Estado de cuenta ----------

  function formEstado(tarjetaId, corte) {
    const t = Datos.tarjeta(tarjetaId);
    const hoy = App.hoy;
    corte = corte || Calc.corteEnOAntes(t, hoy);
    const cortes = [];
    let c = Calc.corteEnOAntes(t, hoy);
    for (let i = 0; i < 6; i++) { cortes.push(c); c = Calc.corteEnOAntes(t, F.sumarDias(c, -1)); }
    if (!cortes.includes(corte)) cortes.unshift(corte);
    const e = t.estados[corte] || {};
    const est = Calc.estadoDeCuenta(t, corte, hoy);
    const ph = (x) => Datos.dinero(x).replace(/[^\d.,]/g, "");

    abrirHoja(`
      <form id="fEst" novalidate>
        <h2>Capturar estado de cuenta</h2>
        <p class="lead">Copia estos datos de tu estado de cuenta o de la app de tu banco. Así los montos dejan de ser estimados y se corrigen intereses o comisiones. Deja vacío lo que no tengas. ${ayuda("estadoCuenta")}</p>
        <label class="field"><span class="lbl">Corte</span>
          <select class="input" name="corte">${cortes.map((x) => `<option value="${x}" ${x === corte ? "selected" : ""}>Corte del ${F.textoFecha(x, { anio: true })} · pagar antes del ${F.textoFecha(Calc.fechaLimite(t, x))}</option>`).join("")}</select></label>
        <label class="field"><span class="lbl">Pago para no generar intereses ${ayuda("noIntereses")}</span>${campoDinero("pagoNoIntereses", e.pagoNoIntereses, { placeholder: "Estimado: " + ph(est.noInt) })}</label>
        <label class="field"><span class="lbl">Pago mínimo ${ayuda("minimo")}</span>${campoDinero("pagoMinimo", e.pagoMinimo, { placeholder: "Estimado: " + ph(est.minimo) })}</label>
        <label class="field"><span class="lbl">Saldo al corte (deuda total) ${ayuda("saldoCorte")}</span>${campoDinero("saldoCorte", e.saldoCorte, { placeholder: "Estimado: " + ph(est.saldoCorte) })}
          <div class="hint">Si lo capturas, tu deuda actual se recalcula desde este saldo real.</div></label>
        <label class="row between field"><span>Ya pagué este estado de cuenta completo</span>
          <span class="switch"><input type="checkbox" name="pagadoManual" ${e.pagadoManual ? "checked" : ""}><span></span></span></label>
        <div class="hint" style="margin:-6px 0 16px">Úsalo si pagaste antes de usar la app. Si pagas desde ahora, mejor registra el pago: así se descuenta de tu deuda.</div>
        <div class="btn-row">
          ${Object.keys(e).length ? `<button type="button" class="btn danger" data-borrar>Borrar captura</button>` : `<button type="button" class="btn ghost" data-cerrar>Cancelar</button>`}
          <button class="btn" type="submit">Guardar</button>
        </div>
      </form>`, {
      alMontar(el) {
        const f = el.querySelector("form");
        f.elements.corte.addEventListener("change", () => formEstado(tarjetaId, f.elements.corte.value));
        const cerrar = el.querySelector("[data-cerrar]");
        if (cerrar) cerrar.addEventListener("click", salirHoja);
        const borrar = el.querySelector("[data-borrar]");
        if (borrar) borrar.addEventListener("click", () => {
          Datos.guardarEstado(t.id, corte, {});
          salirHoja();
          aviso("Captura borrada: se vuelven a estimar los montos");
        });
        f.addEventListener("submit", (ev) => {
          ev.preventDefault();
          const d = {
            saldoCorte: leer(f.elements.saldoCorte.value),
            pagoNoIntereses: leer(f.elements.pagoNoIntereses.value),
            pagoMinimo: leer(f.elements.pagoMinimo.value),
            pagadoManual: f.elements.pagadoManual.checked,
          };
          if (d.pagoMinimo !== null && d.pagoNoIntereses !== null && d.pagoMinimo > d.pagoNoIntereses + 0.01) {
            aviso("El pago mínimo no puede ser mayor que el pago para no generar intereses");
            return;
          }
          Datos.guardarEstado(t.id, corte, d);
          salirHoja();
          aviso("Estado de cuenta guardado");
        });
      },
    });
  }

  // ---------- Ayuda ----------

  function verAyuda(clave) {
    const g = GLOSARIO[clave];
    if (!g) return;
    abrirHoja(`
      <h2>${esc(g.titulo)}</h2>
      <p class="lead" style="font-weight:600;color:var(--text)">${esc(g.corto)}</p>
      ${g.texto.map((p) => `<p class="muted" style="margin:0 0 10px">${esc(p)}</p>`).join("")}
      ${g.ejemplo ? `<div class="panel small" style="background:var(--primary-soft);box-shadow:none;margin:14px 0"><b>Ejemplo:</b> ${esc(g.ejemplo)}</div>` : ""}
      ${g.donde ? `<p class="small muted"><b>¿Dónde lo encuentro?</b> ${esc(g.donde)}</p>` : ""}
      <button class="btn block sec" data-cerrar style="margin-top:8px">Entendido</button>`, {
      alMontar: (el) => el.querySelector("[data-cerrar]").addEventListener("click", salirHoja),
    });
  }

  // ---------- Menú de la tarjeta ----------

  function menuTarjeta(id) {
    const t = Datos.tarjeta(id);
    abrirHoja(`
      <h2>${esc(t.nombre)}</h2>
      <div class="list" style="box-shadow:none;background:var(--surface-2);margin-top:12px">
        <button class="item" data-o="editar"><span class="ic">${icono("lapiz", 20)}</span><span class="grow t1">Editar datos de la tarjeta</span></button>
        <button class="item" data-o="estado"><span class="ic">${icono("recibo", 20)}</span><span class="grow t1">Capturar estado de cuenta</span></button>
        <button class="item" data-o="archivar"><span class="ic">${icono("archivo", 20)}</span><span class="grow"><div class="t1">${t.archivada ? "Reactivar tarjeta" : "Archivar tarjeta"}</div><div class="t2">${t.archivada ? "Vuelve a mostrarla y a recordarte sus pagos" : "La ocultas y dejas de recibir sus recordatorios, sin borrar su historial"}</div></span></button>
        <button class="item" data-o="borrar" style="color:var(--bad)"><span class="ic critico">${icono("basura", 20)}</span><span class="grow t1">Eliminar tarjeta</span></button>
      </div>`, {
      alMontar(el) {
        el.addEventListener("click", async (e) => {
          const b = e.target.closest("[data-o]");
          if (!b) return;
          const o = b.dataset.o;
          if (o === "editar") formTarjeta(id);
          else if (o === "estado") formEstado(id);
          else if (o === "archivar") {
            salirHoja();
            Datos.editarTarjeta(id, { archivada: !t.archivada });
            aviso(t.archivada ? "Tarjeta archivada" : "Tarjeta reactivada");
            if (t.archivada) App.atras();
          } else if (o === "borrar") {
            if (await confirmar({ titulo: `¿Eliminar ${t.nombre}?`, texto: "Se borrarán la tarjeta y todos sus movimientos. No se puede deshacer.", ok: "Eliminar", peligro: true })) {
              Datos.borrarTarjeta(id);
              aviso("Tarjeta eliminada");
              App.atras();
            }
          }
        });
      },
    });
  }

  window.Formularios = { formTarjeta, formMovimiento, formEstado, verAyuda, menuTarjeta, cablearSegmentos, seg };
})();
