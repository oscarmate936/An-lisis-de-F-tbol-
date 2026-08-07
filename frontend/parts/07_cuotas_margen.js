/* ============================================================
   CUOTAS: quitar el margen de la casa
   ============================================================ */

/** Método de Shin: reparte el margen suponiendo apostantes informados.
    Normalizar en proporción, que es lo habitual, infla a los favoritos. */
function shinDevig(odds) {
  const q = odds.map((o) => 1 / o);
  const S = q.reduce((a, b) => a + b, 0);
  if (!isFinite(S) || S <= 1.0001) return q.map((x) => x / S);
  const probs = (z) =>
    q.map((x) => (Math.sqrt(z * z + 4 * (1 - z) * (x * x) / S) - z) / (2 * (1 - z)));
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 60; i++) {
    const z = (lo + hi) / 2;
    const s = probs(z).reduce((a, b) => a + b, 0);
    if (s > 1) lo = z; else hi = z;
  }
  const p = probs((lo + hi) / 2);
  const t = p.reduce((a, b) => a + b, 0);
  return p.map((x) => x / t);
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Extrae del bloque de cuotas las probabilidades limpias de cada mercado. */
function marketProbs(oddsBlock, metodo = "mediana") {
  const books = oddsBlock?.[0]?.bookmakers || [];
  const grab = (betNames, values) => {
    // "Mejor cuota" toma el máximo de cada resultado entre todas las casas.
    // Deja un margen menor (a veces negativo) y suele ser la estimación
    // más limpia de la probabilidad real, aunque nadie la ofrezca junta.
    if (metodo === "mejor") {
      const mejores = values.map(() => 0);
      let hay = 0;
      books.forEach((b) => {
        const bet = (b.bets || []).find((x) => betNames.includes(x.name));
        if (!bet) return;
        values.forEach((v, i) => {
          const hit = (bet.values || []).find((z) => String(z.value).toLowerCase() === v.toLowerCase());
          const o = hit ? Number(hit.odd) : 0;
          if (o > mejores[i]) { mejores[i] = o; hay++; }
        });
      });
      if (mejores.some((o) => !o || o <= 1)) return null;
      return { p: shinDevig(mejores), books: books.length, metodo: "mejor" };
    }
    const rows = [];
    books.forEach((b) => {
      const bet = (b.bets || []).find((x) => betNames.includes(x.name));
      if (!bet) return;
      const o = values.map((v) => {
        const hit = (bet.values || []).find(
          (z) => String(z.value).toLowerCase() === v.toLowerCase()
        );
        return hit ? Number(hit.odd) : null;
      });
      if (o.some((x) => !x || x <= 1)) return;
      rows.push(shinDevig(o));
    });
    if (!rows.length) return null;
    const p = values.map((_, i) => median(rows.map((r) => r[i])));
    const s = p.reduce((a, b) => a + b, 0);
    return { p: p.map((v) => v / s), books: rows.length, metodo: "mediana" };
  };
  return {
    x1x2: grab(["Match Winner", "1x2", "Full Time Result"], ["Home", "Draw", "Away"]),
    ou25: grab(["Goals Over/Under"], ["Over 2.5", "Under 2.5"]),
    btts: grab(["Both Teams Score", "Both Teams To Score"], ["Yes", "No"]),
    n: books.length,
  };
}

