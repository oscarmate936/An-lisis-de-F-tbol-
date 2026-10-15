/* Motor de cálculo de tarjetas de crédito.
 *
 * Funciones puras (sin DOM ni almacenamiento) para que se puedan probar
 * con `node --test` y para que la interfaz nunca tenga lógica de dinero
 * escondida en un botón.
 *
 * Conceptos (los mismos que explica la sección "Aprende"):
 * - Fecha de corte: el banco "cierra" el periodo y suma lo que debes.
 * - Fecha límite de pago: hasta cuándo tienes para pagar ese corte.
 * - Pago para no generar intereses: lo que hay que pagar del corte para
 *   no pagar intereses (el saldo al corte menos las compras a meses que
 *   todavía no tocan).
 * - Pago mínimo: lo mínimo para no caer en atraso (sí genera intereses).
 *
 * Saldo ("cuánto debo"): se parte de un ancla conocida —la deuda que se
 * capturó al dar de alta la tarjeta o, mejor, el saldo al corte de un
 * estado de cuenta real— y se le suman cargos y restan pagos posteriores.
 * El ancla más reciente gana: capturar un estado de cuenta "reconcilia"
 * intereses o comisiones que la app no podía conocer.
 */
(function (root) {
  "use strict";

  const F = root.Fechas || (typeof require !== "undefined" ? require("./00_fechas.js") : null);

  const EPS = 0.005;
  const esNum = (x) => typeof x === "number" && isFinite(x);
  const r2 = (x) => Math.round(x * 100) / 100;

  const MINIMO_PCT_DEFECTO = 5;

  // ---------- Fechas del ciclo ----------

  function corteEnOAntes(t, f) {
    const { y, m } = F.partes(f);
    const c = F.fechaConDia(y, m, t.diaCorte);
    return c <= f ? c : F.fechaConDia(y, m - 1, t.diaCorte);
  }

  function corteDespues(t, f) {
    const { y, m } = F.partes(f);
    const c = F.fechaConDia(y, m, t.diaCorte);
    return c > f ? c : F.fechaConDia(y, m + 1, t.diaCorte);
  }

  // El corte que "cierra" una compra hecha el día f (el mismo día de corte
  // entra en ese corte).
  function corteDeCompra(t, f) {
    const c = corteEnOAntes(t, f);
    return c === f ? c : corteDespues(t, f);
  }

  function fechaLimite(t, corte) {
    if (t.modoPago === "dias" && esNum(t.diasParaPagar) && t.diasParaPagar > 0) {
      return F.sumarDias(corte, t.diasParaPagar);
    }
    const { y, m } = F.partes(corte);
    let f = F.fechaConDia(y, m, t.diaPago);
    if (f <= corte) f = F.fechaConDia(y, m + 1, t.diaPago);
    return f;
  }

  // Mejor día para comprar: el día siguiente al corte, porque esa compra
  // no entra hasta el corte del mes siguiente y da el máximo de días para
  // pagarla sin intereses.
  function mejorDiaDesde(t, hoyF) {
    const ultimo = corteEnOAntes(t, F.sumarDias(hoyF, -1));
    const candidato = F.sumarDias(ultimo, 1);
    return candidato >= hoyF ? candidato : F.sumarDias(corteDeCompra(t, hoyF), 1);
  }

  function diasParaPagarCompra(t, f) {
    return F.diasEntre(f, fechaLimite(t, corteDeCompra(t, f)));
  }

  // ---------- Saldo ----------

  function signo(mov) {
    return mov.tipo === "pago" ? -1 : 1; // cargo, msi, interes, comision
  }

  function anclas(t) {
    const a = [{ fecha: t.fechaInicial, saldo: t.saldoInicial || 0, incluyeDia: false }];
    for (const [c, e] of Object.entries(t.estados || {})) {
      if (e && esNum(e.saldoCorte)) a.push({ fecha: c, saldo: e.saldoCorte, incluyeDia: true });
    }
    a.sort((x, y) => (x.fecha < y.fecha ? -1 : x.fecha > y.fecha ? 1 : x.incluyeDia - y.incluyeDia));
    return a;
  }

  function saldoAl(t, f) {
    const lista = anclas(t);
    let ancla = lista[0];
    for (const a of lista) if (a.fecha <= f) ancla = a;
    let s = ancla.saldo;
    for (const mv of t.movimientos || []) {
      if (mv.fecha > f) continue;
      const despues = ancla.incluyeDia ? mv.fecha > ancla.fecha : mv.fecha >= ancla.fecha;
      if (despues) s += signo(mv) * mv.monto;
    }
    return r2(s);
  }

  // ---------- Compras a meses (MSI / cuotas) ----------

  function mesesEntre(a, b) {
    const pa = F.partes(a), pb = F.partes(b);
    return (pb.y - pa.y) * 12 + (pb.m - pa.m);
  }

  function cuotasFacturadas(t, mv, corte) {
    const primero = corteDeCompra(t, mv.fecha);
    if (corte < primero) return 0;
    return Math.min(mv.meses, mesesEntre(primero, corte) + 1);
  }

  function planesMSI(t, f) {
    const corte = corteEnOAntes(t, f);
    return (t.movimientos || [])
      .filter((mv) => mv.tipo === "msi" && mv.meses > 0 && mv.fecha <= f)
      .map((mv) => {
        const cuota = r2(mv.monto / mv.meses);
        const facturadas = cuotasFacturadas(t, mv, corte);
        return { ...mv, cuota, facturadas, restantes: mv.meses - facturadas,
          pendiente: r2(mv.monto - cuota * facturadas) };
      });
  }

  // Lo que, al corte, todavía no "toca" pagar de las compras a meses.
  function msiPendiente(t, corte) {
    let s = 0;
    for (const mv of t.movimientos || []) {
      if (mv.tipo !== "msi" || !(mv.meses > 0) || mv.fecha > corte) continue;
      const fact = cuotasFacturadas(t, mv, corte);
      s += mv.monto - (mv.monto / mv.meses) * fact;
    }
    return r2(Math.max(0, s));
  }

  function cuotaMSIDelCorte(t, corte) {
    let s = 0;
    for (const mv of t.movimientos || []) {
      if (mv.tipo !== "msi" || !(mv.meses > 0) || mv.fecha > corte) continue;
      const fact = cuotasFacturadas(t, mv, corte);
      const antes = cuotasFacturadas(t, mv, corteEnOAntes(t, F.sumarDias(corte, -1)));
      if (fact > antes) s += mv.monto / mv.meses;
    }
    return r2(s);
  }

  // ---------- Estado de cuenta de un corte ----------

  function minimoEstimado(t, noInt, cuotaMSI) {
    if (noInt <= EPS) return 0;
    const pct = esNum(t.minimoPct) ? t.minimoPct : MINIMO_PCT_DEFECTO;
    const revolvente = Math.max(0, noInt - cuotaMSI);
    const base = cuotaMSI + Math.max(revolvente * pct / 100, t.minimoFijo || 0);
    return r2(Math.min(noInt, base));
  }

  function pagosEntre(t, desdeExcl, hastaIncl) {
    let s = 0;
    for (const mv of t.movimientos || []) {
      if (mv.tipo === "pago" && mv.fecha > desdeExcl && mv.fecha <= hastaIncl) s += mv.monto;
    }
    return r2(s);
  }

  function estadoDeCuenta(t, corte, hoyF) {
    const e = (t.estados || {})[corte] || {};
    const limite = fechaLimite(t, corte);
    const saldoCorte = esNum(e.saldoCorte) ? e.saldoCorte : saldoAl(t, corte);
    const pendienteMSI = msiPendiente(t, corte);
    const cuotaMSI = cuotaMSIDelCorte(t, corte);
    const noInt = r2(Math.max(0, esNum(e.pagoNoIntereses) ? e.pagoNoIntereses : saldoCorte - pendienteMSI));
    const minimo = r2(esNum(e.pagoMinimo) ? Math.min(e.pagoMinimo, noInt || e.pagoMinimo)
      : minimoEstimado(t, noInt, cuotaMSI));
    const siguiente = corteDespues(t, corte);
    const pagado = pagosEntre(t, corte, hoyF < siguiente ? hoyF : siguiente);
    const restante = r2(Math.max(0, noInt - pagado));
    const restanteMin = r2(Math.max(0, minimo - pagado));

    let estado;
    if (noInt <= EPS) estado = "sin-saldo";
    else if (e.pagadoManual || restante <= EPS) estado = "pagado";
    else if (hoyF > limite) estado = restanteMin > EPS ? "vencido" : "minimo";
    else estado = restanteMin <= EPS ? "minimo" : "pendiente";

    const tasa = esNum(t.tasaAnual) ? t.tasaAnual : null;
    // Si se paga solo el mínimo, el resto genera intereses (estimación
    // simple: tasa anual / 12 sobre lo que queda; el banco usa el saldo
    // promedio diario, así que el real puede variar).
    const interesSiMinimo = tasa === null ? null : r2(Math.max(0, noInt - minimo) * tasa / 100 / 12);

    return {
      corte, limite, saldoCorte, noInt, minimo, pendienteMSI, cuotaMSI, pagado, restante,
      restanteMin: estado === "pagado" ? 0 : restanteMin,
      restanteFinal: estado === "pagado" ? 0 : restante,
      estado, interesSiMinimo,
      estimado: {
        saldo: !esNum(e.saldoCorte),
        noInt: !esNum(e.pagoNoIntereses),
        minimo: !esNum(e.pagoMinimo),
      },
      capturado: esNum(e.saldoCorte) || esNum(e.pagoNoIntereses) || esNum(e.pagoMinimo),
    };
  }

  // ---------- Resumen de una tarjeta ----------

  function nivelUso(uso) {
    if (uso < 0.1) return { clave: "excelente", texto: "Excelente", tono: "bien" };
    if (uso < 0.3) return { clave: "bueno", texto: "Saludable", tono: "bien" };
    if (uso < 0.5) return { clave: "atencion", texto: "Atención", tono: "aviso" };
    if (uso < 0.9) return { clave: "alto", texto: "Alto", tono: "serio" };
    return { clave: "critico", texto: "Al límite", tono: "critico" };
  }

  function resumen(t, hoyF) {
    const ultimoCorte = corteEnOAntes(t, hoyF);
    const proxCorte = corteDespues(t, hoyF);
    const ec = estadoDeCuenta(t, ultimoCorte, hoyF);
    const deuda = saldoAl(t, hoyF);
    const limite = t.limite || 0;
    const disponible = r2(limite - deuda);
    const uso = limite > 0 ? Math.max(0, deuda) / limite : 0;

    // ¿Qué pago es el que importa ahora?
    let proximoPago;
    const ecVivo = ec.estado === "pendiente" || ec.estado === "minimo" || ec.estado === "vencido";
    if (ecVivo && (ec.limite >= hoyF || ec.estado === "vencido")) {
      proximoPago = { tipo: "corte", fecha: ec.limite, monto: ec.restanteFinal, minimo: ec.restanteMin,
        estimado: ec.estimado.noInt, estado: ec.estado, corte: ultimoCorte };
    } else {
      // Aún no ha cortado el periodo que se pagará después: se estima con
      // lo que se debe hoy (menos lo que falta de compras a meses).
      const msi = msiPendiente(t, proxCorte);
      proximoPago = { tipo: "siguiente", fecha: fechaLimite(t, proxCorte), monto: r2(Math.max(0, deuda - msi)),
        minimo: null, estimado: true, estado: deuda > EPS ? "por-cortar" : "sin-saldo", corte: proxCorte };
    }

    let gastoCiclo = 0;
    for (const mv of t.movimientos || []) {
      if ((mv.tipo === "cargo" || mv.tipo === "msi") && mv.fecha > ultimoCorte && mv.fecha <= hoyF) gastoCiclo += mv.monto;
    }

    return {
      t, ultimoCorte, proxCorte, ec, deuda, disponible, uso, nivel: nivelUso(uso), proximoPago,
      gastoCiclo: r2(gastoCiclo),
      mejorDia: mejorDiaDesde(t, hoyF),
      diasHoy: diasParaPagarCompra(t, hoyF),
      diasMax: diasParaPagarCompra(t, F.sumarDias(ultimoCorte, 1)),
      planes: planesMSI(t, hoyF).filter((p) => p.restantes > 0),
    };
  }

  function totales(resumenes) {
    const r = { deuda: 0, limite: 0, disponible: 0, porPagar: 0, minimo: 0 };
    for (const s of resumenes) {
      r.deuda += Math.max(0, s.deuda);
      r.limite += s.t.limite || 0;
      r.disponible += Math.max(0, s.disponible);
      if (s.proximoPago.tipo === "corte") {
        r.porPagar += s.proximoPago.monto;
        r.minimo += s.proximoPago.minimo || 0;
      }
    }
    for (const k of Object.keys(r)) r[k] = r2(r[k]);
    r.uso = r.limite > 0 ? r.deuda / r.limite : 0;
    r.nivel = nivelUso(r.uso);
    return r;
  }

  // ---------- Calendario ----------

  function eventos(t, desde, hasta, hoyF) {
    const out = [];
    let c = corteEnOAntes(t, F.sumarDias(desde, -62));
    let guard = 0;
    while (c <= hasta && guard++ < 60) {
      const lim = fechaLimite(t, c);
      const mejor = F.sumarDias(c, 1);
      if (c >= desde && c <= hasta) out.push({ fecha: c, tipo: "corte", t, corte: c });
      if (lim >= desde && lim <= hasta) {
        const ev = { fecha: lim, tipo: "pago", t, corte: c };
        if (c <= hoyF) ev.ec = estadoDeCuenta(t, c, hoyF);
        out.push(ev);
      }
      if (mejor >= desde && mejor <= hasta) out.push({ fecha: mejor, tipo: "mejor", t, corte: c });
      c = corteDespues(t, c);
    }
    return out;
  }

  // ---------- Simulador: ¿cuánto tardo en pagar? ----------

  function simular({ saldo, tasaAnual, modo, pct = MINIMO_PCT_DEFECTO, minFijo = 0, pagoFijo = 0, maxMeses = 600 }) {
    let b = saldo;
    const r = (tasaAnual || 0) / 100 / 12;
    // Sin piso, un mínimo porcentual se encoge con el saldo y nunca llega
    // a cero; los bancos siempre ponen un monto mínimo fijo.
    const piso = Math.max(minFijo, saldo * 0.01, 1);
    let meses = 0, intereses = 0, pagado = 0, nunca = false;
    const serie = [r2(b)];
    while (b > EPS && meses < maxMeses) {
      const i = b * r;
      b += i;
      intereses += i;
      // El mínimo de los bancos siempre cubre al menos los intereses del mes
      // y un poco de capital; si no, la deuda crecería pagando "el mínimo".
      let p = modo === "fijo" ? pagoFijo : Math.max(b * pct / 100, i + (b - i) * 0.01, piso);
      if (modo === "fijo" && p <= i + EPS) { nunca = true; break; }
      p = Math.min(p, b);
      b -= p;
      pagado += p;
      meses++;
      serie.push(r2(Math.max(0, b)));
    }
    return { meses, intereses: r2(intereses), pagado: r2(pagado), serie, terminado: b <= EPS, nunca,
      primerPago: modo === "fijo" ? pagoFijo : r2(Math.max(saldo * (1 + r) * pct / 100, piso)) };
  }

  // ---------- Plan para salir de deudas (avalancha / bola de nieve) ----------

  function planDeudas(deudas, presupuesto, metodo, maxMeses = 600) {
    const ds = deudas.filter((d) => d.saldo > EPS).map((d) => ({
      ...d, b: d.saldo, r: (d.tasa || 0) / 100 / 12, mesLiquidada: null, interes: 0,
      piso: Math.max(d.minFijo || 0, d.saldo * 0.01, 1),
    }));
    const minimoDe = (d) => {
      const i = d.b - d.b / (1 + d.r); // intereses que se acaban de sumar
      return Math.min(d.b, Math.max(d.b * (d.minPct ?? MINIMO_PCT_DEFECTO) / 100, i + (d.b - i) * 0.01, d.piso));
    };
    const minimoInicial = r2(ds.reduce((s, d) => s + minimoDe({ ...d, b: d.b * (1 + d.r) }), 0));
    if (!ds.length) return { meses: 0, intereses: 0, orden: [], insuficiente: false, minimoInicial: 0 };
    if (metodo !== "minimos" && presupuesto + EPS < minimoInicial) {
      return { meses: null, intereses: null, orden: [], insuficiente: true, minimoInicial };
    }
    let mes = 0, intereses = 0;
    while (ds.some((d) => d.b > EPS) && mes < maxMeses) {
      mes++;
      for (const d of ds) if (d.b > EPS) { const i = d.b * d.r; d.b += i; d.interes += i; intereses += i; }
      let dinero = metodo === "minimos" ? Infinity : presupuesto;
      for (const d of ds) {
        if (d.b <= EPS) continue;
        const p = Math.min(minimoDe(d), dinero);
        d.b -= p; dinero -= p;
      }
      if (metodo !== "minimos") {
        const vivos = ds.filter((d) => d.b > EPS);
        vivos.sort(metodo === "avalancha"
          ? (a, b) => b.r - a.r || a.b - b.b
          : (a, b) => a.b - b.b || b.r - a.r);
        for (const d of vivos) {
          if (dinero <= EPS) break;
          const p = Math.min(d.b, dinero);
          d.b -= p; dinero -= p;
        }
      }
      for (const d of ds) if (d.b <= EPS && d.mesLiquidada === null) { d.b = 0; d.mesLiquidada = mes; }
    }
    const terminado = ds.every((d) => d.b <= EPS);
    return {
      meses: terminado ? mes : null, intereses: r2(intereses), insuficiente: false, minimoInicial, terminado,
      orden: ds.slice().sort((a, b) => (a.mesLiquidada ?? 1e9) - (b.mesLiquidada ?? 1e9))
        .map((d) => ({ id: d.id, nombre: d.nombre, mes: d.mesLiquidada, interes: r2(d.interes) })),
    };
  }

  // ---------- Consejos ----------

  function consejos(resumenes, hoyF) {
    const out = [];
    const conDeuda = resumenes.filter((s) => s.deuda > EPS);
    for (const s of resumenes) {
      const n = s.t.nombre;
      const p = s.proximoPago;
      if (p.estado === "vencido") {
        out.push({ nivel: "critico", tarjetaId: s.t.id, titulo: `Pago vencido en ${n}`,
          texto: `La fecha límite fue el ${F.textoFecha(p.fecha)}. Paga al menos el mínimo cuanto antes para evitar más intereses, comisiones y reportes en tu historial.`,
          monto: p.minimo });
      } else if (p.tipo === "corte" && p.estado === "minimo" && hoyF > p.fecha) {
        out.push({ nivel: "aviso", tarjetaId: s.t.id, titulo: `${n} está generando intereses`,
          texto: "Cubriste el mínimo, pero lo que queda del corte genera intereses. Abonar el resto pronto los reduce.",
          monto: p.monto });
      } else if (p.tipo === "corte" && (p.estado === "pendiente" || p.estado === "minimo")) {
        const dias = F.diasEntre(hoyF, p.fecha);
        if (dias <= 3) {
          out.push({ nivel: "aviso", tarjetaId: s.t.id,
            titulo: dias === 0 ? `Hoy vence el pago de ${n}` : `Paga ${n} ${F.textoRelativo(p.fecha, hoyF)}`,
            texto: "Paga el total del corte (pago para no generar intereses) para no pagar intereses.", monto: p.monto });
        }
      }
      if (s.uso >= 0.3 && s.t.limite > 0) {
        out.push({ nivel: s.uso >= 0.7 ? "serio" : "aviso", tarjetaId: s.t.id,
          titulo: `${n} usa el ${Math.round(s.uso * 100)}% de su límite`,
          texto: "Usar más del 30% de tu límite puede bajar tu puntaje de crédito. Intenta abonar antes del corte para que el banco reporte un saldo menor." });
      }
      if (p.tipo === "corte" && !s.ec.capturado && s.ec.noInt > EPS && F.diasEntre(s.ultimoCorte, hoyF) <= 25 && s.ultimoCorte >= s.t.fechaInicial) {
        out.push({ nivel: "info", tarjetaId: s.t.id, accion: "estado", titulo: `Captura el estado de cuenta de ${n}`,
          texto: "Los montos que ves son estimados. Copia el pago mínimo y el pago para no generar intereses de tu estado de cuenta para tener cifras exactas." });
      }
      if (s.mejorDia === hoyF && s.t.limite > 0) {
        out.push({ nivel: "bien", tarjetaId: s.t.id, titulo: `Hoy es el mejor día para comprar con ${n}`,
          texto: `Lo que compres hoy se paga hasta el ${F.textoFecha(fechaLimite(s.t, s.proxCorte))}: ${s.diasHoy} días sin intereses.` });
      }
      if (!esNum(s.t.tasaAnual) && s.deuda > EPS) {
        out.push({ nivel: "info", tarjetaId: s.t.id, accion: "editar", titulo: `Agrega la tasa de interés de ${n}`,
          texto: "Con la tasa anual (aparece en tu estado de cuenta) puedo estimar cuánto pagarías de intereses." });
      }
    }
    const conTasa = conDeuda.filter((s) => esNum(s.t.tasaAnual));
    if (conTasa.length >= 2) {
      const top = conTasa.slice().sort((a, b) => b.t.tasaAnual - a.t.tasaAnual)[0];
      out.push({ nivel: "info", tarjetaId: top.t.id, accion: "plan", titulo: `Si te sobra dinero, abona primero a ${top.t.nombre}`,
        texto: `Es la de tasa más alta (${top.t.tasaAnual}% anual). Cada peso que abones ahí ahorra más intereses (método avalancha).` });
    }
    const orden = { critico: 0, serio: 1, aviso: 2, info: 3, bien: 4 };
    // A igual urgencia, primero lo que tiene que ver con pagar.
    return out.sort((a, b) => orden[a.nivel] - orden[b.nivel] || (a.monto ? 0 : 1) - (b.monto ? 0 : 1));
  }

  // ---------- Notificaciones programadas ----------

  function idNotif(clave) {
    let h = 2166136261;
    for (let i = 0; i < clave.length; i++) { h ^= clave.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 1) % 2000000000 + 1;
  }

  function planNotificaciones(tarjetas, ajustes, hoyF, fmt, horizonteDias = 100) {
    const dias = (ajustes.recordatorios && ajustes.recordatorios.dias) || [3, 1, 0];
    const hora = (ajustes.recordatorios && ajustes.recordatorios.hora) || "09:00";
    const fin = F.sumarDias(hoyF, horizonteDias);
    const out = [];
    const push = (fecha, clave, titulo, cuerpo, t) => {
      if (fecha < hoyF || fecha > fin) return;
      out.push({ id: idNotif(`${t.id}|${clave}|${fecha}`), fecha, hora, titulo, cuerpo, tarjetaId: t.id });
    };
    for (const t of tarjetas) {
      if (t.archivada) continue;
      const s = resumen(t, hoyF);
      const nombre = t.nombre + (t.ultimos4 ? ` •${t.ultimos4}` : "");

      if (s.ec.estado === "vencido") {
        push(hoyF, "vencido", `⚠️ Pago vencido: ${nombre}`,
          `Venció el ${F.textoFecha(s.ec.limite)}. Paga al menos ${fmt(s.ec.restanteMin)} para ponerte al corriente.`, t);
        push(F.sumarDias(hoyF, 2), "vencido2", `⚠️ Sigue pendiente: ${nombre}`,
          `Tu pago venció el ${F.textoFecha(s.ec.limite)}. Mínimo pendiente: ${fmt(s.ec.restanteMin)}.`, t);
      }

      let c = s.ultimoCorte;
      for (let k = 0; k < 4; k++, c = corteDespues(t, c)) {
        const lim = fechaLimite(t, c);
        const actual = c === s.ultimoCorte;
        if (actual) {
          if (s.ec.estado !== "pendiente" && s.ec.estado !== "minimo") continue;
          if (lim < hoyF) continue;
        }
        if (!actual && t.recordatorioCorte !== false && ajustes.recordatorios.corte !== false) {
          push(c, "corte", `✂️ Hoy corta ${nombre}`,
            `Desde mañana, lo que compres se paga hasta el ${F.textoFecha(fechaLimite(t, corteDespues(t, c)))}. Deuda actual aprox. ${fmt(s.deuda)}.`, t);
        }
        for (const d of dias) {
          const f = F.sumarDias(lim, -d);
          const cuando = d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`;
          let cuerpo;
          if (actual) {
            cuerpo = `Para no generar intereses: ${fmt(s.ec.restante)}${s.ec.estimado.noInt ? " (aprox.)" : ""} · Mínimo: ${fmt(s.ec.restanteMin)}. Fecha límite: ${F.textoFecha(lim, { semana: true })}.`;
          } else {
            cuerpo = `Revisa tu estado de cuenta y abre Al Día para ver el monto exacto. Fecha límite: ${F.textoFecha(lim, { semana: true })}.`;
          }
          push(f, `pago-${d}`, `💳 Pago de ${nombre} ${cuando}`, cuerpo, t);
        }
      }
    }
    out.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    return out;
  }

  const Calc = {
    corteEnOAntes, corteDespues, corteDeCompra, fechaLimite, mejorDiaDesde, diasParaPagarCompra,
    saldoAl, msiPendiente, cuotaMSIDelCorte, planesMSI, minimoEstimado, estadoDeCuenta, resumen, totales,
    nivelUso, eventos, simular, planDeudas, consejos, planNotificaciones, idNotif, MINIMO_PCT_DEFECTO, r2, esNum,
  };

  root.Calc = Calc;
  if (typeof module !== "undefined" && module.exports) module.exports = Calc;
})(typeof globalThis !== "undefined" ? globalThis : this);
