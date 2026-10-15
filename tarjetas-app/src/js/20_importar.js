/* Importar el estado de cuenta desde un PDF, una foto o texto pegado.
 *
 * Todo ocurre en el teléfono, sin internet: pdf.js extrae el texto del PDF
 * y tesseract.js (con el idioma español empaquetado en el APK) lee las
 * fotos. Luego Lector.analizar busca los montos y fechas, y la persona
 * revisa el resultado antes de guardarlo.
 */
(function () {
  "use strict";

  const { icono, esc, $m, abrirHoja, salirHoja, aviso, campoDinero } = UI;
  const F = Fechas;
  const leer = (v) => Datos.leerMonto(v);
  const VENDOR = window.ALDIA_VENDOR || {};

  function disponible() {
    return { pdf: !!VENDOR.pdf, foto: !!VENDOR.ocr, texto: true };
  }

  function cargarScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => res();
      s.onerror = () => rej(new Error(`No se pudo cargar ${src}`));
      document.head.append(s);
    });
  }

  // ---------- PDF ----------
  let pdfjs = null;
  async function pdfLib() {
    if (!pdfjs) {
      pdfjs = await import(new URL("vendor/pdf/pdf.min.js", location.href).href);
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("vendor/pdf/pdf.worker.min.js", location.href).href;
    }
    return pdfjs;
  }

  async function textoDePdf(datos, password, progreso) {
    const lib = await pdfLib();
    const doc = await lib.getDocument({ data: datos, password, isEvalSupported: false }).promise;
    const lineas = [];
    const paginas = Math.min(doc.numPages, 6);
    for (let p = 1; p <= paginas; p++) {
      progreso(`Leyendo página ${p} de ${paginas}…`);
      const pag = await doc.getPage(p);
      const cont = await pag.getTextContent();
      // Reconstruye renglones agrupando por altura.
      const items = cont.items.filter((it) => it.str && it.str.trim())
        .map((it) => ({ s: it.str, x: it.transform[4], y: Math.round(it.transform[5]) }))
        .sort((a, b) => b.y - a.y || a.x - b.x);
      let actual = null;
      for (const it of items) {
        if (actual && Math.abs(actual.y - it.y) <= 3) actual.partes.push(it);
        else { actual = { y: it.y, partes: [it] }; lineas.push(actual); }
      }
    }
    const texto = lineas.map((l) => l.partes.sort((a, b) => a.x - b.x).map((x) => x.s).join(" ")).join("\n");
    return { texto, doc, paginas };
  }

  // PDF escaneado (sin texto): se renderizan las primeras páginas y se leen con OCR.
  async function ocrDePdf(doc, progreso) {
    const imgs = [];
    for (let p = 1; p <= Math.min(doc.numPages, 2); p++) {
      const pag = await doc.getPage(p);
      const vp = pag.getViewport({ scale: 2 });
      const c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height;
      await pag.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      imgs.push(c);
    }
    let texto = "";
    for (const [i, c] of imgs.entries()) texto += "\n" + (await ocr(c, (m) => progreso(`Página ${i + 1}: ${m}`)));
    return texto;
  }

  // ---------- OCR ----------
  let trabajador = null;
  async function ocr(imagen, progreso) {
    await cargarScript("vendor/ocr/tesseract.min.js");
    if (!trabajador) {
      progreso("Preparando el lector de texto…");
      trabajador = await window.Tesseract.createWorker("spa", 1, {
        workerPath: new URL("vendor/ocr/worker.min.js", location.href).href,
        corePath: new URL("vendor/ocr/core/", location.href).href,
        langPath: new URL("vendor/ocr/lang", location.href).href,
        workerBlobURL: false,
        cacheMethod: "none",
        logger: (m) => { if (m.status === "recognizing text") progreso(`Leyendo texto… ${Math.round((m.progress || 0) * 100)}%`); },
      });
    }
    const r = await trabajador.recognize(imagen);
    return r.data.text || "";
  }

  // Fotos grandes → máximo 2200 px de lado: más rápido y con la misma precisión.
  function prepararFoto(archivo) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(archivo);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 2200 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext("2d");
        ctx.filter = "grayscale(1) contrast(1.25)";
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("No pude abrir esa imagen")); };
      img.src = url;
    });
  }

  // ---------- Flujo ----------

  function abrir(tarjetaId, corte) {
    const d = disponible();
    const t = Datos.tarjeta(tarjetaId);
    abrirHoja(`
      <h2>Leer estado de cuenta</h2>
      <p class="lead">Busco automáticamente el pago mínimo, el pago para no generar intereses, el saldo y las fechas de ${esc(t.nombre)}. Revisarás todo antes de guardar. Nada sale de tu teléfono.</p>
      <div class="list" style="box-shadow:none;background:var(--surface-2)">
        ${d.pdf ? `<button class="item" data-o="pdf"><span class="ic info">${icono("recibo", 20)}</span><span class="grow"><div class="t1">Desde el PDF del banco</div><div class="t2">El estado de cuenta que te llega por correo o descargas de la app</div></span>${icono("derecha", 18)}</button>` : ""}
        ${d.foto ? `<button class="item" data-o="foto"><span class="ic info">${icono("foto", 20)}</span><span class="grow"><div class="t1">Desde una foto o captura</div><div class="t2">Toma una foto del estado de cuenta impreso o usa una captura de pantalla</div></span>${icono("derecha", 18)}</button>` : ""}
        <button class="item" data-o="texto"><span class="ic info">${icono("lapiz", 20)}</span><span class="grow"><div class="t1">Pegar texto</div><div class="t2">Copia el texto del correo o de la app del banco y pégalo</div></span>${icono("derecha", 18)}</button>
      </div>
      ${!d.pdf ? `<p class="small muted" style="margin-top:12px">Leer PDF y fotos está disponible en la app de Android.</p>` : ""}
      <input type="file" class="hide" id="impPdf" accept="application/pdf,.pdf">
      <input type="file" class="hide" id="impFoto" accept="image/*">`, {
      alMontar(el) {
        const pdf = el.querySelector("#impPdf"), foto = el.querySelector("#impFoto");
        el.querySelectorAll("[data-o]").forEach((b) => b.addEventListener("click", () => {
          const o = b.dataset.o;
          if (o === "pdf") pdf.click();
          else if (o === "foto") foto.click();
          else pegarTexto(tarjetaId, corte);
        }));
        pdf.addEventListener("change", () => pdf.files[0] && procesarPdf(tarjetaId, corte, pdf.files[0]));
        foto.addEventListener("change", () => foto.files[0] && procesarFoto(tarjetaId, corte, foto.files[0]));
      },
    });
  }

  function hojaProgreso() {
    abrirHoja(`<div class="center" style="padding:24px 0">
      <div class="empty" style="padding:8px 0"><div class="art">${icono("recibo", 44)}</div></div>
      <h2>Leyendo tu estado de cuenta…</h2><p class="lead" id="progreso">Un momento.</p></div>`);
    return (msg) => { const p = document.getElementById("progreso"); if (p) p.textContent = msg; };
  }

  async function procesarPdf(tarjetaId, corte, archivo, password) {
    const progreso = hojaProgreso();
    try {
      const datos = new Uint8Array(await archivo.arrayBuffer());
      let { texto, doc } = await textoDePdf(datos, password, progreso);
      if (texto.replace(/\s/g, "").length < 60 && VENDOR.ocr) {
        progreso("El PDF es una imagen; lo leo como foto…");
        texto = await ocrDePdf(doc, progreso);
      }
      resultados(tarjetaId, corte, texto);
    } catch (e) {
      if (e && e.name === "PasswordException") { pedirPassword(tarjetaId, corte, archivo, !!password); return; }
      console.warn(e);
      falla(tarjetaId, corte, "No pude leer ese PDF. Prueba con una foto o pegando el texto.");
    }
  }

  function pedirPassword(tarjetaId, corte, archivo, otraVez) {
    abrirHoja(`<form novalidate><h2>PDF protegido</h2>
      <p class="lead">${otraVez ? "Esa contraseña no funcionó. " : ""}Muchos bancos protegen el estado de cuenta con una contraseña (a menudo tu RFC, fecha de nacimiento o los últimos dígitos de la tarjeta). No se guarda.</p>
      <label class="field"><span class="lbl">Contraseña del PDF</span><input class="input" type="password" name="pw" autocomplete="off" autofocus></label>
      <div class="btn-row"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button class="btn" type="submit">Abrir</button></div></form>`, {
      alMontar(el) {
        el.querySelector("[data-cerrar]").addEventListener("click", salirHoja);
        el.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); procesarPdf(tarjetaId, corte, archivo, el.querySelector("[name=pw]").value); });
      },
    });
  }

  async function procesarFoto(tarjetaId, corte, archivo) {
    const progreso = hojaProgreso();
    try {
      const c = await prepararFoto(archivo);
      const texto = await ocr(c, progreso);
      resultados(tarjetaId, corte, texto);
    } catch (e) {
      console.warn(e);
      falla(tarjetaId, corte, "No pude leer esa imagen. Prueba con una foto más nítida y bien iluminada, o pega el texto.");
    }
  }

  function pegarTexto(tarjetaId, corte) {
    abrirHoja(`<form novalidate><h2>Pegar texto</h2>
      <p class="lead">Copia el resumen del estado de cuenta (del correo, del PDF o de la app del banco) y pégalo aquí.</p>
      <label class="field"><textarea class="input" name="txt" rows="8" placeholder="Fecha de corte: 15/10/2026&#10;Pago mínimo: $560.00&#10;…" autofocus></textarea></label>
      <div class="btn-row"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button class="btn" type="submit">Buscar datos</button></div></form>`, {
      alMontar(el) {
        el.querySelector("[data-cerrar]").addEventListener("click", salirHoja);
        el.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); resultados(tarjetaId, corte, el.querySelector("[name=txt]").value); });
      },
    });
  }

  function falla(tarjetaId, corte, msg) {
    abrirHoja(`<h2>No encontré los datos</h2><p class="lead">${esc(msg)}</p>
      <div class="btn-row"><button class="btn ghost" data-o="otra">Intentar de otra forma</button><button class="btn" data-o="mano">Escribirlos a mano</button></div>`, {
      alMontar(el) {
        el.querySelector('[data-o="otra"]').addEventListener("click", () => abrir(tarjetaId, corte));
        el.querySelector('[data-o="mano"]').addEventListener("click", () => Formularios.formEstado(tarjetaId, corte));
      },
    });
  }

  function resultados(tarjetaId, corteSugerido, texto) {
    const t = Datos.tarjeta(tarjetaId);
    const r = Lector.analizar(texto);
    const hallados = ["noInt", "minimo", "saldoCorte"].filter((k) => r[k]);
    if (!hallados.length && !r.fechaLimite) {
      falla(tarjetaId, corteSugerido, "El texto no tiene los montos que busco (pago mínimo, pago para no generar intereses o saldo al corte).");
      return;
    }
    // ¿A qué corte de la tarjeta corresponde?
    const hoy = App.hoy;
    let corte = corteSugerido || Calc.corteEnOAntes(t, hoy);
    if (r.fechaCorte) {
      const c = Calc.corteEnOAntes(t, F.sumarDias(r.fechaCorte.v, 3));
      if (Math.abs(F.diasEntre(c, r.fechaCorte.v)) <= 3 && c <= hoy) corte = c;
    }
    const cortes = [];
    let c = Calc.corteEnOAntes(t, hoy);
    for (let i = 0; i < 6; i++) { cortes.push(c); c = Calc.corteEnOAntes(t, F.sumarDias(c, -1)); }
    if (!cortes.includes(corte)) cortes.unshift(corte);
    const nuevaFecha = r.fechaLimite && r.fechaLimite.v !== Calc.fechaLimite(t, corte) ? r.fechaLimite.v : null;
    const fila = (k, etiqueta, ayudaK) => `<label class="field"><span class="lbl">${etiqueta} ${UI.ayuda(ayudaK)} ${r[k] ? `<span class="badge bien">encontrado</span>` : `<span class="badge">no encontrado</span>`}</span>
      ${campoDinero(k, r[k] ? r[k].v : null, { placeholder: "Escríbelo si lo tienes" })}
      ${r[k] ? `<div class="hint ellipsis">“${esc(r[k].linea.slice(0, 80))}”</div>` : ""}</label>`;
    abrirHoja(`<form novalidate>
      <h2>Revisa lo que encontré</h2>
      <p class="lead">Corrige lo que haga falta antes de guardar.</p>
      <label class="field"><span class="lbl">Corte ${r.fechaCorte ? `<span class="badge bien">${F.textoFecha(r.fechaCorte.v, { anio: true })}</span>` : ""}</span>
        <select class="input" name="corte">${cortes.map((x) => `<option value="${x}" ${x === corte ? "selected" : ""}>Corte del ${F.textoFecha(x, { anio: true })}</option>`).join("")}</select></label>
      ${fila("noInt", "Pago para no generar intereses", "noIntereses")}
      ${fila("minimo", "Pago mínimo", "minimo")}
      ${fila("saldoCorte", "Saldo al corte (deuda total)", "saldoCorte")}
      ${r.limite && Math.abs(r.limite.v - (t.limite || 0)) > 0.5 ? `<label class="row between field"><span class="grow small">Actualizar el límite de crédito a <b>${$m(r.limite.v)}</b> (ahora ${$m(t.limite || 0)})</span><span class="switch"><input type="checkbox" name="usarLimite" checked><span></span></span></label>` : ""}
      ${r.tasa && r.tasa.v !== t.tasaAnual ? `<label class="row between field"><span class="grow small">Usar <b>${r.tasa.v}%</b> como tasa anual${t.tasaAnual != null ? ` (ahora ${t.tasaAnual}%)` : ""}</span><span class="switch"><input type="checkbox" name="usarTasa" ${t.tasaAnual == null ? "checked" : ""}><span></span></span></label>` : ""}
      ${nuevaFecha ? `<div class="tip aviso" style="box-shadow:none;background:var(--warn-soft);margin-bottom:14px"><span class="ticon">${icono("calendario", 20)}</span><span class="grow"><div class="ttl">Fecha límite distinta</div><div class="txt">El estado de cuenta dice <b>${F.textoFecha(nuevaFecha, { anio: true })}</b> y yo calculaba el ${F.textoFecha(Calc.fechaLimite(t, corte), { anio: true })}. Revisa el día de pago en Editar tarjeta.</div></span></div>` : ""}
      <details class="acc" style="box-shadow:none;background:var(--surface-2);margin-bottom:14px"><summary>Ver el texto leído <span class="chev">${icono("abajo", 18)}</span></summary>
        <div class="body"><pre style="white-space:pre-wrap;font-size:12px;max-height:240px;overflow:auto;margin:0">${esc(texto.slice(0, 5000))}</pre></div></details>
      <div class="btn-row"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button class="btn" type="submit">Guardar</button></div>
    </form>`, {
      alMontar(el) {
        const f = el.querySelector("form");
        el.querySelector("[data-cerrar]").addEventListener("click", salirHoja);
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const d = { saldoCorte: leer(f.elements.saldoCorte.value), pagoNoIntereses: leer(f.elements.noInt.value), pagoMinimo: leer(f.elements.minimo.value) };
          if (d.pagoMinimo !== null && d.pagoNoIntereses !== null && d.pagoMinimo > d.pagoNoIntereses + 0.01) { aviso("El pago mínimo no puede ser mayor que el pago para no generar intereses"); return; }
          const corteSel = f.elements.corte.value;
          const previo = t.estados[corteSel] || {};
          Datos.guardarEstado(t.id, corteSel, { ...previo, ...d });
          const cambios = {};
          if (f.elements.usarLimite && f.elements.usarLimite.checked) cambios.limite = r.limite.v;
          if (f.elements.usarTasa && f.elements.usarTasa.checked) cambios.tasaAnual = r.tasa.v;
          if (Object.keys(cambios).length) Datos.editarTarjeta(t.id, cambios);
          salirHoja();
          aviso("Estado de cuenta guardado ✓");
        });
      },
    });
  }

  window.Importar = { abrir, disponible, resultados };
})();
