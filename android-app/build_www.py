"""Ensambla la SPA de Pizarra para empaquetarla como app de Android.

Usa exactamente el mismo código de frontend/parts/ que la versión de
Streamlit (build_frontend.py, en la raíz del repo) — ni una línea de
JSX distinta, así que el diseño y el comportamiento son los mismos.
Lo único que cambia es la cabecera: en vez de cargar React/ReactDOM/
Babel desde un CDN (pensado para un navegador con conexión), aquí se
sirven copias locales empaquetadas en el propio APK (carpeta libs/),
para que la app funcione igual con la red floja o sin ella, y sin
depender de que cdnjs.cloudflare.com esté accesible desde el móvil.
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

ANDROID_DIR = Path(__file__).parent
REPO_DIR = ANDROID_DIR.parent
FRONTEND_DIR = REPO_DIR / "frontend"
PARTS_DIR = FRONTEND_DIR / "parts"
WWW_DIR = ANDROID_DIR / "www"
VENDOR_DIR = ANDROID_DIR / "vendor" / "libs"


def build_www() -> None:
    head = (ANDROID_DIR / "template_head_mobile.html").read_text(encoding="utf-8")
    tail = (FRONTEND_DIR / "template_tail.html").read_text(encoding="utf-8")

    parts = sorted(PARTS_DIR.glob("*.js"))
    if not parts:
        raise FileNotFoundError(f"No se encontraron módulos .js en {PARTS_DIR}")
    body = "".join(part.read_text(encoding="utf-8") for part in parts)

    build_hash = hashlib.sha1(body.encode("utf-8")).hexdigest()[:16]
    tail = tail.replace("__BUILD_HASH__", build_hash)

    WWW_DIR.mkdir(parents=True, exist_ok=True)
    (WWW_DIR / "index.html").write_text(head + body + tail, encoding="utf-8")

    # React, ReactDOM y Babel: copias locales versionadas en el repo
    # (android-app/vendor/libs/), no bajadas de un CDN en cada build.
    libs_dir = WWW_DIR / "libs"
    libs_dir.mkdir(parents=True, exist_ok=True)
    for nombre in ("react.production.min.js", "react-dom.production.min.js", "babel.min.js"):
        origen = VENDOR_DIR / nombre
        if not origen.exists():
            raise FileNotFoundError(
                f"Falta {origen}. Son las mismas librerías que ya se probaron con la app "
                "(react/react-dom 18.2.0, babel-standalone 7.23.2); hay que vendorizarlas una vez."
            )
        shutil.copy2(origen, libs_dir / nombre)

    # Iconos y manifest: los mismos que ya se generaron para la PWA de
    # Streamlit, copiados tal cual — el icono real de la app instalada
    # (el que ve Android en el launcher) sale de android/app/src/main/
    # res/mipmap-*, no de aquí, pero conviene que la web interna sea
    # coherente con el manifest si algo la inspecciona.
    static_dir = REPO_DIR / "static"
    for nombre in ("icon-192.png", "icon-512.png", "icon-maskable-512.png"):
        shutil.copy2(static_dir / nombre, WWW_DIR / nombre)

    manifest = (WWW_DIR / "manifest.json")
    manifest.write_text(
        (static_dir / "manifest.json")
        .read_text(encoding="utf-8")
        .replace('"start_url": "/"', '"start_url": "./index.html"')
        .replace('"id": "/"', '"id": "./index.html"'),
        encoding="utf-8",
    )

    print(f"www/index.html generado ({len(head + body + tail):,} bytes, hash {build_hash})")


if __name__ == "__main__":
    build_www()
