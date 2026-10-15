/* Datos de ejemplo para explorar la app sin capturar nada. Las fechas se
 * calculan respecto a hoy, para que siempre haya un pago próximo, uno ya
 * cubierto y una compra a meses en curso. */
(function () {
  "use strict";

  const F = Fechas;

  function diaHace(n) {
    return F.partes(F.sumarDias(Fechas.hoy(), -n)).d;
  }

  function generar() {
    const hoy = Fechas.hoy();
    const alta = F.sumarDias(hoy, -75);
    const d = (n) => F.sumarDias(hoy, -n);
    const id = () => Datos.uid();

    // Corte hace 12 días → pago en ~8 días.
    const a = {
      id: id(), nombre: "Clásica", banco: "Banco Nacional", ultimos4: "4821", red: "visa", color: "azul",
      limite: 35000, diaCorte: Math.min(28, diaHace(12)), diaPago: 0, modoPago: "dias", diasParaPagar: 20,
      tasaAnual: 42, minimoPct: 5, fechaInicial: alta, saldoInicial: 6200, estados: {},
      movimientos: [
        { id: id(), tipo: "cargo", monto: 1850.4, fecha: d(60), desc: "Supermercado", categoria: "super" },
        { id: id(), tipo: "pago", monto: 6200, fecha: d(55), desc: "" },
        { id: id(), tipo: "cargo", monto: 920, fecha: d(41), desc: "Gasolina", categoria: "transporte" },
        { id: id(), tipo: "cargo", monto: 3400, fecha: d(33), desc: "Zapatos", categoria: "compras" },
        { id: id(), tipo: "pago", monto: 6170.4, fecha: d(24), desc: "" },
        { id: id(), tipo: "msi", monto: 9600, meses: 12, fecha: d(30), desc: "Celular", categoria: "compras" },
        { id: id(), tipo: "cargo", monto: 1290.5, fecha: d(20), desc: "Supermercado", categoria: "super" },
        { id: id(), tipo: "cargo", monto: 640, fecha: d(16), desc: "Restaurante", categoria: "comida" },
        { id: id(), tipo: "cargo", monto: 2199, fecha: d(14), desc: "Vuelo", categoria: "viajes" },
        { id: id(), tipo: "cargo", monto: 199, fecha: d(8), desc: "Streaming", categoria: "suscripciones" },
        { id: id(), tipo: "cargo", monto: 780, fecha: d(3), desc: "Farmacia", categoria: "salud" },
      ],
    };

    // Corte hace 22 días → pago en ~3 días, con el mínimo ya cubierto.
    const b = {
      id: id(), nombre: "Oro", banco: "Banco del Sur", ultimos4: "1093", red: "mastercard", color: "oro",
      limite: 18000, diaCorte: Math.min(28, diaHace(22)), diaPago: 0, modoPago: "dias", diasParaPagar: 25,
      tasaAnual: 58, minimoPct: 4, fechaInicial: alta, saldoInicial: 9800, estados: {},
      movimientos: [
        { id: id(), tipo: "cargo", monto: 1200, fecha: d(50), desc: "Ropa", categoria: "compras" },
        { id: id(), tipo: "pago", monto: 1500, fecha: d(40), desc: "" },
        { id: id(), tipo: "cargo", monto: 450, fecha: d(30), desc: "Cine", categoria: "ocio" },
        { id: id(), tipo: "pago", monto: 600, fecha: d(10), desc: "" },
        { id: id(), tipo: "cargo", monto: 1350, fecha: d(6), desc: "Restaurante", categoria: "comida" },
      ],
    };

    // Corte hace 2 días, al corriente y con poco uso.
    const c = {
      id: id(), nombre: "Digital", banco: "NeoBanco", ultimos4: "7710", red: "visa", color: "violeta",
      limite: 12000, diaCorte: Math.min(28, diaHace(2)), diaPago: 0, modoPago: "dias", diasParaPagar: 20,
      tasaAnual: 36, minimoPct: 5, fechaInicial: alta, saldoInicial: 0, estados: {},
      movimientos: [
        { id: id(), tipo: "cargo", monto: 349, fecha: d(40), desc: "Música", categoria: "suscripciones" },
        { id: id(), tipo: "pago", monto: 349, fecha: d(28), desc: "" },
        { id: id(), tipo: "cargo", monto: 1120, fecha: d(9), desc: "Despensa", categoria: "super" },
        { id: id(), tipo: "cargo", monto: 260, fecha: d(1), desc: "Taxi", categoria: "transporte" },
      ],
    };
    for (const t of [a, b, c]) {
      t.diaPago = F.partes(F.sumarDias(Calc.corteEnOAntes(t, hoy), t.diasParaPagar)).d;
    }
    // Estado de cuenta capturado en la tarjeta Oro, para mostrar la
    // diferencia entre "estimado" y "real".
    const corteB = Calc.corteEnOAntes(b, hoy);
    const estB = Calc.estadoDeCuenta(b, corteB, hoy);
    b.estados[corteB] = { pagoNoIntereses: Math.round(estB.noInt + 214.37), pagoMinimo: 560 };
    return [a, b, c];
  }

  window.Ejemplo = { generar };
})();
