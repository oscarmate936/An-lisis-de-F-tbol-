/* Aprende: lo básico de las tarjetas de crédito, con tus propias fechas. */
(function () {
  "use strict";

  const { icono, esc } = UI;
  const F = Fechas;

  const SECCIONES = [
    { titulo: "Lo básico", claves: ["corte", "limite", "noIntereses", "minimo", "saldoCorte", "estadoCuenta"] },
    { titulo: "Para ahorrar", claves: ["mejorDia", "msi", "uso", "tasa"] },
    { titulo: "Para salir de deudas", claves: ["avalancha", "bola"] },
    { titulo: "Cuidado con", claves: ["anualidad", "efectivo", "puntaje"] },
  ];

  const HABITOS = [
    "Paga siempre el \"pago para no generar intereses\" completo, no solo el mínimo.",
    "Paga unos días antes de la fecha límite: los pagos pueden tardar en reflejarse.",
    "Usa menos del 30% de tu límite para cuidar tu puntaje de crédito.",
    "Haz tus compras grandes justo después del corte para tener más días para pagar.",
    "No uses la tarjeta para sacar efectivo: cobra comisión e intereses desde el primer día.",
    "Antes de comprar a meses, suma las mensualidades que ya tienes.",
    "Revisa tu estado de cuenta cada mes por si hay cargos que no reconoces.",
    "Si te cuesta pagar, habla con tu banco antes de atrasarte.",
  ];

  const QUIZ = [
    { p: "Tu corte es el día 10. Compras algo el día 11. ¿En qué estado de cuenta aparece?",
      o: ["En el del día 10 de este mes", "En el del día 10 del mes siguiente"], c: 1,
      e: "El corte del día 10 ya cerró; la compra del 11 entra en el siguiente corte. Por eso el día después del corte es el mejor para comprar." },
    { p: "Si pagas solo el mínimo cada mes…",
      o: ["No pagas intereses", "Evitas el atraso, pero pagas intereses sobre el resto"], c: 1,
      e: "El mínimo solo evita la comisión por atraso. Todo lo que no pagues genera intereses." },
    { p: "¿Qué tienes que pagar para no pagar nada de intereses?",
      o: ["El pago para no generar intereses", "La deuda total, incluidas todas las compras a meses"], c: 0,
      e: "Las compras a meses se pagan en mensualidades: basta con el \"pago para no generar intereses\", que ya incluye la mensualidad que toca." },
    { p: "Tienes un límite de $20,000. ¿Cuál deuda es más sana para tu puntaje?",
      o: ["$4,000 (20%)", "$15,000 (75%)"], c: 0,
      e: "Por debajo del 30% de uso es lo ideal. Usar casi todo tu límite se ve como riesgo." },
  ];

  const respuestas = {};

  function linea() {
    const t = Datos.tarjetas[0];
    const tmp = t || { diaCorte: 15, diaPago: 5 };
    const hoy = App.hoy;
    const corte = Calc.corteEnOAntes(tmp, hoy);
    const anterior = Calc.corteEnOAntes(tmp, F.sumarDias(corte, -1));
    const lim = Calc.fechaLimite(tmp, corte);
    const total = F.diasEntre(anterior, lim);
    const x = (f) => 18 + (F.diasEntre(anterior, f) / total) * 304;
    const x0 = x(anterior), x1 = x(corte), x2 = x(lim);
    return `
      <div class="timeline">
        <svg viewBox="0 0 340 118" role="img" aria-label="Ciclo de la tarjeta: del ${F.textoFecha(F.sumarDias(anterior, 1))} al ${F.textoFecha(corte)} compras; se pagan hasta el ${F.textoFecha(lim)}">
          <rect x="${x0}" y="44" width="${x1 - x0}" height="12" rx="6" fill="var(--series-1)"/>
          <rect x="${x1}" y="44" width="${x2 - x1}" height="12" rx="6" fill="var(--good)"/>
          <text x="${(x0 + x1) / 2}" y="34" text-anchor="middle" font-size="12" font-weight="650" fill="var(--text)">Compras del periodo</text>
          <text x="${(x1 + x2) / 2}" y="34" text-anchor="middle" font-size="12" font-weight="650" fill="var(--text)">Tiempo para pagar</text>
          ${[[x0, anterior, "Corte anterior"], [x1, corte, "Corte"], [x2, lim, "Fecha límite"]].map(([px, f, n], i) => `
            <circle cx="${px}" cy="50" r="8" fill="var(--surface)" stroke="${i === 2 ? "var(--bad)" : "var(--text-2)"}" stroke-width="3"/>
            <text x="${px}" y="82" text-anchor="${i === 0 ? "start" : i === 2 ? "end" : "middle"}" font-size="12" font-weight="700" fill="var(--text)">${F.textoFecha(f)}</text>
            <text x="${px}" y="98" text-anchor="${i === 0 ? "start" : i === 2 ? "end" : "middle"}" font-size="11" fill="var(--text-2)">${n}</text>`).join("")}
        </svg>
      </div>
      <p class="small muted" style="margin:6px 0 0">${t ? `Con tu tarjeta <b>${esc(t.nombre)}</b>: ` : "Ejemplo con corte el día 15: "}
        lo que compras del <b>${F.textoFecha(F.sumarDias(anterior, 1))}</b> al <b>${F.textoFecha(corte)}</b> se suma en el corte y tienes hasta el <b>${F.textoFecha(lim)}</b> para pagarlo. Si lo pagas completo a tiempo, <b>no pagas intereses</b>.</p>`;
  }

  function quiz() {
    return QUIZ.map((q, i) => {
      const r = respuestas[i];
      return `<div class="panel" style="margin-bottom:10px">
        <div class="bold" style="margin-bottom:10px">${i + 1}. ${esc(q.p)}</div>
        <div class="stack">${q.o.map((o, k) => {
          let estilo = "";
          if (r !== undefined && k === q.c) estilo = "background:var(--good-soft);color:var(--good)";
          else if (r === k) estilo = "background:var(--bad-soft);color:var(--bad)";
          return `<button class="btn ghost block" style="justify-content:flex-start;text-align:left;min-height:44px;font-weight:600;${estilo}" data-act="quiz" data-q="${i}" data-k="${k}">${esc(o)}</button>`;
        }).join("")}</div>
        ${r !== undefined ? `<p class="small" style="margin:10px 0 0">${r === q.c ? "✅ ¡Correcto! " : "❌ Casi. "}${esc(q.e)}</p>` : ""}
      </div>`;
    }).join("");
  }

  function html() {
    const aciertos = Object.entries(respuestas).filter(([i, r]) => QUIZ[i].c === r).length;
    return `
      <div class="panel">
        <div class="row" style="margin-bottom:10px"><span style="color:var(--primary)">${icono("reloj", 22)}</span><b>Cómo funciona tu tarjeta cada mes</b></div>
        ${linea()}
      </div>

      <div class="tip bien" style="margin-top:12px"><span class="ticon">${icono("estrella", 20)}</span><span class="grow">
        <div class="ttl">La regla de oro</div>
        <div class="txt">Paga cada mes el <b>pago para no generar intereses</b> completo antes de la <b>fecha límite</b>. Así la tarjeta te sale gratis y mejora tu historial de crédito.</div></span></div>

      ${SECCIONES.map((s) => `
        <div class="section-title">${s.titulo}</div>
        ${s.claves.map((k) => {
          const g = GLOSARIO[k];
          return `<details class="acc"><summary>${esc(g.titulo)}<span class="chev">${icono("abajo", 18)}</span></summary>
            <div class="body"><p style="color:var(--text);font-weight:600">${esc(g.corto)}</p>
            ${g.texto.map((p) => `<p>${esc(p)}</p>`).join("")}
            ${g.ejemplo ? `<div class="ej"><b>Ejemplo:</b> ${esc(g.ejemplo)}</div>` : ""}
            ${g.donde ? `<p class="small" style="margin-top:10px"><b>¿Dónde lo encuentro?</b> ${esc(g.donde)}</p>` : ""}</div></details>`;
        }).join("")}`).join("")}

      <div class="section-title">Buenos hábitos</div>
      <div class="list">${HABITOS.map((h, i) => `<div class="item"><span class="ic bien">${icono("ok", 18)}</span><span class="grow small">${esc(h)}</span></div>`).join("")}</div>

      <div class="section-title">Pon a prueba lo aprendido ${Object.keys(respuestas).length === QUIZ.length ? `<span class="badge bien">${aciertos}/${QUIZ.length}</span>` : ""}</div>
      ${quiz()}
      <p class="tiny faint center" style="margin-top:14px">Información general y educativa. Los nombres y reglas exactas cambian según el país y el banco: tu estado de cuenta siempre manda.</p>`;
  }

  App.registrar("aprende", {
    tab: true,
    titulo: () => "Aprende",
    sub: () => "Tarjetas de crédito sin complicaciones",
    html,
  });

  App.accion("quiz", (el) => {
    const i = +el.dataset.q;
    if (respuestas[i] !== undefined) return;
    respuestas[i] = +el.dataset.k;
    UI.vibrar(respuestas[i] === QUIZ[i].c ? 12 : 30);
    App.render();
  });
})();
