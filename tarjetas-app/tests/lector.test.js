// Pruebas del lector de estados de cuenta.
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/js/01b_lector.js");

test("fechas en varios formatos", () => {
  assert.equal(L.fechasEn("Fecha de corte: 15/10/2026")[0].f, "2026-10-15");
  assert.equal(L.fechasEn("Pagar antes de 04-NOV-2026")[0].f, "2026-11-04");
  assert.equal(L.fechasEn("Fecha límite de pago: 5 de noviembre de 2026")[0].f, "2026-11-05");
  assert.equal(L.fechasEn("vence 5 nov. 2026")[0].f, "2026-11-05");
  assert.equal(L.fechasEn("2026-10-15")[0].f, "2026-10-15");
  assert.equal(L.fechasEn("05/11/26")[0].f, "2026-11-05");
});

test("montos", () => {
  assert.deepEqual(L.montosEn("Pago mínimo $1,234.56").map((x) => x.v), [1234.56]);
  assert.deepEqual(L.montosEn("Saldo 12.345,67 y 89,00").map((x) => x.v), [12345.67, 89]);
});

test("estado de cuenta típico (México)", () => {
  const texto = `
    BANCO NACIONAL  Tarjeta Clásica
    Periodo: 16/09/2026 al 15/10/2026
    Fecha de corte: 15/10/2026
    Fecha límite de pago: 04/11/2026
    Pago para no generar intereses:          $ 9,564.00
    Pago mínimo:                              $ 560.00
    Pago mínimo + compras y cargos diferidos a meses: $ 1,360.00
    Saldo deudor total                       $ 18,432.10
    Límite de crédito                         $ 35,000.00
    Tasa de interés ordinaria anual: 42.5 %
    CAT promedio: 68.3% sin IVA
  `;
  const r = L.analizar(texto);
  assert.equal(r.noInt.v, 9564);
  assert.equal(r.minimo.v, 560);
  assert.equal(r.saldoCorte.v, 18432.1);
  assert.equal(r.limite.v, 35000);
  assert.equal(r.tasa.v, 42.5);
  assert.equal(r.fechaCorte.v, "2026-10-15");
  assert.equal(r.fechaLimite.v, "2026-11-04");
});

test("tabla partida en líneas y formato con coma decimal", () => {
  const texto = `Fecha límite
5 de noviembre de 2026
Pago mínimo
1.250,00
Pago total
15.300,50`;
  const r = L.analizar(texto);
  assert.equal(r.fechaLimite.v, "2026-11-05");
  assert.equal(r.minimo.v, 1250);
  assert.equal(r.noInt.v, 15300.5);
});
