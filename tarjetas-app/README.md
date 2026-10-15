# Al Día — gestor de tarjetas de crédito

App de Android (y web) para llevar tus tarjetas de crédito sin
complicaciones: cuánto y cuándo pagar, recordatorios antes de cada fecha
límite y explicaciones sencillas de cada concepto.

## Qué hace

**Lo esencial**

- **Cuánto pagar**: para cada tarjeta muestra el *pago para no generar
  intereses* y el *pago mínimo* del último corte, lo que ya pagaste y lo
  que te falta. Se calculan solos con lo que registras; si copias los
  montos reales de tu estado de cuenta, pasan de "estimado" a exactos.
- **Cuándo pagar**: fecha de corte, fecha límite (como día fijo del mes o
  como "N días después del corte") y cuenta regresiva.
- **Recordatorios**: notificaciones del propio teléfono (no necesitan
  internet) 3 días antes, 1 día antes y el mismo día de la fecha límite,
  con el monto a pagar. Los días y la hora se eligen en Ajustes. También
  avisa el día de corte. Si ya pagaste, deja de recordártelo.
- **Deuda actual, disponible y uso del límite** por tarjeta y en total,
  con un semáforo (menos del 30% es saludable).
- **Registrar compras, pagos y compras a meses** en segundos. Al
  registrar una compra te dice en qué corte entra y hasta cuándo se paga.

**Extras para ayudarte**

- **Botones en la notificación**: "Ya pagué" registra el pago (con opción
  de deshacer) y "Recordar mañana" pospone el aviso un día.
- **¿Con qué tarjeta compro hoy?**: ordena tus tarjetas por los días que
  tendrías para pagar una compra hecha hoy, revisando el crédito
  disponible y cómo quedaría tu uso del límite.
- **Mejor día para comprar** (el día después del corte).
- **Recordatorio del estado de cuenta**: 3 días después de cada corte.
- **Avisos a la hora exacta** (permiso de "alarmas y recordatorios" de
  Android 12+, se pide desde Ajustes).
- **Pago domiciliado**: si el banco cobra solo, el pago se registra en la
  fecha límite y el aviso cambia a "revisa que tengas saldo".
- **Intereses estimados**: si no pagas el total de un corte, se suman a la
  deuda los intereses que probablemente cobrará el banco (+ IVA, 16% por
  defecto en pesos mexicanos), hasta que captures el estado de cuenta real.
- **Leer el estado de cuenta** desde el **PDF** del banco (también con
  contraseña), una **foto** (lectura de texto en el propio teléfono, sin
  internet) o **texto pegado**; revisas lo encontrado antes de guardar.
- **Compras a meses / en cuotas** y **compras en dólares u otra moneda**
  con tipo de cambio.
- **Cargos recurrentes** (Netflix, gimnasio...) que se registran solos.
- **Anualidad**: aviso 30 y 7 días antes para pedir que te la quiten.
- **Presupuesto** mensual (total y por categoría) y por tarjeta, con aviso
  al 80% y al 100%.
- **Meta para liquidar una tarjeta**: cuánto pagar al mes para terminar a
  tiempo.
- **Historial**: compras y deuda mes a mes, con gráficas y tabla.
- **Buscar y filtrar movimientos** de todas tus tarjetas.
- **Calendario** con cortes, fechas límite, anualidades y cargos
  recurrentes, y exportación a Google Calendar (`.ics`).
- **Simulador** de "solo el mínimo" frente a un pago fijo, y **plan para
  salir de deudas** (avalancha o bola de nieve).
- **Widget** de Android con el próximo pago.
- **Bloqueo con PIN y huella**.
- **Recomendaciones** automáticas, sección **Aprende** con glosario,
  diagrama del ciclo con tus fechas y mini examen.
- **Modo discreto**, tema claro/oscuro/automático, 15 monedas.
- **Respaldos**: copia automática semanal dentro del teléfono (Android la
  incluye en tu copia de seguridad de Google si la tienes activada) y
  respaldo manual en un archivo.

**Privacidad**: no hay cuentas, servidores ni conexión con el banco. Todo
se guarda en el teléfono. Nunca se pide el número completo de la tarjeta:
solo un nombre y, si quieres, los 4 últimos dígitos.

## Cómo conseguir el APK

Cada vez que se sube un cambio en `tarjetas-app/`, GitHub compila la app
con el flujo `.github/workflows/build-tarjetas-apk.yml`:

1. En GitHub, pestaña **Actions** → la ejecución más reciente de
   "Compilar APK de Al Día (tarjetas)".
2. Al final de la página, en **Artifacts**, descarga
   `al-dia-tarjetas-apk` (un `.zip` con `app-debug.apk`).
3. Pasa el `.apk` al teléfono y ábrelo. Android pedirá permiso para
   "instalar apps de fuentes desconocidas" la primera vez: es normal
   porque no viene de Google Play.
4. Al abrir la app y agregar tu primera tarjeta te pedirá permiso para
   enviar notificaciones. Acéptalo para recibir los recordatorios.

**Actualizar**: instala el APK nuevo encima del anterior; tus datos se
conservan. Todos los APK se firman con la misma clave (guardada en
`android/app/aldia-debug.keystore`). La excepción son los compilados antes
de la versión 1.1: esos usaban una clave distinta en cada compilación, así
que si tienes uno de esos instalado, desinstálalo una sola vez (guarda antes
un respaldo desde Ajustes).

### Publicar en Google Play

Google Play pide un `.aab` firmado con una clave de publicación **tuya**
(si la pierdes no podrás actualizar la app en la tienda, así que guárdala
bien). Cuando quieras dar ese paso:

1. Crea la clave en tu computadora:
   `keytool -genkey -v -keystore aldia-release.keystore -alias aldia -keyalg RSA -keysize 2048 -validity 10000`
2. Conviértela a texto: `base64 -w0 aldia-release.keystore` (en Mac: `base64 -i aldia-release.keystore`).
3. En GitHub: **Settings → Secrets and variables → Actions → New
   repository secret**, crea `ALDIA_KEYSTORE_BASE64` (el texto del paso 2),
   `ALDIA_KEYSTORE_PASSWORD`, `ALDIA_KEY_ALIAS` (`aldia`) y
   `ALDIA_KEY_PASSWORD`.
4. La siguiente compilación publicará además el artefacto
   `al-dia-tarjetas-publicacion` con `app-release.apk` y `app-release.aab`.

## Probarla en el navegador

```bash
cd tarjetas-app
python3 build_www.py --web     # un único www/index.html autocontenido
```

y abre `www/index.html`. En el navegador funciona todo menos las
notificaciones con la app cerrada (eso solo lo puede hacer el APK).

## Desarrollo

```bash
cd tarjetas-app
npm install
npm test              # pruebas del motor de cálculo y del lector (node --test)
npm run test:e2e      # pruebas de pantallas en Chromium (Playwright)
npm run sync          # ensambla www/ y sincroniza el proyecto Android
npx cap open android  # abre el proyecto en Android Studio
python3 gen_icons.py  # regenera iconos y pantalla de arranque
```

No hay paso de compilación de JavaScript: `build_www.py` une
`src/index.html`, `src/styles.css` y `src/js/*.js` (en orden por su
prefijo numérico) en un solo `www/index.html`, y copia junto a él los
plugins de Capacitor desde `node_modules`.

```
tarjetas-app/
├── src/
│   ├── index.html, styles.css
│   └── js/
│       ├── 00_fechas.js       fechas de calendario sin zona horaria
│       ├── 01_calculos.js     motor: cortes, pagos, mínimos, a meses, intereses, domiciliación,
│       │                      recurrentes, metas, presupuestos, simulador, plan, avisos
│       ├── 01b_lector.js      lee montos y fechas del texto de un estado de cuenta
│       ├── 02_datos.js        guardado local, moneda, plugins
│       ├── 03_ui.js           iconos, hojas inferiores, avisos
│       ├── 04_avisos.js       notificaciones y exportación .ics
│       ├── 05_glosario.js     explicaciones de cada término
│       ├── 06_piezas.js       componentes compartidos
│       ├── 07_app.js          navegación y acciones
│       ├── 08_formularios.js  tarjeta, movimiento, estado de cuenta
│       ├── 09_ejemplo.js      datos de ejemplo
│       ├── 10…18_*.js         pantallas (inicio, tarjetas, calendario, planear, aprende,
│       │                      ajustes, búsqueda, extras, presupuesto/historial)
│       ├── 19_bloqueo.js      PIN y huella
│       ├── 20_importar.js     leer estado de cuenta (PDF / foto / texto)
│       └── 99_inicio.js       arranque, botones de notificación y autoprueba
├── tests/                     pruebas unitarias, de pantallas (e2e/) y archivos de ejemplo (fixtures/)
├── android/                   proyecto nativo (Capacitor) + widget (AldiaWidget.java)
├── build_www.py, gen_icons.py
└── capacitor.config.json
```

### Cómo calcula

- **Deuda**: parte de la deuda que capturaste al dar de alta la tarjeta (o,
  mejor, del saldo al corte de un estado de cuenta capturado) y suma
  compras y resta pagos posteriores. Capturar un estado de cuenta corrige
  intereses y comisiones que la app no puede conocer.
- **Pago para no generar intereses (estimado)**: saldo al corte menos lo
  que falta de compras a meses.
- **Pago mínimo (estimado)**: la mensualidad de compras a meses más un
  porcentaje del resto (5% por defecto, configurable por tarjeta). Las
  reglas reales cambian por banco y país: el estado de cuenta manda.
- **Intereses**: tasa anual ÷ 12 sobre lo que no se paga. Es una
  aproximación; el banco usa el saldo promedio diario.

### Pruebas en GitHub

Cada compilación corre, en este orden: las pruebas unitarias, las pruebas
de pantallas en Chromium (incluida la lectura de un PDF y de una foto con
OCR, y el bloqueo con PIN), compila el APK y lo publica, y después lo
**instala en un emulador de Android 14**, lo abre con
`aldia://autoprueba` y revisa en el registro del sistema que la interfaz y
los plugins nativos (notificaciones, almacenamiento, archivos, widget,
huella) respondan. La captura del emulador queda en el artefacto
`emulador-captura`.
