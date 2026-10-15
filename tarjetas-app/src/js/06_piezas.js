/* Fragmentos de interfaz reutilizados por varias pantallas. */
(function () {
  "use strict";

  const { icono, esc, $m, ayuda } = UI;
  const F = Fechas;

  const COLORES = ["azul", "grafito", "esmeralda", "violeta", "vino", "oro", "coral", "turquesa", "plata"];
  const REDES = { visa: "VISA", mastercard: "mastercard", amex: "AMEX", otra: "" };

  const CATEGORIAS = [
    { c: "super", n: "Súper", e: "🛒" },
    { c: "comida", n: "Comida", e: "🍔" },
    { c: "transporte", n: "Transporte", e: "⛽" },
    { c: "compras", n: "Compras", e: "🛍️" },
    { c: "servicios", n: "Servicios", e: "💡" },
    { c: "salud", n: "Salud", e: "💊" },
    { c: "viajes", n: "Viajes", e: "✈️" },
    { c: "ocio", n: "Ocio", e: "🎬" },
    { c: "suscripciones", n: "Suscripciones", e: "📺" },
    { c: "educacion", n: "Educación", e: "📚" },
    { c: "intereses", n: "Intereses / comisión", e: "🏦" },
    { c: "otros", n: "Otros", e: "📦" },
  ];
  const cat = (c) => CATEGORIAS.find((x) => x.c === c) || CATEGORIAS[CATEGORIAS.length - 1];

  function plastico(t, s, { boton = true } = {}) {
    const tag = boton ? "button" : "div";
    const attrs = boton ? `data-act="verTarjeta" data-id="${t.id}" aria-label="Abrir ${esc(t.nombre)}"` : "";
    return `<${tag} class="cc g-${esc(t.color || "azul")}" ${attrs}>
      <div class="row between top">
        <div class="grow"><div class="bank ellipsis">${esc(t.banco || "Tarjeta de crédito")}</div><div class="name ellipsis">${esc(t.nombre)}</div></div>
        <div class="netw">${REDES[t.red] || ""}</div>
      </div>
      <div class="row between">
        <div class="chipimg"></div>
        <div class="digits num">•••• ${esc(t.ultimos4 || "····")}</div>
      </div>
      <div class="row between" style="align-items:flex-end">
        <div><div class="bal">Deuda actual</div><div class="balv">${$m(Math.max(0, s.deuda))}</div></div>
        <div class="right"><div class="bal">Disponible</div><div style="font-weight:650">${$m(Math.max(0, s.disponible))}</div></div>
      </div>
    </${tag}>`;
  }

  function puntoColor(t) {
    return `<span class="cc g-${esc(t.color || "azul")}" style="width:28px;height:20px;padding:0;border-radius:5px;flex:0 0 28px;aspect-ratio:auto;box-shadow:none"></span>`;
  }

  const ESTADOS = {
    pagado: { tono: "bien", texto: "Pagado", ic: "ok" },
    "sin-saldo": { tono: "", texto: "Sin saldo", ic: "ok" },
    pendiente: { tono: "info", texto: "Pendiente", ic: "reloj" },
    minimo: { tono: "aviso", texto: "Mínimo cubierto", ic: "alerta" },
    vencido: { tono: "critico", texto: "Vencido", ic: "alerta" },
    "por-cortar": { tono: "", texto: "Por cortar", ic: "tijera" },
  };

  function insignia(estado, fecha, hoy) {
    const e = ESTADOS[estado] || ESTADOS.pendiente;
    let tono = e.tono, texto = e.texto;
    if (estado === "pendiente" && fecha) {
      const n = F.diasEntre(hoy, fecha);
      if (n <= 3) tono = "aviso";
      texto = n === 0 ? "Vence hoy" : n === 1 ? "Vence mañana" : `Faltan ${n} días`;
    }
    return `<span class="badge ${tono}">${texto}</span>`;
  }

  function cajaFecha(fecha, tono = "") {
    const { m, d } = F.partes(fecha);
    return `<div class="datebox ${tono}"><div class="m">${F.MESES_CORTOS[m - 1]}</div><div class="d num">${d}</div></div>`;
  }

  function tonoPago(p, hoy) {
    if (p.estado === "vencido") return "bad";
    if (p.tipo === "corte" && (p.estado === "pendiente" || p.estado === "minimo") && F.diasEntre(hoy, p.fecha) <= 3) return "warn";
    return "";
  }

  function medidor(uso, tono) {
    return `<div class="meter ${tono}"><i style="width:${Math.min(100, Math.max(uso > 0 ? 2 : 0, uso * 100)).toFixed(1)}%"></i></div>`;
  }

  const ICONO_CONSEJO = { critico: "alerta", serio: "alerta", aviso: "reloj", info: "bombilla", bien: "estrella" };

  function consejo(c) {
    return `<button class="tip ${c.nivel}" data-act="consejo" data-id="${c.tarjetaId || ""}" data-accion="${c.accion || ""}">
      <span class="ticon">${icono(ICONO_CONSEJO[c.nivel] || "info", 20)}</span>
      <span class="grow"><div class="ttl">${esc(c.titulo)}</div><div class="txt">${esc(c.texto)}</div>
      ${c.monto ? `<div class="small bold" style="margin-top:4px">${$m(c.monto)}</div>` : ""}</span>
    </button>`;
  }

  function filaMovimiento(mv, t) {
    const esPago = mv.tipo === "pago";
    const c = cat(mv.categoria);
    const titulo = mv.desc || (esPago ? "Pago a la tarjeta" : mv.tipo === "msi" ? "Compra a meses" : c.n);
    const sub = [F.textoFecha(mv.fecha, { anio: mv.fecha.slice(0, 4) !== F.hoy().slice(0, 4) })];
    if (t) sub.push(t.nombre);
    if (mv.tipo === "msi") sub.push(`${mv.meses} meses · ${Datos.dinero(mv.monto / mv.meses)}/mes`);
    else if (!esPago) sub.push(c.n);
    if (mv.monedaOriginal) sub.push(`${mv.monedaOriginal} ${mv.montoOriginal} × ${mv.tipoCambio}`);
    if (mv.auto === "domiciliado") sub.push("automático");
    if (mv.auto === "recurrente") sub.push("recurrente");
    return `<button class="item" data-act="verMovimiento" data-id="${t ? t.id : ""}" data-mid="${mv.id}">
      <span class="ic ${esPago ? "bien" : ""}" style="font-size:18px">${esPago ? icono("pago", 20) : mv.tipo === "msi" ? icono("capas", 20) : c.e}</span>
      <span class="grow"><div class="t1 ellipsis">${esc(titulo)}</div><div class="t2 ellipsis">${esc(sub.join(" · "))}</div></span>
      <span class="amount ${esPago ? "neg" : ""}">${esPago ? "−" : ""}${$m(mv.monto)}</span>
    </button>`;
  }

  function filaInfo(etiqueta, valor, { clave, sub, fuerte } = {}) {
    return `<div class="row between" style="padding:9px 0">
      <span class="muted row" style="gap:6px">${etiqueta}${clave ? " " + ayuda(clave) : ""}</span>
      <span class="right"><span class="${fuerte ? "bold" : ""} num">${valor}</span>${sub ? `<div class="tiny faint">${sub}</div>` : ""}</span>
    </div>`;
  }

  // Intereses estimados: no son movimientos guardados, se muestran aparte.
  function filaInteres(x) {
    return `<div class="item">
      <span class="ic aviso" style="font-size:18px">🏦</span>
      <span class="grow"><div class="t1">Intereses estimados</div><div class="t2">${F.textoFecha(x.fecha)} · por lo que faltó pagar del corte del ${F.textoFecha(x.corte)} · aprox.</div></span>
      <span class="amount">${$m(x.monto)}</span>
    </div>`;
  }

  window.Piezas = { filaInteres, COLORES, REDES, CATEGORIAS, cat, plastico, puntoColor, insignia, cajaFecha, tonoPago, medidor, consejo, filaMovimiento, filaInfo, ESTADOS };
})();
