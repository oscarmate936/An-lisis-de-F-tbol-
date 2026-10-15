"""Genera los archivos de prueba del lector de estados de cuenta:
estado.pdf (PDF con texto) y estado.png (imagen para OCR).

Ejecutar con: python3 tests/fixtures/generar.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).parent

LINEAS = [
    "BANCO DE PRUEBA - Estado de cuenta",
    "Fecha de corte: 03/10/2026",
    "Fecha limite de pago: 23/10/2026",
    "Pago para no generar intereses: $5,120.40",
    "Pago minimo: $410.00",
    "Saldo al corte: $14,900.00",
    "Limite de credito: $35,000.00",
    "Tasa de interes anual: 42.5%",
]


def pdf() -> bytes:
    """PDF mínimo escrito a mano (una página, Helvetica)."""
    contenido = "BT /F1 12 Tf 50 750 Td 16 TL\n" + "".join(
        f"({l.replace('(', '').replace(')', '')}) Tj T*\n" for l in LINEAS) + "ET"
    objetos = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(contenido)} >>\nstream\n{contenido}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ]
    salida = "%PDF-1.4\n"
    offsets = []
    for i, o in enumerate(objetos, 1):
        offsets.append(len(salida.encode("latin-1")))
        salida += f"{i} 0 obj\n{o}\nendobj\n"
    xref = len(salida.encode("latin-1"))
    salida += f"xref\n0 {len(objetos) + 1}\n0000000000 65535 f \n"
    salida += "".join(f"{o:010d} 00000 n \n" for o in offsets)
    salida += f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return salida.encode("latin-1")


def png() -> Image.Image:
    fuente = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    im = Image.new("RGB", (1100, 60 + 48 * len(LINEAS)), "white")
    d = ImageDraw.Draw(im)
    textos = [l.replace("limite", "límite").replace("minimo", "mínimo").replace("credito", "crédito").replace("interes", "interés") for l in LINEAS]
    for i, l in enumerate(textos):
        d.text((40, 30 + i * 48), l, fill="black", font=fuente)
    return im


if __name__ == "__main__":
    (AQUI / "estado.pdf").write_bytes(pdf())
    png().save(AQUI / "estado.png")
    print("estado.pdf y estado.png generados")
