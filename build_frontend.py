"""Ensambla la interfaz de Pizarra a partir de sus módulos en frontend/.

La interfaz es una SPA de React que corre entera en el navegador (habla
directo con API-Football, no necesita backend). Streamlit solo la aloja.
Este módulo concatena la cabecera HTML, cada pieza de frontend/parts/
(en orden alfabético, de ahí el prefijo numérico de cada archivo) y el
cierre, para producir exactamente el mismo documento que antes vivía en
un único archivo de más de 11 000 líneas.
"""
from __future__ import annotations

from pathlib import Path

FRONTEND_DIR = Path(__file__).parent / "frontend"
PARTS_DIR = FRONTEND_DIR / "parts"


def build_html() -> str:
    head = (FRONTEND_DIR / "template_head.html").read_text(encoding="utf-8")
    tail = (FRONTEND_DIR / "template_tail.html").read_text(encoding="utf-8")

    parts = sorted(PARTS_DIR.glob("*.js"))
    if not parts:
        raise FileNotFoundError(f"No se encontraron módulos .js en {PARTS_DIR}")

    body = "".join(part.read_text(encoding="utf-8") for part in parts)
    return head + body + tail


if __name__ == "__main__":
    # Ejecutar `python build_frontend.py` vuelca el HTML ensamblado a stdout,
    # útil para revisar el resultado o para servirlo como archivo estático
    # fuera de Streamlit.
    print(build_html())
