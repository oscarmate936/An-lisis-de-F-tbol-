/* Presupuesto mensual e historial con gráficas (secciones de Planear). */
(function () {
  "use strict";

  const { icono, esc, $m, abrirHoja, salirHoja, aviso, campoDinero } = UI;
  const F = Fechas;
  const P = Piezas;
  const leer = (v) => Datos.leerMonto(v);

  const tonoPct = (p) => (p >= 1 ? "critico" : p >= 0.8 ? "aviso" : "bien");

  // ---------- Presupuesto ----------

  function filaPresupuesto(nombre, l) {
    const tono = tonoPct(l.pct);
    return `<div style="margin-bottom:14px">
      <div class="row between small"><span>${nombre}</span>
        <span><b class="num">${$m(l.gastado)}</b> <span class="faint">de ${$m(l.limite, true)}</span></span></div>
      <div style="margin:6px 0 4px">${P.medidor(Math.min(1, l.pct), tono)}</div>
      <div class="tiny ${l.pct >= 1 ? "" : "faint"}" style="${l.pct >= 1 ? "color:var(--bad)" : ""}">
        ${l.pct >= 1 ? `Te pasaste por ${esc(Datos.dinero(l.gastado - l.limite))}` : `Quedan ${esc(Datos.dinero(l.limite - l.gastado))}`}
        ${l.pct < 1 && l.proyectado > l.limite ? ` · a este ritmo llegarías a ${esc(Datos.dinero(l.proyectado, true))}` : ""}</div>
    </div>`;
  }

  function presupuestoHtml() {
    if (!Datos.tarjetas.length) return `<div class="empty"><div class="art">${icono("alcancia", 44)}</div><h3>Presupuesto mensual</h3><p>Agrega una tarjeta para controlar cuánto gastas cada mes.</p></div>`;
    const ep = Calc.estadoPresupuesto(Datos.tarjetas, Datos.ajustes.presupuestos, App.hoy);
    const { y, m, d } = F.partes(App.hoy);
    const sinPres = Object.entries(ep.porCat).filter(([c]) => !ep.categorias.some((x) => x.c === c)).sort((a, b) => b[1] - a[1]);
    const conTarjeta = App.resumenes().filter((s) => s.t.presupuesto > 0);
    const nada = !ep.total && !ep.categorias.length;
    return `
      <div class="panel">
        <div class="row between"><b style="text-transform:capitalize">${F.MESES[m - 1]} ${y}</b><span class="small muted">día ${d} de ${F.diasDelMes(y, m)}</span></div>
        <div class="small muted" style="margin:2px 0 12px">Compras con todas tus tarjetas este mes: <b class="num" style="color:var(--text)">${$m(ep.gastadoTotal)}</b></div>
        ${ep.total ? filaPresupuesto("<b>Total del mes</b>", ep.total) : ""}
        ${ep.categorias.map((l) => { const c = P.cat(l.c); return filaPresupuesto(`${c.e} ${esc(c.n)}`, l); }).join("")}
        ${nada ? `<p class="small muted" style="margin:0 0 12px">Ponle un límite al mes (en total o por categoría) y te aviso cuando vayas en el 80%.</p>` : ""}
        <button class="btn block sec" data-act="editarPresupuesto">${icono("lapiz", 18)} ${nada ? "Crear presupuesto" : "Editar presupuesto"}</button>
      </div>
      ${conTarjeta.length ? `<div class="section-title">Por tarjeta (desde su corte)</div><div class="panel">${conTarjeta.map((s) =>
        filaPresupuesto(esc(s.t.nombre), { limite: s.t.presupuesto, gastado: s.gastoCiclo, pct: s.gastoCiclo / s.t.presupuesto, proyectado: 0 })).join("")}</div>` : ""}
      ${sinPres.length ? `<div class="section-title">Sin presupuesto este mes</div><div class="list">${sinPres.map(([c, v]) => {
        const k = P.cat(c);
        return `<div class="item"><span class="ic" style="font-size:18px">${k.e}</span><span class="grow t1">${esc(k.n)}</span><span class="amount">${$m(v)}</span></div>`;
      }).join("")}</div>` : ""}`;
  }

  function editarPresupuesto() {
    const p = Datos.ajustes.presupuestos;
    const ep = Calc.estadoPresupuesto(Datos.tarjetas, p, App.hoy);
    abrirHoja(`
      <form novalidate>
        <h2>Presupuesto mensual</h2>
        <p class="lead">Cuenta las compras de todas tus tarjetas en el mes (del 1 al último día). Deja vacío lo que no quieras limitar.</p>
        <label class="field"><span class="lbl">Total al mes</span>${campoDinero("total", p.total)}</label>
        <div class="section-title" style="margin-top:4px">Por categoría</div>
        ${P.CATEGORIAS.filter((c) => c.c !== "intereses").map((c) => `
          <label class="row between field" style="gap:10px"><span class="grow small">${c.e} ${esc(c.n)}${ep.porCat[c.c] ? `<div class="tiny faint">Este mes: ${esc(Datos.dinero(ep.porCat[c.c]))}</div>` : ""}</span>
            <span style="width:150px">${campoDinero("c_" + c.c, p.categorias[c.c] || null, { placeholder: "Sin límite" })}</span></label>`).join("")}
        <div class="btn-row"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button class="btn" type="submit">Guardar</button></div>
      </form>`, {
      alMontar(el) {
        const f = el.querySelector("form");
        el.querySelector("[data-cerrar]").addEventListener("click", salirHoja);
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const cats = {};
          for (const c of P.CATEGORIAS) {
            const inp = f.elements["c_" + c.c];
            const v = inp ? leer(inp.value) : null;
            if (v > 0) cats[c.c] = v;
          }
          const total = leer(f.elements.total.value);
          Datos.ajustes.presupuestos = { total: total > 0 ? total : null, categorias: cats };
          Datos.guardar();
          salirHoja();
          aviso("Presupuesto guardado");
        });
      },
    });
  }

  // Al registrar una compra: aviso inmediato si cruzó el 80% o el 100%.
  function revisarTrasCompra(antes) {
    const despues = Calc.estadoPresupuesto(Datos.tarjetas, Datos.ajustes.presupuestos, App.hoy);
    const lineas = [];
    if (despues.total) lineas.push(["tu presupuesto del mes", antes.total, despues.total]);
    for (const l of despues.categorias) lineas.push([`tu presupuesto de ${P.cat(l.c).n}`, antes.categorias.find((x) => x.c === l.c), l]);
    for (const [n, a, d] of lineas) {
      const pa = a ? a.pct : 0;
      if (pa < 1 && d.pct >= 1) return `Te pasaste de ${n}`;
      if (pa < 0.8 && d.pct >= 0.8) return `Vas en el ${Math.round(d.pct * 100)}% de ${n}`;
    }
    return null;
  }

  // ---------- Historial con gráficas ----------

  function barras(datos, valor, etiqueta) {
    const W = 340, H = 170, L = 46, R = 8, T = 14, B = 24;
    const max = Math.max(1, ...datos.map(valor));
    const e = Math.pow(10, Math.floor(Math.log10(max)));
    const ymax = [1, 2, 2.5, 5, 10].map((k) => k * e).find((v) => v >= max);
    const n = datos.length;
    const ancho = (W - L - R) / n;
    const bw = Math.max(6, Math.min(26, ancho - 6));
    const y = (v) => T + (1 - v / ymax) * (H - T - B);
    const corto = (v) => {
      const s = Datos.dinero(v, true);
      return v >= 1e6 ? s.replace(/[\d.,\s]+/, Math.round(v / 1e5) / 10 + " M") : v >= 1e4 ? s.replace(/[\d.,\s]+/, Math.round(v / 1e3) + " mil") : s;
    };
    let g = "", ejes = "", marcas = "";
    for (const k of [0, 0.5, 1]) {
      g += `<line x1="${L}" x2="${W - R}" y1="${y(ymax * k)}" y2="${y(ymax * k)}"/>`;
      ejes += `<text x="${L - 6}" y="${y(ymax * k) + 4}" text-anchor="end">${esc(corto(ymax * k))}</text>`;
    }
    datos.forEach((d, i) => {
      const cx = L + ancho * i + ancho / 2;
      const v = valor(d);
      const top = y(v), alto = Math.max(0, H - B - top);
      const r = Math.min(4, alto / 2, bw / 2);
      // Barra con extremos superiores redondeados, apoyada en la base.
      const x0 = cx - bw / 2, x1 = cx + bw / 2, base = H - B;
      const path = alto > 0.5
        ? `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`
        : "";
      marcas += `<g class="barra" data-i="${i}">${path ? `<path d="${path}" fill="var(--series-1)"/>` : ""}
        <rect x="${cx - ancho / 2}" y="${T}" width="${ancho}" height="${H - T - B + 2}" fill="transparent"/></g>`;
      if (n <= 6 || (n - 1 - i) % 2 === 0) {
        ejes += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${F.MESES_CORTOS[d.mes - 1]}</text>`;
      }
    });
    return `<div class="chart hist" style="position:relative">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(etiqueta)}"><g class="grid">${g}</g><g class="axis">${ejes}</g>${marcas}</svg>
      <div class="tt hide"></div></div>`;
  }

  function cablearBarras(raiz, datos, valor, nombre) {
    raiz.querySelectorAll(".chart.hist").forEach((ch, k) => {
      if (k !== nombre.idx) return;
      const tt = ch.querySelector(".tt");
      const svg = ch.querySelector("svg");
      const mostrar = (g) => {
        const d = datos[+g.dataset.i];
        svg.querySelectorAll(".barra path").forEach((p) => (p.style.opacity = ""));
        const p = g.querySelector("path");
        svg.querySelectorAll(".barra path").forEach((x) => { if (x !== p) x.style.opacity = ".45"; });
        tt.innerHTML = `<b>${F.MESES[d.mes - 1]} ${d.anio}</b><br>${esc(nombre.texto)}: <b>${esc(Datos.dinero(valor(d)))}</b>`;
        tt.classList.remove("hide");
        const r = svg.getBoundingClientRect(), gr = g.getBoundingClientRect();
        tt.style.left = Math.min(Math.max(gr.left - r.left + gr.width / 2, 80), r.width - 80) + "px";
        tt.style.top = "8px";
      };
      svg.querySelectorAll(".barra").forEach((g) => {
        g.addEventListener("pointerenter", () => mostrar(g));
        g.addEventListener("pointerdown", () => mostrar(g));
      });
      svg.addEventListener("pointerleave", () => { tt.classList.add("hide"); svg.querySelectorAll(".barra path").forEach((p) => (p.style.opacity = "")); });
    });
  }

  function historialHtml() {
    if (!Datos.tarjetas.length) return `<div class="empty"><div class="art">${icono("plan", 44)}</div><h3>Historial</h3><p>Cuando registres movimientos, aquí verás cómo cambian tu gasto y tu deuda mes a mes.</p></div>`;
    const h = Calc.historial(Datos.tarjetas, App.hoy, 12);
    const ultimo = h[h.length - 1], previo = h[h.length - 2];
    const cambio = previo ? ultimo.deuda - previo.deuda : 0;
    return `
      <div class="kpis">
        <div class="kpi"><div class="k">Deuda hoy</div><div class="v">${$m(ultimo.deuda)}</div>
          <div class="s">${previo ? `${cambio <= 0 ? "▼" : "▲"} ${esc(Datos.dinero(Math.abs(cambio), true))} vs. fin de ${F.MESES[previo.mes - 1]}` : "Primer mes registrado"}</div></div>
        <div class="kpi"><div class="k">Gasto promedio</div><div class="v">${$m(h.reduce((a, x) => a + x.gasto, 0) / h.length, true)}</div><div class="s">por mes (${h.length} mes${h.length === 1 ? "" : "es"})</div></div>
      </div>
      <div class="panel" style="margin-top:12px">
        <b>Compras por mes</b><div class="small muted" style="margin-bottom:6px">Todas tus tarjetas. Toca una barra para ver el monto.</div>
        ${barras(h, (d) => d.gasto, "Compras por mes")}
      </div>
      <div class="panel" style="margin-top:12px">
        <b>Deuda al cierre de cada mes</b><div class="small muted" style="margin-bottom:6px">Incluye intereses estimados cuando no has capturado el estado de cuenta.</div>
        ${barras(h, (d) => d.deuda, "Deuda al cierre de cada mes")}
      </div>
      <div class="section-title">Detalle</div>
      <div class="panel flush" style="overflow-x:auto">
        <table class="tabla">
          <thead><tr><th>Mes</th><th class="right">Compras</th><th class="right">Pagos</th><th class="right">Deuda</th></tr></thead>
          <tbody>${h.slice().reverse().map((d) => `<tr><td>${F.MESES_CORTOS[d.mes - 1]} ${d.anio}</td><td class="right">${$m(d.gasto, true)}</td><td class="right">${$m(d.pagos, true)}</td><td class="right"><b>${$m(d.deuda, true)}</b></td></tr>`).join("")}</tbody>
        </table>
      </div>`;
  }

  function historialMontar(raiz) {
    const h = Calc.historial(Datos.tarjetas, App.hoy, 12);
    cablearBarras(raiz, h, (d) => d.gasto, { idx: 0, texto: "Compras" });
    cablearBarras(raiz, h, (d) => d.deuda, { idx: 1, texto: "Deuda" });
  }

  App.accion("editarPresupuesto", editarPresupuesto);
  window.Presupuesto = { html: presupuestoHtml, revisarTrasCompra, editar: editarPresupuesto };
  window.Historial = { html: historialHtml, montar: historialMontar };
})();
