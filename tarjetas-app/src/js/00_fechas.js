/* Fechas sin zona horaria.
 *
 * Todo el modelo trabaja con fechas de calendario "YYYY-MM-DD" (cadenas),
 * nunca con instantes: una fecha de corte es "el 15", no "el 15 a las
 * 00:00 UTC". Así un cambio de horario o de zona del teléfono no puede
 * mover un corte o una fecha de pago un día arriba o abajo.
 */
(function (root) {
  "use strict";

  const pad = (n) => String(n).padStart(2, "0");

  function iso(y, m, d) {
    // m es 1..12
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  function partes(f) {
    const [y, m, d] = f.split("-").map(Number);
    return { y, m, d };
  }

  function diasDelMes(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  // Un "día 31" en un mes de 30 días cae en el último día del mes: es lo
  // que hacen los bancos cuando el día de corte no existe en ese mes.
  function fechaConDia(y, m, dia) {
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    return iso(y, m, Math.min(dia, diasDelMes(y, m)));
  }

  function aUTC(f) {
    const { y, m, d } = partes(f);
    return Date.UTC(y, m - 1, d);
  }

  function desdeUTC(ms) {
    const t = new Date(ms);
    return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }

  function sumarDias(f, n) {
    return desdeUTC(aUTC(f) + n * 86400000);
  }

  function diasEntre(a, b) {
    // b - a, en días enteros
    return Math.round((aUTC(b) - aUTC(a)) / 86400000);
  }

  function hoy(fechaReloj) {
    const t = fechaConReloj(fechaReloj);
    return iso(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }

  function fechaConReloj(x) {
    return x instanceof Date ? x : new Date();
  }

  function diaSemana(f) {
    // 0 = domingo
    return new Date(aUTC(f)).getUTCDay();
  }

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

  function textoFecha(f, { anio = false, semana = false } = {}) {
    const { y, m, d } = partes(f);
    let s = `${d} ${MESES_CORTOS[m - 1]}`;
    if (anio) s += ` ${y}`;
    if (semana) s = `${DIAS_CORTOS[diaSemana(f)]} ${s}`;
    return s;
  }

  function textoFechaLarga(f) {
    const { y, m, d } = partes(f);
    return `${DIAS[diaSemana(f)]} ${d} de ${MESES[m - 1]} de ${y}`;
  }

  // "hoy", "mañana", "en 5 días", "hace 2 días"
  function textoRelativo(f, ref) {
    const n = diasEntre(ref, f);
    if (n === 0) return "hoy";
    if (n === 1) return "mañana";
    if (n === -1) return "ayer";
    if (n > 1) return `en ${n} días`;
    return `hace ${-n} días`;
  }

  const Fechas = {
    iso, partes, diasDelMes, fechaConDia, sumarDias, diasEntre, hoy, diaSemana,
    textoFecha, textoFechaLarga, textoRelativo, MESES, MESES_CORTOS, DIAS, DIAS_CORTOS,
  };

  root.Fechas = Fechas;
  if (typeof module !== "undefined" && module.exports) module.exports = Fechas;
})(typeof globalThis !== "undefined" ? globalThis : this);
