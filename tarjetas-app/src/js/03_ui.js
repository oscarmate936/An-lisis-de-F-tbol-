/* Piezas de interfaz compartidas: iconos, escape de HTML, hojas
 * inferiores, avisos breves y confirmaciones. */
(function () {
  "use strict";

  const P = {
    inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    tarjeta: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 15h4"/>',
    calendario: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    plan: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    aprende: '<path d="M2 6.5 12 3l10 3.5-10 3.5L2 6.5Z"/><path d="M6 8.5v5c0 1.7 2.7 3.5 6 3.5s6-1.8 6-3.5v-5"/><path d="M22 6.5v6"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    ojoNo: '<path d="M9.9 4.2A9.6 9.6 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 8 10 8a9.4 9.4 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="m2 2 20 20"/>',
    campana: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    ok: '<path d="M20 6 9 17l-5-5"/>',
    okCirculo: '<circle cx="12" cy="12" r="9.5"/><path d="m8 12 3 3 5-6"/>',
    alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4M12 8h.01"/>',
    chispa: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    estrella: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9Z"/>',
    pago: '<path d="M12 4v12M6 10l6 6 6-6"/><path d="M5 20h14"/>',
    compra: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3.5h3l2.4 11.4a1.5 1.5 0 0 0 1.5 1.1h8.3a1.5 1.5 0 0 0 1.5-1.2L21 7.5H6.3"/>',
    capas: '<path d="m12 2.5 9.5 5-9.5 5-9.5-5 9.5-5Z"/><path d="m2.5 12.5 9.5 5 9.5-5"/><path d="m2.5 17 9.5 5 9.5-5"/>',
    basura: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    lapiz: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    atras: '<path d="m15 18-6-6 6-6"/>',
    abajo: '<path d="m6 9 6 6 6-6"/>',
    derecha: '<path d="m9 18 6-6-6-6"/>',
    izquierda: '<path d="m15 18-6-6 6-6"/>',
    tijera: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    reloj: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
    descarga: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    subir: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    escudo: '<path d="M12 2.5 4 5.5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10v-6Z"/><path d="m9 12 2 2 4-4"/>',
    recibo: '<path d="M5 2.5h14v19l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3"/>',
    cartera: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-4a2 2 0 0 0 0 4h4v4a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5"/>',
    cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    puntos: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    archivo: '<rect x="3" y="3.5" width="18" height="5" rx="1"/><path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5M10 12.5h4"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    tendencia: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    meta: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
    bombilla: '<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.6.5 1 1.3 1 2.1V16h6v-.8c0-.8.4-1.6 1-2.1A6.5 6.5 0 0 0 12 2.5Z"/>',
    candado: '<rect x="4" y="10.5" width="16" height="11" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  };

  function icono(nombre, tam = 22, extra = "") {
    return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[nombre] || ""}</svg>`;
  }

  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  // Monto con la clase que lo difumina en "modo discreto".
  const $m = (x, redondo) => `<span class="money-v num">${esc(Datos.dinero(x, redondo))}</span>`;

  function vibrar(ms = 10) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* sin vibración */ }
  }

  // ---------- Hoja inferior ----------
  // El botón "atrás" de Android la cierra (lo gestiona App con el plugin
  // @capacitor/app, ver 20_app.js) en vez de salir de la app.
  let hoja = null;

  function abrirHoja(html, { alMontar, alCerrar } = {}) {
    cerrarHoja(true);
    const scrim = document.createElement("div");
    scrim.className = "scrim";
    const el = document.createElement("div");
    el.className = "sheet";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="grab"></div>${html}`;
    document.body.append(scrim, el);
    hoja = { el, scrim, alCerrar };
    scrim.addEventListener("click", () => cerrarHoja());
    if (alMontar) alMontar(el);
    const primero = el.querySelector("[autofocus]");
    if (primero) setTimeout(() => primero.focus(), 220);
    return el;
  }

  function cerrarHoja(silencioso) {
    if (!hoja) return false;
    const h = hoja;
    hoja = null;
    h.el.remove();
    h.scrim.remove();
    if (!silencioso && h.alCerrar) h.alCerrar();
    return true;
  }

  // Cierra la hoja desde un botón (sin disparar alCerrar, que es para
  // cuando la persona la descarta sin responder).
  function salirHoja() {
    cerrarHoja(true);
  }

  const hayHoja = () => !!hoja;

  function aviso(texto, ms = 2600) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = texto;
    document.body.append(t);
    setTimeout(() => t.remove(), ms);
  }

  function confirmar({ titulo, texto, ok = "Confirmar", peligro = false }) {
    return new Promise((res) => {
      let respondido = false;
      abrirHoja(`
        <h2>${esc(titulo)}</h2>
        <p class="lead">${texto}</p>
        <div class="btn-row">
          <button class="btn ghost" data-r="0">Cancelar</button>
          <button class="btn ${peligro ? "danger" : ""}" data-r="1">${esc(ok)}</button>
        </div>`, {
        alMontar: (el) => el.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => {
          respondido = true;
          salirHoja();
          res(b.dataset.r === "1");
        })),
        alCerrar: () => { if (!respondido) res(false); },
      });
    });
  }

  function campoDinero(nombre, valor, { autofocus = false, placeholder = "0.00" } = {}) {
    const v = valor === null || valor === undefined || valor === "" ? "" : Number(valor).toFixed(Datos.decimales());
    return `<input class="input money" name="${nombre}" inputmode="decimal" autocomplete="off" placeholder="${placeholder}" value="${v}" ${autofocus ? "autofocus" : ""}>`;
  }

  const ayuda = (clave) => `<button type="button" class="help" data-act="ayuda" data-clave="${clave}" aria-label="¿Qué es esto?">?</button>`;

  window.UI = { icono, esc, $m, vibrar, abrirHoja, cerrarHoja, salirHoja, hayHoja, aviso, confirmar, campoDinero, ayuda };
})();
