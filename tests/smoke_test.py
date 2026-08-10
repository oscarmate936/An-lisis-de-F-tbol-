"""Prueba de humo end-to-end de Acierto, con Playwright.

No hay ningún test automatizado en el repo: toda la lógica de cálculo y de
interfaz se venía verificando a mano, así que un cambio en cualquiera de los
módulos de frontend/parts/ podía romper otro sin que nada lo avisara antes de
producción. Esta prueba no sustituye esa verificación manual (sigue haciendo
falta para cambios de cálculo finos), pero cubre el camino más básico y más
fácil de romper por accidente: que la app arranque, liste partidos, abra un
partido, abra un equipo desde ahí sin perder el partido, y que "Volver"
deshaga un paso cada vez en lugar de mandar siempre a la cartelera.

Requiere Playwright instalado (`pip install playwright && playwright
install chromium`). No hace falta conexión a internet: React y Babel se
sirven desde una copia local en tests/vendor/ en vez de desde cdnjs (así la
prueba no depende de que ese CDN esté accesible al ejecutarla). Se ejecuta
a mano:

    python3 build_frontend.py > /tmp/acierto_smoke/built.html
    python3 tests/smoke_test.py

No está enganchado a ningún workflow de CI: compilar y firmar el APK ya
tarda varios minutos por sí solo, y esta prueba necesita red hacia cdnjs,
que no siempre está disponible en el runner. Se deja como herramienta de
verificación local antes de hacer push.
"""
import asyncio
import http.server
import json
import socketserver
import subprocess
import sys
import threading
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
VENDOR_DIR = Path(__file__).resolve().parent / "vendor"
SERVE_DIR = Path("/tmp/acierto_smoke")
PORT = 8899

# React/Babel se sirven desde cdnjs en producción; aquí se interceptan y se
# devuelve una copia local (tests/vendor/) para que la prueba no dependa de
# que ese CDN esté accesible en el momento de ejecutarla.
CDN_LOCAL = {
    "react/18.2.0/umd/react.production.min.js": "react.production.min.js",
    "react-dom/18.2.0/umd/react-dom.production.min.js": "react-dom.production.min.js",
    "babel-standalone/7.23.2/babel.min.js": "babel.min.js",
}

STATUS_BODY = {"get": "status", "response": {
    "account": {"firstname": "T", "lastname": "U", "email": "t@e.com"},
    "subscription": {"plan": "Free", "end": "2027-01-01T00:00:00+00:00", "active": True},
    "requests": {"current": 3, "limit_day": 100},
}}

FIXTURES_BODY = {"get": "fixtures", "response": [{
    "fixture": {"id": 1000, "date": "2026-08-08T18:00:00+00:00", "status": {"short": "NS", "elapsed": None}, "referee": None},
    "league": {"id": 39, "name": "Liga 0", "logo": "", "season": 2025, "country": "Pais"},
    "teams": {"home": {"id": 0, "name": "Equipo0A", "logo": "", "winner": None},
              "away": {"id": 1, "name": "Equipo0B", "logo": "", "winner": None}},
    "goals": {"home": None, "away": None},
}]}

TEAMSTATS_BODY = {"get": "teams/statistics", "response": {
    "form": "WWDLW",
    "fixtures": {"played": {"home": 5, "away": 5, "total": 10},
                 "wins": {"home": 3, "away": 2, "total": 5},
                 "draws": {"home": 1, "away": 1, "total": 2},
                 "loses": {"home": 1, "away": 2, "total": 3}},
    "goals": {"for": {"total": {"home": 10, "away": 8}, "average": {"home": "2.0", "away": "1.6", "total": "1.8"},
                       "minute": {}, "under_over": {}},
              "against": {"total": {"home": 5, "away": 6}, "average": {"home": "1.0", "away": "1.2", "total": "1.1"},
                          "minute": {}, "under_over": {}}},
    "biggest": {"streak": {"wins": 3, "draws": 1, "loses": 1},
                "wins": {"home": "3-0", "away": "2-1"}, "loses": {"home": "0-2", "away": "0-3"}},
    "clean_sheet": {"home": 2, "away": 1, "total": 3},
    "failed_to_score": {"home": 0, "away": 1, "total": 1},
    "penalty": {"scored": {"total": 2}, "missed": {"total": 0}, "total": 2},
    "lineups": [{"formation": "4-3-3", "played": 6}],
}}


def build():
    SERVE_DIR.mkdir(parents=True, exist_ok=True)
    html = subprocess.check_output([sys.executable, str(ROOT / "build_frontend.py")], cwd=ROOT)
    (SERVE_DIR / "built.html").write_bytes(html)


def serve():
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    import os
    os.chdir(SERVE_DIR)
    # Ojo: NO usar `with TCPServer(...) as httpd:` aquí — al salir del
    # bloque `with` (incluso solo por el `return`) se cierra el socket,
    # así que el servidor moría antes de que Playwright llegara a usarlo.
    httpd = socketserver.TCPServer(("", PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


async def dismiss_coach(page):
    for _ in range(3):
        coach = await page.query_selector(".coach-fondo")
        if not coach:
            return
        for b in await page.query_selector_all(".coach-acts button"):
            if "Saltar" in (await b.inner_text() or ""):
                await b.click()
                break
        await page.wait_for_timeout(300)


async def run():
    fails = []

    def check(name, cond):
        print(("  OK  " if cond else "FALLO ") + name)
        if not cond:
            fails.append(name)

    async with async_playwright() as p:
        exe = Path("/opt/pw-browsers/chromium")
        browser = await p.chromium.launch(executable_path=str(exe) if exe.exists() else None)
        page = await browser.new_page(viewport={"width": 420, "height": 900})
        console_errors = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(f"pageerror: {e}"))

        async def handle_cdn(route):
            url = route.request.url
            for frag, fname in CDN_LOCAL.items():
                if frag in url:
                    await route.fulfill(path=str(VENDOR_DIR / fname))
                    return
            await route.continue_()
        await page.route("https://cdnjs.cloudflare.com/**", handle_cdn)

        async def handle_route(route):
            url = route.request.url
            if "/status" in url:
                await route.fulfill(status=200, content_type="application/json", body=json.dumps(STATUS_BODY))
            elif "/fixtures" in url:
                await route.fulfill(status=200, content_type="application/json", body=json.dumps(FIXTURES_BODY))
            elif "teams/statistics" in url:
                await route.fulfill(status=200, content_type="application/json", body=json.dumps(TEAMSTATS_BODY))
            else:
                await route.fulfill(status=200, content_type="application/json", body='{"response": []}')
        await page.route("https://v3.football.api-sports.io/**", handle_route)

        await page.goto(f"http://localhost:{PORT}/built.html", wait_until="networkidle")
        await page.wait_for_selector("input")
        await (await page.query_selector("input")).fill("fake-key-1234567890")
        for b in await page.query_selector_all("button"):
            if "onect" in (await b.inner_text() or ""):
                await b.click()
                break
        await page.wait_for_timeout(1000)
        await dismiss_coach(page)

        check("la cartelera lista al menos un partido", await page.query_selector("button.fx") is not None)

        row = await page.query_selector("button.fx")
        await row.click()
        await page.wait_for_timeout(700)
        check("abrir un partido lleva a la vista de Partido", await page.query_selector(".sb-h") is not None)

        team_btn = await page.query_selector(".sb-h")
        await team_btn.click()
        await page.wait_for_timeout(700)
        st = await page.evaluate("() => history.state")
        check("abrir el equipo local conserva el partido en el historial",
              bool(st) and st.get("fixture") is not None and st.get("teamCtx") is not None)

        back_btn = await page.query_selector("button.back")
        check("la vista de Equipo tiene botón Volver", back_btn is not None)
        if back_btn:
            await back_btn.click()
            await page.wait_for_timeout(700)
            check("Volver desde Equipo regresa al Partido (no a la cartelera)",
                  await page.query_selector(".sb-h") is not None)

            back_btn2 = await page.query_selector("button.back")
            await back_btn2.click()
            await page.wait_for_timeout(700)
            check("Volver desde Partido regresa a la cartelera",
                  await page.query_selector("button.fx") is not None)

        ruido = [e for e in console_errors if "BABEL" not in e and "ERR_CONNECTION_RESET" not in e]
        check(f"sin errores de consola inesperados (hubo {len(ruido)})", not ruido)
        for e in ruido[:10]:
            print("    -", e[:200])

        await browser.close()

    print()
    if fails:
        print(f"{len(fails)} comprobación(es) fallaron:")
        for f in fails:
            print(" -", f)
        sys.exit(1)
    print("Todo correcto.")


if __name__ == "__main__":
    build()
    serve()
    asyncio.run(run())
