// Pruebas del motor de cálculo: `npm test` (node --test).
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../src/js/00_fechas.js");
const C = require("../src/js/01_calculos.js");

function tarjeta(extra = {}) {
  return {
    id: "t1", nombre: "Visa", limite: 20000, diaCorte: 15, diaPago: 5,
    tasaAnual: 48, minimoPct: 5, minimoFijo: 0,
    saldoInicial: 0, fechaInicial: "2026-01-01", movimientos: [], estados: {}, ...extra,
  };
}

test("fechas: día 31 en meses cortos cae en el último día", () => {
  assert.equal(F.fechaConDia(2026, 2, 31), "2026-02-28");
  assert.equal(F.fechaConDia(2028, 2, 30), "2028-02-29");
  assert.equal(F.fechaConDia(2026, 13, 5), "2027-01-05");
  assert.equal(F.fechaConDia(2026, 0, 5), "2025-12-05");
  assert.equal(F.diasEntre("2026-03-01", "2026-03-31"), 30);
  assert.equal(F.sumarDias("2026-12-31", 1), "2027-01-01");
});

test("corte y fecha límite", () => {
  const t = tarjeta();
  assert.equal(C.corteEnOAntes(t, "2026-10-15"), "2026-10-15");
  assert.equal(C.corteEnOAntes(t, "2026-10-14"), "2026-09-15");
  assert.equal(C.corteDespues(t, "2026-10-15"), "2026-11-15");
  assert.equal(C.corteDeCompra(t, "2026-10-15"), "2026-10-15");
  assert.equal(C.corteDeCompra(t, "2026-10-16"), "2026-11-15");
  // día de pago menor que el de corte → mes siguiente
  assert.equal(C.fechaLimite(t, "2026-10-15"), "2026-11-05");
  // día de pago mayor → mismo mes
  assert.equal(C.fechaLimite(tarjeta({ diaCorte: 3, diaPago: 23 }), "2026-10-03"), "2026-10-23");
  // modo "días después del corte"
  assert.equal(C.fechaLimite(tarjeta({ modoPago: "dias", diasParaPagar: 20 }), "2026-10-15"), "2026-11-04");
  // corte el 31
  const t31 = tarjeta({ diaCorte: 31, diaPago: 20 });
  assert.equal(C.corteEnOAntes(t31, "2026-03-15"), "2026-02-28");
  assert.equal(C.corteDespues(t31, "2026-02-28"), "2026-03-31");
});

test("mejor día para comprar = día siguiente al corte", () => {
  const t = tarjeta();
  assert.equal(C.mejorDiaDesde(t, "2026-10-16"), "2026-10-16");
  assert.equal(C.mejorDiaDesde(t, "2026-10-15"), "2026-10-16");
  assert.equal(C.mejorDiaDesde(t, "2026-10-17"), "2026-11-16");
  assert.ok(C.diasParaPagarCompra(t, "2026-10-16") > C.diasParaPagarCompra(t, "2026-11-14"));
  assert.equal(C.diasParaPagarCompra(t, "2026-10-16"), 50); // 16 oct → 5 dic
});

test("saldo: ancla inicial + movimientos, y el estado de cuenta reconcilia", () => {
  const t = tarjeta({
    saldoInicial: 1000, fechaInicial: "2026-09-01",
    movimientos: [
      { id: "a", tipo: "cargo", monto: 500, fecha: "2026-09-10" },
      { id: "b", tipo: "pago", monto: 200, fecha: "2026-09-20" },
      { id: "c", tipo: "cargo", monto: 300, fecha: "2026-10-01" },
      { id: "x", tipo: "cargo", monto: 999, fecha: "2026-08-01" }, // anterior al alta: ya estaba en el saldo inicial
    ],
  });
  assert.equal(C.saldoAl(t, "2026-09-15"), 1500);
  assert.equal(C.saldoAl(t, "2026-10-10"), 1600);
  // El estado real dice 1550 al 15 sep (intereses que la app no sabía)
  t.estados["2026-09-15"] = { saldoCorte: 1550 };
  assert.equal(C.saldoAl(t, "2026-09-15"), 1550);
  assert.equal(C.saldoAl(t, "2026-10-10"), 1650);
});

test("estado de cuenta: estimado, pagos y estados", () => {
  const t = tarjeta({ saldoInicial: 0, fechaInicial: "2026-08-20",
    movimientos: [{ id: "a", tipo: "cargo", monto: 4000, fecha: "2026-09-01" }] });
  let ec = C.estadoDeCuenta(t, "2026-09-15", "2026-09-20");
  assert.equal(ec.noInt, 4000);
  assert.equal(ec.minimo, 200); // 5%
  assert.equal(ec.limite, "2026-10-05");
  assert.equal(ec.estado, "pendiente");
  assert.ok(ec.estimado.noInt);

  t.movimientos.push({ id: "p1", tipo: "pago", monto: 200, fecha: "2026-09-25" });
  ec = C.estadoDeCuenta(t, "2026-09-15", "2026-09-26");
  assert.equal(ec.estado, "minimo");
  assert.equal(ec.restante, 3800);

  ec = C.estadoDeCuenta(t, "2026-09-15", "2026-10-06");
  assert.equal(ec.estado, "minimo"); // pasó la fecha, pero cubrió el mínimo

  t.movimientos.push({ id: "p2", tipo: "pago", monto: 3800, fecha: "2026-10-01" });
  ec = C.estadoDeCuenta(t, "2026-09-15", "2026-10-02");
  assert.equal(ec.estado, "pagado");

  const t2 = tarjeta({ fechaInicial: "2026-08-20", movimientos: [{ id: "a", tipo: "cargo", monto: 1000, fecha: "2026-09-01" }] });
  assert.equal(C.estadoDeCuenta(t2, "2026-09-15", "2026-10-06").estado, "vencido");

  // valores reales capturados mandan
  t2.estados["2026-09-15"] = { pagoNoIntereses: 1100, pagoMinimo: 90 };
  ec = C.estadoDeCuenta(t2, "2026-09-15", "2026-09-20");
  assert.equal(ec.noInt, 1100);
  assert.equal(ec.minimo, 90);
  assert.equal(ec.estimado.noInt, false);
  t2.estados["2026-09-15"].pagadoManual = true;
  assert.equal(C.estadoDeCuenta(t2, "2026-09-15", "2026-10-10").estado, "pagado");
});

test("compras a meses: solo la cuota del mes cuenta para no generar intereses", () => {
  const t = tarjeta({ fechaInicial: "2026-01-01",
    movimientos: [{ id: "m", tipo: "msi", monto: 1200, meses: 12, fecha: "2026-09-20" }] });
  // primera cuota en el corte del 15 oct
  assert.equal(C.msiPendiente(t, "2026-10-15"), 1100);
  const ec = C.estadoDeCuenta(t, "2026-10-15", "2026-10-16");
  assert.equal(ec.saldoCorte, 1200);
  assert.equal(ec.noInt, 100);
  assert.equal(ec.cuotaMSI, 100);
  assert.equal(ec.minimo, 100);
  assert.equal(C.msiPendiente(t, "2027-09-15"), 0);
  assert.equal(C.planesMSI(t, "2026-11-20")[0].restantes, 10);
});

test("resumen: próximo pago y uso", () => {
  const t = tarjeta({ fechaInicial: "2026-08-01",
    movimientos: [{ id: "a", tipo: "cargo", monto: 8000, fecha: "2026-09-10" }] });
  let s = C.resumen(t, "2026-09-20");
  assert.equal(s.proximoPago.tipo, "corte");
  assert.equal(s.proximoPago.fecha, "2026-10-05");
  assert.equal(s.uso, 0.4);
  assert.equal(s.nivel.clave, "atencion");
  t.movimientos.push({ id: "p", tipo: "pago", monto: 8000, fecha: "2026-10-01" });
  s = C.resumen(t, "2026-10-02");
  assert.equal(s.proximoPago.tipo, "siguiente");
  assert.equal(s.proximoPago.estado, "sin-saldo");
});

test("simulador: solo el mínimo tarda mucho más y cuesta más", () => {
  const min = C.simular({ saldo: 10000, tasaAnual: 48, modo: "minimo", pct: 5 });
  const fijo = C.simular({ saldo: 10000, tasaAnual: 48, modo: "fijo", pagoFijo: 1000 });
  assert.ok(min.terminado && fijo.terminado);
  assert.ok(min.meses > fijo.meses);
  assert.ok(min.intereses > fijo.intereses);
  assert.equal(fijo.meses, 14); // 13 pagos de 1000 y un último pago pequeño
  const nunca = C.simular({ saldo: 10000, tasaAnual: 48, modo: "fijo", pagoFijo: 300 });
  assert.equal(nunca.nunca, true);
  // aunque la tasa mensual supere el % mínimo, la deuda no crece
  const caro = C.simular({ saldo: 10000, tasaAnual: 70, modo: "minimo", pct: 3 });
  assert.ok(caro.terminado && caro.serie[1] < 10000);
  const sinTasa = C.simular({ saldo: 1000, tasaAnual: 0, modo: "fijo", pagoFijo: 250 });
  assert.equal(sinTasa.meses, 4);
  assert.equal(sinTasa.intereses, 0);
});

test("plan de deudas: avalancha ahorra intereses frente a bola de nieve", () => {
  const deudas = [
    { id: "a", nombre: "A", saldo: 2000, tasa: 20, minPct: 5 },
    { id: "b", nombre: "B", saldo: 9000, tasa: 60, minPct: 5 },
  ];
  const av = C.planDeudas(deudas, 1500, "avalancha");
  const bn = C.planDeudas(deudas, 1500, "bola");
  const mi = C.planDeudas(deudas, 0, "minimos");
  assert.ok(av.terminado && bn.terminado);
  // el mínimo siempre cubre los intereses: termina, pero mucho después
  assert.ok(mi.terminado && mi.meses > av.meses);
  assert.ok(av.intereses <= bn.intereses);
  assert.equal(bn.orden[0].id, "a");
  assert.ok(mi.intereses > av.intereses);
  assert.equal(C.planDeudas(deudas, 100, "avalancha").insuficiente, true);
});

test("notificaciones: recordatorios antes de la fecha límite, ids estables", () => {
  const t = tarjeta({ fechaInicial: "2026-08-01",
    movimientos: [{ id: "a", tipo: "cargo", monto: 1000, fecha: "2026-10-01" }] });
  const aj = { recordatorios: { dias: [3, 1, 0], hora: "09:00", corte: true } };
  const fmt = (x) => `$${x}`;
  const plan = C.planNotificaciones([t], aj, "2026-10-16", fmt);
  const fechas = plan.filter((n) => n.titulo.includes("Pago")).map((n) => n.fecha);
  assert.ok(fechas.includes("2026-11-02") && fechas.includes("2026-11-04") && fechas.includes("2026-11-05"));
  assert.ok(plan.some((n) => n.titulo.includes("corta") && n.fecha === "2026-11-15"));
  const primero = plan.find((n) => n.fecha === "2026-11-05");
  assert.match(primero.cuerpo, /\$1000/);
  const otra = C.planNotificaciones([t], aj, "2026-10-16", fmt);
  assert.deepEqual(plan.map((n) => n.id), otra.map((n) => n.id));
  assert.equal(new Set(plan.map((n) => n.id)).size, plan.length);
  // pagado → no hay recordatorio del corte actual
  t.movimientos.push({ id: "p", tipo: "pago", monto: 1000, fecha: "2026-10-16" });
  const plan2 = C.planNotificaciones([t], aj, "2026-10-16", fmt);
  assert.ok(!plan2.some((n) => n.fecha === "2026-11-05"));
});

test("consejos: avisa de pago vencido primero", () => {
  const t = tarjeta({ fechaInicial: "2026-08-01", limite: 1000,
    movimientos: [{ id: "a", tipo: "cargo", monto: 900, fecha: "2026-09-01" }] });
  const s = C.resumen(t, "2026-10-08");
  const cs = C.consejos([s], "2026-10-08");
  assert.equal(cs[0].nivel, "critico");
  assert.ok(cs.some((c) => c.titulo.includes("90%")));
});
