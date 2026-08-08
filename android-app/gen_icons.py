"""Genera los iconos nativos de Android (adaptativos + heredados) a
partir de la misma marca que ya se usaba en la PWA de Streamlit
(static/icon-512.png), para que la app instalada se vea exactamente
igual en el launcher que el icono que ya se diseñó.

El icono adaptativo separa dos capas: el fondo (el mismo violeta
oscuro de la marca, #0F1116) y el primer plano (solo el cuadrado
partido violeta/oro, con todo lo demás transparente) — así cualquier
launcher lo recorta con su propia forma (círculo, squircle...) sin
cortar el símbolo.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ANDROID_DIR = Path(__file__).parent
REPO_DIR = ANDROID_DIR.parent
SRC = REPO_DIR / "static" / "icon-512.png"
RES = ANDROID_DIR / "android" / "app" / "src" / "main" / "res"

FONDO = (15, 17, 22, 255)  # #0F1116, el --pitch oscuro de la marca

# Tamaños estándar de Android para cada densidad.
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
SPLASH = {"mdpi": 200, "hdpi": 300, "xhdpi": 400, "xxhdpi": 600, "xxxhdpi": 800}


def solo_glifo(im: Image.Image) -> Image.Image:
    """Quita el cuadrado de fondo oscuro y deja solo el símbolo
    violeta/oro sobre transparente, para usarlo como capa de primer
    plano de un icono adaptativo."""
    px = im.load()
    w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    outpx = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            if abs(r - FONDO[0]) < 14 and abs(g - FONDO[1]) < 14 and abs(b - FONDO[2]) < 14:
                continue
            outpx[x, y] = (r, g, b, a)
    return out


def circulo(im: Image.Image) -> Image.Image:
    """Recorta a un círculo, para el ic_launcher_round heredado."""
    from PIL import ImageDraw
    w, h = im.size
    mascara = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mascara).ellipse((0, 0, w, h), fill=255)
    out = im.copy()
    out.putalpha(mascara)
    return out


def main() -> None:
    base = Image.open(SRC).convert("RGBA")
    glifo = solo_glifo(base)

    for densidad, px_size in FOREGROUND.items():
        carpeta = RES / f"mipmap-{densidad}"
        carpeta.mkdir(parents=True, exist_ok=True)
        glifo.resize((px_size, px_size), Image.LANCZOS).save(carpeta / "ic_launcher_foreground.png")

    for densidad, px_size in LEGACY.items():
        carpeta = RES / f"mipmap-{densidad}"
        carpeta.mkdir(parents=True, exist_ok=True)
        cuadrado = base.resize((px_size, px_size), Image.LANCZOS)
        cuadrado.save(carpeta / "ic_launcher.png")
        circulo(cuadrado).save(carpeta / "ic_launcher_round.png")

    # Color de fondo del icono adaptativo: el mismo violeta oscuro de
    # toda la app, no el teal por defecto de Capacitor.
    valores = RES / "values" / "ic_launcher_background.xml"
    valores.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        '    <color name="ic_launcher_background">#0F1116</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )

    # Pantalla de arranque: el mismo símbolo centrado sobre el fondo
    # oscuro de la marca, para que no haya un parpadeo blanco entre
    # tocar el icono y que la interfaz termine de cargar.
    for densidad, px_size in SPLASH.items():
        carpeta = RES / f"drawable-{densidad}"
        carpeta.mkdir(parents=True, exist_ok=True)
        glifo.resize((px_size, px_size), Image.LANCZOS).save(carpeta / "splash_icon.png")

    drawable = RES / "drawable"
    drawable.mkdir(parents=True, exist_ok=True)
    (drawable / "splash.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <item android:drawable="@color/splash_background" />\n'
        "    <item>\n"
        '        <bitmap android:gravity="center" android:src="@drawable/splash_icon" />\n'
        "    </item>\n"
        "</layer-list>\n",
        encoding="utf-8",
    )

    print("Iconos generados en", RES)


if __name__ == "__main__":
    main()
