/* Lector de estados de cuenta: saca de un texto (extraído de un PDF, de
 * una foto con OCR o pegado a mano) los datos que importan.
 *
 * Funciones puras, probadas con `node --test`. Los formatos cambian por
 * banco y país, así que todo lo encontrado se muestra para revisar antes
 * de guardarlo.
 */
(function (root) {
  "use strict";

  const MESES = {
    ene: 1, enero: 1, jan: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, apr: 4,
    may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, aug: 8,
    sep: 9, sept: 9, septiembre: 9, setiembre: 9, set: 9, oct: 10, octubre: 10,
    nov: 11, noviembre: 11, dic: 12, diciembre: 12, dec: 12,
  };

  const sinAcentos = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const pad = (n) => String(n).padStart(2, "0");

  function leerMonto(txt) {
    let s = String(txt || "").replace(/[^\d.,-]/g, "");
    if (!s) return null;
    const c = s.lastIndexOf(","), p = s.lastIndexOf(".");
    if (c > -1 && p > -1) {
      const dec = c > p ? "," : ".";
      s = s.split(dec === "," ? "." : ",").join("").replace(dec, ".");
    } else if (c > -1) {
      const tras = s.length - c - 1;
      s = s.split(",").length === 2 && tras <= 2 ? s.replace(",", ".") : s.split(",").join("");
    } else if (p > -1) {
      const tras = s.length - p - 1;
      if (s.split(".").length > 2 || tras === 3) s = s.split(".").join("");
    }
    const n = parseFloat(s);
    return isFinite(n) ? Math.round(n * 100) / 100 : null;
  }

  // Montos: "$12,345.67", "12.345,67", "$ 1 234.50", "1234.5"
  const RX_MONTO = /-?\$?\s?\d{1,3}(?:[,.\s]\d{3})+(?:[.,]\d{1,2})?|-?\$?\s?\d+[.,]\d{1,2}|\$\s?\d+/g;

  function montosEn(linea) {
    const out = [];
    for (const m of linea.matchAll(RX_MONTO)) {
      const v = leerMonto(m[0]);
      if (v !== null) out.push({ v, i: m.index, txt: m[0] });
    }
    return out;
  }

  function fechaISO(y, m, d) {
    if (y < 100) y += 2000;
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100)) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  // "15/10/2026", "15-10-26", "15 de octubre de 2026", "15-OCT-2026",
  // "15 oct 2026", "2026-10-15"
  function fechasEn(linea) {
    const out = [];
    const l = sinAcentos(linea).toLowerCase();
    let m;
    const rxIso = /(\d{4})-(\d{2})-(\d{2})/g;
    while ((m = rxIso.exec(l))) { const f = fechaISO(+m[1], +m[2], +m[3]); if (f) out.push({ f, i: m.index }); }
    const rxNum = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/g;
    while ((m = rxNum.exec(l))) { const f = fechaISO(+m[3], +m[2], +m[1]); if (f) out.push({ f, i: m.index }); }
    const rxTxt = /(\d{1,2})(?:\s+de\s+|\s*[-/.\s]\s*)([a-z]{3,10})\.?(?:\s+de\s+|\s*[-/.\s]\s*|,\s*)(\d{2,4})/g;
    while ((m = rxTxt.exec(l))) {
      const mes = MESES[m[2]] || MESES[m[2].slice(0, 3)];
      if (!mes) continue;
      const f = fechaISO(+m[3], mes, +m[1]);
      if (f) out.push({ f, i: m.index });
    }
    return out.sort((a, b) => a.i - b.i);
  }

  const ETIQUETAS = {
    noInt: [/pago\s+para\s+no\s+generar\s+intereses/, /para\s+no\s+generar\s+intereses/, /pago\s+sin\s+intereses/, /pago\s+de\s+contado/, /pago\s+total\s+del\s+periodo/, /pago\s+total/],
    minimo: [/pago\s+minimo(?!\s*(\+|mas\b))/, /pago\s+minimo/, /minimo\s+a\s+pagar/],
    saldoCorte: [/saldo\s+al\s+corte/, /saldo\s+deudor\s+total/, /saldo\s+total\s+al\s+corte/, /nuevo\s+saldo/, /saldo\s+nuevo/, /saldo\s+total/],
    limite: [/limite\s+de\s+credito/, /linea\s+de\s+credito/],
  };
  const ET_CORTE = [/fecha\s+de\s+corte/, /fecha\s+de\s+cierre/, /corte\s+al/, /fecha\s+corte/];
  const ET_LIMITE = [/fecha\s+limite\s+de\s+pago/, /fecha\s+limite/, /pagar\s+antes\s+de/, /fecha\s+de\s+pago/, /fecha\s+maxima\s+de\s+pago/, /vencimiento/];
  const ET_TASA = [/tasa\s+de\s+interes\s+ordinaria\s+anual/, /tasa\s+de\s+interes\s+anual/, /tasa\s+anual/, /tasa\s+de\s+interes/, /tasa\s+ordinaria/, /\bcat\b/];

  function buscar(lineas, etiquetas, extraer) {
    for (const rx of etiquetas) {
      for (let i = 0; i < lineas.length; i++) {
        const norm = lineas[i].norm;
        const m = rx.exec(norm);
        if (!m) continue;
        // Primero en la misma línea, después del texto de la etiqueta;
        // si no, en las dos líneas siguientes (tablas partidas en el PDF).
        const resto = lineas[i].orig.slice(Math.min(lineas[i].orig.length, m.index + m[0].length));
        const v = extraer(resto) ?? extraer(lineas[i + 1] ? lineas[i + 1].orig : "") ?? extraer(lineas[i + 2] ? lineas[i + 2].orig : "");
        if (v !== null && v !== undefined) return { v, linea: lineas[i].orig.trim() };
      }
    }
    return null;
  }

  function analizar(texto) {
    const lineas = String(texto || "").split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean)
      .map((orig) => ({ orig, norm: sinAcentos(orig).toLowerCase() }));
    const monto = (s) => { const ms = montosEn(s); return ms.length ? ms[0].v : null; };
    const fecha = (s) => { const fs = fechasEn(s); return fs.length ? fs[fs.length > 1 && /al|a/.test(s) ? fs.length - 1 : 0].f : null; };
    const pct = (s) => { const m = /(\d{1,3}(?:[.,]\d{1,2})?)\s*%/.exec(s); return m ? parseFloat(m[1].replace(",", ".")) : null; };
    const r = {};
    for (const [k, ets] of Object.entries(ETIQUETAS)) {
      const x = buscar(lineas, ets, monto);
      if (x) r[k] = x;
    }
    const fc = buscar(lineas, ET_CORTE, fecha);
    if (fc) r.fechaCorte = fc;
    const fl = buscar(lineas, ET_LIMITE, (s) => { const fs = fechasEn(s); return fs.length ? fs[0].f : null; });
    if (fl) r.fechaLimite = fl;
    const ts = buscar(lineas, ET_TASA, pct);
    if (ts && ts.v > 0 && ts.v < 300) r.tasa = ts;
    // Coherencia: el mínimo no puede pasar del pago sin intereses.
    if (r.minimo && r.noInt && r.minimo.v > r.noInt.v) delete r.minimo;
    return r;
  }

  const Lector = { analizar, fechasEn, montosEn, leerMonto };
  root.Lector = Lector;
  if (typeof module !== "undefined" && module.exports) module.exports = Lector;
})(typeof globalThis !== "undefined" ? globalThis : this);
