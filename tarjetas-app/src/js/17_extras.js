/* Hojas de las funciones extra: ¿con qué tarjeta compro?, meta para
 * liquidar una tarjeta y cargos recurrentes. */
(function () {
  "use strict";

  const { icono, esc, $m, ayuda, abrirHoja, salirHoja, aviso, confirmar, campoDinero } = UI;
  const F = Fechas;
  const P = Piezas;
  const leer = (v) => Datos.leerMonto(v);

  // ---------- ¿Con qué tarjeta compro hoy? ----------

  function filasRanking(monto) {
    const rank = Calc.mejorTarjetaHoy(App.resumenes(), App.hoy, monto || 0);
    if (!rank.length) return `<p class="muted small">Agrega una tarjeta con su límite de crédito para ver la recomendación.</p>`;
    return `<div class="list" style="box-shadow:none;background:var(--surface-2)">${rank.map((r, i) => `
      <div class="item">
        <span class="ic ${r.ok ? (i === 0 ? "bien" : "info") : "critico"}" style="font-weight:800">${r.ok ? i + 1 : "✕"}</span>
        <span class="grow"><div class="t1 ellipsis">${esc(r.s.t.nombre)}${i === 0 && r.ok ? ` <span class="badge bien">Recomendada</span>` : ""}</div>
          <div class="t2">${r.ok ? `Pagas hasta el ${F.textoFecha(r.limite)} · <b>${r.dias} días</b>` : "No conviene hoy"}${r.motivos.length ? ` · ${esc(r.motivos.join(", "))}` : ""}</div></span>
        <span class="right small"><div class="faint">Disponible</div><b class="num">${$m(Math.max(0, r.s.disponible))}</b></span>
      </div>`).join("")}</div>`;
  }

  function mejorTarjeta() {
    abrirHoja(`
      <h2>¿Con qué tarjeta compro hoy?</h2>
      <p class="lead">Ordenadas por los días que tendrías para pagar sin intereses una compra hecha hoy. ${ayuda("mejorDia")}</p>
      <label class="field"><span class="lbl">¿Cuánto vas a gastar? (opcional)</span>${campoDinero("montoCompra", null)}
        <div class="hint">Así reviso que te alcance el crédito y cómo quedaría tu uso del límite.</div></label>
      <div id="ranking">${filasRanking(0)}</div>`, {
      alMontar(el) {
        const inp = el.querySelector('[name="montoCompra"]');
        inp.addEventListener("input", () => { el.querySelector("#ranking").innerHTML = filasRanking(leer(inp.value) || 0); });
      },
    });
  }

  function panelMejorTarjeta() {
    const rank = Calc.mejorTarjetaHoy(App.resumenes(), App.hoy, 0);
    const top = rank.find((r) => r.ok);
    if (!top || rank.length < 1) return "";
    return `<button class="panel row" data-act="mejorTarjeta" style="width:100%;border:0;text-align:left;margin-top:12px">
      <span class="ic" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--good-soft);color:var(--good)">${icono("compra", 20)}</span>
      <span class="grow"><div class="small muted">¿Vas a comprar algo hoy?</div>
        <div class="bold ellipsis">Usa ${esc(top.s.t.nombre)}: ${top.dias} días para pagar</div></span>
      ${icono("derecha", 18)}
    </button>`;
  }

  // ---------- Meta para liquidar ----------

  function formMeta(id) {
    const t = Datos.tarjeta(id);
    const s = App.res(id);
    const m = t.meta || {};
    const sugerida = F.fechaConDia(F.partes(App.hoy).y, F.partes(App.hoy).m + 6, 28);
    abrirHoja(`
      <form novalidate>
        <h2>Meta: liquidar ${esc(t.nombre)}</h2>
        <p class="lead">Elige para cuándo quieres terminar de pagarla y te digo cuánto abonar cada mes (con los intereses incluidos).</p>
        <label class="field"><span class="lbl">Quiero terminar de pagarla antes del</span>
          <input class="input" type="date" name="fecha" value="${esc(m.fecha || sugerida)}" min="${F.sumarDias(App.hoy, 20)}"></label>
        <div class="panel small" id="calc" style="background:var(--surface-2);box-shadow:none;margin-bottom:16px"></div>
        <div class="btn-row">
          ${t.meta ? `<button type="button" class="btn danger" data-quitar>Quitar meta</button>` : `<button type="button" class="btn ghost" data-cerrar>Cancelar</button>`}
          <button class="btn" type="submit">Guardar meta</button>
        </div>
      </form>`, {
      alMontar(el) {
        const f = el.querySelector("form");
        const calc = () => {
          const fecha = f.elements.fecha.value;
          if (!fecha) return;
          const plan = Calc.planMeta({ ...t, meta: { fecha, saldoInicial: Math.max(s.deuda, 0) } }, App.hoy, Math.max(0, s.deuda));
          el.querySelector("#calc").innerHTML = plan.alcanzada ? "No tienes deuda en esta tarjeta. 🎉"
            : plan.vencida ? "Elige una fecha futura."
            : `Debes hoy ${$m(s.deuda)}. Pagando <b>${$m(plan.pagoMensual)}</b> al mes durante ${plan.meses} mes${plan.meses === 1 ? "" : "es"} la liquidas a tiempo${plan.intereses > 1 ? `, con unos ${$m(plan.intereses, true)} de intereses` : ""}. Evita compras nuevas en esta tarjeta mientras tanto.`;
        };
        f.addEventListener("input", calc);
        calc();
        const c = el.querySelector("[data-cerrar]");
        if (c) c.addEventListener("click", salirHoja);
        const q = el.querySelector("[data-quitar]");
        if (q) q.addEventListener("click", () => { Datos.editarTarjeta(id, { meta: null }); salirHoja(); aviso("Meta quitada"); });
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const fecha = f.elements.fecha.value;
          if (!fecha || fecha <= App.hoy) { aviso("Elige una fecha futura"); return; }
          Datos.editarTarjeta(id, { meta: { fecha, creada: App.hoy, saldoInicial: Math.max(0, s.deuda) } });
          salirHoja();
          aviso("Meta guardada");
        });
      },
    });
  }

  // ---------- Cargos recurrentes ----------

  function formRecurrente(id, rid) {
    const t = Datos.tarjeta(id);
    t.recurrentes = t.recurrentes || [];
    const rc = rid ? t.recurrentes.find((r) => r.id === rid) : null;
    const v = rc || { desc: "", monto: null, dia: F.partes(App.hoy).d, categoria: "suscripciones", activo: true };
    let dias = "";
    for (let d = 1; d <= 31; d++) dias += `<option value="${d}" ${d === v.dia ? "selected" : ""}>Día ${d}</option>`;
    abrirHoja(`
      <form novalidate>
        <h2>${rc ? "Editar cargo recurrente" : "Nuevo cargo recurrente"}</h2>
        <p class="lead">Suscripciones o pagos que se cargan solos cada mes a ${esc(t.nombre)} (streaming, gimnasio, teléfono...). Se registrarán automáticamente cada mes.</p>
        <label class="field"><span class="lbl">¿Qué es?</span><input class="input" name="desc" maxlength="30" placeholder="Ej. Netflix" value="${esc(v.desc)}" ${rc ? "" : "autofocus"}></label>
        <div class="grid2">
          <label class="field"><span class="lbl">Monto mensual</span>${campoDinero("monto", v.monto)}</label>
          <label class="field"><span class="lbl">Se cobra el</span><select class="input" name="dia">${dias}</select></label>
        </div>
        <div class="field"><span class="lbl">Categoría</span>
          <div class="chips" data-seg="categoria">${P.CATEGORIAS.filter((c) => c.c !== "intereses").map((c) => `<button type="button" class="chip ${c.c === v.categoria ? "on" : ""}" data-v="${c.c}">${c.e} ${c.n}</button>`).join("")}</div>
          <input type="hidden" name="categoria" value="${esc(v.categoria)}"></div>
        ${rc ? `<label class="row between field"><span>Activo</span><span class="switch"><input type="checkbox" name="activo" ${rc.activo !== false ? "checked" : ""}><span></span></span></label>` : ""}
        <div class="btn-row">
          ${rc ? `<button type="button" class="btn danger" data-borrar>Borrar</button>` : `<button type="button" class="btn ghost" data-cerrar>Cancelar</button>`}
          <button class="btn" type="submit">Guardar</button>
        </div>
      </form>`, {
      alMontar(el) {
        const f = el.querySelector("form");
        Formularios.cablearSegmentos(el);
        const c = el.querySelector("[data-cerrar]");
        if (c) c.addEventListener("click", salirHoja);
        const b = el.querySelector("[data-borrar]");
        if (b) b.addEventListener("click", async () => {
          if (!(await confirmar({ titulo: "¿Borrar este cargo recurrente?", texto: "Los cargos que ya se registraron se quedan; solo deja de crear nuevos.", ok: "Borrar", peligro: true }))) return;
          t.recurrentes = t.recurrentes.filter((r) => r.id !== rid);
          Datos.guardar();
          aviso("Cargo recurrente borrado");
        });
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const monto = leer(f.elements.monto.value);
          if (!(monto > 0)) { aviso("Escribe el monto mensual"); return; }
          const datos = { desc: f.elements.desc.value.trim() || "Cargo recurrente", monto, dia: +f.elements.dia.value,
            categoria: f.elements.categoria.value, activo: f.elements.activo ? f.elements.activo.checked : true };
          if (rc) Object.assign(rc, datos);
          else {
            // Empieza a contar desde hoy: no crea cargos de meses pasados.
            t.recurrentes.push({ id: Datos.uid(), desde: App.hoy, ultimo: null, ...datos });
          }
          Datos.aplicarAutomaticos(App.hoy);
          Datos.guardar();
          salirHoja();
          aviso(rc ? "Cargo recurrente actualizado" : `Se registrará cada mes el día ${datos.dia}`);
        });
      },
    });
  }

  window.Extras = { mejorTarjeta, panelMejorTarjeta, formMeta, formRecurrente };
})();
