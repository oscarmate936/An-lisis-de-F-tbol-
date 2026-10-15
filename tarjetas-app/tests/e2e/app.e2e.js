// Pruebas de pantallas de punta a punta: abre la app ya ensamblada (www/,
// `python3 build_www.py`) en Chromium y la recorre como una persona.
//   npm run test:e2e
// Falla si la app lanza cualquier error de JavaScript.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

function cargarPlaywright() {
  try { return require("playwright"); } catch (e) {
    const global = require("child_process").execSync("npm root -g").toString().trim();
    return require(path.join(global, "playwright"));
  }
}
const { chromium } = cargarPlaywright();

const WWW = path.join(__dirname, "..", "..", "www");
const FIX = path.join(__dirname, "..", "fixtures");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".gz": "application/gzip", ".wasm": "application/wasm" };

let servidor, base, navegador;

test.before(async () => {
  assert.ok(fs.existsSync(path.join(WWW, "index.html")), "Falta www/index.html: ejecuta `python3 build_www.py` antes");
  servidor = http.createServer((req, res) => {
    const ruta = path.join(WWW, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!ruta.startsWith(WWW) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(ruta)] || "application/octet-stream" });
    fs.createReadStream(ruta).pipe(res);
  });
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${servidor.address().port}/index.html`;
  navegador = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function nuevaPagina() {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  const p = await ctx.newPage();
  p.errores = [];
  p.on("pageerror", (e) => p.errores.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errores.push(m.text()); });
  await p.goto(base);
  return p;
}

const marcar = (p, selector, valor = true) => p.evaluate(([s, v]) => {
  const c = document.querySelector(s);
  c.checked = v;
  c.dispatchEvent(new Event("change", { bubbles: true }));
}, [selector, valor]);

test("primera vez: agregar tarjeta, compra y pago", async () => {
  const p = await nuevaPagina();
  await p.click('[data-modo="nueva"]');
  await p.fill('#fTar [name=nombre]', "Mi Visa");
  await p.fill('#fTar [name=limite]', "20000");
  await p.selectOption('#fTar [name=diaCorte]', "10");
  await p.selectOption('#fTar [name=diaPago]', "30");
  await p.fill('#fTar [name=saldoInicial]', "3000");
  await p.fill('#fTar [name=tasaAnual]', "45");
  await p.click('#fTar button[type=submit]');
  await p.waitForSelector('.topbar h1:has-text("Mi Visa")');
  // Rechaza el permiso de avisos (navegador sin notificaciones)
  if (await p.$(".sheet")) await p.keyboard.press("Escape");
  await p.click('[data-act="nuevaCompra"] >> nth=0');
  await p.fill('#fMov [name=monto]', "1500");
  await p.click('#fMov button[type=submit]');
  await p.waitForTimeout(150);
  assert.match(await p.textContent(".cc .balv"), /4,500/);
  await p.click('[data-act="nuevoPago"] >> nth=0');
  await p.fill('#fMov [name=monto]', "4500");
  await p.click('#fMov button[type=submit]');
  await p.waitForTimeout(150);
  assert.match(await p.textContent(".cc .balv"), /0\.00/);
  assert.deepEqual(p.errores, []);
});

test("datos de ejemplo: todas las pestañas y secciones nuevas", async () => {
  const p = await nuevaPagina();
  await p.click('[data-modo="ejemplo"]');
  await p.waitForSelector(".hero");
  await p.click('[data-act="mejorTarjeta"]');
  await p.waitForSelector('.sheet:has-text("¿Con qué tarjeta compro hoy?")');
  await p.fill('.sheet [name=montoCompra]', "5000");
  assert.ok((await p.$$(".sheet #ranking .item")).length === 3);
  await p.keyboard.press("Escape");
  for (const tab of ["tarjetas", "calendario", "planear", "aprende", "inicio"]) {
    await p.click(`.tabbar [data-tab="${tab}"]`);
  }
  await p.click('.tabbar [data-tab="planear"]');
  for (const m of ["plan", "pres", "hist", "sim"]) await p.click(`[data-act="planModo"][data-v="${m}"]`);
  await p.click('[data-act="planModo"][data-v="hist"]');
  assert.ok((await p.$$(".chart.hist")).length === 2);
  // Búsqueda
  await p.click('.tabbar [data-tab="inicio"]');
  await p.click('[data-act="buscar"]');
  await p.fill("#q", "super");
  await p.waitForTimeout(100);
  assert.ok((await p.$$("#res .item")).length >= 1);
  assert.deepEqual(p.errores, []);
});

test("presupuesto avisa al pasar el 80%", async () => {
  const p = await nuevaPagina();
  await p.click('[data-modo="ejemplo"]');
  await p.click('.tabbar [data-tab="planear"]');
  await p.click('[data-act="planModo"][data-v="pres"]');
  await p.click('[data-act="editarPresupuesto"]');
  await p.fill(".sheet [name=total]", "6000");
  await p.click(".sheet button[type=submit]");
  await p.click('.tabbar [data-tab="inicio"]');
  await p.click('[data-act="nuevaCompra"] >> nth=0');
  await p.fill('#fMov [name=monto]', "800");
  await p.click('#fMov button[type=submit]');
  await p.waitForSelector('.toast:has-text("presupuesto")');
  assert.deepEqual(p.errores, []);
});

test("tarjeta: domiciliación, anualidad, recurrente, meta y compra en dólares", async () => {
  const p = await nuevaPagina();
  await p.click('[data-modo="ejemplo"]');
  await p.click('.tabbar [data-tab="tarjetas"]');
  await p.click('.cc[data-act="verTarjeta"] >> nth=0');
  await p.click('[data-act="menuTarjeta"]');
  await p.click('[data-o="editar"]');
  await marcar(p, "#fTar [name=domActiva]");
  await p.selectOption("#fTar [name=anMes]", "3");
  await p.click("#fTar button[type=submit]");
  await p.waitForSelector('.badge:has-text("Pago domiciliado")');
  await p.click('[data-act="recurrente"] >> nth=0');
  await p.fill(".sheet [name=desc]", "Gimnasio");
  await p.fill(".sheet [name=monto]", "499");
  await p.click(".sheet button[type=submit]");
  await p.waitForSelector('.item:has-text("Gimnasio")');
  await p.click('[data-act="meta"] >> nth=0');
  await p.click(".sheet button[type=submit]");
  await p.waitForSelector('.section-title:has-text("Meta")');
  await p.click('[data-act="nuevaCompra"] >> nth=0');
  await p.click('#fMov [data-seg="monedaOrig"] [data-v="USD"]');
  await p.fill("#fMov [name=montoOrig]", "50");
  await p.fill("#fMov [name=tc]", "18.5");
  assert.equal(await p.inputValue("#fMov [name=monto]"), "925.00");
  await p.click("#fMov button[type=submit]");
  await p.waitForSelector('.item:has-text("USD 50")');
  assert.deepEqual(p.errores, []);
});

async function abrirLector(p) {
  await p.click('[data-modo="ejemplo"]');
  await p.click('.tabbar [data-tab="tarjetas"]');
  await p.click('.cc[data-act="verTarjeta"] >> nth=0');
  await p.click('[data-act="estadoCuenta"] >> nth=0');
  await p.click('[data-act="importarEstado"]');
}

test("leer estado de cuenta desde texto pegado", async () => {
  const p = await nuevaPagina();
  await abrirLector(p);
  await p.click('[data-o="texto"]');
  await p.fill(".sheet [name=txt]", "Pago para no generar intereses: $5,120.40\nPago mínimo: $410.00\nSaldo al corte: $14,900.00");
  await p.click(".sheet button[type=submit]");
  await p.waitForSelector('.sheet:has-text("Revisa lo que encontré")');
  assert.equal(await p.inputValue(".sheet [name=noInt]"), "5120.40");
  assert.equal(await p.inputValue(".sheet [name=minimo]"), "410.00");
  await p.click(".sheet button[type=submit]");
  await p.waitForSelector('.toast:has-text("Estado de cuenta guardado")');
  assert.deepEqual(p.errores, []);
});

test("leer estado de cuenta desde un PDF", async () => {
  const p = await nuevaPagina();
  await abrirLector(p);
  await p.setInputFiles("#impPdf", path.join(FIX, "estado.pdf"));
  await p.waitForSelector('.sheet:has-text("Revisa lo que encontré")', { timeout: 30000 });
  assert.equal(await p.inputValue(".sheet [name=noInt]"), "5120.40");
  assert.equal(await p.inputValue(".sheet [name=minimo]"), "410.00");
  assert.equal(await p.inputValue(".sheet [name=saldoCorte]"), "14900.00");
  assert.deepEqual(p.errores, []);
});

test("leer estado de cuenta desde una foto (OCR)", { timeout: 180000 }, async () => {
  const p = await nuevaPagina();
  await abrirLector(p);
  await p.setInputFiles("#impFoto", path.join(FIX, "estado.png"));
  await p.waitForSelector('.sheet:has-text("Revisa lo que encontré")', { timeout: 150000 });
  assert.equal(await p.inputValue(".sheet [name=minimo]"), "410.00");
  assert.equal(await p.inputValue(".sheet [name=noInt]"), "5120.40");
  assert.deepEqual(p.errores, []);
});

test("bloqueo con PIN", async () => {
  const p = await nuevaPagina();
  await p.click('[data-modo="ejemplo"]');
  await p.click('[data-act="abrir"][data-v="ajustes"]');
  await p.evaluate(() => { const c = document.querySelector('[data-aj="pin"]'); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); });
  for (const k of "1234") await p.click(`.sheet .teclado [data-k="${k}"]`);
  for (const k of "1234") await p.click(`.sheet .teclado [data-k="${k}"]`);
  await p.waitForSelector('.toast:has-text("Bloqueo activado")');
  await p.reload();
  await p.waitForSelector(".bloqueo");
  for (const k of "9999") await p.click(`.bloqueo [data-k="${k}"]`);
  await p.waitForTimeout(500);
  assert.ok(await p.$(".bloqueo"), "un PIN incorrecto no debe desbloquear");
  for (const k of "1234") await p.click(`.bloqueo [data-k="${k}"]`);
  await p.waitForSelector(".bloqueo", { state: "detached" });
  assert.deepEqual(p.errores, []);
});

test("autoprueba de la app (la misma que corre en el emulador)", async () => {
  const p = await nuevaPagina();
  const r = await p.evaluate(() => window.AldiaAutoprueba());
  assert.equal(r.plugins.calculos, true);
  assert.equal(r.plugins.pantallas, true, JSON.stringify(r.errores));
  // No toca los datos de la persona: sigue en la bienvenida.
  assert.ok(await p.$('[data-modo="ejemplo"]'));
  assert.deepEqual(p.errores, []);
});
