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

- **Mejor día para comprar** (el día después del corte) y cuántos días
  tendrías para pagar una compra hecha hoy.
- **Compras a meses / en cuotas**: mensualidades pagadas y pendientes; solo
  la mensualidad del mes cuenta para el pago sin intereses.
- **Calendario** con cortes, fechas límite y mejores días de compra, y
  exportación a Google Calendar / calendario del teléfono (`.ics`).
- **Simulador**: cuánto tardarías y cuánto pagarías de intereses pagando
  solo el mínimo frente a un pago fijo, con gráfica mes a mes.
- **Plan para salir de deudas**: con lo que puedes pagar al mes, te da el
  orden (método avalancha o bola de nieve) y la fecha en que quedarías
  libre de deudas.
- **Recomendaciones** automáticas: pago vencido, fecha cercana, uso alto
  del límite, estado de cuenta sin capturar, mejor día para comprar...
- **Aprende**: glosario en lenguaje llano (con botones **?** en toda la
  app), un diagrama del ciclo con las fechas de tu propia tarjeta, buenos
  hábitos y un mini examen.
- **Gastos por categoría** desde el último corte.
- **Modo discreto** (difumina los montos), tema claro/oscuro/automático,
  15 monedas de Latinoamérica, EE. UU. y España.
- **Respaldo** en un archivo y restauración.

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

Es un APK de **depuración**: sirve para instalarlo y usarlo, pero para
publicarlo en Google Play hay que firmarlo con una clave propia (ver el
README de `android-app/`, los pasos son los mismos).

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
npm test              # pruebas del motor de cálculo (node --test)
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
│       ├── 01_calculos.js     motor: cortes, pagos, mínimos, a meses, simulador, plan, avisos
│       ├── 02_datos.js        guardado local, moneda, plugins
│       ├── 03_ui.js           iconos, hojas inferiores, avisos
│       ├── 04_avisos.js       notificaciones y exportación .ics
│       ├── 05_glosario.js     explicaciones de cada término
│       ├── 06_piezas.js       componentes compartidos
│       ├── 07_app.js          navegación y acciones
│       ├── 08_formularios.js  tarjeta, movimiento, estado de cuenta
│       ├── 09_ejemplo.js      datos de ejemplo
│       ├── 10…15_*.js         pantallas
│       └── 99_inicio.js       arranque
├── tests/                     pruebas del motor
├── android/                   proyecto nativo (Capacitor)
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
