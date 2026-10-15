"""Ensambla la app en www/ para Capacitor (y para abrirla en un navegador).

Une src/index.html, src/styles.css y src/js/*.js (en orden alfabético, de
ahí el prefijo numérico) en un solo www/index.html, y copia al lado los
puentes de los plugins de Capacitor desde node_modules (scripts IIFE que
dejan sus objetos en window, sin necesidad de bundler).

Uso:
    python3 build_www.py            # para el APK (incluye los plugins)
    python3 build_www.py --web      # solo web: un único HTML autocontenido
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).parent
SRC = RAIZ / "src"
WWW = RAIZ / "www"
NM = RAIZ / "node_modules" / "@capacitor"

# (archivo en node_modules/@capacitor, nombre en www/vendor)
PLUGINS = [
    ("core/dist/capacitor.js", "capacitor.js"),
    ("app/dist/plugin.js", "app.js"),
    ("local-notifications/dist/plugin.js", "local-notifications.js"),
    ("preferences/dist/plugin.js", "preferences.js"),
    ("filesystem/dist/plugin.js", "filesystem.js"),
    ("share/dist/plugin.js", "share.js"),
    ("status-bar/dist/plugin.js", "status-bar.js"),
    ("splash-screen/dist/plugin.js", "splash-screen.js"),
]


def version() -> str:
    return json.loads((RAIZ / "package.json").read_text(encoding="utf-8"))["version"]


def ensamblar(web: bool) -> str:
    html = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    partes = sorted((SRC / "js").glob("*.js"))
    js = "\n".join(p.read_text(encoding="utf-8") for p in partes).replace("__VERSION__", version())
    # "</script" dentro del código cerraría la etiqueta antes de tiempo.
    js = js.replace("</script", "<\\/script")
    cap = "" if web else "\n  ".join(f'<script src="vendor/{dst}"></script>' for _, dst in PLUGINS)
    return html.replace("<!--CAPACITOR-->", cap).replace("/*ESTILOS*/", css).replace("/*SCRIPTS*/", js)


def main() -> None:
    web = "--web" in sys.argv
    WWW.mkdir(exist_ok=True)
    (WWW / "index.html").write_text(ensamblar(web), encoding="utf-8")
    if not web:
        vendor = WWW / "vendor"
        vendor.mkdir(exist_ok=True)
        for origen, destino in PLUGINS:
            o = NM / origen
            if not o.exists():
                raise SystemExit(f"Falta {o}. Ejecuta `npm install` primero.")
            shutil.copy2(o, vendor / destino)
    for icono in ("icon-192.png", "icon-512.png"):
        o = RAIZ / "assets" / icono
        if o.exists():
            shutil.copy2(o, WWW / icono)
    (WWW / "manifest.json").write_text(json.dumps({
        "name": "Al Día · Tarjetas", "short_name": "Al Día", "start_url": "./index.html", "display": "standalone",
        "background_color": "#0b1020", "theme_color": "#2563eb", "lang": "es",
        "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}],
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"www/index.html listo ({(WWW / 'index.html').stat().st_size:,} bytes, {'web' if web else 'APK'})")


if __name__ == "__main__":
    main()
