"""Genera el icono de marca de Acierto: static/icon-512.png,
icon-192.png e icon-maskable-512.png.

El símbolo es una diana — violeta por fuera, hueco del color de fondo,
oro en el centro — porque "acierto" es justo eso: dar en el blanco. Se
mantienen las mismas proporciones y colores de marca que ya usaba el
icono anterior (fondo #0F1116, violeta #8E7CFF, oro #F0B23F) para que
android-app/gen_icons.py (que separa fondo y primer plano por color)
lo siga aceptando sin tocarlo.

Ejecutar con: python3 static/gen_icon.py
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

STATIC_DIR = Path(__file__).parent

FONDO = (15, 17, 22, 255)       # #0F1116 — el mismo --pitch oscuro de toda la app
VIOLETA = (142, 124, 255, 255)  # #8E7CFF — --mark
ORO = (240, 178, 63, 255)       # #F0B23F — --sodium

S = 512          # lienzo a máxima resolución; el resto se reescala desde aquí
SS = 4            # supersample: se dibuja a S*SS y se reduce, para bordes limpios
CENTRO = (S * SS) // 2


def _diana(radio_max: int) -> Image.Image:
    """Dibuja la diana (violeta / hueco / oro) centrada, con el anillo
    exterior ocupando radio_max. Devuelve una imagen S*SS al cuadrado."""
    L = S * SS
    im = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = radio_max * SS
    c = CENTRO

    def circulo(radio, color):
        d.ellipse((c - radio, c - radio, c + radio, c + radio), fill=color)

    circulo(r, VIOLETA)                       # anillo exterior
    circulo(int(r * 0.715), FONDO)            # hueco (se funde con el fondo)
    circulo(int(r * 0.445), ORO)              # centro: el acierto
    return im


def _fondo_redondeado(color) -> Image.Image:
    """Cuadrado redondeado a sangre completa, el mismo tratamiento que ya
    tenía el icono anterior (radio grande, casi un squircle)."""
    L = S * SS
    im = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle((0, 0, L - 1, L - 1), radius=int(L * 0.225), fill=color)
    return im


def icono_normal() -> Image.Image:
    base = _fondo_redondeado(FONDO)
    glifo = _diana(radio_max=123)
    base.alpha_composite(glifo)
    return base.resize((S, S), Image.LANCZOS)


def icono_maskable() -> Image.Image:
    """A sangre completa de verdad (sin redondeo propio: lo aplica el
    sistema), y el símbolo encogido a la zona segura (~66% del lienzo)
    para que ningún launcher se lo coma al recortarlo a círculo."""
    L = S * SS
    base = Image.new("RGBA", (L, L), FONDO)
    glifo = _diana(radio_max=100)
    base.alpha_composite(glifo)
    return base.resize((S, S), Image.LANCZOS)


def main() -> None:
    icono_normal().save(STATIC_DIR / "icon-512.png")
    icono_normal().resize((192, 192), Image.LANCZOS).save(STATIC_DIR / "icon-192.png")
    icono_maskable().save(STATIC_DIR / "icon-maskable-512.png")
    print("Iconos generados en", STATIC_DIR)


if __name__ == "__main__":
    main()
