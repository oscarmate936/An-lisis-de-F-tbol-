/* Planear: simulador de pagos y plan para salir de deudas. */
(function () {
  "use strict";

  const { icono, esc, $m, ayuda, campoDinero, vibrar } = UI;
  const F = Fechas;
  const leer = (v) => Datos.leerMonto(v);

  const estado = { modo: "sim", sim: { id: null, saldo: null, tasa: null, pago: null }, plan: { presupuesto: null, metodo: "avalancha" } };

  function duracion(m) {
    if (m === null || m === undefined) return "más de 50 años";
    const a = Math.floor(m / 12), r = m % 12;
    const partes = [];
    if (a) partes.push(`${a} año${a === 1 ? "" : "s"}`);
    if (r || !a) partes.push(`${r} mes${r === 1 ? "" : "es"}`);
    return partes.join(" y ");
  }

  function mesEnTexto(n) {
    const { y, m } = F.partes(App.hoy);
    const f = F.fechaConDia(y, m + n, 1);
    const p = F.partes(f);
    return `${F.MESES[p.m - 1]} ${p.y}`;
  }

  // ---------- Gráfica: saldo a lo largo del tiempo ----------
  // Dos series (solo mínimo / pago fijo), un solo eje, leyenda + etiquetas
  // directas y una guía con tooltip al pasar el dedo.

  function bonito(max) {
    if (max <= 0) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(max)));
    for (const k of [1, 2, 2.5, 5, 10]) if (k * e >= max) return k * e;
    return 10 * e;
  }

  function grafica(series) {
    const W = 340, H = 190, L = 50, R = 12, T = 12, B = 26;
    const n = Math.max(...series.map((s) => s.datos.length)) - 1 || 1;
    const ymax = bonito(Math.max(...series.map((s) => Math.max(...s.datos))));
    const x = (i) => L + (i / n) * (W - L - R);
    const y = (v) => T + (1 - v / ymax) * (H - T - B);
    const fmtEje = (v) => {
      const s = Datos.dinero(v, true);
      return v >= 1e6 ? s.replace(/[\d.,\s]+/, (Math.round(v / 1e5) / 10) + " M") : v >= 1e4 ? s.replace(/[\d.,\s]+/, Math.round(v / 1e3) + " mil") : s;
    };
    let grid = "", ejes = "";
    for (const k of [0, 0.5, 1]) {
      const v = ymax * k;
      grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`;
      ejes += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${esc(fmtEje(v))}</text>`;
    }
    const paso = n > 36 ? 12 * Math.ceil(n / 12 / 4) : n > 12 ? 6 : n > 6 ? 3 : 1;
    for (let i = 0; i <= n; i += paso) {
      ejes += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${n > 36 ? (i / 12) + " a" : i + " m"}</text>`;
    }
    const lineas = series.map((s) => {
      const d = s.datos.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      return `<path d="${d}" fill="none" class="${s.clase}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join("");
    return `<div class="chart" data-n="${n}" data-l="${L}" data-r="${R}" data-w="${W}">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo de la deuda mes a mes">
        <g class="grid">${grid}</g><g class="axis">${ejes}</g>${lineas}
        <line class="guia" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--text-3)" stroke-dasharray="3 3" visibility="hidden"/>
        ${series.map((s, k) => `<circle class="pt${k} ${s.clase}" r="4" fill="var(--surface)" stroke-width="2" visibility="hidden"/>`).join("")}
        <rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent" class="hit"/>
      </svg>
      <div class="tt hide"></div>
    </div>`;
  }

  function cablearGrafica(raiz, series) {
    const ch = raiz.querySelector(".chart");
    if (!ch) return;
    const svg = ch.querySelector("svg");
    const tt = ch.querySelector(".tt");
    const guia = svg.querySelector(".guia");
    const n = +ch.dataset.n, L = +ch.dataset.l, R = +ch.dataset.r, W = +ch.dataset.w;
    const H = 190, T = 12, B = 26;
    const ymax = bonito(Math.max(...series.map((s) => Math.max(...s.datos))));
    const mover = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(n, Math.round(((px - L) / (W - L - R)) * n)));
      const gx = L + (i / n) * (W - L - R);
      guia.setAttribute("x1", gx); guia.setAttribute("x2", gx); guia.setAttribute("visibility", "visible");
      series.forEach((s, k) => {
        const c = svg.querySelector(".pt" + k);
        const v = s.datos[Math.min(i, s.datos.length - 1)];
        c.setAttribute("cx", gx); c.setAttribute("cy", T + (1 - v / ymax) * (H - T - B)); c.setAttribute("visibility", "visible");
      });
      tt.innerHTML = `<b>Mes ${i}</b> · ${esc(mesEnTexto(i))}<br>${series.map((s) => `<span class="key"><i style="background:var(--${s.clase === "s1" ? "series-1" : "series-2"})"></i>${esc(s.nombre)}: <b>${esc(Datos.dinero(s.datos[Math.min(i, s.datos.length - 1)]))}</b></span>`).join("<br>")}`;
      tt.classList.remove("hide");
      tt.style.left = Math.min(Math.max((gx / W) * r.width, 90), r.width - 90) + "px";
      tt.style.top = "8px";
    };
    const salir = () => {
      tt.classList.add("hide");
      guia.setAttribute("visibility", "hidden");
      series.forEach((s, k) => svg.querySelector(".pt" + k).setAttribute("visibility", "hidden"));
    };
    svg.addEventListener("pointermove", mover);
    svg.addEventListener("pointerdown", mover);
    svg.addEventListener("pointerleave", salir);
  }

  // ---------- Simulador ----------

  function simHtml() {
    const res = App.resumenes();
    const conDeuda = res.filter((s) => s.deuda > 0);
    const sim = estado.sim;
    if (sim.saldo === null) {
      const base = conDeuda.slice().sort((a, b) => b.deuda - a.deuda)[0];
      if (base) { sim.id = base.t.id; sim.saldo = base.deuda; sim.tasa = base.t.tasaAnual ?? 45; }
      else { sim.id = ""; sim.saldo = 10000; sim.tasa = 45; }
      sim.pago = null;
    }
    return `
      <div class="panel">
        <p class="small muted" style="margin:0 0 14px">Descubre cuánto tardarías en pagar una deuda y cuánto te costaría en intereses, comparando pagar solo el mínimo contra un pago fijo. ${ayuda("minimo")}</p>
        ${res.length ? `<label class="field"><span class="lbl">Deuda de</span>
          <select class="input" name="simTarjeta">
            ${res.map((s) => `<option value="${s.t.id}" ${s.t.id === sim.id ? "selected" : ""}>${esc(s.t.nombre)} · ${esc(Datos.dinero(Math.max(0, s.deuda)))}</option>`).join("")}
            <option value="" ${!sim.id ? "selected" : ""}>Otra cantidad</option>
          </select></label>` : ""}
        <div class="grid2">
          <label class="field"><span class="lbl">Deuda</span>${campoDinero("simSaldo", sim.saldo)}</label>
          <label class="field"><span class="lbl">Tasa anual % ${ayuda("tasa")}</span><input class="input num" name="simTasa" inputmode="decimal" value="${sim.tasa}"></label>
        </div>
        <label class="field"><span class="lbl">Si pagara cada mes…</span>
          <input type="range" name="simRango" style="width:100%" min="1" max="100" step="1">
          <div class="row" style="margin-top:8px">${campoDinero("simPago", sim.pago)}</div>
        </label>
      </div>
      <div id="simRes"></div>`;
  }

  function simMontar(raiz) {
    const q = (n) => raiz.querySelector(`[name="${n}"]`);
    const sim = estado.sim;
    const rango = q("simRango");

    const pctMin = () => {
      const t = sim.id && Datos.tarjeta(sim.id);
      return t && t.minimoPct != null ? t.minimoPct : Calc.MINIMO_PCT_DEFECTO;
    };
    const ajustarRango = () => {
      const max = Math.max(1, Math.ceil(sim.saldo || 1));
      rango.min = Math.max(1, Math.floor((sim.saldo || 0) * 0.02));
      rango.max = max;
      rango.step = Math.max(1, Math.round(max / 200));
      if (sim.pago === null || sim.pago > max) sim.pago = Math.round(Math.max((sim.saldo || 0) * 0.1, (sim.saldo || 0) * (pctMin() / 100) * 2));
      rango.value = sim.pago;
      q("simPago").value = sim.pago ? Number(sim.pago).toFixed(Datos.decimales()) : "";
    };

    const calcular = () => {
      const out = raiz.querySelector("#simRes");
      const saldo = sim.saldo || 0, tasa = sim.tasa || 0, pago = sim.pago || 0;
      if (!(saldo > 0)) { out.innerHTML = `<div class="panel small muted center" style="margin-top:12px">Escribe una deuda para simular.</div>`; return; }
      const t = sim.id && Datos.tarjeta(sim.id);
      const min = Calc.simular({ saldo, tasaAnual: tasa, modo: "minimo", pct: pctMin(), minFijo: t ? t.minimoFijo || 0 : 0 });
      const fij = Calc.simular({ saldo, tasaAnual: tasa, modo: "fijo", pagoFijo: pago });
      const mejor = fij.nunca ? "min" : (min.terminado ? (fij.intereses <= min.intereses ? "fij" : "min") : "fij");
      const ahorro = min.intereses - fij.intereses;
      let mensaje;
      if (fij.nunca) {
        mensaje = `<div class="tip critico" style="margin-top:12px"><span class="ticon">${icono("alerta", 20)}</span><span class="grow"><div class="ttl">Ese pago no alcanza</div><div class="txt">Con ${esc(Datos.dinero(pago))} al mes ni siquiera cubres los intereses (≈${esc(Datos.dinero(saldo * tasa / 1200))} al mes): la deuda nunca bajaría.</div></span></div>`;
      } else if (ahorro > 0) {
        mensaje = `<div class="tip bien" style="margin-top:12px"><span class="ticon">${icono("estrella", 20)}</span><span class="grow"><div class="ttl">Te ahorras ${esc(Datos.dinero(ahorro, true))} en intereses</div><div class="txt">Pagando ${esc(Datos.dinero(pago))} al mes terminas en ${duracion(fij.meses)} (en ${esc(mesEnTexto(fij.meses))})${min.terminado ? `, ${duracion(min.meses - fij.meses)} antes que pagando solo el mínimo` : ", mientras que con el mínimo seguirías pagando dentro de 50 años"}.</div></span></div>`;
      } else mensaje = "";
      const series = [{ nombre: "Solo el mínimo", clase: "s2", datos: min.serie }];
      if (!fij.nunca) series.unshift({ nombre: `${Datos.dinero(pago, true)} al mes`, clase: "s1", datos: fij.serie });
      out.innerHTML = `
        <div class="compare" style="margin-top:12px">
          <div class="col ${mejor === "fij" ? "best" : ""}">
            <div class="h"><i class="dot" style="background:var(--series-1)"></i>${esc(Datos.dinero(pago, true))} al mes</div>
            <div class="v">${fij.nunca ? "Nunca" : duracion(fij.meses)}</div>
            <div class="small muted">Intereses: <b>${fij.nunca ? "—" : $m(fij.intereses, true)}</b></div>
          </div>
          <div class="col ${mejor === "min" ? "best" : ""}">
            <div class="h"><i class="dot" style="background:var(--series-2)"></i>Solo el mínimo</div>
            <div class="v">${min.terminado ? duracion(min.meses) : "+50 años"}</div>
            <div class="small muted">Intereses: <b>${$m(min.intereses, true)}</b></div>
          </div>
        </div>
        ${mensaje}
        <div class="panel" style="margin-top:12px">
          <div class="row between"><b>Saldo mes a mes</b><span class="row" style="gap:10px">${series.map((s) => `<span class="key"><i style="background:var(--${s.clase === "s1" ? "series-1" : "series-2"})"></i>${esc(s.nombre)}</span>`).join("")}</span></div>
          <div style="margin-top:8px">${grafica(series)}</div>
          <p class="tiny faint" style="margin:8px 0 0">Estimación con interés mensual = tasa anual ÷ 12, sin compras nuevas. El mínimo se calcula como ${pctMin()}% del saldo (con un piso). Toca la gráfica para ver cada mes.</p>
        </div>`;
      cablearGrafica(out, series);
    };

    const sel = q("simTarjeta");
    if (sel) sel.addEventListener("change", () => {
      sim.id = sel.value;
      const t = sim.id && Datos.tarjeta(sim.id);
      if (t) {
        sim.saldo = Math.max(0, App.res(t.id).deuda);
        sim.tasa = t.tasaAnual ?? sim.tasa;
        q("simSaldo").value = sim.saldo.toFixed(Datos.decimales());
        q("simTasa").value = sim.tasa;
      }
      sim.pago = null;
      ajustarRango(); calcular();
    });
    q("simSaldo").addEventListener("input", () => { sim.saldo = leer(q("simSaldo").value) || 0; sim.pago = null; ajustarRango(); calcular(); });
    q("simTasa").addEventListener("input", () => { sim.tasa = parseFloat(q("simTasa").value.replace(",", ".")) || 0; calcular(); });
    rango.addEventListener("input", () => { sim.pago = +rango.value; q("simPago").value = sim.pago.toFixed(Datos.decimales()); calcular(); });
    q("simPago").addEventListener("input", () => { sim.pago = leer(q("simPago").value) || 0; rango.value = sim.pago; calcular(); });
    ajustarRango();
    calcular();
  }

  // ---------- Salir de deudas ----------

  function deudas() {
    return App.resumenes().filter((s) => s.deuda > 0).map((s) => ({
      id: s.t.id, nombre: s.t.nombre, saldo: s.deuda, tasa: s.t.tasaAnual || 0, sinTasa: s.t.tasaAnual == null,
      minPct: s.t.minimoPct ?? Calc.MINIMO_PCT_DEFECTO, minFijo: s.t.minimoFijo || 0,
    }));
  }

  function planHtml() {
    const ds = deudas();
    if (!ds.length) {
      return `<div class="empty"><div class="art">${icono("meta", 44)}</div><h3>No tienes deudas 🎉</h3><p>Cuando alguna tarjeta tenga saldo, aquí te ayudo a armar un plan para liquidarla pagando lo menos posible de intereses.</p></div>`;
    }
    const pl = estado.plan;
    const minimo = Calc.planDeudas(ds, 0, "avalancha").minimoInicial;
    if (pl.presupuesto === null) pl.presupuesto = Math.ceil(minimo * 1.6);
    return `
      <div class="panel">
        <p class="small muted" style="margin:0 0 14px">Dime cuánto puedes destinar en total al mes para tus tarjetas y te digo en qué orden pagarlas y cuándo quedarías libre de deudas.</p>
        <label class="field"><span class="lbl">Puedo pagar al mes (en total)</span>${campoDinero("planPres", pl.presupuesto)}
          <div class="hint">La suma de los pagos mínimos de este mes es aprox. ${esc(Datos.dinero(minimo))}.</div></label>
        <div class="field"><span class="lbl">Estrategia</span>
          <div class="seg" data-planm>
            <button type="button" data-v="avalancha" class="${pl.metodo === "avalancha" ? "on" : ""}">Avalancha</button>
            <button type="button" data-v="bola" class="${pl.metodo === "bola" ? "on" : ""}">Bola de nieve</button>
          </div>
          <div class="hint">${pl.metodo === "avalancha" ? "Primero la de tasa más alta: pagas menos intereses." : "Primero la de saldo más pequeño: liquidas tarjetas antes."} ${ayuda(pl.metodo === "avalancha" ? "avalancha" : "bola")}</div></div>
        ${ds.some((d) => d.sinTasa) ? `<div class="small" style="color:var(--warn)">${icono("alerta", 15, 'style="vertical-align:-3px"')} ${ds.filter((d) => d.sinTasa).map((d) => esc(d.nombre)).join(", ")} no tiene tasa de interés: se calcula como si fuera 0%.</div>` : ""}
      </div>
      <div id="planRes"></div>`;
  }

  function planMontar(raiz) {
    const pl = estado.plan;
    const inp = raiz.querySelector('[name="planPres"]');
    if (!inp) return;
    const calcular = () => {
      const ds = deudas();
      const out = raiz.querySelector("#planRes");
      const r = { avalancha: Calc.planDeudas(ds, pl.presupuesto, "avalancha"), bola: Calc.planDeudas(ds, pl.presupuesto, "bola"), minimos: Calc.planDeudas(ds, 0, "minimos") };
      const sel = r[pl.metodo];
      if (sel.insuficiente) {
        out.innerHTML = `<div class="tip critico" style="margin-top:12px"><span class="ticon">${icono("alerta", 20)}</span><span class="grow"><div class="ttl">No alcanza para los mínimos</div><div class="txt">Necesitas al menos ${esc(Datos.dinero(sel.minimoInicial))} al mes para cubrir los pagos mínimos de todas tus tarjetas. Si no llegas, habla con tu banco: muchos ofrecen planes de reestructura.</div></span></div>`;
        return;
      }
      const ahorro = r.minimos.intereses - sel.intereses;
      out.innerHTML = `
        <div class="compare" style="margin-top:12px">
          <div class="col best"><div class="h">${pl.metodo === "avalancha" ? "Avalancha" : "Bola de nieve"}</div>
            <div class="v">${duracion(sel.meses)}</div><div class="small muted">Intereses: <b>${$m(sel.intereses, true)}</b></div></div>
          <div class="col"><div class="h">Solo mínimos</div>
            <div class="v">${r.minimos.terminado ? duracion(r.minimos.meses) : "+50 años"}</div><div class="small muted">Intereses: <b>${$m(r.minimos.intereses, true)}</b></div></div>
        </div>
        ${ahorro > 0 ? `<div class="tip bien" style="margin-top:12px"><span class="ticon">${icono("estrella", 20)}</span><span class="grow"><div class="ttl">Libre de deudas en ${esc(mesEnTexto(sel.meses))}</div><div class="txt">Frente a pagar solo los mínimos te ahorras unos <b>${esc(Datos.dinero(ahorro, true))}</b> de intereses.${pl.metodo === "bola" && r.avalancha.intereses < sel.intereses - 1 ? ` Con avalancha ahorrarías ${esc(Datos.dinero(sel.intereses - r.avalancha.intereses, true))} más.` : ""}</div></span></div>` : ""}
        <div class="section-title">Tu orden de pago</div>
        <div class="list">${sel.orden.map((o, i) => `
          <div class="item"><span class="ic info" style="font-weight:800">${i + 1}</span>
            <span class="grow"><div class="t1">${esc(o.nombre)}</div><div class="t2">Liquidada en ${o.mes ? esc(mesEnTexto(o.mes)) : "más de 50 años"} · intereses ${esc(Datos.dinero(o.interes, true))}</div></span>
          </div>`).join("")}</div>
        <p class="small muted" style="margin-top:12px">Cómo seguirlo: cada mes paga el mínimo en todas y todo lo que sobre a la n.º 1. Cuando la liquides, ese dinero pasa a la siguiente. Evita hacer compras nuevas mientras tanto.</p>`;
    };
    inp.addEventListener("input", () => { pl.presupuesto = leer(inp.value) || 0; calcular(); });
    raiz.querySelector("[data-planm]").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      pl.metodo = b.dataset.v;
      vibrar(6);
      App.render();
    });
    calcular();
  }

  App.registrar("planear", {
    tab: true,
    titulo: () => "Planear",
    sub: () => "Simula, presupuesta y revisa tu historial",
    html: () => `
      <div class="seg" style="margin-bottom:14px" data-modo>
        <button type="button" data-act="planModo" data-v="sim" class="${estado.modo === "sim" ? "on" : ""}">Simulador</button>
        <button type="button" data-act="planModo" data-v="plan" class="${estado.modo === "plan" ? "on" : ""}">Deudas</button>
        <button type="button" data-act="planModo" data-v="pres" class="${estado.modo === "pres" ? "on" : ""}">Presupuesto</button>
        <button type="button" data-act="planModo" data-v="hist" class="${estado.modo === "hist" ? "on" : ""}">Historial</button>
      </div>
      ${estado.modo === "sim" ? simHtml() : estado.modo === "plan" ? planHtml() : estado.modo === "pres" ? Presupuesto.html() : Historial.html()}`,
    montar: (raiz) => (estado.modo === "sim" ? simMontar(raiz) : estado.modo === "plan" ? planMontar(raiz) : estado.modo === "hist" ? Historial.montar(raiz) : null),
  });

  App.accion("planModo", (el) => { estado.modo = el.dataset.v; App.render(); });
  App.accion("verHistorial", () => { estado.modo = "hist"; App.ir("planear"); });
  App.accion("verPresupuesto", () => { estado.modo = "pres"; App.ir("planear"); });
  // Si cambian los datos (p. ej. se registra un pago), el simulador vuelve
  // a partir de la deuda real en vez de quedarse con la de antes.
  Datos.alCambiar(() => { estado.sim.saldo = null; estado.plan.presupuesto = null; });
})();
