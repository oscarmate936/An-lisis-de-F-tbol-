# Acierto — app de Android

La misma app de siempre (mismo diseño Material 3/Android, mismos
menús, mismo motor de modelos, mismas mejoras de esta temporada de
trabajo) empaquetada como una app de Android de verdad, instalable
como `.apk`, en vez de vivir dentro de un componente de Streamlit.

## Cómo se hizo: ni una línea de interfaz reescrita

Esto **no es una reescritura**. Es la SPA de React que ya vive en
`../frontend/parts/` (los mismos 33+ módulos, el mismo CSS, la misma
lógica) envuelta con [Capacitor](https://capacitorjs.com/): Capacitor
mete esa misma página web dentro de una `WebView` nativa de Android y
la reparte como si fuera cualquier otra app del Play Store. El diseño,
los menús, los atajos de teclado, el modelo estadístico, todo es
exactamente el mismo código.

Lo único que cambia frente a la versión de Streamlit:

- **React, ReactDOM y Babel se sirven en local** (`vendor/libs/`), no
  desde un CDN: la versión de Streamlit los carga de
  `cdnjs.cloudflare.com` porque asume que quien la visita tiene
  conexión de sobra; una app instalada no debería depender de que ese
  CDN esté accesible en cada arranque, así que aquí van empaquetadas
  dentro del propio APK.
- **No hay Streamlit de por medio**: la web ya no vive dentro de un
  `components.html`, así que las cosas que antes inyectaba `app.py`
  (el `<link rel="manifest">`, el `theme-color`, ocultar la cabecera
  de Streamlit) se han movido a la propia cabecera de la página
  (`template_head_mobile.html`), porque ahora la página **es** toda la
  pantalla.
- **Permisos nuevos** en `AndroidManifest.xml`: `VIBRATE` (para que el
  toque háptico del FAB, los interruptores y el menú de tres puntos
  funcione de verdad — sin este permiso `navigator.vibrate()` no
  falla, simplemente no hace nada) y `ACCESS_NETWORK_STATE` (para el
  aviso de "sin conexión").
- **Iconos nativos de Android** (adaptativos + heredados) y una
  pantalla de arranque, generados a partir del mismo icono de marca
  que ya se había diseñado para la PWA (`../static/icon-512.png`).

Todo lo demás —Cartelera, Competición, Combinada, Calibración, Mercados,
el cajón lateral, el buscador global, las sugerencias, la bienvenida
guiada, los reintentos de red, el deslizar entre pestañas...— es
idéntico, porque es literalmente el mismo archivo JavaScript.

## Cómo conseguir el `.apk`

### Opción A — dejar que GitHub lo compile (recomendado)

Cada vez que se hace `push` a este repositorio tocando `android-app/`
o `frontend/`, se dispara el flujo
`.github/workflows/build-android-apk.yml`. Ese flujo corre en un
servidor de GitHub (con acceso completo a los repositorios de Google
que hacen falta para compilar Android, cosa que un entorno de
desarrollo aislado no siempre tiene) y dos cosas:

1. Ensambla `www/index.html` a partir de `frontend/parts/` (fresco,
   siempre con el código más reciente).
2. Compila el APK de depuración con Gradle.

Para bajarlo: en GitHub, pestaña **Actions** → el run más reciente de
"Compilar APK de Android" → sección **Artifacts**, al final de la
página → `acierto-debug-apk`. Es un `.zip` que contiene `app-debug.apk`.

Este es un APK de **depuración** (`assembleDebug`), firmado con una
clave de pruebas genérica: sirve para instalarlo y probarlo tal cual,
pero no es el que se sube a Google Play. Para eso hace falta firmarlo
con una clave propia — ver más abajo.

### Opción B — compilarlo en tu propio ordenador

Hace falta tener instalado Android Studio (que ya trae el SDK de
Android) o, como mínimo, el SDK de línea de comandos + JDK 17.

```bash
cd android-app
npm install
npm run sync          # ensambla www/index.html y sincroniza el proyecto nativo
npx cap open android  # abre el proyecto en Android Studio
```

Desde Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
El resultado queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

O por línea de comandos, con el SDK ya instalado y `ANDROID_HOME`
apuntando a él:

```bash
cd android-app/android
./gradlew assembleDebug
```

## Instalar el APK en un móvil

1. Copia `app-debug.apk` al teléfono (por cable, Drive, lo que sea).
2. Ábrelo desde el gestor de archivos del teléfono. Android pedirá
   permiso para "instalar apps de fuentes desconocidas" la primera
   vez — es normal, porque no viene de Google Play.
3. Al abrir la app, pide la clave de API-Football igual que la versión
   web; se guarda en el propio teléfono (en el almacenamiento local de
   la `WebView`), nunca sale de ahí.

## Publicarla de verdad (Google Play)

Este proyecto deja compilado un APK de depuración, que sirve para
instalar y probar, pero **no** para subir a Google Play — hace falta
un `.aab` (Android App Bundle) firmado con una clave de publicación
propia, que no se puede generar sin que decidas tú la clave (es tuya,
no se puede improvisar por ti). Los pasos, cuando quieras dar ese
paso:

1. Generar una clave: `keytool -genkey -v -keystore acierto.keystore -alias acierto -keyalg RSA -keysize 2048 -validity 10000`.
2. Configurar la firma en `android/app/build.gradle` (`signingConfigs`).
3. `./gradlew bundleRelease` en vez de `assembleDebug`.
4. Subir el `.aab` resultante a la Play Console.

## Estructura

```
android-app/
├── build_www.py               # arma www/index.html desde ../frontend/parts/
├── gen_icons.py                # genera los iconos nativos y la pantalla de arranque
├── template_head_mobile.html   # <head> específico del empaquetado (libs locales, manifest)
├── capacitor.config.json       # id de la app, colores, plugins
├── package.json
├── vendor/libs/                 # React, ReactDOM y Babel — copias locales versionadas
├── www/                        # generado por build_www.py — no se guarda en git
└── android/                    # proyecto nativo (Gradle) generado por `npx cap add android`
```

## Nota honesta sobre `navigator.share`

El botón "Compartir" de la combinada usa la Web Share API del
navegador. Dentro de la `WebView` de Android puede que esté disponible
o puede que no, según la versión de Android/WebView del teléfono; si
no lo está, el botón simplemente no aparece (igual que en un navegador
de escritorio sin esa API) y "Copiar" sigue funcionando como respaldo.
No se ha añadido ningún plugin nativo de compartir para no salirse de
"el mismo código que ya teníamos" — sería una función nueva, no una
adaptación de la que ya existía.
