"""Genera el icono de Al Día y todos sus derivados.

- assets/icon-512.png, icon-192.png: para la versión web.
- Android: iconos adaptativos (fondo azul + símbolo), heredados y
  redondos; el icono pequeño de notificación (silueta blanca, como exige
  Android) y la pantalla de arranque.

El símbolo es una tarjeta con una marca de "listo": tarjetas al día.

Ejecutar con: python3 gen_icons.py
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

RAIZ = Path(__file__).parent
RES = RAIZ / "android" / "app" / "src" / "main" / "res"
ASSETS = RAIZ / "assets"

AZUL_OSCURO = (30, 58, 138)
AZUL = (59, 130, 246)
FONDO_ARRANQUE = (11, 16, 32)
VERDE = (16, 185, 129)
BLANCO = (255, 255, 255, 255)

SS = 4  # supersample para bordes suaves


def degradado(tam: int) -> Image.Image:
    im = Image.new("RGBA", (tam, tam))
    px = im.load()
    for y in range(tam):
        for x in range(tam):
            t = (x + y) / (2 * (tam - 1))
            px[x, y] = tuple(int(AZUL_OSCURO[i] + (AZUL[i] - AZUL_OSCURO[i]) * t) for i in range(3)) + (255,)
    return im


def simbolo(tam: int, escala: float, silueta: bool = False) -> Image.Image:
    """Tarjeta + círculo con palomita, centrado, ocupando `escala` del lienzo."""
    L = tam * SS
    im = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ancho = L * escala
    alto = ancho * 0.66
    x0 = (L - ancho) / 2 - ancho * 0.05
    y0 = (L - alto) / 2 - alto * 0.08
    r = ancho * 0.11
    grosor = max(1, int(ancho * 0.075))
    # Contorno de la tarjeta
    d.rounded_rectangle((x0, y0, x0 + ancho, y0 + alto), radius=r, outline=BLANCO, width=grosor)
    # Banda magnética y línea de texto
    d.rectangle((x0 + grosor / 2, y0 + alto * 0.26, x0 + ancho - grosor / 2, y0 + alto * 0.26 + grosor * 1.1), fill=BLANCO)
    d.rounded_rectangle((x0 + ancho * 0.13, y0 + alto * 0.66, x0 + ancho * 0.40, y0 + alto * 0.66 + grosor), radius=grosor / 2, fill=BLANCO)
    # Círculo con palomita en la esquina inferior derecha
    cr = ancho * 0.27
    cx, cy = x0 + ancho * 0.98, y0 + alto * 0.95
    if silueta:
        # En la silueta el círculo "recorta" la tarjeta para que se lea.
        d.ellipse((cx - cr - grosor, cy - cr - grosor, cx + cr + grosor, cy + cr + grosor), fill=(0, 0, 0, 0))
        d.ellipse((cx - cr, cy - cr, cx + cr, cy + cr), fill=BLANCO)
        color_palomita = (0, 0, 0, 0)
    else:
        d.ellipse((cx - cr - grosor * 0.8, cy - cr - grosor * 0.8, cx + cr + grosor * 0.8, cy + cr + grosor * 0.8), fill=(0, 0, 0, 0))
        d.ellipse((cx - cr, cy - cr, cx + cr, cy + cr), fill=VERDE + (255,))
        color_palomita = BLANCO
    p = [(cx - cr * 0.45, cy + cr * 0.02), (cx - cr * 0.1, cy + cr * 0.36), (cx + cr * 0.5, cy - cr * 0.32)]
    d.line(p, fill=color_palomita, width=int(cr * 0.24), joint="curve")
    return im.resize((tam, tam), Image.LANCZOS)


def icono_completo(tam: int, redondo: bool = False) -> Image.Image:
    base = degradado(tam)
    sim = simbolo(tam, 0.58)
    base.alpha_composite(sim)
    L = tam * SS
    mascara = Image.new("L", (L, L), 0)
    md = ImageDraw.Draw(mascara)
    if redondo:
        md.ellipse((0, 0, L, L), fill=255)
    else:
        md.rounded_rectangle((0, 0, L, L), radius=L * 0.22, fill=255)
    base.putalpha(mascara.resize((tam, tam), Image.LANCZOS))
    return base


def guardar(im: Image.Image, ruta: Path) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    im.save(ruta)


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    guardar(icono_completo(512), ASSETS / "icon-512.png")
    guardar(icono_completo(192), ASSETS / "icon-192.png")

    densidades = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for d, f in densidades.items():
        leg = int(48 * f)
        guardar(icono_completo(leg), RES / f"mipmap-{d}" / "ic_launcher.png")
        guardar(icono_completo(leg, redondo=True), RES / f"mipmap-{d}" / "ic_launcher_round.png")
        # Capa frontal del icono adaptativo: 108dp con el símbolo dentro de
        # la zona segura central (66dp).
        fg = int(108 * f)
        guardar(simbolo(fg, 0.47), RES / f"mipmap-{d}" / "ic_launcher_foreground.png")
        # Icono de notificación: silueta blanca sobre transparente.
        n = int(24 * f)
        guardar(simbolo(n, 0.62, silueta=True), RES / f"drawable-{d}" / "ic_stat_aldia.png")

    (RES / "values" / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2563EB</color>\n</resources>\n',
        encoding="utf-8")

    # Pantallas de arranque: fondo de la app + icono centrado.
    def arranque(w: int, h: int) -> Image.Image:
        im = Image.new("RGBA", (w, h), FONDO_ARRANQUE + (255,))
        lado = int(min(w, h) * 0.28)
        ic = icono_completo(lado)
        im.alpha_composite(ic, ((w - lado) // 2, (h - lado) // 2))
        return im.convert("RGB")

    for ruta in RES.glob("drawable*/splash.png"):
        w, h = Image.open(ruta).size
        arranque(w, h).save(ruta)
    print("Iconos y pantallas de arranque generados")


if __name__ == "__main__":
    main()
