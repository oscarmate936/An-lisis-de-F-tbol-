/* Bloqueo con PIN y huella.
 *
 * El PIN nunca se guarda tal cual: se guarda su huella SHA-256 con una sal
 * aleatoria. Es una protección contra miradas (alguien que toma el
 * teléfono desbloqueado), no un cifrado de los datos.
 */
(function () {
  "use strict";

  const { icono, esc, aviso, confirmar, abrirHoja, salirHoja } = UI;
  const { Plat } = Datos;

  // SHA-256 en JavaScript puro: crypto.subtle no existe fuera de contextos
  // seguros (p. ej. al abrir el HTML como archivo).
  function sha256(texto) {
    const bytes = new TextEncoder().encode(texto);
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const l = bytes.length;
    const total = ((l + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(total);
    m.set(bytes);
    m[l] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 4, l * 8);
    dv.setUint32(total - 8, Math.floor((l * 8) / 0x100000000));
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < total; i += 64) {
      for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4);
      for (let j = 16; j < 64; j++) {
        const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let j = 0; j < 64; j++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[j] + w[j]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map((x) => x.toString(16).padStart(8, "0")).join("");
  }

  const seg = () => Datos.ajustes.seguridad;
  const huella = (pin, sal) => sha256(`${sal}:${pin}:aldia`);
  const configurado = () => !!seg().pin;
  let visible = false;
  let enSegundoPlano = null;

  async function biometriaDisponible() {
    if (!(Plat.nativo && Plat.Bio)) return false;
    try { return !!(await Plat.Bio.checkBiometry()).isAvailable; } catch (e) { return false; }
  }

  async function pedirBiometria(razon = "Desbloquea Al Día") {
    try {
      await Plat.Bio.authenticate({ reason: razon, cancelTitle: "Usar PIN", androidTitle: "Al Día", androidSubtitle: razon, allowDeviceCredential: false });
      return true;
    } catch (e) { return false; }
  }

  // Teclado numérico reutilizable. `alCompletar(pin)` devuelve true si el
  // PIN es correcto (cierra) o false (sacude y limpia).
  function teclado(raiz, largo, alCompletar) {
    let pin = "";
    const puntos = raiz.querySelector(".puntos");
    const pintar = () => { puntos.innerHTML = Array.from({ length: largo }, (_, i) => `<i class="${i < pin.length ? "on" : ""}"></i>`).join(""); };
    pintar();
    raiz.querySelector(".teclado").addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-k]");
      if (!b) return;
      UI.vibrar(5);
      if (b.dataset.k === "x") pin = pin.slice(0, -1);
      else if (pin.length < largo) pin += b.dataset.k;
      pintar();
      if (pin.length === largo) {
        const ok = await alCompletar(pin);
        if (!ok) {
          puntos.classList.add("error");
          UI.vibrar(60);
          setTimeout(() => { puntos.classList.remove("error"); pin = ""; pintar(); }, 350);
        }
      }
    });
  }

  const tecladoHtml = (extra = "") => `
    <div class="puntos" aria-live="polite"></div>
    <div class="teclado">${["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => `<button data-k="${k}" aria-label="${k}">${k}</button>`).join("")}
      ${extra || `<button class="vacio" disabled></button>`}<button data-k="0" aria-label="0">0</button><button data-k="x" class="vacio" aria-label="Borrar">⌫</button></div>`;

  async function mostrar() {
    if (!configurado() || visible) return;
    visible = true;
    const conHuella = seg().biometria && (await biometriaDisponible());
    const el = document.createElement("div");
    el.className = "bloqueo";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Al Día está bloqueada");
    el.innerHTML = `
      <div class="logo">${icono("candado", 30)}</div>
      <div class="center"><b style="font-size:19px">Al Día está bloqueada</b><div class="small muted">Escribe tu PIN${conHuella ? " o usa tu huella" : ""}</div></div>
      ${tecladoHtml(conHuella ? `<button data-huella aria-label="Usar huella" style="font-size:0;display:grid;place-items:center">${icono("huella", 26)}</button>` : "")}
      <button class="link small" data-olvide>Olvidé mi PIN</button>`;
    document.body.append(el);
    const cerrar = () => { el.remove(); visible = false; };
    teclado(el, 4, async (pin) => {
      if (huella(pin, seg().sal) === seg().pin) { cerrar(); return true; }
      return false;
    });
    const b = el.querySelector("[data-huella]");
    const probarHuella = async () => { if (await pedirBiometria()) cerrar(); };
    if (b) { b.addEventListener("click", probarHuella); setTimeout(probarHuella, 300); }
    el.querySelector("[data-olvide]").addEventListener("click", async () => {
      el.style.visibility = "hidden";
      const ok = await confirmar({
        titulo: "¿Olvidaste tu PIN?",
        texto: "Por seguridad no se puede recuperar. La única opción es borrar los datos de Al Día en este teléfono y empezar de nuevo (después puedes restaurar un respaldo que hayas guardado).",
        ok: "Borrar datos", peligro: true,
      });
      el.style.visibility = "";
      if (ok) { Datos.borrarTodo(); cerrar(); aviso("Datos borrados"); App.ir("inicio"); }
    });
  }

  // ---------- Configuración (desde Ajustes) ----------

  function pedirPin(titulo, texto) {
    return new Promise((res) => {
      let listo = false;
      abrirHoja(`<div class="center"><h2>${esc(titulo)}</h2><p class="lead">${esc(texto)}</p></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding-bottom:8px">${tecladoHtml()}</div>`, {
        alMontar(el) {
          teclado(el, 4, (pin) => { listo = true; salirHoja(); res(pin); return true; });
        },
        alCerrar: () => { if (!listo) res(null); },
      });
    });
  }

  async function crearPin() {
    const a = await pedirPin("Crea un PIN", "4 números que te pediré al abrir la app.");
    if (!a) return false;
    const b = await pedirPin("Confirma tu PIN", "Escríbelo otra vez.");
    if (!b) return false;
    if (a !== b) { aviso("Los PIN no coinciden. Inténtalo de nuevo."); return false; }
    const sal = Datos.uid();
    Object.assign(seg(), { pin: huella(a, sal), sal });
    if (await biometriaDisponible()) seg().biometria = true;
    Datos.guardar();
    aviso("Bloqueo activado ✓");
    return true;
  }

  async function verificarActual() {
    const p = await pedirPin("Escribe tu PIN actual", "Para confirmar que eres tú.");
    if (!p) return false;
    if (huella(p, seg().sal) !== seg().pin) { aviso("PIN incorrecto"); return false; }
    return true;
  }

  async function quitarPin() {
    if (!(await verificarActual())) return;
    Object.assign(seg(), { pin: null, sal: null, biometria: false });
    Datos.guardar();
    aviso("Bloqueo desactivado");
  }

  async function cambiarPin() {
    if (!(await verificarActual())) return;
    await crearPin();
  }

  // Al ir a segundo plano se anota la hora; al volver, si pasó más de
  // medio minuto, se bloquea.
  function alCambiarEstado(activa) {
    if (!configurado() || !seg().bloquearAlSalir) return;
    if (!activa) { enSegundoPlano = Date.now(); return; }
    if (enSegundoPlano && Date.now() - enSegundoPlano > 30000) mostrar();
    enSegundoPlano = null;
  }

  window.Bloqueo = { mostrar, configurado, crearPin, quitarPin, cambiarPin, biometriaDisponible, pedirBiometria, alCambiarEstado, sha256 };
})();
