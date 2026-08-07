# Pizarra — terminal de análisis de partidos

Terminal de análisis de fútbol sobre datos de [API-Football](https://www.api-football.com/)
(API-Sports v3): fixtures en vivo, mercados y cuotas, alineaciones, un
motor de modelos estadísticos (Dixon-Coles, Skellam, cópula gaussiana,
Conway-Maxwell-Poisson, Elo, ensamble apilado...) y calibración/backtest
de esos modelos.

La interfaz sigue el lenguaje visual de Material 3 (Android): barra de
navegación inferior fija, hojas que suben desde abajo en vez de
diálogos centrados, botones de píldora, tipografía Roboto y una
pantalla de Ajustes con interruptores. En pantallas anchas la app se
ve dentro de un encuadre de teléfono centrado, en vez de estirarse a
todo el ancho.

## Cómo está organizado

La aplicación en sí es una **SPA de React** que corre entera en el
navegador: habla directo con API-Football con la clave que el usuario
pega en pantalla (se guarda solo en su navegador, en IndexedDB con
fallback a `localStorage`; nunca pasa por ningún servidor). No hay
backend propiamente dicho — solo una interfaz.

**Streamlit aloja esa interfaz**: `app.py` levanta un servidor Streamlit
y monta la SPA dentro de un componente `components.html`. Esto permite
correr y desplegar el proyecto como una app de Streamlit (`streamlit run`,
Streamlit Community Cloud, etc.) sin reescribir toda la lógica de la
interfaz en Python — algo que habría significado perder animaciones,
actualizaciones en vivo y toda la interacción fina que ya tenía la
versión original, ya que el modelo de ejecución de Streamlit (rerun de
todo el script en cada acción) no encaja con una SPA de este tamaño.

```
.
├── app.py                     # Entrada de Streamlit: monta la SPA
├── build_frontend.py          # Ensambla frontend/ en un único HTML
├── requirements.txt
├── .streamlit/
│   └── config.toml            # Tema oscuro a juego con la interfaz
└── frontend/
    ├── template_head.html     # <head>, CDN de React/Babel, <div id="root">
    ├── template_tail.html     # cierre de </script></body></html>
    └── parts/                 # el código de la SPA, cortado en módulos
        ├── 01_core_cache.js            # storage, caché (IndexedDB/localStorage), errores de la API
        ├── 02_ui_common.js             # utilidades de UI compartidas (spinners, escudos, barras...)
        ├── 03_connect.js               # pantalla de conexión / clave de API
        ├── 04_fixtures.js              # listado y buscador de partidos
        ├── 05_prob_engine.js           # núcleo de probabilidad (factoriales log, Poisson)
        ├── 06_backtest_calibracion.js  # backtest de temporada completa
        ├── 07_cuotas_margen.js         # quitar el margen de la casa a las cuotas
        ├── 08_simulacion.js            # simulación de combinadas con jugadores
        ├── 09_dixon_coles.js           # máxima verosimilitud (Dixon-Coles)
        ├── 10_recalibracion_objetivos.js
        ├── 11_incertidumbre.js
        ├── 12_registro_prospectivo.js  # registro de pronósticos antes del partido
        ├── 13_combinada_calc.js        # cálculo de combinadas correlacionadas
        ├── 14_metricas.js              # RPS, intervalos, segmentos
        ├── 15_skellam.js               # diferencia de goles en forma cerrada
        ├── 16_copula_gaussiana.js
        ├── 17_comp_poisson.js          # Conway-Maxwell-Poisson
        ├── 18_elo.js                   # Elo con margen de victoria
        ├── 19_logistica_ordinal.js
        ├── 20_ensamble.js              # ensamble apilado (EM sobre log-verosimilitud)
        ├── 21_regresion_lineal.js
        ├── 22_recalibracion_vectorial.js
        ├── 23_bayes_empirico.js
        ├── 24_inclinar_matriz.js
        ├── 25_market_pieces.js         # piezas comunes de mercado (Conf, IcoPos)
        ├── 26_mercados.js              # vista de mercados y cuotas de un partido
        ├── 27_match_views.js           # ficha de partido: resumen, previa, stats, alineaciones...
        ├── 28_league_team.js           # vistas de liga y de equipo
        ├── 29_calibracion_ui.js        # pantalla de calibración de modelos
        ├── 30_historial_combinada.js   # historial, comparador, combinada (boleto)
        ├── 31_app_shell.js             # ayuda, ajustes, y el componente App raíz
        ├── 32_styles.js                # todo el CSS-in-JS
        └── 33_bootstrap.js             # ReactDOM.createRoot(...).render(<App />)
```

`build_frontend.py` concatena `template_head.html` + cada archivo de
`frontend/parts/` (ordenados alfabéticamente, por eso el prefijo
numérico) + `template_tail.html`. El resultado es, byte a byte, el
mismo documento HTML que la interfaz original de un solo archivo — solo
que ahora cada pieza vive en su propio módulo, ordenado por lo que hace,
en vez de un único archivo de más de 11 000 líneas.

## Cómo correrlo en local

```bash
pip install -r requirements.txt
streamlit run app.py
```

Se abre en `http://localhost:8501`. La primera pantalla pide la clave de
API-Football (Account → My Access en tu cuenta de API-Football); se
guarda en el navegador, no hay que volver a pegarla salvo que se borre
el almacenamiento del sitio.

## Desplegarlo

Al ser una app de Streamlit estándar (`app.py` + `requirements.txt`), se
puede desplegar tal cual en [Streamlit Community Cloud](https://streamlit.io/cloud)
u otro hosting compatible con Streamlit, apuntando a `app.py` como
archivo principal.

## Notas

- La interfaz carga React, ReactDOM y Babel desde `cdnjs.cloudflare.com`
  en el navegador de quien la visita (igual que hacía el archivo
  original). Hace falta que ese navegador tenga salida a internet hacia
  ese dominio; si una red corporativa o un bloqueador lo impide, la app
  se queda en "Compilando la interfaz…".
- Si en alguna pantalla el contenido se corta, sube el valor `height` de
  la llamada a `components.html(...)` en `app.py` (el componente añade
  scroll propio, así que nunca se pierde contenido, solo queda más o
  menos cómodo verlo).
- Para tocar la interfaz, edita el archivo de `frontend/parts/` que
  corresponda — cada uno es JSX normal (Babel lo compila en el
  navegador, no hace falta paso de build). No hace falta volver a unir
  nada a mano: `build_frontend.py` los vuelve a ensamblar cada vez que
  arranca la app.
