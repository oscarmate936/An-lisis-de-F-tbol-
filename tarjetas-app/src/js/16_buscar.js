/* Buscar y filtrar movimientos de todas las tarjetas. */
(function () {
  "use strict";

  const { icono, esc, $m } = UI;
  const F = Fechas;
  const P = Piezas;

  const filtro = { texto: "", tipo: "todos", tarjeta: "", categoria: "", periodo: "todo" };

  const quitarAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function resultados() {
    const q = quitarAcentos(filtro.texto.trim());
    const hoy = App.hoy;
    const desde = filtro.periodo === "mes" ? hoy.slice(0, 8) + "01"
      : filtro.periodo === "3m" ? F.sumarDias(hoy, -92)
      : filtro.periodo === "anio" ? F.sumarDias(hoy, -366) : "0000-00-00";
    const out = [];
    for (const t of Datos.estado.tarjetas) {
      if (filtro.tarjeta && t.id !== filtro.tarjeta) continue;
      for (const mv of t.movimientos) {
        if (mv.fecha < desde) continue;
        if (filtro.tipo === "compras" && mv.tipo === "pago") continue;
        if (filtro.tipo === "pagos" && mv.tipo !== "pago") continue;
        if (filtro.categoria && (mv.tipo === "pago" || (mv.categoria || "otros") !== filtro.categoria)) continue;
        if (q) {
          const cat = P.cat(mv.categoria).n;
          const texto = quitarAcentos(`${mv.desc || ""} ${cat} ${t.nombre} ${mv.tipo === "pago" ? "pago abono" : "compra cargo"} ${mv.monto}`);
          if (!q.split(/\s+/).every((p) => texto.includes(p))) continue;
        }
        out.push({ mv, t });
      }
    }
    return out.sort((a, b) => (a.mv.fecha < b.mv.fecha ? 1 : a.mv.fecha > b.mv.fecha ? -1 : 0));
  }

  function listaHtml() {
    const r = resultados();
    if (!r.length) return `<div class="panel small muted center" style="margin-top:12px">No hay movimientos con esos filtros.</div>`;
    let cargos = 0, pagos = 0;
    for (const { mv } of r) { if (mv.tipo === "pago") pagos += mv.monto; else cargos += mv.monto; }
    const grupos = new Map();
    for (const x of r.slice(0, 300)) {
      const k = x.mv.fecha.slice(0, 7);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(x);
    }
    return `
      <div class="kpis" style="margin-top:12px">
        <div class="kpi"><div class="k">Compras (${r.filter((x) => x.mv.tipo !== "pago").length})</div><div class="v">${$m(cargos)}</div></div>
        <div class="kpi"><div class="k">Pagos (${r.filter((x) => x.mv.tipo === "pago").length})</div><div class="v">${$m(pagos)}</div></div>
      </div>
      ${[...grupos.entries()].map(([k, l]) => {
        const [y, m] = k.split("-").map(Number);
        return `<div class="section-title">${F.MESES[m - 1]} ${y}</div><div class="list">${l.map(({ mv, t }) => P.filaMovimiento(mv, t)).join("")}</div>`;
      }).join("")}
      ${r.length > 300 ? `<p class="small muted center">Se muestran los 300 más recientes.</p>` : ""}`;
  }

  function html() {
    const tarjetas = Datos.estado.tarjetas;
    const chip = (grupo, v, n) => `<button class="chip ${filtro[grupo] === v ? "on" : ""}" data-f="${grupo}" data-v="${v}">${n}</button>`;
    return `
      <div style="position:relative">
        <span style="position:absolute;left:14px;top:13px;color:var(--text-3)">${icono("buscar", 20)}</span>
        <input class="input" id="q" type="search" placeholder="Buscar: súper, Netflix, 1500…" value="${esc(filtro.texto)}" style="padding-left:44px" autocomplete="off">
      </div>
      <div class="chips" style="margin-top:12px">${chip("tipo", "todos", "Todo")}${chip("tipo", "compras", "Compras")}${chip("tipo", "pagos", "Pagos")}</div>
      <div class="chips" style="margin-top:8px">${chip("periodo", "todo", "Siempre")}${chip("periodo", "mes", "Este mes")}${chip("periodo", "3m", "3 meses")}${chip("periodo", "anio", "Último año")}</div>
      <div class="grid2" style="margin-top:10px">
        <select class="input" id="fTarjeta"><option value="">Todas las tarjetas</option>${tarjetas.map((t) => `<option value="${t.id}" ${filtro.tarjeta === t.id ? "selected" : ""}>${esc(t.nombre)}</option>`).join("")}</select>
        <select class="input" id="fCat"><option value="">Todas las categorías</option>${P.CATEGORIAS.map((c) => `<option value="${c.c}" ${filtro.categoria === c.c ? "selected" : ""}>${c.e} ${c.n}</option>`).join("")}</select>
      </div>
      <div id="res">${listaHtml()}</div>`;
  }

  function montar(raiz) {
    const q = raiz.querySelector("#q");
    const pintar = () => { raiz.querySelector("#res").innerHTML = listaHtml(); };
    q.addEventListener("input", () => { filtro.texto = q.value; pintar(); });
    raiz.querySelector("#fTarjeta").addEventListener("change", (e) => { filtro.tarjeta = e.target.value; pintar(); });
    raiz.querySelector("#fCat").addEventListener("change", (e) => { filtro.categoria = e.target.value; pintar(); });
    raiz.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
      filtro[b.dataset.f] = b.dataset.v;
      raiz.querySelectorAll(`[data-f="${b.dataset.f}"]`).forEach((x) => x.classList.toggle("on", x === b));
      pintar();
    }));
  }

  App.registrar("buscar", {
    titulo: () => "Buscar movimientos",
    html,
    montar,
    alEntrar: () => { const q = document.getElementById("q"); if (q) q.focus(); },
  });
})();
