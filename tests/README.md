# Pruebas

No hay bundler ni framework de test configurado (el frontend es JSX crudo
compilado en el navegador, ver `build_frontend.py`), así que por ahora hay
un único smoke test end-to-end en vez de tests unitarios por módulo.

## `smoke_test.py`

Levanta la app real en un navegador (Playwright + Chromium), simula las
respuestas de la API y comprueba el camino más básico: conectar, listar
partidos, abrir un partido, abrir un equipo desde ahí sin perder el
partido, y que los botones "Volver" deshagan un paso cada vez en lugar de
mandar siempre a la cartelera.

```bash
pip install playwright
playwright install chromium
python3 tests/smoke_test.py
```

React y Babel se sirven desde `tests/vendor/` (copia local de lo que en
producción viene de cdnjs), así que no hace falta red para ejecutarla.

No está enganchado a ningún workflow de CI (compilar y firmar el APK ya
tarda varios minutos por sí solo). Se ejecuta a mano antes de hacer push a
cambios que toquen navegación, `frontend/parts/31_app_shell.js` o
`frontend/parts/27_match_views.js`.
