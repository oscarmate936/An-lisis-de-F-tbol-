"""Ensambla la interfaz de Pizarra a partir de sus módulos en frontend/.

La interfaz es una SPA de React que corre entera en el navegador (habla
directo con API-Football, no necesita backend). Streamlit solo la aloja.
Este módulo concatena la cabecera HTML, cada pieza de frontend/parts/
(en orden alfabético, de ahí el prefijo numérico de cada archivo) y el
cierre, para producir exactamente el mismo documento que antes vivía en
un único archivo de más de 11 000 líneas.
"""
from __future__ import annotations

import hashlib
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

    # El navegador guarda el JSX ya compilado en localStorage para no
    # tener que volver a pasarlo por Babel en cada visita. La clave de
    # esa caché es un hash del propio código: en cuanto algo cambia
    # aquí, el hash cambia, la caché vieja se descarta sola y el
    # navegador compila la versión nueva una vez más.
    build_hash = hashlib.sha1(body.encode("utf-8")).hexdigest()[:16]
    tail = tail.replace("__BUILD_HASH__", build_hash)

    return head + body + tail


if __name__ == "__main__":
    # Ejecutar `python build_frontend.py` vuelca el HTML ensamblado a stdout,
    # útil para revisar el resultado o para servirlo como archivo estático
    # fuera de Streamlit.
    print(build_html())
