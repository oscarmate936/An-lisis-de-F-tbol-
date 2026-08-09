# Acierto — terminal de análisis de partidos

Terminal de análisis de fútbol sobre datos de [API-Football](https://www.api-football.com/)
(API-Sports v3): fixtures en vivo, mercados y cuotas, alineaciones, un
motor de modelos estadísticos (Dixon-Coles, Skellam, cópula gaussiana,
Conway-Maxwell-Poisson, Elo, ensamble apilado...) y calibración/backtest
de esos modelos.

La interfaz sigue el lenguaje visual y de interacción de Material 3
(Android):

- **Barra timón + FAB**: la combinada —la acción de firma de la
  app— vive acoplada como botón flotante en el centro de la barra
  inferior, no como una pestaña más.
- **Cajón lateral**: Ajustes, Ayuda, tema y el atajo a "Mis ligas"
  viven en un menú lateral con accesos rápidos en tarjetas grandes.
- **Rejilla**: el selector de competición es una rejilla visual de
  escudos, no un desplegable de texto.
- **Hojas inferiores** en vez de diálogos centrados, con tirador,
  para Ajustes, Ayuda, comparaciones y menús contextuales.
- **Menú de tres puntos** en el historial de combinadas archivadas,
  para ver el detalle o borrar sin llenar la fila de botones.
- Tipografía Roboto, botones de píldora, y un encuadre de teléfono
  centrado en pantallas anchas en vez de estirarse a todo el ancho.

Y de comportamiento, no solo de estilo:

- **Calibración automática**: cada competición ajusta sola sus
  parámetros (fuerzas, forma, motor, y un afinado fino del empate) la
  primera vez que hace falta, sin pedir peticiones nuevas a la API.
  Una vigilancia diaria revisa el registro de pronósticos —lo único
  que no admite trampa, porque queda escrito antes del partido— y si
  una liga se desvía de su tasa base, se recalibra sola. Lo calibrado
  a mano nunca se toca sin que lo pida quien lo guardó.
- **Tema automático**: además de Claro/Oscuro, "Auto" sigue el tema
  del sistema operativo y se actualiza solo si el aparato cambia de
  tema mientras la app está abierta.
- **Deslizar para actuar**: las combinadas archivadas del historial
  se pueden quitar deslizándolas, sin pasar por ningún menú.
- **Pulsación larga**: mantener pulsado un partido en la cartelera
  abre un atajo a ver cualquiera de los dos equipos o fijar su liga,
  sin entrar primero al partido.
- **Tirar para refrescar**: en la cartelera, el gesto de Android de
  siempre, además del botón "Actualizar" que ya había.
- **Secciones plegables** en Mercados y en Calibración para el
  contenido más opcional o denso (qué pasa si me equivoco, hándicap
  europeo, dónde falla el modelo, parámetros, validación cruzada...),
  dejando arriba lo que casi todo el mundo mira primero.
- **Vibración breve** en la acción central (FAB), los interruptores y
  las acciones del menú de tres puntos, donde el navegador lo permite.
- **Sugerencias de búsqueda** en la cartelera: al escribir aparecen
  equipos y ligas que coinciden, para no tener que escribir el nombre
  entero ni adivinar cómo lo llama la API.
- **Bienvenida guiada**: la primera vez que se entra, dos avisos
  breves señalan el menú lateral y la combinada antes de dejar a la
  persona sola con la pantalla. Se puede saltar, y no vuelve a
  aparecer (marca en `localStorage`).
- **Caché del código compilado**: la interfaz se compila con Babel en
  el navegador (no hay paso de build), así que la primera visita paga
  ese coste; las siguientes arrancan con el JavaScript ya compilado
  guardado en `localStorage`, bastante más rápido, con recuperación
  automática si esa caché quedara corrupta.
- **Icono y nombre propios** al guardar la app como acceso directo o
  marcador (`manifest.json` + iconos). *Nota honesta*: no llega a ser
  una PWA instalable de verdad — se probó registrar un service worker
  y Chrome lo rechaza, porque el único sitio donde Streamlit deja
  servir archivos estáticos (`app/static/`) no alcanza a cubrir la
  página real de la app. Sin ese service worker no hay ventana propia
  sin barra de navegador, solo un acceso directo con buen icono.
- **Buscador global** (Ctrl/Cmd+K, o el icono "Buscar" del cajón): un
  mismo cajón para saltar a cualquier sección, repetir una búsqueda
  reciente o escribir un equipo nuevo y caer directo en la cartelera
  con esa búsqueda ya hecha.
- **Búsquedas recientes**: la cartelera recuerda las últimas búsquedas
  y las ofrece en cuanto se toca la caja vacía, sin tener que escribir
  de nuevo.
- **Compartir combinada** con la hoja nativa de compartir del sistema
  (Web Share API) donde el navegador la ofrezca — sobre todo Android;
  donde no exista, sigue estando "Copiar" al portapapeles.
- **Deslizar entre pestañas**: Cartelera, Competición y Calibración se
  pueden recorrer arrastrando el dedo en horizontal, como en cualquier
  visor de pestañas de Android, cediendo el gesto sin pelear cuando
  hay algo debajo que ya se desliza (la tira de días, una tabla ancha).
- **Volver arriba**: un botón flotante aparece al bajar en una lista
  larga y sube de un toque, sin tener que arrastrar el dedo de vuelta.
- **Reintentos automáticos**: un corte de red de medio segundo ya no
  se convierte en un error en pantalla — la petición se reintenta un
  par de veces con espera creciente antes de rendirse.

Y de accesibilidad: todo lo interactivo tiene un anillo de foco visible
al navegar con teclado (Tab), y lo que solo se alcanzaba con un gesto
de puntero tiene también su equivalente de teclado — por ejemplo, el
menú contextual de un partido (pulsación larga) también se abre con
Mayús+F10 o la tecla Menú, como cualquier menú contextual nativo.

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
        ├── 02_ui_common.js             # utilidades de UI compartidas (spinners, escudos, menú de tres puntos...)
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
        ├── 31_app_shell.js             # ayuda, ajustes, cajón lateral, y el componente App raíz
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

## También existe como app de Android

La misma interfaz, mismo diseño y misma funcionalidad, empaquetada
como app instalable (`.apk`) con Capacitor — sin backend de Streamlit
de por medio, con React/ReactDOM/Babel servidos en local en vez de
desde un CDN. Ver [`android-app/README.md`](android-app/README.md)
para cómo conseguir el APK (se compila solo en GitHub Actions en cada
push) o compilarlo en local con Android Studio.

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
