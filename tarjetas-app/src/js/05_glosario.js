/* Glosario: explicaciones en lenguaje llano. Se usan en "Aprende" y en
 * los botones "?" que hay junto a cada término en toda la app. */
(function () {
  "use strict";

  const GLOSARIO = {
    corte: {
      titulo: "Fecha de corte",
      corto: "El día que el banco cierra tu periodo y suma lo que gastaste.",
      texto: [
        "Cada mes, en la misma fecha, el banco \"cierra la cuenta\": suma todas las compras que hiciste desde el corte anterior y te manda un estado de cuenta con lo que debes.",
        "Lo que compras después del corte ya no entra en ese estado de cuenta: pasa al del mes siguiente.",
      ],
      ejemplo: "Si tu corte es el día 15, lo que compres del 16 de septiembre al 15 de octubre aparece en el estado de cuenta del 15 de octubre.",
      donde: "Aparece en tu estado de cuenta como \"Fecha de corte\" y también en la app de tu banco.",
    },
    limite: {
      titulo: "Fecha límite de pago",
      corto: "El último día para pagar lo del corte sin atrasarte.",
      texto: [
        "Después del corte, el banco te da unos días (normalmente 20) para pagar. Ese último día es la fecha límite.",
        "Si pagas el total del corte antes de esa fecha, no pagas intereses. Si no pagas ni el mínimo, te cobran comisión por atraso y se reporta en tu historial de crédito.",
      ],
      ejemplo: "Corte el 15 de octubre → fecha límite alrededor del 4 o 5 de noviembre.",
      donde: "En tu estado de cuenta como \"Fecha límite de pago\" o \"Pagar antes de\".",
    },
    noIntereses: {
      titulo: "Pago para no generar intereses",
      corto: "Lo que debes pagar para que el banco no te cobre intereses.",
      texto: [
        "Es la cantidad más importante del estado de cuenta. Normalmente es lo que gastaste en el periodo, más la mensualidad de tus compras a meses.",
        "Si cada mes pagas esta cantidad completa antes de la fecha límite, usar la tarjeta te sale gratis: nunca pagas intereses.",
      ],
      ejemplo: "Gastaste $5,000 en el periodo y tienes una compra a meses de $300 al mes → pago para no generar intereses: $5,300.",
      donde: "En México se llama así; en otros países puede aparecer como \"pago total\", \"pago de contado\" o \"saldo al corte\".",
    },
    minimo: {
      titulo: "Pago mínimo",
      corto: "Lo menos que puedes pagar para no atrasarte (pero sí pagas intereses).",
      texto: [
        "El pago mínimo evita que te cobren comisión por atraso, pero todo lo que no pagues genera intereses, y son caros.",
        "Pagar solo el mínimo es la forma más lenta y cara de pagar una deuda: puedes tardar años y pagar más en intereses que lo que compraste. Úsalo solo en emergencias.",
      ],
      ejemplo: "Con una deuda de $10,000 al 48% anual, pagando solo el mínimo puedes tardar más de 10 años y pagar miles en intereses. Pruébalo en Planear → Simulador.",
      donde: "En tu estado de cuenta como \"Pago mínimo\".",
    },
    saldoCorte: {
      titulo: "Saldo al corte / deuda total",
      corto: "Todo lo que debías el día del corte.",
      texto: [
        "Incluye lo que gastaste, intereses, comisiones y también lo que falta por pagar de tus compras a meses.",
        "No hace falta pagarlo todo de golpe: para no pagar intereses basta con el \"pago para no generar intereses\".",
      ],
      donde: "En tu estado de cuenta como \"Saldo al corte\", \"Saldo deudor total\" o \"Saldo nuevo\".",
    },
    deuda: {
      titulo: "Deuda actual",
      corto: "Lo que debes hoy, incluidas compras que todavía no han cortado.",
      texto: [
        "Al Día la calcula con lo que capturas: la deuda que tenías al registrar la tarjeta, más tus compras, menos tus pagos. Si capturas tu estado de cuenta, se corrige sola con el saldo real del banco.",
      ],
    },
    limiteCredito: {
      titulo: "Límite de crédito",
      corto: "Lo máximo que el banco te deja deber en esa tarjeta.",
      texto: ["Tu crédito disponible es el límite menos lo que debes. Las compras a meses ocupan el límite completo desde el principio y se va liberando conforme pagas."],
    },
    uso: {
      titulo: "Uso del crédito (utilización)",
      corto: "Qué porcentaje de tu límite estás usando.",
      texto: [
        "Se calcula dividiendo lo que debes entre tu límite. Por ejemplo, deber $3,000 de un límite de $10,000 es un 30% de uso.",
        "Mantenerlo por debajo del 30% ayuda a tu puntaje de crédito. Arriba del 50% los bancos lo ven como señal de riesgo.",
        "Truco: si abonas antes de la fecha de corte, el banco reporta un saldo menor.",
      ],
    },
    tasa: {
      titulo: "Tasa de interés anual",
      corto: "Lo que te cobran por año sobre lo que no pagas a tiempo.",
      texto: [
        "Es el porcentaje anual que el banco cobra sobre el saldo que \"arrastras\" de un mes a otro. Mensualmente es aproximadamente la tasa anual entre 12.",
        "Puede aparecer como \"tasa de interés ordinaria\", \"TAE\", \"APR\" o \"CAT\" (el CAT incluye además comisiones). Si solo encuentras el CAT, úsalo: dará una estimación algo más alta.",
      ],
      ejemplo: "48% anual ≈ 4% al mes. Si arrastras $10,000, pagarías unos $400 de intereses ese mes.",
      donde: "En tu estado de cuenta, normalmente en la primera página o en la sección de \"tasas\".",
    },
    msi: {
      titulo: "Compras a meses",
      corto: "Una compra dividida en mensualidades (con o sin intereses).",
      texto: [
        "Cuando compras \"a meses sin intereses\" (MSI) o \"en cuotas\", cada mes se suma solo una mensualidad a tu pago para no generar intereses.",
        "Ojo: si no pagas el total de tu corte, algunos bancos te cobran intereses también sobre esas compras. Y aunque pagues poco a poco, ocupan tu límite completo desde el principio.",
      ],
      ejemplo: "Un celular de $12,000 a 12 meses: cada corte se agregan $1,000 a tu pago para no generar intereses.",
    },
    mejorDia: {
      titulo: "Mejor día para comprar",
      corto: "El día después del corte: te da el mayor tiempo para pagar.",
      texto: [
        "Una compra hecha justo después del corte no se cobra hasta el siguiente corte, y luego tienes los días hasta la fecha límite. En total, casi 50 días sin intereses.",
        "Una compra hecha el mismo día del corte, en cambio, se paga en solo unos 20 días.",
      ],
      ejemplo: "Corte el 15 → mejor día el 16. Una compra del 16 de octubre se paga hasta principios de diciembre.",
    },
    estadoCuenta: {
      titulo: "Estado de cuenta",
      corto: "El resumen mensual que manda el banco después de cada corte.",
      texto: [
        "Trae todo lo que necesitas: fecha de corte, fecha límite, saldo al corte, pago para no generar intereses y pago mínimo.",
        "Al Día estima esos montos con lo que registras, pero copiarlos de tu estado de cuenta real (botón \"Capturar estado de cuenta\") los deja exactos y corrige intereses o comisiones que la app no podía conocer.",
      ],
    },
    avalancha: {
      titulo: "Método avalancha",
      corto: "Pagar primero la deuda con la tasa más alta.",
      texto: ["Pagas el mínimo en todas tus tarjetas y todo el dinero extra va a la de interés más alto. Cuando la liquidas, pasas a la siguiente. Es el método con el que menos intereses pagas."],
    },
    bola: {
      titulo: "Método bola de nieve",
      corto: "Pagar primero la deuda más pequeña.",
      texto: ["Pagas el mínimo en todas y el extra va a la de menor saldo. Pagas algo más de intereses que con la avalancha, pero liquidas tarjetas antes, y eso motiva a seguir."],
    },
    puntaje: {
      titulo: "Historial y puntaje de crédito",
      corto: "Tu \"reputación\" como persona que paga.",
      texto: [
        "Los bancos reportan cada mes si pagaste a tiempo y cuánto debes. Con eso se calcula tu puntaje (score), que decide si te prestan y a qué tasa.",
        "Lo que más lo mejora: pagar siempre a tiempo, usar poco de tu límite y no pedir muchos créditos a la vez.",
      ],
    },
    anualidad: {
      titulo: "Anualidad y comisiones",
      corto: "Cobros fijos por tener o usar la tarjeta.",
      texto: [
        "La anualidad es un cobro una vez al año por tener la tarjeta. Otras comisiones comunes: por pago tardío, por disponer efectivo en cajero, o por sobregiro.",
        "Muchos bancos te quitan la anualidad si la pides o si gastas cierto monto: vale la pena preguntar.",
      ],
    },
    efectivo: {
      titulo: "Disposición de efectivo",
      corto: "Sacar dinero del cajero con la tarjeta de crédito.",
      texto: ["Casi siempre es mala idea: cobra comisión inmediata y genera intereses desde el primer día, sin periodo de gracia. Úsalo solo en emergencias reales."],
    },
  };

  window.GLOSARIO = GLOSARIO;
})();
