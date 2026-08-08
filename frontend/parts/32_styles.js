/* ============================================================
   Estilos
   ============================================================ */
function Styles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Mono:wght@400;500;700&family=Roboto+Flex:opsz,wght@10..24,400..800&display=swap');

/* ---------------------------------------------------------------
   Sistema visual — Material 3 (look de app Android)
   El color aquí no decora: dice algo. El oro es siempre el local,
   el azul siempre el visitante, y el violeta —que no pertenece a
   ningún equipo— es siempre lo que TÚ has marcado. Por eso una
   selección se reconoce de un vistazo entre cien barras de datos.
   Los mismos nombres de variable de siempre, pero con roles de
   color, radios y elevación de Material 3: superficies con un
   ligero tinte del color de marca en vez de sombras duras, formas
   muy redondeadas y un violeta como "primary" del sistema.
   --------------------------------------------------------------- */
:root{
  --pitch:#0F1116;         /* fondo de página (M3 surface dim) */
  --surface:#1A1C23;       /* tarjeta (M3 surface container) */
  --turf:#212330;          /* controles y cabeceras (surface container high) */
  --turf2:#2B2E3D;         /* relleno secundario (surface container highest) */
  --line:#38394A;
  --line-soft:rgba(56,57,74,.55);
  --chalk:#E4E1EA; --dim:#A8AABB; --faint:#8C8DA0;
  --mark:#B6A5FF; --mark-soft:rgba(182,165,255,.16); --mark-ink:#25135E;
  --sodium:#F0B23F; --sodium-soft:rgba(240,178,63,.14);
  --cool:#7FD1FF; --red:#FFB4AB; --win:#7FDBA6; --yellow:#E8C33F;
  --r:14px; --r-lg:24px; --pill:999px;
  --sh:0 1px 2px rgba(0,0,0,.3), 0 3px 10px -4px rgba(0,0,0,.5);
  --sh2:0 2px 6px rgba(0,0,0,.35), 0 8px 24px -8px rgba(0,0,0,.6);
  --gap:14px;
  --bar:58px;
  --tabh:0px;
  --ctxh:0px;
  --phone:428px;
}
/* Tema claro: la misma pizarra, en Material Light. */
html[data-tema="claro"]{
  --pitch:#F6F2FA; --surface:#FFFFFF; --turf:#F1ECF7; --turf2:#E7E0F0;
  --line:#DED8E8; --line-soft:rgba(222,216,232,.7);
  --chalk:#1C1B22; --dim:#5C5C6E; --faint:#7C7C8E;
  --mark:#5B3FE0; --mark-soft:rgba(91,63,224,.10); --mark-ink:#FFFFFF;
  --sodium:#8A5A00; --sodium-soft:rgba(138,90,0,.10);
  --cool:#0B6D93; --red:#BA1B1B; --win:#1D7A4C; --yellow:#8A6D00;
  --sh:0 1px 2px rgba(28,27,34,.08), 0 2px 8px -4px rgba(28,27,34,.12);
  --sh2:0 2px 6px rgba(28,27,34,.1), 0 10px 26px -12px rgba(28,27,34,.22);
}
html[data-tema="claro"] .app{background-image:none}
html[data-tema="claro"] .mcell{border-color:var(--surface)}
html[data-tema="claro"] .tri0{background:var(--sodium);color:#fff}
html[data-tema="claro"] .tri2{background:var(--cool);color:#fff}
html[data-tema="claro"] .topbar,html[data-tema="claro"] .tabbar,
html[data-tema="claro"] .builder{background:rgba(246,242,250,.94)}
html[data-tema="claro"] .input-date{color-scheme:light}

*{box-sizing:border-box}
.app,.app *,.shell,.shell *{font-family:'Roboto',system-ui,-apple-system,sans-serif}
.mono,.mono *{font-family:'Roboto Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;
  letter-spacing:-.01em}
/* La voz de la marca: Roboto Flex bien cargada, siempre en cifras
   grandes y rótulos, nunca en texto corrido — el mismo Roboto que
   usa el sistema en Android, solo que más ancho y más grueso. */
.h1,.brand-word,.gate-word,.sb-score,.kpibig,.rule-label,.card-title,.lg-name,
.cb-p,.bp,.xgval,.metval,.probval,.cb-match-p{
  font-family:'Roboto Flex','Roboto',system-ui,sans-serif;
  font-variation-settings:'wdth' 118,'opsz' 24;font-weight:700}

.app-ctx{--ctxh:43px}
.app{min-height:100vh;background:var(--pitch);color:var(--chalk);display:flex;flex-direction:column;
  background-image:radial-gradient(900px 380px at 88% -14%, rgba(142,124,255,.07) 0%, transparent 72%)}
.shell{display:flex;min-height:100vh;background:var(--pitch);color:var(--chalk)}
.shell-gate{align-items:center;justify-content:center}

/* ---------- barra superior ---------- */
.topbar{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--line);
  background:rgba(9,12,19,.86);backdrop-filter:blur(14px)}
.topbar-in{max-width:1280px;margin:0 auto;padding:0 24px;height:var(--bar);
  display:flex;align-items:center;gap:26px}
.brand{display:flex;align-items:center;gap:10px;flex:0 0 auto}
.brand-mark{width:16px;height:16px;border-radius:3px;flex:0 0 auto;
  background:linear-gradient(135deg,var(--mark) 0 48%,var(--sodium) 48% 100%)}
.brand-txt{display:flex;flex-direction:column;line-height:1}
.brand-word{font-size:18px;font-weight:700;letter-spacing:.01em;
  font-variation-settings:'wdth' 122}
.brand-sub{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:var(--faint);margin-top:3px}
.nav{display:flex;gap:2px;margin-right:auto;overflow-x:auto;scrollbar-width:none}
.nav::-webkit-scrollbar{display:none}
.navbtn{all:unset;cursor:pointer;position:relative;display:inline-flex;align-items:center;gap:7px;
  padding:8px 13px;border-radius:var(--r);font-size:13px;color:var(--dim);white-space:nowrap;transition:.15s}
.navbtn .ico{opacity:.7}
.navbtn:hover{color:var(--chalk);background:var(--turf)}
.navbtn:hover .ico{opacity:1}
.navbtn-on{background:var(--turf2);color:var(--chalk);font-weight:600;box-shadow:inset 0 0 0 1px var(--line)}
.navbtn-on .ico{opacity:1;color:var(--mark)}
.navbtn:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.ico{width:16px;height:16px;flex:0 0 auto}
.navbadge{font-size:10px;font-weight:700;line-height:1;padding:3px 6px;border-radius:var(--pill);
  background:var(--mark);color:var(--mark-ink);font-style:normal}
.topbar-right{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.qpill{display:flex;flex-direction:column;gap:5px;min-width:116px;padding:7px 11px;
  border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}
.qpill-top{display:flex;justify-content:space-between;gap:10px;font-size:10.5px;color:var(--dim)}
.qpill-top b{color:var(--chalk);font-weight:600}
.qtrack{height:3px;background:var(--turf2);border-radius:var(--pill);overflow:hidden}
.qfill{height:100%;background:var(--dim)}
.qfill-hot{background:var(--red)}
.iconbtn{all:unset;cursor:pointer;width:34px;height:34px;border-radius:var(--r);display:grid;
  place-items:center;border:1px solid var(--line);color:var(--dim);font-size:14px}
.iconbtn:hover{color:var(--chalk);border-color:var(--dim)}
.iconbtn:focus-visible{outline:2px solid var(--mark);outline-offset:2px}

/* Lo abierto no es una sección: tiene su propia tira y se cierra. */
.ctxbar{border-top:1px solid var(--line-soft);background:var(--surface)}
.ctxbar-in{max-width:1280px;margin:0 auto;padding:8px 24px;display:flex;gap:8px;
  overflow-x:auto;scrollbar-width:none}
.ctxbar-in::-webkit-scrollbar{display:none}
.ctx{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:var(--pill);
  background:var(--turf);max-width:min(420px,70vw)}
.ctx-on{border-color:var(--mark);background:var(--mark-soft)}
.ctx-go{all:unset;cursor:pointer;display:inline-flex;align-items:baseline;gap:8px;padding:5px 4px 5px 13px;
  font-size:12.5px;color:var(--chalk);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ctx-go em{font-style:normal;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.ctx-on .ctx-go em{color:var(--mark)}
.ctx-go:focus-visible{outline:2px solid var(--mark);outline-offset:-2px;border-radius:var(--pill)}
.ctx-x{all:unset;cursor:pointer;width:26px;height:26px;display:grid;place-items:center;color:var(--faint);
  font-size:15px;border-radius:var(--pill);flex:0 0 auto}
.ctx-x:hover{color:var(--red);background:var(--turf2)}
.ctx-x:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}

/* ---------- navegación de pulgar (móvil) ---------- */
.tabbar{display:none}

.main{flex:1;min-width:0}
.page{max-width:1280px;margin:0 auto;padding:26px 24px calc(96px + var(--tabh))}
.page-head{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end;justify-content:space-between;
  padding-bottom:18px;margin-bottom:22px;border-bottom:1px solid var(--line)}
.h1{font-size:31px;font-weight:700;letter-spacing:-.01em;margin:0;line-height:1}
.page-sub{font-size:12.5px;color:var(--dim);margin:8px 0 0;line-height:1.55;max-width:600px}

/* ---------- tarjetas ---------- */
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  box-shadow:var(--sh);overflow:hidden}
.card + .card{margin-top:var(--gap)}
.card-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;
  padding:12px 18px;border-bottom:1px solid var(--line);background:var(--turf)}
.card-title{font-size:13px;letter-spacing:.02em;color:var(--chalk);font-weight:600;margin:0;
  font-variation-settings:'wdth' 112}
.card-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.card-body{padding:18px}
.card-body > .rule:first-child{margin-top:0}
.card-body > :last-child{margin-bottom:0}
.card-flush{padding:0}
.card-note{font-size:11px;color:var(--faint)}

/* ---------- controles ---------- */
.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.input{background:var(--turf);border:1px solid var(--line);color:var(--chalk);padding:7px 11px;
  border-radius:var(--r);font-size:13px;outline:none;transition:.15s}
.input:focus{border-color:var(--mark);box-shadow:0 0 0 3px var(--mark-soft)}
.input-date{color-scheme:dark;width:150px}
.input-search{width:190px}
select.input{cursor:pointer;max-width:280px}
.btn{all:unset;cursor:pointer;padding:7px 14px;border-radius:var(--r);font-size:13px;
  border:1px solid var(--line);text-align:center;transition:.15s}
.btn:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.btn-ghost{color:var(--dim)}
.btn-ghost:hover{color:var(--chalk);border-color:var(--dim);background:var(--turf)}
.btn-primary{background:var(--mark);color:var(--mark-ink);font-weight:600;border-color:var(--mark)}
.btn-primary:hover{filter:brightness(1.08)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed;filter:none}
.btn-quiet{color:var(--faint);font-size:11.5px;padding:5px 9px}
.btn-quiet:hover{color:var(--chalk);background:var(--turf)}
.btn-quiet:disabled{opacity:.5;cursor:not-allowed}
.btn-live-on{background:rgba(240,86,75,.13);border-color:var(--red);color:#F7A79F}
.dot{display:inline-block;width:6px;height:6px;border-radius:var(--pill);background:var(--red);
  margin-right:6px;animation:pulse 1.4s infinite}
@keyframes pulse{50%{opacity:.25}}
.back{all:unset;cursor:pointer;color:var(--dim);font-size:12.5px;margin-bottom:16px;
  display:inline-flex;align-items:center;gap:6px}
.back:hover{color:var(--mark)}

.rule{display:flex;align-items:center;gap:12px;margin:26px 0 12px}
.rule-label{font-size:12px;letter-spacing:.02em;color:var(--chalk);white-space:nowrap;font-weight:600;
  font-variation-settings:'wdth' 110}
.rule-line{flex:1;height:1px;background:var(--line)}

.spinner{display:flex;align-items:center;gap:10px;color:var(--dim);font-size:13px;padding:28px 0}
.ball{width:9px;height:9px;border-radius:99px;background:var(--mark);animation:bounce .7s infinite alternate}
@keyframes bounce{to{transform:translateY(-7px);opacity:.5}}
.empty{border:1px dashed var(--line);border-radius:var(--r-lg);padding:30px;text-align:center;margin:14px 0}
.empty-title{font-size:15px;font-weight:600}
.empty-hint{font-size:12.5px;color:var(--dim);margin-top:7px;max-width:480px;margin-left:auto;
  margin-right:auto;line-height:1.6}
.alert{border:1px solid var(--red);background:rgba(240,86,75,.08);color:#F8ADA6;
  padding:10px 12px;border-radius:var(--r);font-size:12.5px;margin:12px 0}
.foot{font-size:11.5px;color:var(--faint);line-height:1.65;margin-top:18px;max-width:660px}
.crest{object-fit:contain;flex:0 0 auto}
.crest-blank{display:inline-block;background:var(--turf2);border-radius:var(--r)}
.dim{color:var(--faint)}

/* ---------- puerta ---------- */
.gate{width:min(440px,92vw);display:flex;flex-direction:column;gap:26px}
.gate-mark{display:flex;flex-direction:column;gap:2px}
.gate-word{font-size:56px;font-weight:800;letter-spacing:-.02em;display:block;line-height:1;
  font-variation-settings:'wdth' 122}
.gate-sub{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);display:block;margin-top:10px}
.gate-card{border:1px solid var(--line);background:var(--surface);border-radius:var(--r-lg);padding:22px;
  display:flex;flex-direction:column;gap:10px}
.fl{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.gate-note{font-size:11.5px;color:var(--faint);line-height:1.65;margin:0}

/* ---------- cartelera ---------- */
.daybar{display:flex;align-items:center;gap:8px;margin-bottom:18px}
.dayarrow{all:unset;cursor:pointer;width:32px;height:46px;display:grid;place-items:center;
  border:1px solid var(--line);border-radius:var(--r);color:var(--dim);font-size:17px;flex:0 0 auto}
.dayarrow:hover{color:var(--chalk);border-color:var(--dim);background:var(--turf)}
.dayarrow:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.daystrip{display:flex;gap:6px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
.daystrip::-webkit-scrollbar{display:none}
.day{all:unset;cursor:pointer;flex:1 1 0;min-width:62px;height:46px;display:flex;
  flex-direction:column;align-items:center;justify-content:center;gap:2px;
  border:1px solid var(--line);border-radius:var(--r);transition:.15s}
.day:hover{background:var(--turf);border-color:var(--dim)}
.day:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.day-dow{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.day-num{font-size:16px;color:var(--dim);line-height:1}
.day-hoy .day-dow{color:var(--mark)}
.day-on{background:var(--mark);border-color:var(--mark)}
.day-on .day-dow{color:rgba(10,13,22,.65)}
.day-on .day-num{color:var(--mark-ink);font-weight:700}
html[data-tema="claro"] .day-on .day-dow{color:rgba(255,255,255,.75)}
.dayjump{flex:0 0 auto;height:46px}

.fx-resumen{display:flex;flex-wrap:wrap;gap:16px;align-items:center;font-size:12px;color:var(--dim);
  margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.fx-resumen b{color:var(--chalk);font-size:13px;margin-right:3px}
.fx-vivos{display:inline-flex;align-items:center;color:var(--red)}
.fx-filtro{margin-left:auto;color:var(--faint);font-style:italic}

.lg-card{margin-bottom:var(--gap)}
.lg-toggle{all:unset;cursor:pointer;box-sizing:border-box;width:100%;display:flex;align-items:center;
  gap:10px;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--turf);transition:.15s}
.lg-toggle:hover{background:var(--turf2)}
.lg-toggle:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}
.lg-name{font-size:15px;font-weight:600;letter-spacing:-.005em;font-variation-settings:'wdth' 112}
.lg-country{font-size:11.5px;color:var(--faint);text-transform:uppercase;letter-spacing:.1em}
.lg-vivo{display:inline-flex;align-items:center;font-size:11px;color:var(--red);font-weight:600}
.lg-count{margin-left:auto;font-size:11px;color:var(--dim);background:var(--turf2);
  border-radius:var(--pill);padding:2px 9px}
.lg-chev{color:var(--faint);font-size:15px;transition:.2s;transform:rotate(90deg)}
.lg-chev-on{transform:rotate(-90deg)}

.fx-list{display:flex;flex-direction:column}
.fx{all:unset;cursor:pointer;display:grid;grid-template-columns:66px minmax(0,1fr) 34px 16px;
  gap:12px;align-items:center;padding:11px 16px;border-bottom:1px solid var(--line-soft);transition:.12s}
.fx:last-child{border-bottom:none}
.fx:hover{background:var(--turf)}
.fx:hover .fx-go{color:var(--mark);transform:translateX(2px)}
.fx:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}
.fx-estado{font-family:'Roboto Mono',monospace;font-size:11.5px;color:var(--dim);text-align:center;
  display:inline-flex;align-items:center;justify-content:center}
.fx-estado-vivo{color:var(--red);font-weight:600}
.fx-estado-raro{color:var(--faint);font-size:10px}
.fx-teams{display:flex;flex-direction:column;gap:6px;min-width:0}
.fx-team{display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--dim);min-width:0}
.fx-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fx-win{color:var(--chalk);font-weight:600}
.fx-score{display:flex;flex-direction:column;gap:6px;text-align:right;font-size:13.5px}
.fx-go{color:var(--line);font-size:15px;transition:.15s}

/* ---------- cabecera del partido ---------- */
.sb{margin-bottom:var(--gap);overflow:visible}
.sb-meta{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:11px;color:var(--dim);
  padding:12px 18px;border-bottom:1px solid var(--line);background:var(--turf)}
.sb-liga{font-size:12.5px;color:var(--chalk);font-weight:600}
.sb-round{letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.sb-fecha{color:var(--dim)}
.sb-pill{margin-left:auto;display:inline-flex;align-items:center;font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;border:1px solid var(--line);border-radius:var(--pill);padding:4px 11px;
  color:var(--dim);white-space:nowrap}
.sb-pill-live{color:var(--red);border-color:var(--red);background:rgba(240,86,75,.1);font-weight:600}
.sb-pill-done{color:var(--faint)}
.sep{color:var(--faint)}
.sb-main{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:22px;padding:28px 18px 22px}
.sb-team{all:unset;cursor:pointer;display:flex;align-items:center;gap:14px;font-size:18px;font-weight:600;
  min-width:0;border-radius:var(--r);padding:8px 10px;transition:.15s}
.sb-team:hover{background:var(--turf)}
.sb-team:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.sb-h{flex-direction:row-reverse;justify-content:flex-start;text-align:right}
.sb-h .sb-nombre{align-items:flex-end}
.sb-nombre{display:flex;flex-direction:column;gap:3px;min-width:0;line-height:1.25}
.sb-ver{font-style:normal;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--faint);font-weight:400;opacity:0;transition:.15s}
.sb-team:hover .sb-ver{opacity:1;color:var(--mark)}
.sb-a{flex-direction:row;justify-content:flex-start;text-align:left}
.sb-a .sb-nombre{align-items:flex-start}
.sb-mid{text-align:center}
.sb-score{font-size:54px;font-weight:800;display:flex;gap:12px;justify-content:center;line-height:1;
  letter-spacing:-.03em}
.sb-score i{color:var(--faint);font-style:normal}
.sb-state{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-top:8px}
.sb-state-live{color:var(--red)}
.sb-breaks{font-size:10.5px;color:var(--faint);margin-top:5px}
.sb-foot{display:flex;flex-wrap:wrap;gap:16px;font-size:11px;color:var(--faint);
  border-top:1px solid var(--line);padding:11px 18px}
.sb-id{margin-left:auto}

/* ---------- pestañas del partido ---------- */
.tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tabs-pill{position:sticky;top:calc(var(--bar) + var(--ctxh));z-index:20;background:var(--pitch);
  padding:10px 0 0;margin-bottom:6px;border-bottom:1px solid var(--line)}
.tab{all:unset;cursor:pointer;padding:9px 14px;font-size:13px;color:var(--dim);white-space:nowrap;
  border-bottom:2px solid transparent;transition:.15s;margin-bottom:-1px}
.tab:hover{color:var(--chalk)}
.tab-on{color:var(--chalk);border-bottom-color:var(--mark);font-weight:600}
.tab:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}
.tabbody{padding-top:8px}

/* ---------- cinta del minuto ---------- */
.ribbon-frame{display:flex;align-items:center;gap:12px}
.ribbon-side{display:flex;flex-direction:column;justify-content:space-between;height:96px;padding:2px 0}
.ribbon{flex:1;min-width:0}
.ribbon-lane{position:relative;height:34px}
.ribbon-home{display:flex;align-items:flex-end}
.ribbon-away{display:flex;align-items:flex-start}
.ribbon-track{position:relative;height:22px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  background:repeating-linear-gradient(90deg,transparent 0 34px,var(--line-soft) 34px 68px)}
.tick{position:absolute;top:0;height:100%;transform:translateX(-50%)}
.tick i{display:block;width:1px;height:7px;background:var(--faint);margin:0 auto}
.tick b{display:block;font-family:'Roboto Mono',monospace;font-size:9px;color:var(--faint);
  font-weight:400;margin-top:1px}
.now{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--red);transform:translateX(-50%);
  box-shadow:0 0 8px rgba(240,86,75,.8)}
.ev{position:absolute;transform:translateX(-50%);font-size:12px;line-height:1;font-style:normal;
  cursor:default;padding:2px}
.ribbon-home .ev{bottom:2px}
.ribbon-away .ev{top:2px}
.ev-goal{color:var(--sodium);font-size:15px}
.ev-own{color:var(--red);font-size:8.5px;font-weight:700;letter-spacing:-.02em}
.ev-miss{color:var(--faint);font-size:14px}
.ev-yellow{color:var(--yellow)}
.ev-red{color:var(--red)}
.ev-sub{color:var(--faint);font-size:11px}
.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:11px;color:var(--dim);margin-top:12px}
.legend span{display:flex;align-items:center;gap:5px}
.legend .ev{position:static;transform:none;padding:0}

.goals{list-style:none;padding:0;margin:0}
.goals li{display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px solid var(--line-soft);font-size:13.5px}
.goals .gh{border-left:2px solid var(--sodium);padding-left:12px}
.goals .ga{border-left:2px solid var(--cool);padding-left:12px}
.gmin{font-size:11.5px;color:var(--dim);min-width:38px}
.gname{font-weight:600}
.gassist{font-size:11.5px;color:var(--faint)}
.gtag{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--sodium);
  border:1px solid var(--line);padding:1px 5px;border-radius:2px}
.timeline{list-style:none;padding:0;margin:0}
.timeline li{display:grid;grid-template-columns:46px 150px 1fr;gap:10px;padding:5px 0;font-size:12.5px;
  border-bottom:1px solid var(--line-soft)}
.timeline .th{border-left:2px solid var(--sodium);padding-left:10px}
.timeline .ta{border-left:2px solid var(--cool);padding-left:10px}
.tmin{color:var(--dim);font-size:11px}
.tdet{color:var(--dim)}

/* ---------- comparativas ---------- */
.vsrow{display:grid;grid-template-columns:62px 1fr 62px;gap:12px;align-items:center;padding:6px 0}
.vsbody{min-width:0}
.vsval{font-family:'Roboto Mono',monospace;font-size:13px;color:var(--dim);text-align:right;
  font-variant-numeric:tabular-nums}
.vsval-a{text-align:left}
.vsval-lead{color:var(--chalk);font-weight:600}
.vslabel{font-size:11px;color:var(--dim);text-align:center;margin-bottom:5px}
.vstrack{display:flex;height:5px;border-radius:99px;overflow:hidden;background:var(--turf2)}
.vsfill{height:100%;transition:width .35s}
.vsfill-h{background:var(--sodium)}
.vsfill-a{background:var(--cool)}
.statlegend{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.1em;
  text-transform:uppercase;margin-bottom:8px}
.lg-h{color:var(--sodium)} .lg-a{color:var(--cool)}

/* ---------- previa ---------- */
.pred{display:flex;flex-direction:column}
.prob{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:end;height:190px;margin-bottom:16px}
.probcol{display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;gap:8px}
.probval{font-size:20px;font-weight:700}
.probtrack{width:56px;flex:1;background:var(--turf2);display:flex;align-items:flex-end;border-radius:var(--r);overflow:hidden}
.probfill{width:100%;transition:height .5s}
.p-h{background:var(--sodium)} .p-d{background:var(--faint)} .p-a{background:var(--cool)}
.problabel{font-size:11.5px;color:var(--dim);text-align:center;line-height:1.3;max-width:120px}
.advice{border:1px solid var(--mark);background:var(--mark-soft);padding:12px 14px;
  border-radius:var(--r);font-size:14px;display:flex;gap:10px;align-items:center}
.advice-tag{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mark);flex:0 0 auto}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
.chip{border:1px solid var(--line);padding:4px 9px;border-radius:99px;font-size:11.5px;color:var(--dim)}
.chip-on{color:var(--mark);border-color:rgba(142,124,255,.45)}
.h2hsum{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:14px}
.h2hcell{border:1px solid var(--line);border-radius:var(--r);padding:12px;text-align:center}
.h2hcell b{display:block;font-size:23px;font-weight:700}
.h2hcell span{font-size:10.5px;color:var(--dim);line-height:1.3;display:block;margin-top:3px}
.h2hlist{list-style:none;padding:0;margin:0}
.h2hlist li{display:grid;grid-template-columns:96px 1fr 2fr;gap:10px;padding:6px 0;font-size:12.5px;
  border-bottom:1px solid var(--line-soft);align-items:center}
.h2hdate{color:var(--dim);font-size:11px}
.h2hcomp{color:var(--faint);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.h2hteams b{margin:0 7px;color:var(--sodium)}
.injgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.injcol{border:1px solid var(--line);border-radius:var(--r);padding:12px}
.injhead{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;margin-bottom:9px}
.injrow{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;padding:4px 0;
  border-top:1px solid var(--line-soft)}
.injtag{font-size:10.5px}
.injout{color:var(--red)} .injdoubt{color:var(--yellow)}
.injnone{font-size:12px;color:var(--faint)}

/* ---------- alineaciones ---------- */
.forms{display:flex;justify-content:space-between;margin-bottom:12px}
.formbox{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--dim)}
.formbox b{font-size:16px;color:var(--chalk)}
.formbox-a{flex-direction:row-reverse;text-align:right}
.pitchwrap{position:relative;display:flex;border:1px solid var(--line);border-radius:var(--r-lg);
  background:linear-gradient(180deg,#0C1220,#0A0E18);min-height:300px;overflow:hidden}
html[data-tema="claro"] .pitchwrap{background:linear-gradient(180deg,#F6F4EE,#EFEBE2)}
.pitch{position:relative;flex:1}
.pitch-lines{position:absolute;inset:0;pointer-events:none}
.pl-box{position:absolute;top:22%;bottom:22%;width:52px;border:1px solid var(--line-soft)}
.pl-arc{position:absolute;top:50%;width:26px;height:52px;border:1px solid var(--line-soft);
  transform:translateY(-50%)}
.pitch-home .pl-box{left:0;border-left:none}
.pitch-home .pl-arc{left:52px;border-left:none;border-radius:0 60px 60px 0}
.pitch-away .pl-box{right:0;border-right:none}
.pitch-away .pl-arc{right:52px;border-right:none;border-radius:60px 0 0 60px}
.halfway{position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line)}
.centre{position:absolute;left:50%;top:50%;width:64px;height:64px;border:1px solid var(--line);
  border-radius:99px;transform:translate(-50%,-50%)}
.pline{position:absolute;top:0;bottom:0;display:flex;flex-direction:column;justify-content:space-evenly;
  align-items:center;transform:translateX(-50%)}
.pman{display:flex;flex-direction:column;align-items:center;gap:3px;width:62px}
.pnum{width:25px;height:25px;border-radius:99px;display:grid;place-items:center;font-size:11px;font-weight:700}
.pnum-h{background:var(--sodium);color:#0A0E18}
.pnum-a{background:var(--cool);color:#0A0E18}
.pname{font-size:9.5px;color:var(--dim);text-align:center;line-height:1.15;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:62px}
.benchgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.bench{border:1px solid var(--line);border-radius:var(--r);padding:12px}
.benchhead{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;margin-bottom:8px}
.benchrow{display:flex;align-items:center;gap:8px;font-size:12px;padding:3px 0;color:var(--dim)}
.benchnum{color:var(--faint);width:20px;font-size:11px}
.benchpos{margin-left:auto;font-size:10px;color:var(--faint)}

/* ---------- tablas ---------- */
.tablewrap{overflow-x:auto;scrollbar-width:thin}
.table{width:100%;border-collapse:collapse;font-size:12.5px}
.table th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);
  font-weight:500;padding:8px 6px;text-align:center;border-bottom:1px solid var(--line);white-space:nowrap}
.table td{padding:7px 6px;text-align:center;border-bottom:1px solid var(--line-soft)}
.table .tl{text-align:left}
.table tbody tr:hover{background:var(--turf)}
.sortbtn{all:unset;cursor:pointer;color:inherit}
.sortbtn:hover{color:var(--chalk)}
.sortbtn-on{color:var(--mark)}
.pl-name{margin:0 7px}
.pl-pos{font-size:10px;color:var(--faint)}
.rate{font-weight:600}
.rate-hi{color:var(--win)} .rate-lo{color:var(--red)}
.cardpip{display:inline-block;width:6px;height:9px;border-radius:1px;margin-left:2px}
.cy{background:var(--yellow)} .cr{background:var(--red)}
.table-stand td{padding:6px}
.rank{color:var(--dim)}
.pts{font-weight:700;color:var(--chalk)}
.linkteam{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px}
.linkteam:hover{color:var(--mark)}
.z-ucl td:first-child{box-shadow:inset 3px 0 0 var(--cool)}
.z-uel td:first-child{box-shadow:inset 3px 0 0 var(--win)}
.z-pro td:first-child{box-shadow:inset 3px 0 0 var(--sodium)}
.z-rel td:first-child{box-shadow:inset 3px 0 0 var(--red)}
.splitbar{display:flex;gap:3px;margin-bottom:10px}
.splitbtn{all:unset;cursor:pointer;padding:5px 11px;font-size:11.5px;color:var(--dim);
  border:1px solid var(--line);border-radius:var(--r)}
.splitbtn-on{background:var(--turf2);color:var(--chalk);box-shadow:inset 0 0 0 1px var(--line)}
.form{display:inline-flex;gap:2px}
.pip{display:grid;place-items:center;width:15px;height:15px;border-radius:2px;font-size:9px;
  font-style:normal;font-weight:700;color:var(--pitch)}
.form-sm .pip{width:13px;height:13px;font-size:8px}
.pip-W{background:var(--win)} .pip-D{background:var(--faint)} .pip-L{background:var(--red)}

.cov{display:flex;flex-wrap:wrap;gap:6px}
.covchip{font-size:11px;padding:3px 8px;border-radius:99px;border:1px solid var(--line)}
.cov-yes{color:var(--win);border-color:rgba(55,201,138,.4)}
.cov-no{color:var(--faint)}

.scorers{display:flex;flex-direction:column}
.scorer{display:grid;grid-template-columns:26px 30px 1fr auto auto;gap:12px;align-items:center;
  padding:8px 0;border-bottom:1px solid var(--line-soft)}
.srank{color:var(--faint);font-size:11px;text-align:right}
.sinfo b{display:block;font-size:13px}
.sinfo span{font-size:11px;color:var(--dim)}
.sgoals{text-align:right}
.sgoals b{font-size:20px;color:var(--sodium)}
.sgoals span{display:block;font-size:10px;color:var(--faint)}
.seff{text-align:right;font-size:12px;color:var(--dim);min-width:70px}
.seff span{display:block;font-size:9.5px;color:var(--faint)}

/* ---------- equipo ---------- */
.teamhead{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.teamhead .h1{font-size:30px}
.teamsub{font-size:12.5px;color:var(--dim)}
.cutbox{margin-left:auto;display:flex;flex-direction:column;gap:4px;max-width:230px}
.cuthint{font-size:10.5px;color:var(--faint);line-height:1.45}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.kpi{border:1px solid var(--line);border-radius:var(--r);padding:14px}
.kpibig{font-size:27px;font-weight:700;line-height:1.05;letter-spacing:-.02em}
.kpilabel{font-size:10.5px;color:var(--dim);margin-top:6px;line-height:1.35}
.minutebands{border:1px solid var(--line);border-radius:var(--r);padding:14px}
.mbrow{display:flex;align-items:center;gap:12px}
.mblabel{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);width:56px;flex:0 0 56px}
.mbtrack{flex:1;display:flex;gap:5px;height:74px;align-items:flex-end}
.mbtrack-down{align-items:flex-start}
.mbcell{flex:1;position:relative;height:100%;display:flex;align-items:flex-end}
.mbtrack-down .mbcell{align-items:flex-start}
.mbbar{width:100%;border-radius:2px;transition:height .4s}
.mbbar-f{background:var(--sodium)}
.mbbar-a{background:var(--cool)}
.mbval{position:absolute;left:50%;transform:translateX(-50%);top:-14px;font-size:10px;color:var(--dim)}
.mbtrack-down .mbval{top:auto;bottom:-14px}
.mbaxis{display:flex;gap:5px;margin-left:68px;padding:6px 0}
.mbaxis span{flex:1;text-align:center;font-size:9.5px;color:var(--faint)}
.ou{border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.ourow{display:grid;grid-template-columns:60px 1fr 1fr;gap:14px;padding:10px 13px;align-items:center;
  border-bottom:1px solid var(--line-soft);font-size:12.5px}
.ourow:last-child{border-bottom:none}
.ouline{font-size:16px;color:var(--chalk);font-weight:700}
.oublock{display:flex;justify-content:space-between;gap:10px}
.oulab{color:var(--dim);font-size:11px}
.biggest{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.biggest div{border:1px solid var(--line);border-radius:var(--r);padding:12px}
.blab{display:block;font-size:10.5px;color:var(--dim);margin-bottom:5px}
.biggest b{font-size:17px}

/* ---------- cuotas ---------- */
.books{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px}
.bookbtn{all:unset;cursor:pointer;padding:5px 11px;font-size:11.5px;border:1px solid var(--line);
  border-radius:var(--r);color:var(--dim)}
.bookbtn-on{background:var(--turf2);color:var(--chalk);border-color:var(--dim);font-weight:600}
.betgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.betcard{border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.bethead{background:var(--turf);padding:9px 11px;font-size:12px;font-weight:600;border-bottom:1px solid var(--line)}
.betvals{max-height:200px;overflow-y:auto}
.betval{display:flex;justify-content:space-between;gap:10px;padding:5px 11px;font-size:12px;
  border-bottom:1px solid var(--line-soft)}
.betlabel{color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.betodd{color:var(--chalk);font-weight:600}

/* ---------- mercados ---------- */
.mkwrap-pad{padding-bottom:104px}
.mk-model{display:flex;flex-direction:column;gap:2px}
.mk-xg{display:grid;grid-template-columns:1fr 1fr;gap:14px 10px;align-items:start}
.xgside{display:flex;flex-direction:column;gap:3px;min-width:0}
.xgright{text-align:right}
.xglab{font-size:12px;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.xgval{font-size:32px;font-weight:700;line-height:1;letter-spacing:-.03em}
.xgsub{font-size:10px;color:var(--faint)}
.xgmid{grid-column:1/-1;text-align:center;order:-1}
.xgtitle{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--faint)}
.xgtrack{height:6px;background:var(--cool);border-radius:99px;overflow:hidden;margin:9px 0 6px}
.xgfill{display:block;height:100%}
.xgh{background:var(--sodium)}
.xgtot{font-size:11px;color:var(--dim)}
.mk-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:16px;padding-top:14px;
  border-top:1px solid var(--line)}

.conf{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--dim);
  border:1px solid var(--line);border-radius:99px;padding:3px 10px}
.conf i{width:3px;height:9px;border-radius:1px;background:var(--line);display:inline-block}
.conf i:last-of-type{margin-right:5px}
.conf-alta i{background:var(--win)}
.conf-media i:nth-of-type(-n+2){background:var(--yellow)}
.conf-baja i:first-of-type{background:var(--red)}
.adjbox{margin-top:14px;padding-top:14px;border-top:1px solid var(--line);
  display:grid;grid-template-columns:1fr;gap:12px}
.adj{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dim)}
.adj span{flex:0 0 104px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adj input[type=range]{flex:1;min-width:0;accent-color:var(--mark)}
.adj select{flex:1;min-width:0}
.adj b{width:46px;text-align:right;color:var(--chalk)}
.adjbox .foot{grid-column:1/-1;margin-top:0}

.picks{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:16px}
.pickcard{all:unset;cursor:pointer;position:relative;border:1px solid var(--line);border-radius:var(--r);
  padding:15px;display:grid;gap:5px;transition:.15s;background:var(--turf)}
.pickcard:hover{border-color:var(--dim)}
.pickcard-1{border-color:var(--line);background:var(--turf2)}
.pickcard-on{border-color:var(--mark);background:var(--mark-soft);box-shadow:inset 0 0 0 1px var(--mark)}
.pickcard:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.pickrank{position:absolute;top:12px;right:14px;font-size:11px;color:var(--faint)}
.pickmkt{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
.picksel{font-size:15px;font-weight:600;line-height:1.25}
.pickp{font-size:21px;font-weight:700;line-height:1.1}
.pickcard .pbar{margin-top:2px}

.famnav{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.fambtn{all:unset;cursor:pointer;padding:6px 12px;font-size:12.5px;color:var(--dim);
  border:1px solid var(--line);border-radius:99px;display:inline-flex;align-items:center;gap:6px}
.fambtn:hover{color:var(--chalk);border-color:var(--dim)}
.fambtn:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.fambtn i{font-style:normal;font-size:10px;color:var(--faint)}
.fambtn-on{background:var(--chalk);color:var(--pitch);border-color:var(--chalk);font-weight:600}
.fambtn-on i{color:rgba(9,12,19,.55)}
.fampanel{min-height:180px}
.colhead{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin:22px 0 8px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;align-items:start}

/* fila de mercado */
.mrow{display:grid;grid-template-columns:20px minmax(0,1fr) 92px 54px;gap:10px;align-items:center;
  padding:6px 2px;border-bottom:1px solid var(--line-soft)}
.mrow-on{background:var(--mark-soft)}
.addbtn{all:unset;cursor:pointer;width:18px;height:18px;border:1px solid var(--line);border-radius:3px;
  display:grid;place-items:center;font-size:13px;line-height:1;color:var(--faint)}
.addbtn:hover{color:var(--mark);border-color:var(--mark)}
.addbtn:focus-visible{outline:2px solid var(--mark);outline-offset:1px}
.addbtn-on{background:var(--mark);color:var(--mark-ink);border-color:var(--mark)}
.mrow-lab{min-width:0;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mrow-mkt{color:var(--dim);margin-right:8px}
.mrow-sel{color:var(--chalk)}
.mrow-note{font-size:10px;color:var(--faint);margin-left:8px}
.mrow-p{text-align:right;font-size:12.5px}
.pbar{height:5px;background:var(--turf2);border-radius:99px;overflow:hidden}
.pfill{height:100%;background:var(--dim)}
.pfill-hi{background:var(--chalk)}
.pfill-lo{background:var(--turf2);box-shadow:inset 0 0 0 1px var(--line)}

/* la escalera */
.ld{border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.ldhead{display:grid;grid-template-columns:1fr 54px 1fr;background:var(--turf);
  border-bottom:1px solid var(--line);font-size:9px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--faint);padding:7px 0}
.ldhl{text-align:right;padding-right:12px}
.ldhc{text-align:center}
.ldhr{padding-left:12px}
.ldrow{display:grid;grid-template-columns:1fr 54px 1fr;align-items:stretch;
  border-bottom:1px solid var(--line-soft)}
.ldrow:last-child{border-bottom:none}
.ldside{all:unset;cursor:pointer;display:flex;align-items:center;gap:9px;padding:8px 12px;min-width:0}
.ldside:hover{background:var(--turf)}
.ldside:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}
.ldu{flex-direction:row-reverse}
.ldtrack{flex:1;min-width:0;height:8px;display:flex;border-radius:2px;overflow:hidden}
.ldu .ldtrack{justify-content:flex-end}
.ldbar{height:100%;border-radius:2px;background:rgba(79,182,232,.28)}
.ldo .ldbar{background:rgba(240,178,63,.28)}
.ldlead.ldu .ldbar{background:var(--cool)}
.ldlead.ldo .ldbar{background:var(--sodium)}
.ldpct{font-size:11.5px;color:var(--dim);flex:0 0 44px;text-align:center}
.ldlead .ldpct{color:var(--chalk);font-weight:600}
.ldpicked{background:var(--mark-soft);box-shadow:inset 0 0 0 1px var(--mark)}
.ldline{display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--chalk);
  border-left:1px solid var(--line);border-right:1px solid var(--line)}

/* barra de tres tramos */
.tri{margin-bottom:4px}
.tritrack{display:flex;height:38px;border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.triseg{all:unset;cursor:pointer;display:grid;place-items:center;font-size:12px;transition:.25s;overflow:hidden}
.triseg:focus-visible{outline:2px solid var(--chalk);outline-offset:-3px}
.tri0{background:rgba(240,178,63,.82);color:#0A0E18;font-weight:600}
.tri1{background:var(--turf2);color:var(--dim)}
.tri2{background:rgba(79,182,232,.82);color:#0A0E18;font-weight:600}
.triseg-on{box-shadow:inset 0 0 0 2px var(--mark)}
.trilabels{display:flex;gap:10px;font-size:11.5px;color:var(--dim);margin-top:6px}
.trilab{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tl1{text-align:center}
.tl2{text-align:right}

/* hándicap */
.hcp{border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.hcprow{display:grid;grid-template-columns:50px 1fr 1fr 78px;align-items:center;
  border-bottom:1px solid var(--line-soft)}
.hcprow:last-child{border-bottom:none}
.hcpline{text-align:center;font-size:12.5px;color:var(--chalk);font-weight:600}
.hcpside{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;padding:7px 10px;min-width:0}
.hcpside:hover{background:var(--turf)}
.hcpside:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}
.hcpside .mono{font-size:11.5px;color:var(--dim);flex:0 0 44px;text-align:center}
.hcptrack{flex:1;min-width:0;height:7px;display:flex}
.hcpside-a .hcptrack{justify-content:flex-end}
.hcpbar{height:100%;border-radius:2px;background:rgba(240,178,63,.5)}
.hcpbar-a{background:rgba(79,182,232,.5)}
.hcp-on{background:var(--mark-soft);box-shadow:inset 0 0 0 1px var(--mark)}
.hcpnote{font-size:10px;color:var(--faint);padding-right:10px;text-align:right}
.hcplegend{display:flex;justify-content:space-between;font-size:10.5px;letter-spacing:.12em;
  text-transform:uppercase;margin-top:6px;padding:0 52px 0 50px}

/* totales asiáticos */
.asian{border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.asrow{display:grid;grid-template-columns:46px 1fr 1fr 66px;align-items:center;
  border-bottom:1px solid var(--line-soft)}
.asrow:last-child{border-bottom:none}
.asline{text-align:center;font-size:12.5px;color:var(--chalk);font-weight:600}
.asbtn{all:unset;cursor:pointer;display:flex;justify-content:space-between;gap:8px;padding:8px 11px;
  font-size:11.5px;color:var(--dim)}
.asbtn:hover{background:var(--turf)}
.asbtn:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}
.asbtn b{color:var(--chalk)}
.asbtn-on{background:var(--mark-soft);box-shadow:inset 0 0 0 1px var(--mark)}
.asnote{font-size:10px;color:var(--faint);text-align:right;padding-right:9px}

/* combinadas del propio partido */
.combos{display:grid;grid-template-columns:repeat(auto-fit,minmax(228px,1fr));gap:10px}
.combo{all:unset;cursor:pointer;border:1px solid var(--line);border-radius:var(--r);padding:13px;
  display:grid;gap:5px;transition:.15s;align-content:start}
.combo:hover{border-color:var(--dim)}
.combo:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.combo-on{border-color:var(--mark);background:var(--mark-soft)}
.combomkt{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
.combosel{font-size:13px;line-height:1.3}
.combop{font-size:19px;font-weight:700;line-height:1.1}

/* matriz de marcadores */
.matrixwrap{display:grid;grid-template-columns:auto 1fr;gap:26px;align-items:start}
.matrow{display:flex;align-items:center;gap:6px}
.mataxis{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.mataxis-top{text-align:center;padding-left:34px;margin-bottom:5px}
.mataxis-left span{writing-mode:vertical-rl;transform:rotate(180deg)}
.matrix{border-collapse:collapse;font-size:10.5px}
.matrix th{color:var(--faint);font-weight:400;padding:3px 6px;font-size:10px}
.mcell{width:44px;height:28px;text-align:center;border:1px solid var(--pitch);color:var(--chalk)}
.mc-h{background:rgba(240,178,63,var(--o,0))}
.mc-d{background:rgba(148,162,189,var(--o,0))}
.mc-a{background:rgba(79,182,232,var(--o,0))}
.matleg{display:flex;flex-wrap:wrap;gap:14px;font-size:10.5px;color:var(--dim);margin-top:10px}
.matleg span{display:flex;align-items:center;gap:6px}
.sw{width:10px;height:10px;border-radius:2px;display:inline-block;--o:.85}
.topscores{min-width:0}
.tshead{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-bottom:9px}
.tsrow{display:grid;grid-template-columns:40px 1fr 50px;gap:9px;align-items:center;padding:3px 0}
.tsscore{font-size:12px}
.tstrack{height:5px;background:var(--turf2);border-radius:99px;overflow:hidden}
.tsfill{height:100%;background:var(--dim)}
.tsp{font-size:11px;color:var(--dim);text-align:right}

/* props de jugador */
.propbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:4px}
.switch{display:inline-flex;align-items:center;gap:8px;font-size:12px;color:var(--dim);cursor:pointer}
.switch input{accent-color:var(--mark)}
.table-props td{padding:5px 4px}
.cellbtn{all:unset;cursor:pointer;padding:4px 7px;border-radius:3px;font-size:12px;color:var(--chalk)}
.cellbtn:hover{background:var(--turf2);color:var(--mark)}
.cellbtn:focus-visible{outline:2px solid var(--mark);outline-offset:1px}
.cellbtn-on{background:var(--mark);color:var(--mark-ink);font-weight:600}

/* bloques por calcular */
.stage{border:1px dashed var(--line);border-radius:var(--r);padding:20px;display:flex;
  flex-direction:column;gap:12px;align-items:flex-start}
.stage p{margin:0;font-size:12.5px;color:var(--dim);line-height:1.6;max-width:600px}
.expected{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.exp{border:1px solid var(--line);border-radius:var(--r);padding:12px}
.exp span{display:block;font-size:10.5px;color:var(--dim);margin-bottom:5px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.exp b{font-size:25px;font-weight:700;letter-spacing:-.02em}
.exp i{display:block;font-style:normal;font-size:9.5px;color:var(--faint);margin-top:4px}

/* ---------- barra de la combinada (dentro del partido) ---------- */
.builder{position:fixed;left:0;right:0;bottom:0;z-index:41;background:rgba(9,12,19,.96);
  border-top:1px solid var(--mark);backdrop-filter:blur(10px);padding-bottom:env(safe-area-inset-bottom)}
.builder-in{max-width:1280px;margin:0 auto;padding:11px 20px;display:flex;flex-wrap:wrap;
  gap:14px;align-items:center}
.bpicks{display:flex;flex-wrap:wrap;gap:6px;flex:1;min-width:200px;max-height:64px;overflow-y:auto}
.bpick{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font-size:11.5px;
  border:1px solid var(--line);border-radius:99px;padding:4px 10px;color:var(--dim);max-width:300px}
.bpick:hover{border-color:var(--red);color:var(--chalk)}
.bpick:focus-visible{outline:2px solid var(--mark);outline-offset:1px}
.bpick span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpick i{font-style:normal;color:var(--mark)}
.bpick-off{opacity:.45;text-decoration:line-through}
.bpick em{font-style:normal;color:var(--faint)}
.bbuscar{position:relative;flex:0 0 180px}
.bbuscar .input{width:100%;font-size:12px;padding:6px 9px}
.bsug{position:absolute;bottom:calc(100% + 6px);left:0;right:0;background:var(--surface);
  border:1px solid var(--line);border-radius:var(--r);overflow:hidden;max-height:220px;overflow-y:auto;z-index:5}
.bsugrow{all:unset;cursor:pointer;display:flex;justify-content:space-between;gap:8px;
  padding:7px 10px;font-size:11.5px;color:var(--dim)}
.bsugrow:hover{background:var(--turf2);color:var(--chalk)}
.bsugrow i{font-style:normal;color:var(--mark)}
.bres{display:flex;align-items:center;gap:18px;flex:0 0 auto}
.bres-blk{display:flex;flex-direction:column;gap:2px;min-width:0}
.blab{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.bp{font-size:24px;font-weight:700;line-height:1;letter-spacing:-.02em}
.bres-total .bp{color:var(--mark)}
.bnote{font-size:10.5px;color:var(--faint);max-width:210px;line-height:1.35}
.botros{font-size:10.5px;color:var(--mark);border:1px solid var(--line);border-radius:var(--pill);
  padding:3px 9px}
.bacts{display:flex;gap:6px;align-items:center}

.pick{border:1px solid var(--mark);background:var(--mark-soft);border-radius:var(--r);
  padding:14px 15px;margin-top:14px;display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.pick-tag{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim)}
.pickwhy{font-size:10.5px;color:var(--faint);line-height:1.5;margin-top:3px;
  display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}
.pickwhy b{color:var(--dim)}
.pickup{font-style:normal;color:var(--win);font-weight:600}
.pick-weak{border-color:var(--line);background:var(--turf);flex-direction:column;
  align-items:flex-start;gap:7px}
.pick-weak-note{font-size:12px;color:var(--dim);line-height:1.6;max-width:640px}

/* acciones de la barra lateral */
.mk-acts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:14px;padding-top:14px;
  border-top:1px solid var(--line)}
.mk-acts .btn{width:100%;font-size:12px;padding:7px 8px}
.mk-acts .btn-wide{grid-column:1/-1}
.mk-side .adj{flex-direction:column;align-items:stretch;gap:6px}
.mk-side .adj > span{flex:none;white-space:normal;overflow:visible;text-overflow:clip;
  font-size:11px;letter-spacing:.02em}
.mk-side .adj b{width:auto;text-align:left;font-size:12px}
.mk-side .adj input[type=range],.mk-side .adj select{width:100%}
.mk-side .adjwide{gap:10px}
.mk-side .switch{align-items:flex-start}
.mk-side .switch span{white-space:normal;line-height:1.5}
.mk-side .injimpact{grid-template-columns:1fr}
.mk-side .adjbox .foot{max-width:none}
.mk-side .adj-row{display:flex;align-items:center;gap:10px}

/* dos columnas en la pestaña de mercados */
.mk{display:grid;grid-template-columns:minmax(0,1fr) 328px;gap:var(--gap);align-items:start}
.mk-main{grid-column:1;grid-row:1;min-width:0;display:flex;flex-direction:column;gap:var(--gap)}
.mk-main > .card + .card{margin-top:0}
.mk-side{grid-column:2;grid-row:1;position:sticky;top:calc(var(--bar) + var(--ctxh) + 18px);
  display:flex;flex-direction:column;gap:var(--gap)}
.mk-side .card + .card{margin-top:0}
.mk-foot{grid-column:1/-1;grid-row:2;max-width:760px}
.mk-pad{padding-bottom:96px}
@media (max-width:1080px){
  .mk{grid-template-columns:minmax(0,1fr)}
  .mk-main{grid-row:1}
  .mk-side{grid-column:1;grid-row:2;position:static}
  .mk-foot{grid-row:3}
}

/* ajustes, bajas, en vivo y comparación con el mercado */
.adjwide{grid-column:1/-1;flex-direction:column;align-items:flex-start;gap:9px}
.injimpact{display:grid;grid-template-columns:1fr 1fr;gap:14px;width:100%}
.injadj{margin-left:auto;color:var(--mark)}
.injapply{grid-column:1/-1;margin-top:4px}
.livehead{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px;color:var(--chalk);
  border:1px solid var(--red);background:rgba(240,86,75,.08);border-radius:var(--r);padding:10px 13px}
.cmp{border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.cmphead,.cmprow{display:grid;grid-template-columns:minmax(0,1fr) 74px 74px 74px;align-items:center;
  padding:8px 12px}
.cmphead{background:var(--turf);border-bottom:1px solid var(--line);font-size:9px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--faint)}
.cmprow{font-size:12.5px;border-bottom:1px solid var(--line-soft)}
.cmprow:last-child{border-bottom:none}
.cmphead span:not(:first-child),.cmprow span:not(:first-child){text-align:right}
.cmplab{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmpmkt{color:var(--dim)}
.cmpdiff{color:var(--faint)}
.cmpup{color:var(--sodium);font-weight:600}
.cmpdown{color:var(--cool);font-weight:600}
.livestats{font-size:12px;color:var(--dim);border:1px solid var(--line);border-radius:var(--r);
  padding:10px 12px;margin-top:10px;line-height:1.5}
.livestats b{color:var(--chalk)}
.arbbox{border:1px solid var(--line);border-radius:var(--r);padding:13px;margin-top:10px;
  display:flex;flex-direction:column;gap:10px;align-items:flex-start}

/* ---------- calibración ---------- */
.mets{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:10px}
.met{border:1px solid var(--line);border-radius:var(--r);padding:13px}
.metlab{display:block;font-size:10.5px;color:var(--dim);margin-bottom:5px;line-height:1.3}
.metval{font-size:24px;font-weight:700;line-height:1.1;letter-spacing:-.02em}
.met-ok{color:var(--win)}
.met-bad{color:var(--red)}
.metbase{display:block;font-style:normal;font-size:9.5px;color:var(--faint);margin-top:4px}
.metci{display:block;font-style:normal;font-size:9px;color:var(--faint);margin-top:3px}
.reliwrap{display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:start}
.relplot{width:230px;height:230px;flex:0 0 auto}
.reldiag{stroke:var(--line);stroke-dasharray:3 3}
.relaxis{stroke:var(--line)}
.reltick{fill:var(--faint);font-size:9px}
.reldot{fill:rgba(142,124,255,.7);stroke:var(--mark)}
.relside{min-width:0}
.relside .table{max-width:440px}
.parbox{border:1px solid var(--line);border-radius:var(--r);padding:16px;display:flex;
  flex-direction:column;gap:14px}
.pars{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.par{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dim)}
.par span{flex:1;line-height:1.3}
.par select{width:118px}
.par input[type=checkbox]{accent-color:var(--mark)}
.paract{display:flex;flex-wrap:wrap;gap:8px}
.bandas{font-size:11.5px;color:var(--dim);margin-top:10px;line-height:1.7}
.bandas b{color:var(--chalk)}
.motorbar{display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin-bottom:16px}
.motorbar .par{flex:0 0 auto}
.motorbar .par span{flex:0 0 auto}
.motorbar .splitbar{flex-wrap:wrap}
.valbox{border:1px solid var(--line);border-radius:var(--r);padding:16px;display:flex;
  flex-direction:column;gap:14px}
.valbox .toolbar{gap:8px}
.propflags{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.row-bench td{opacity:.6}
.table-props .pl-name{margin-left:0;white-space:nowrap}
.table-props .pl-pos{display:block;margin-top:2px}
.table-props td.tl{min-width:158px}
.table-props th,.table-props td{padding:6px 7px}
.evol{display:flex;align-items:flex-end;gap:3px;height:110px;border-bottom:1px solid var(--line);
  padding-bottom:2px}
.evolcol{flex:1;min-width:6px;display:flex;flex-direction:column;justify-content:flex-end;
  align-items:center;height:100%;gap:3px}
.evolbar{width:100%;background:var(--mark);opacity:.65;border-radius:2px 2px 0 0;min-height:4px}
.evolcol:hover .evolbar{opacity:1}
.evoln{font-size:8.5px;color:var(--faint)}
.temabtn{all:unset;cursor:pointer;font-size:11px;color:var(--dim);border:1px solid var(--line);
  border-radius:99px;padding:5px 12px;text-align:center}
.temabtn:hover{color:var(--chalk);border-color:var(--dim)}
.resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.resblk{border:1px solid var(--line);border-radius:var(--r);padding:13px}
.resh{font-size:9.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
.resrow{all:unset;cursor:pointer;display:grid;grid-template-columns:1fr auto;gap:4px 8px;
  padding:5px 0;align-items:center}
.resrow .pbar{grid-column:1/-1}
.resrow-on{background:var(--mark-soft)}
.ressel{font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.resp{font-size:13px;font-weight:600}
.sensbox{border:1px solid var(--line);border-radius:var(--r);padding:15px;display:flex;
  flex-direction:column;gap:12px;margin-bottom:14px}
.sensout{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.sensc{display:grid;gap:4px}
.sensc span{font-size:11px;color:var(--dim)}
.sensc b{font-size:20px;font-weight:700}
.alerta{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;border:1px solid var(--red);
  background:rgba(240,86,75,.08);border-radius:var(--r);padding:11px 14px;margin-top:12px;
  font-size:12.5px;line-height:1.55;color:var(--chalk)}
.alerta-tag{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--red);flex:0 0 auto}
.curva{width:100%;max-width:560px;height:auto}
.curvaln{fill:none;stroke:var(--mark);stroke-width:1.6}
.curvabase{stroke:var(--line);stroke-dasharray:3 3}
.crash{border:1px solid var(--red);background:rgba(240,86,75,.07);border-radius:var(--r-lg);
  padding:22px;display:flex;flex-direction:column;gap:12px;align-items:flex-start;max-width:640px}
.crash-tag{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--red)}
.crash p{margin:0;font-size:13px;color:var(--dim);line-height:1.6}
.crash-msg{font-size:11.5px;color:var(--chalk);background:var(--turf);border:1px solid var(--line);
  border-radius:var(--r);padding:9px 11px;display:block;width:100%;overflow-x:auto}
.crash-acts{display:flex;gap:8px;flex-wrap:wrap}

/* ---------- mercado de jugadores ---------- */
.jugbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}
.jugbar .input-search{flex:0 0 190px}
.jugcount{font-size:11px;color:var(--faint);margin-left:auto}
.destacados{display:grid;grid-template-columns:repeat(auto-fit,minmax(196px,1fr));gap:10px;
  margin-bottom:18px}
.destblk{border:1px solid var(--line);border-radius:var(--r);padding:12px 13px}
.desth{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
.destrow{display:grid;grid-template-columns:14px minmax(0,1fr) auto;gap:8px;align-items:center;
  padding:3px 0;font-size:12.5px}
.destpos{font-size:10px;color:var(--faint)}
.destname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.destp{font-size:12.5px;font-weight:600}
.th-sort{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
.th-sort:hover{color:var(--chalk)}
.th-sort:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.th-sort-on{color:var(--mark)}
.th-sort i{font-style:normal;font-size:9px}

/* ---------- tarjetas neutras ---------- */
.card-quiet{background:transparent;border-color:transparent;box-shadow:none}
.card-quiet .motorbar{margin:0 0 4px}
.stack{display:flex;flex-direction:column;gap:14px}
.foot-page{max-width:760px}
.card-body > .mets:first-child,.card-body > .tablewrap:first-child{margin-top:0}
.card-body > .foot:last-child{margin-bottom:0}

/* ===============================================================
   COMBINADA
   La firma de la app: la cadena. Multiplicar probabilidades es
   sumar logaritmos, así que cada selección se dibuja como un tramo
   de barra proporcional a lo que le quita al conjunto. Los tramos
   suman, literalmente, la combinada entera.
   =============================================================== */
.cb-total{display:grid;grid-template-columns:minmax(220px,auto) minmax(0,1fr);gap:0;
  border-color:var(--mark);overflow:hidden}
.cb-cifra{padding:26px 26px 24px;background:var(--mark-soft);
  border-right:1px solid var(--line);display:flex;flex-direction:column;gap:6px}
.cb-eyebrow{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--mark)}
.cb-p{font-size:58px;font-weight:800;line-height:1;letter-spacing:-.035em;color:var(--chalk)}
.cb-sub{font-size:12px;color:var(--dim);max-width:240px;line-height:1.5}
.cb-datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;
  background:var(--line)}
.cb-dato{background:var(--surface);padding:18px 18px 16px;display:flex;flex-direction:column;gap:4px}
.cb-dato > span{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}
.cb-dato > b{font-size:23px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
.cb-dato > i{font-style:normal;font-size:10.5px;color:var(--faint);line-height:1.45}
.cb-dim{color:var(--dim)}

.cb-cadena-card .card-body{padding:20px 18px 16px}
.cb-track{display:flex;gap:2px;height:46px}
.cb-link{all:unset;cursor:pointer;flex:1 1 0;min-width:6px;border-radius:3px;
  background:var(--mark);opacity:.45;display:grid;place-items:center;transition:.15s;
  color:var(--mark-ink)}
.cb-link:nth-child(even){opacity:.62}
.cb-link:hover{opacity:.85}
.cb-link-on{opacity:1;box-shadow:0 0 0 2px var(--surface),0 0 0 3px var(--mark)}
.cb-link:focus-visible{outline:2px solid var(--chalk);outline-offset:-3px}
.cb-link-n{font-size:11px;font-weight:700}
.cb-escala{display:flex;justify-content:space-between;font-size:10px;color:var(--faint);
  margin-top:7px;letter-spacing:.1em;text-transform:uppercase}
.cb-foco{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:6px 12px;align-items:baseline;
  margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.cb-foco-tag{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mark)}
.cb-foco-sel{font-size:13px;color:var(--dim);min-width:0}
.cb-foco-sel b{color:var(--chalk);font-weight:600}
.cb-foco-num{font-size:17px;font-weight:700;color:var(--chalk)}
.cb-foco-nota{grid-column:1/-1;font-size:11.5px;color:var(--faint);line-height:1.6}

.cb-match{margin-bottom:0}
.cb-match-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.cb-match-id{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.cb-match-eq{font-size:14.5px;font-weight:600}
.cb-match-eq i{font-style:normal;color:var(--faint);margin:0 2px}
.cb-match-meta{font-size:11px;color:var(--faint)}
.cb-match-p{font-size:16px;font-weight:700;color:var(--chalk);border:1px solid var(--line);
  border-radius:var(--pill);padding:3px 12px;background:var(--surface)}
.cb-match-p-mal{color:var(--red);border-color:var(--red)}
.cb-x{all:unset;cursor:pointer;width:26px;height:26px;display:grid;place-items:center;
  border-radius:var(--r);color:var(--faint);font-size:17px;line-height:1;flex:0 0 auto}
.cb-x:hover{color:var(--red);background:var(--turf2)}
.cb-x:focus-visible{outline:2px solid var(--mark);outline-offset:1px}
.cb-picks{display:flex;flex-direction:column}
.cb-pick{display:grid;grid-template-columns:30px 84px minmax(0,1fr) 104px 116px 26px;gap:12px;
  align-items:center;padding:10px 18px;border-bottom:1px solid var(--line-soft)}
.cb-pick:last-child{border-bottom:none}
.cb-pick-off{opacity:.42}
.cb-sw{all:unset;cursor:pointer;width:28px;height:16px;border-radius:99px;background:var(--turf2);
  box-shadow:inset 0 0 0 1px var(--line);position:relative;transition:.15s;flex:0 0 auto}
.cb-sw::after{content:"";position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:99px;
  background:var(--faint);transition:.15s}
.cb-sw-on{background:var(--mark);box-shadow:none}
.cb-sw-on::after{left:15px;background:var(--mark-ink)}
.cb-sw:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.cb-pick-fam{font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}
.cb-pick-sel{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12.5px}
.cb-pick-sel b{font-weight:600}
.cb-pick-sel span{color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cb-pick-p{display:flex;flex-direction:column;gap:5px}
.cb-pick-p b{font-size:13px;text-align:right}
.cb-pick-coste{font-size:10.5px;color:var(--faint);text-align:right}
.cb-match-pie{font-size:11px;color:var(--faint);line-height:1.6;padding:11px 18px;
  border-top:1px solid var(--line);background:var(--turf)}

.cb-sug .card-body{padding:16px 18px}
.cb-swaps{display:flex;flex-direction:column;gap:10px}
.cb-swap{display:grid;grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr) auto auto;gap:14px;
  align-items:center;border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}
.cb-swap-de,.cb-swap-a{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:12.5px}
.cb-swap-de b,.cb-swap-a b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cb-swap-de span,.cb-swap-a span{color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cb-swap-de i,.cb-swap-a i{font-style:normal;font-size:11px;color:var(--faint)}
.cb-swap-tag{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.cb-swap-a .cb-swap-tag{color:var(--mark)}
.cb-swap-flecha{color:var(--faint);text-align:center}
.cb-swap-res{text-align:right;display:flex;flex-direction:column;gap:2px}
.cb-swap-res b{font-size:17px;font-weight:700;color:var(--win)}
.cb-swap-res span{font-size:10px;color:var(--faint)}
.cb-swap-btn{flex:0 0 auto}
.cb-swap-a i{display:flex;flex-direction:column;gap:2px}
.cb-swap-nota{font-style:normal;font-size:9.5px;color:var(--faint);letter-spacing:.02em;
  font-family:'Roboto',sans-serif}
.cb-quitar{display:flex;align-items:center;gap:14px;border:1px dashed var(--line);
  border-radius:var(--r);padding:12px 14px}
.cb-quitar-txt{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;font-size:12.5px}
.cb-quitar-txt b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cb-quitar-txt > span{color:var(--dim)}
.cb-quitar-txt i{font-style:normal;color:var(--chalk);font-weight:600}

/* ---------- esqueleto de carga ---------- */
.skel{display:flex;flex-direction:column;gap:var(--gap)}
.skel-fila{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--surface);
  position:relative;overflow:hidden}
.skel-fila::after{content:"";position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,var(--turf2),transparent);
  transform:translateX(-100%);animation:barrido 1.5s infinite}
@keyframes barrido{to{transform:translateX(100%)}}

/* ---------- boletos ---------- */
.bol-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:-6px 0 18px}
.bolchip{display:inline-flex;align-items:center;border:1px solid var(--line);
  border-radius:var(--pill);background:var(--surface);max-width:280px}
.bolchip-on{border-color:var(--mark);background:var(--mark-soft)}
.bolchip-go{all:unset;cursor:pointer;display:inline-flex;align-items:baseline;gap:8px;
  padding:6px 13px;font-size:12.5px;color:var(--dim);min-width:0}
.bolchip-on .bolchip-go{color:var(--chalk);font-weight:600}
.bolchip-go:focus-visible{outline:2px solid var(--mark);outline-offset:-2px;border-radius:var(--pill)}
.bolchip-nom{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bolchip-p{font-style:normal;font-size:11px;color:var(--faint)}
.bolchip-on .bolchip-p{color:var(--mark)}
.bolchip-x{all:unset;cursor:pointer;width:24px;height:24px;display:grid;place-items:center;
  color:var(--faint);font-size:15px;border-radius:var(--pill);margin-right:2px}
.bolchip-x:hover{color:var(--red);background:var(--turf2)}
.bolchip-x:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}
.bol-input{width:180px;font-size:12.5px;padding:6px 12px;border-radius:var(--pill)}

/* ---------- partidos ya empezados ---------- */
.cb-viejos{display:flex;flex-wrap:wrap;align-items:center;gap:10px;border:1px solid var(--line);
  border-left:3px solid var(--sodium);border-radius:var(--r);background:var(--turf);
  padding:11px 14px;margin-bottom:var(--gap)}
.cb-viejos-txt{flex:1;min-width:220px;font-size:12.5px;color:var(--dim);line-height:1.55}
.cb-viejos-txt b{color:var(--chalk)}
.cb-sello{font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--sodium);
  border:1px solid var(--sodium);border-radius:var(--pill);padding:3px 10px;white-space:nowrap}
.cb-sello-on{color:var(--mark);border-color:var(--mark)}
.cb-match-viejo .cb-picks,.cb-match-viejo .cb-match-pie{opacity:.5}
.cb-match-viejo .cb-match-p{opacity:.5}

/* ---------- deshacer ---------- */
.undo{position:fixed;left:20px;bottom:20px;z-index:60;display:flex;align-items:center;gap:12px;
  background:var(--turf2);border:1px solid var(--line);border-radius:var(--r);
  padding:10px 10px 10px 15px;box-shadow:0 18px 40px -20px rgba(0,0,0,.9);
  max-width:min(420px,calc(100vw - 40px));animation:sube .18s ease-out}
@keyframes sube{from{transform:translateY(10px);opacity:0}}
.undo-txt{font-size:12.5px;color:var(--chalk);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.undo-btn{all:unset;cursor:pointer;font-size:12px;font-weight:600;color:var(--mark);
  padding:5px 10px;border-radius:var(--r);flex:0 0 auto}
.undo-btn:hover{background:var(--mark-soft)}
.undo-btn:focus-visible{outline:2px solid var(--mark);outline-offset:1px}
.undo-x{all:unset;cursor:pointer;width:24px;height:24px;display:grid;place-items:center;
  color:var(--faint);font-size:15px;border-radius:var(--r);flex:0 0 auto}
.undo-x:hover{color:var(--chalk)}
.undo-x:focus-visible{outline:2px solid var(--mark);outline-offset:1px}

/* ---------- ayuda de atajos ---------- */
.modal-fondo{position:fixed;inset:0;z-index:70;background:rgba(9,12,19,.72);backdrop-filter:blur(3px);
  display:grid;place-items:center;padding:20px;animation:aparece .15s ease-out}
@keyframes aparece{from{opacity:0}}
.modal{width:min(460px,100%);background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r-lg);box-shadow:0 30px 70px -30px rgba(0,0,0,.95);overflow:hidden}
.atajos{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px 16px;margin:0;align-items:baseline}
.atajos dt{margin:0}
.atajos dd{margin:0;font-size:12.5px;color:var(--dim);line-height:1.45}
kbd{font-family:'Roboto Mono',monospace;font-size:11px;background:var(--turf2);
  border:1px solid var(--line);border-bottom-width:2px;border-radius:4px;padding:3px 7px;
  color:var(--chalk);white-space:nowrap}
.btn-atajos{font-weight:700}

/* ---------- marcas en la cartelera ---------- */
.fx{grid-template-columns:66px minmax(0,1fr) 34px 22px 16px}
.fx-marcada{box-shadow:inset 2px 0 0 var(--mark)}
.fx-marcado{display:grid;place-items:center}
.fx-chip{font-style:normal;font-size:9.5px;font-weight:700;line-height:1;padding:3px 5px;
  border-radius:var(--pill);background:var(--mark-soft);color:var(--mark);
  box-shadow:inset 0 0 0 1px var(--mark)}
.fx-punto{width:6px;height:6px;border-radius:var(--pill);background:var(--mark);
  display:inline-block;margin-right:6px;flex:0 0 auto}
.fx-conmarca{display:inline-flex;align-items:center;color:var(--mark)}
.lg-toggle{padding:0;gap:0}
.lg-abrir{all:unset;cursor:pointer;box-sizing:border-box;flex:1;display:flex;align-items:center;
  gap:10px;padding:12px 4px 12px 16px;min-width:0;transition:.15s}
.lg-abrir:hover{background:var(--turf2)}
.lg-abrir:focus-visible{outline:2px solid var(--mark);outline-offset:-2px}
.lg-marca{display:inline-flex;align-items:center;font-size:11px;color:var(--mark);font-weight:600}
.lg-fav{all:unset;cursor:pointer;width:42px;align-self:stretch;display:grid;place-items:center;
  color:var(--line);font-size:15px;transition:.15s}
.lg-fav:hover{color:var(--dim)}
.lg-fav-on{color:var(--sodium)}
.lg-fav:focus-visible{outline:2px solid var(--mark);outline-offset:-3px}

/* ---------- resolución e historial ---------- */
.cb-sello-fin{color:var(--dim);border-color:var(--line)}
.cb-sello-ok{color:var(--win);border-color:var(--win)}
.cb-sello-mal{color:var(--red);border-color:var(--red)}
.cb-pick-ok{box-shadow:inset 2px 0 0 var(--win)}
.cb-pick-mal{box-shadow:inset 2px 0 0 var(--red)}
.cb-ok{color:var(--win);font-weight:600}
.cb-mal{color:var(--red);font-weight:600}
.vistas{display:flex;gap:3px;margin:-6px 0 16px}
.hist-frase{font-size:14px;line-height:1.7;color:var(--dim);margin:0}
.hist-frase b{color:var(--chalk);font-size:17px;font-family:'Roboto Mono',monospace}
.masfilas{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;
  font-size:11.5px;color:var(--faint);border-top:1px solid var(--line)}

/* ---------- comparación de boletos ---------- */
.modal-ancho{width:min(720px,100%)}
.cmp-tabla td:first-child{max-width:320px}
.cmp-si{color:var(--mark);font-size:13px}
.cmp-no{color:var(--line)}
.cmp-difiere{background:var(--mark-soft)}
.cmp-total{font-size:14px;font-weight:700;color:var(--chalk)}
.cmp-tabla tfoot td{border-top:1px solid var(--line);padding-top:10px}

/* La lista de partidos y las tablas largas no se pintan hasta que se
   acercan a la pantalla: en el móvil se nota al desplazar. */
.fx-list,.tablewrap{content-visibility:auto;contain-intrinsic-size:auto 400px}

/* ---------- filtros de la cartelera ---------- */
.fx-filtros{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;
  align-items:center;margin-bottom:16px}
.fx-orden{margin-left:auto}
.fx-liga{font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);
  margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ---------- barra de probabilidad con referencia ---------- */
.pbar-marca{position:relative}
.pbar-marca::after{content:"";position:absolute;left:50%;top:-1px;bottom:-1px;width:1px;
  background:var(--line);opacity:.9}
.fambtn-marca{width:5px;height:5px;border-radius:var(--pill);background:var(--mark);
  display:inline-block;margin-left:1px}
.fambtn-on .fambtn-marca{background:var(--pitch)}

/* ---------- barra de la combinada, plegable ---------- */
.builder-tirador{display:none}

/* ---------- jugadores ---------- */
.ico-pos{width:14px;height:14px;flex:0 0 auto}
.splitbtn-pos{display:inline-flex;align-items:center;gap:6px}
.cellbtn{position:relative;overflow:hidden;min-width:46px;display:inline-block;text-align:center}
.cellbar{position:absolute;left:0;top:0;bottom:0;background:var(--turf2);border-radius:3px;
  transition:width .3s}
.cellbtn-on .cellbar{background:rgba(255,255,255,.22)}
.cellnum{position:relative}

/* ---------- aporte de cada partido ---------- */
.cb-aporte{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.cb-aporte-fila{display:grid;grid-template-columns:minmax(0,1fr) 90px 42px 52px;gap:10px;
  align-items:center;padding:4px 0;font-size:12px}
.cb-aporte-eq{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dim)}
.cb-aporte-barra{height:6px;background:var(--turf2);border-radius:var(--pill);overflow:hidden}
.cb-aporte-barra i{display:block;height:100%;background:var(--mark);opacity:.75}
.cb-aporte-n{font-size:11px;color:var(--faint);text-align:right}
.cb-aporte-p{font-size:12px;color:var(--chalk);text-align:right;font-weight:600}

/* ---------- cartel de la cadena ---------- */
.cb-link{position:relative}
.cb-tip{display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);
  z-index:30;width:max-content;max-width:250px;background:var(--turf2);border:1px solid var(--mark);
  border-radius:var(--r);padding:9px 11px;font-size:11.5px;line-height:1.5;color:var(--dim);
  text-align:left;box-shadow:0 16px 34px -20px rgba(0,0,0,.9);pointer-events:none;
  font-family:'Roboto',sans-serif}
.cb-tip b{display:block;color:var(--chalk);margin-bottom:1px}
.cb-tip i{display:block;font-style:normal;color:var(--faint);margin-top:4px;font-size:10.5px}
.cb-link:hover .cb-tip,.cb-link:focus-visible .cb-tip{display:block}

/* ---------- avisos breves ---------- */
.aviso-flotante{position:fixed;left:50%;transform:translateX(-50%);bottom:26px;z-index:65;
  background:var(--turf2);border:1px solid var(--win);color:var(--chalk);
  border-radius:var(--pill);padding:9px 18px;font-size:12.5px;
  box-shadow:0 18px 40px -20px rgba(0,0,0,.9);animation:sube .18s ease-out;
  max-width:calc(100vw - 40px);text-align:center}
.aviso-flotante.aviso-mal{border-color:var(--red)}

/* ---------- calibración ---------- */
.relci{stroke:var(--mark);stroke-width:1.4;opacity:.45}

/* ---------- glosario ---------- */
.glos-buscar{width:100%;margin-bottom:6px}

/* ---------- micro-interacciones ---------- */
/* Un botón que no se hunde al pulsarlo se siente muerto en el móvil,
   donde no hay puntero que dé pistas antes del toque. */
.btn:active,.segbtn:active,.splitbtn:active,.fambtn:active,
.cellbtn:active,.addbtn:active,.day:active,.bolchip-go:active{transform:translateY(1px)}
.addbtn,.cellbtn,.btn,.segbtn,.fambtn{transition:transform .08s,background .15s,color .15s,border-color .15s}
.mrow-on .addbtn-on{animation:marcado .32s ease-out}
@keyframes marcado{0%{transform:scale(.7)}60%{transform:scale(1.18)}}
.cb-p,.bp{transition:color .2s}
.skel-fila{animation:aparece .2s ease-out}

/* ---------- densidad y tamaño de letra ---------- */
/* El zoom del documento respeta la maquetación fija; escalar con
   transform rompería las barras ancladas. */
html[data-letra="pequena"]{zoom:.92}
html[data-letra="grande"]{zoom:1.1}
html[data-densidad="comoda"]{--gap:24px}
html[data-densidad="comoda"] .card-body{padding:22px}
html[data-densidad="comoda"] .card-head{padding:15px 20px}
html[data-densidad="comoda"] .page{padding-top:32px}
html[data-densidad="comoda"] .fx{padding:15px 16px}
html[data-densidad="comoda"] .cb-pick{padding:14px 20px}
html[data-densidad="comoda"] .table td{padding:11px 7px}
html[data-densidad="comoda"] .mrow{padding:9px 2px}
html[data-densidad="comoda"] .goals li,html[data-densidad="comoda"] .timeline li{padding:9px 0}
html[data-densidad="comoda"] .betval,html[data-densidad="comoda"] .ldside{padding:9px 12px}

/* ---------- avisos de estado ---------- */
.aviso{background:rgba(240,86,75,.1);border-bottom:1px solid var(--red)}
.aviso-cuota{background:var(--sodium-soft);border-bottom-color:var(--sodium)}
.aviso-in{max-width:1280px;margin:0 auto;padding:9px 24px;font-size:12.5px;line-height:1.5;
  color:var(--chalk)}
.aviso-in b{color:var(--red)}
.aviso-cuota .aviso-in b{color:var(--sodium)}
.ok{border:1px solid var(--win);background:rgba(55,201,138,.08);color:var(--chalk);
  padding:10px 12px;border-radius:var(--r);font-size:12.5px;margin:12px 0}

/* ---------- frescura del dato ---------- */
.fx-frescura{display:inline-flex;align-items:center;gap:4px;color:var(--faint);font-size:11.5px}
.tab-refresh{margin-left:auto;font-size:15px;line-height:1;padding:8px 12px;color:var(--faint)}
.tab-refresh:hover{color:var(--mark)}

/* ---------- glosario ---------- */
.term-wrap{position:relative;display:inline-block}
.term{all:unset;cursor:help;border-bottom:1px dotted var(--faint);color:inherit}
.term:hover{border-bottom-color:var(--mark);color:var(--mark)}
.term:focus-visible{outline:2px solid var(--mark);outline-offset:2px;border-radius:2px}
.term-pop{position:absolute;left:0;top:calc(100% + 7px);z-index:50;width:min(300px,74vw);
  background:var(--turf2);border:1px solid var(--mark);border-radius:var(--r);padding:12px 30px 12px 13px;
  font-size:11.5px;line-height:1.6;color:var(--dim);text-transform:none;letter-spacing:normal;
  font-weight:400;box-shadow:0 20px 40px -22px rgba(0,0,0,.9);display:block;
  font-family:'Roboto',sans-serif}
.term-pop b{display:block;color:var(--chalk);font-size:12.5px;margin-bottom:4px}
.term-x{all:unset;cursor:pointer;position:absolute;top:6px;right:8px;color:var(--faint);
  font-size:14px;line-height:1;padding:2px 4px}
.term-x:hover{color:var(--chalk)}
.glos{display:grid;gap:4px 0;margin:0}
.glos dt{font-size:12.5px;font-weight:600;color:var(--chalk);margin-top:10px}
.glos dd{margin:0;font-size:11.5px;color:var(--dim);line-height:1.6}

/* ---------- ajustes ---------- */
.modal-scroll{max-height:min(74vh,620px);overflow-y:auto}
.modal-scroll .rule:first-child{margin-top:0}
.seg{display:flex;gap:3px}
.segbtn{all:unset;cursor:pointer;padding:6px 12px;font-size:11.5px;color:var(--dim);
  border:1px solid var(--line);border-radius:var(--r)}
.segbtn:hover{color:var(--chalk);border-color:var(--dim)}
.segbtn-on{background:var(--turf2);color:var(--chalk);font-weight:600;box-shadow:inset 0 0 0 1px var(--line)}
.segbtn:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.oculto{display:none}

/* ---------- primera pantalla ---------- */
.gate-que{font-size:13px;color:var(--dim);line-height:1.65;
  border-left:2px solid var(--mark);padding-left:16px}
.gate-que p{margin:0 0 10px}
.gate-que p:last-child{margin-bottom:0}
.gate-no{font-size:11.5px;color:var(--faint)}

/* ---------- responsive ---------- */
@media (max-width:900px){
  :root{--tabh:60px}
  .two{grid-template-columns:1fr;gap:0}
  .mk-xg{grid-template-columns:1fr;gap:12px}
  .xgright{text-align:left}
  .adjbox{grid-template-columns:1fr}
  .adj span{flex:0 0 104px}
  .hcprow{grid-template-columns:44px 1fr 1fr}
  .hcpnote{display:none}
  .hcplegend{padding:0 8px}
  .asrow{grid-template-columns:42px 1fr 1fr}
  .asnote{display:none}
  .mrow{grid-template-columns:20px minmax(0,1fr) 62px 50px;gap:8px}
  .ldside{padding:8px;gap:6px}
  .ldpct{flex:0 0 40px;font-size:11px}
  .matrixwrap{grid-template-columns:1fr}
  .mataxis-left{display:none}
  .mcell{width:38px;height:26px}
  .shell{flex-direction:column}
  .brand-sub{display:none}
  .page{padding:18px 16px calc(60px + var(--tabh))}
  .h1{font-size:27px}
  .sb-main{grid-template-columns:1fr;gap:10px}
  .sb-team,.sb-a{flex-direction:row;justify-content:center;text-align:center}
  .sb-score{font-size:42px}
  .injgrid,.benchgrid{grid-template-columns:1fr}
  .timeline li{grid-template-columns:42px 1fr}
  .timeline .tply{grid-column:1/-1;color:var(--dim);padding-left:52px}
  .pitchwrap{flex-direction:column;min-height:520px}
  .halfway{left:0;right:0;top:50%;bottom:auto;width:auto;height:1px}
  .cutbox{margin-left:0;max-width:none}
  .reliwrap{grid-template-columns:1fr;gap:18px}

  /* la navegación baja al pulgar */
  .nav{display:none}
  .btn-salir{display:none}
  .topbar-in{padding:0 16px;gap:12px}
  .ctxbar-in{padding:8px 16px}
  .qpill{min-width:0;padding:6px 9px}
  .qpill-top{font-size:10px}
  .tabbar{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;left:0;right:0;bottom:0;
    z-index:42;background:rgba(9,12,19,.96);backdrop-filter:blur(14px);
    border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom)}
  .tabbtn{all:unset;cursor:pointer;position:relative;height:60px;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:4px;font-size:10px;color:var(--faint)}
  .tabbtn .ico{width:19px;height:19px}
  .tabbtn-on{color:var(--mark)}
  .tabbtn:focus-visible{outline:2px solid var(--mark);outline-offset:-3px}
  .tabbadge{position:absolute;top:9px;left:calc(50% + 6px);font-size:9px;font-weight:700;
    line-height:1;padding:2px 5px;border-radius:var(--pill);background:var(--mark);
    color:var(--mark-ink);font-style:normal}
  .app-conslip{--tabh:126px}
  .builder{bottom:calc(60px + env(safe-area-inset-bottom))}

  /* combinada */
  .cb-total{grid-template-columns:1fr}
  .cb-cifra{border-right:none;border-bottom:1px solid var(--line);padding:22px 18px}
  .cb-p{font-size:48px}
  .cb-pick{grid-template-columns:30px minmax(0,1fr) 76px 26px;gap:10px;padding:10px 14px}
  .cb-pick-fam,.cb-pick-coste{display:none}
  .cb-swap{grid-template-columns:1fr;gap:10px;text-align:left}
  .cb-swap-flecha{display:none}
  .cb-swap-res{text-align:left;flex-direction:row;align-items:baseline;gap:8px}
  .undo{left:12px;right:12px;bottom:calc(72px + env(safe-area-inset-bottom));max-width:none}
  .app-conslip .undo{bottom:calc(140px + env(safe-area-inset-bottom))}
  .bol-bar{margin-top:0}
  .cb-viejos{gap:8px}
  .btn-atajos{display:none}
  .fx{grid-template-columns:60px minmax(0,1fr) 30px 20px 12px;gap:8px}
  .aviso-in{padding:9px 16px}
  .modal-fondo{padding:12px;align-items:flex-end}
  .modal{width:100%}
  .modal-scroll{max-height:72vh}
  .term-pop{position:fixed;left:12px;right:12px;top:auto;bottom:76px;width:auto}
  .fx-frescura{width:100%;justify-content:flex-start}
  .fx-filtros{gap:8px}
  .fx-orden{margin-left:0}
  .seg{flex-wrap:wrap}

  /* la barra de la combinada se queda en una línea y se despliega */
  .builder-tirador{all:unset;cursor:pointer;box-sizing:border-box;display:flex;width:100%;
    align-items:center;gap:10px;padding:10px 14px;font-size:12.5px;color:var(--dim);
    border-bottom:1px solid var(--line-soft)}
  .builder-tirador-n{font-size:10px;font-weight:700;padding:3px 7px;border-radius:var(--pill);
    background:var(--mark);color:var(--mark-ink)}
  .builder-tirador .lg-chev{margin-left:auto;transform:rotate(-90deg)}
  .builder-tirador .lg-chev-on{transform:rotate(90deg)}
  .bpicks,.bbuscar{display:none}
  .builder-abierta .bpicks,.builder-abierta .bbuscar{display:flex}
  .builder-abierta .bpicks{max-height:120px}
  .builder-in{padding:10px 14px}
  .cb-aporte-fila{grid-template-columns:minmax(0,1fr) 60px 40px}
  .cb-aporte-p{display:none}
  .cb-tip{position:fixed;left:12px;right:12px;bottom:auto;top:auto;transform:none;
    max-width:none;width:auto}
  .aviso-flotante{bottom:calc(72px + env(safe-area-inset-bottom))}
  .app-conslip .aviso-flotante{bottom:calc(140px + env(safe-area-inset-bottom))}
  .lg-abrir{padding-left:14px}
  .builder-in{padding:10px 14px;gap:10px}
  .bbuscar{flex:1 1 100%;order:3}
  .bnote{display:none}
  .bp{font-size:20px}
  .bres{gap:14px;width:100%;justify-content:space-between}
}
@media (max-width:560px){
  .cb-datos{grid-template-columns:1fr 1fr}
  .prob{height:150px}
  .page-head{gap:12px}
}
@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
}

/* ===============================================================
   ANDROID SHELL — rediseño Material 3
   La pizarra deja de comportarse como un panel de escritorio que se
   encoge en el móvil: pasa a ser, siempre, una app de Android. Barra
   inferior fija con indicador de píldora, hojas que suben desde
   abajo en vez de diálogos centrados, botones de píldora, listas de
   ajustes con icono a la izquierda y un interruptor a la derecha.
   Este bloque va deliberadamente al final: en un empate de
   especificidad gana la regla que aparece más abajo en el archivo,
   así que estas reglas se imponen sobre las suyas propias de arriba
   sin tener que reescribirlas ni tocar los componentes.
   =============================================================== */

/* Encuadre de teléfono en pantallas anchas: el escritorio de sobra
   queda como fondo oscuro, la app vive en una columna del ancho de
   un móvil, tal como se ve en cualquier maqueta de una app Android. */
@media (min-width:760px){
  html,body{background:#0B0B0D}
  .shell,.app{max-width:var(--phone);margin:0 auto;min-height:100vh;
    box-shadow:var(--sh2);border-left:1px solid var(--line);border-right:1px solid var(--line)}
}

/* La navegación de escritorio desaparece: vive siempre abajo, como en
   cualquier app de Android, y se reserva su alto en todas partes. */
.nav{display:none!important}
:root{--tabh:66px}

.tabbar{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;left:0;right:0;bottom:0;
  z-index:42;max-width:var(--phone);margin:0 auto;background:var(--turf);
  border-top:1px solid var(--line-soft);padding-bottom:env(safe-area-inset-bottom);
  box-shadow:0 -2px 14px -6px rgba(0,0,0,.4)}
.tabbtn{all:unset;box-sizing:border-box;cursor:pointer;position:relative;height:var(--tabh);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  font-size:10.5px;font-weight:500;color:var(--faint);-webkit-tap-highlight-color:transparent}
.tabbtn .ico{width:22px;height:22px;position:relative;z-index:1;transition:color .15s}
.tabbtn-on{color:var(--chalk)}
.tabbtn::before{content:"";position:absolute;top:8px;width:52px;height:28px;border-radius:var(--pill);
  background:transparent;transition:background .18s}
.tabbtn-on::before{background:var(--mark)}
.tabbtn-on .ico{color:var(--mark-ink);position:relative;z-index:1}
.tabbtn:active{transform:scale(.94)}
.tabbtn:focus-visible{outline:2px solid var(--mark);outline-offset:-3px;border-radius:var(--r)}
.tabbadge{position:absolute;top:4px;left:calc(50% + 12px);font-size:9px;font-weight:700;line-height:1;
  padding:2px 5px;border-radius:var(--pill);background:var(--red);color:#3C0000;font-style:normal}

/* Barra superior: plana y tonal, sin la sensación de panel de control. */
.topbar{border-bottom:1px solid var(--line-soft);background:var(--surface)!important;
  backdrop-filter:none}
.topbar-in{gap:10px;padding:0 16px}
.brand-sub{display:none}
.btn-salir{display:none}
.qpill{min-width:0;padding:6px 10px;border-radius:var(--pill);background:var(--turf)}
.ctxbar-in{padding:8px 16px}
.page{padding:16px 16px calc(88px + var(--tabh))}

/* Botones Material: píldora rellena para la acción principal, tonal
   para las secundarias, texto simple para las discretas. */
.btn{border-radius:var(--pill);padding:9px 18px;font-size:13.5px;font-weight:500;border-color:transparent}
.btn-ghost{background:var(--turf2);color:var(--chalk)}
.btn-ghost:hover{filter:brightness(1.15);border-color:transparent;background:var(--turf2)}
.btn-primary{background:var(--mark);color:var(--mark-ink);box-shadow:var(--sh)}
.btn-quiet{border-radius:var(--pill);color:var(--mark)}
.btn-quiet:hover{background:var(--mark-soft);color:var(--mark)}
.btn:active,.iconbtn:active,.segbtn:active,.lg-fav:active{transform:scale(.95)}

.iconbtn{width:40px;height:40px;border-radius:var(--pill);border-color:transparent;
  background:var(--turf2);color:var(--dim)}
.iconbtn:hover{background:var(--turf2);filter:brightness(1.2);color:var(--chalk);border-color:transparent}
/* El acceso a la ayuda y el glosario no debería depender del ancho de
   la pantalla: en el modo Android siempre hay sitio para el icono. */
.btn-atajos{display:grid!important}

/* Los botones segmentados pasan a ser chips de Material en una
   píldora tonal, con el segmento activo relleno. */
.seg{background:var(--turf2);padding:3px;border-radius:var(--pill);gap:0}
.segbtn{border:none;border-radius:var(--pill);padding:7px 14px}
.segbtn-on{background:var(--mark);color:var(--mark-ink);box-shadow:none}

/* Campos de texto "filled" de Material: esquina redondeada arriba,
   línea de acento abajo en vez de un recuadro completo. */
.input{background:var(--turf2);border:none;border-bottom:2px solid var(--line);
  border-radius:10px 10px 0 0;padding:9px 12px}
.input:focus{border-bottom-color:var(--mark);box-shadow:none;background:var(--turf2)}

/* Tarjetas: superficies elevadas de esquina grande, cabecera tonal. */
.card{border-radius:var(--r-lg);border-color:var(--line-soft)}
.card-head{background:var(--turf);border-bottom-color:var(--line-soft);
  border-radius:var(--r-lg) var(--r-lg) 0 0}

/* Hojas inferiores en vez de diálogos centrados: todo lo que antes
   aparecía en medio de la pantalla ahora sube desde abajo con el
   tirador de cualquier app de Android, y se queda anclado al borde
   inferior aunque la pantalla sea ancha. */
.modal-fondo{align-items:flex-end;padding:0;background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
.modal{width:100%;max-width:var(--phone);border-radius:var(--r-lg) var(--r-lg) 0 0;
  border:none;border-top:1px solid var(--line-soft);box-shadow:0 -14px 40px -14px rgba(0,0,0,.65);
  padding-top:10px;animation:sube-hoja .22s cubic-bezier(.2,.8,.2,1)}
.modal::before{content:"";display:block;width:36px;height:4px;border-radius:var(--pill);
  background:var(--line);margin:0 auto 6px}
.modal .card-head{border-radius:0;padding-top:2px}
.modal-scroll{max-height:min(68vh,600px)}
@keyframes sube-hoja{from{transform:translateY(100%)}}

/* Avisos flotantes y "deshacer": snackbars de Material, siempre por
   encima de la barra inferior. */
.aviso-flotante,.undo{bottom:calc(16px + var(--tabh) + env(safe-area-inset-bottom));
  background:var(--turf2);border-color:var(--line-soft);box-shadow:var(--sh2)}
.aviso-flotante{border-radius:var(--pill)}
.undo{border-radius:var(--r)}
.app-conslip .aviso-flotante,.app-conslip .undo{
  bottom:calc(84px + var(--tabh) + env(safe-area-inset-bottom))}

/* Listas de ajustes: icono en círculo tonal a la izquierda, título y
   subtítulo en el centro, control a la derecha — la gramática visual
   de cualquier pantalla de ajustes de Android. */
.list-row{display:flex;align-items:center;gap:14px;padding:11px 2px;min-height:56px}
.list-row-icon{flex:0 0 auto;width:40px;height:40px;border-radius:var(--pill);
  background:var(--mark-soft);color:var(--mark);display:grid;place-items:center;
  font-size:14px;font-weight:700}
.list-row-icon .ico{width:20px;height:20px}
.list-row-icon-ok{background:rgba(127,219,166,.16);color:var(--win)}
.list-row-icon-mal{background:rgba(255,180,171,.16);color:var(--red)}
.list-row-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.list-row-title{font-size:14px;color:var(--chalk);font-weight:500}
.list-row-sub{font-size:11.5px;color:var(--faint);line-height:1.45}
.list-row-end{flex:0 0 auto;display:flex;align-items:center}

/* El interruptor: la pieza más reconocible de un ajuste en Android. */
.switch{all:unset;cursor:pointer;box-sizing:border-box;width:44px;height:26px;border-radius:var(--pill);
  background:var(--turf2);border:1px solid var(--line);position:relative;flex:0 0 auto;
  transition:background .15s,border-color .15s}
.switch::after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;
  background:var(--dim);transition:transform .15s,background .15s}
.switch-on{background:var(--mark);border-color:var(--mark)}
.switch-on::after{transform:translateX(18px);background:var(--mark-ink)}
.switch:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.switch:active::after{width:23px}
.switch-on:active::after{transform:translateX(15px)}

/* El icono de menú empuja todo lo demás a la derecha: sin el nav de
   escritorio, la cuota es lo único que queda pegado al borde. */
.brand{margin-right:auto}

/* ---------- cajón lateral (side menu) ---------- */
.drawer-fondo{position:fixed;inset:0;z-index:71;background:rgba(0,0,0,.55);
  backdrop-filter:blur(2px);animation:aparece .15s ease-out}
.drawer{position:fixed;left:0;top:0;bottom:0;width:min(300px,84vw);background:var(--surface);
  border-right:1px solid var(--line-soft);box-shadow:14px 0 40px -14px rgba(0,0,0,.65);
  display:flex;flex-direction:column;padding:20px 16px;animation:sale-cajon .2s cubic-bezier(.2,.8,.2,1)}
@keyframes sale-cajon{from{transform:translateX(-100%)}}
.drawer-head{display:flex;align-items:center;gap:10px;padding-bottom:16px;margin-bottom:4px}
.drawer-email{display:block;font-size:11px;color:var(--faint);margin-top:3px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px}
.drawer-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
.drawer-tile{all:unset;cursor:pointer;box-sizing:border-box;display:flex;flex-direction:column;
  gap:10px;padding:16px 14px;border-radius:var(--r);background:var(--turf2);color:var(--chalk);
  font-size:12.5px;font-weight:500;transition:transform .08s,filter .15s}
.drawer-tile:hover{filter:brightness(1.15)}
.drawer-tile:active{transform:scale(.96)}
.drawer-tile:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.drawer-tile-icon{width:34px;height:34px;border-radius:var(--pill);background:var(--mark-soft);
  color:var(--mark);display:grid;place-items:center}
.drawer-tile-icon .ico{width:18px;height:18px}
.drawer-x{all:unset;cursor:pointer;position:absolute;top:16px;right:14px;width:30px;height:30px;
  display:grid;place-items:center;color:var(--faint);font-size:17px;border-radius:var(--pill)}
.drawer-x:hover{color:var(--chalk);background:var(--turf2)}
@media (min-width:760px){.drawer,.drawer-fondo{max-width:var(--phone)}.drawer{left:calc(50% - var(--phone)/2)}}

/* ---------- barra timón: navegación + acción central acoplada ---------- */
.tabbar-rudder{align-items:end;padding-top:14px;overflow:visible}
.fab-dock{all:unset;cursor:pointer;box-sizing:border-box;position:relative;justify-self:center;
  width:56px;height:56px;margin-top:-30px;border-radius:var(--pill);background:var(--mark);
  color:var(--mark-ink);display:grid;place-items:center;box-shadow:0 10px 24px -8px rgba(0,0,0,.55),
  0 0 0 6px var(--turf);transition:transform .1s}
.fab-dock .ico{width:24px;height:24px}
.fab-dock:active{transform:scale(.94)}
.fab-dock-on{background:var(--sodium)}
.fab-dock:focus-visible{outline:2px solid var(--chalk);outline-offset:2px}
.fabbadge{position:absolute;top:-3px;right:-3px;font-size:9px;font-weight:700;line-height:1;
  padding:2px 5px;border-radius:var(--pill);background:var(--red);color:#3C0000;font-style:normal;
  box-shadow:0 0 0 2px var(--turf)}

/* ---------- rejilla de ligas (grid) ---------- */
.league-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px;margin-top:14px}
.league-tile{all:unset;cursor:pointer;box-sizing:border-box;display:flex;flex-direction:column;
  align-items:center;gap:8px;padding:12px 8px;border-radius:var(--r);background:var(--turf2);
  text-align:center;transition:transform .08s,filter .15s}
.league-tile:hover{filter:brightness(1.15)}
.league-tile:active{transform:scale(.95)}
.league-tile:focus-visible{outline:2px solid var(--mark);outline-offset:2px}
.league-tile-on{background:var(--mark);color:var(--mark-ink)}
.league-tile img{width:32px;height:32px;object-fit:contain;border-radius:6px}
.league-tile-name{font-size:10.5px;line-height:1.25;overflow:hidden;display:-webkit-box;
  -webkit-line-clamp:2;-webkit-box-orient:vertical}

/* ---------- menú de tres puntos (overflow) ---------- */
.overflow-btn{all:unset;cursor:pointer;width:30px;height:30px;border-radius:var(--pill);
  display:grid;place-items:center;color:var(--faint);flex:0 0 auto}
.overflow-btn:hover{color:var(--chalk);background:var(--turf2)}
.overflow-btn:focus-visible{outline:2px solid var(--mark);outline-offset:1px}
.ofitem{all:unset;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;gap:12px;
  width:100%;padding:12px 4px;font-size:13.5px;color:var(--chalk);border-radius:var(--r)}
.ofitem:hover{background:var(--turf2)}
.ofitem-mal{color:var(--red)}

/* ---------- deslizar para actuar (swipe) ---------- */
.swipe-wrap{position:relative;overflow:hidden;border-radius:var(--r)}
.swipe-front{position:relative;background:var(--surface);touch-action:pan-y;will-change:transform}
.swipe-action{all:unset;box-sizing:border-box;cursor:pointer;position:absolute;top:0;right:0;bottom:0;
  width:92px;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;
  letter-spacing:.02em;color:#fff;background:var(--mark)}
.swipe-action-mal{background:var(--red);color:#3C0000}

/* ---------- secciones plegables (accordion) ---------- */
.acc{border:1px solid var(--line-soft);border-radius:var(--r);overflow:hidden;margin-top:var(--gap)}
.acc-head{all:unset;cursor:pointer;box-sizing:border-box;width:100%;display:flex;align-items:center;
  gap:10px;padding:13px 14px;background:var(--turf);color:var(--chalk);font-size:13px;font-weight:600}
.acc-head-sub{font-weight:400;color:var(--faint);font-size:11.5px;margin-left:2px}
.acc-chev{margin-left:auto;transition:transform .18s;color:var(--faint);flex:0 0 auto}
.acc-head:hover .acc-chev{color:var(--chalk)}
.acc-on .acc-chev{transform:rotate(180deg)}
.acc-body{padding:16px 14px}

/* ---------- tirar para refrescar (pull to refresh) ---------- */
.ptr{display:flex;align-items:center;justify-content:center;height:0;overflow:hidden;color:var(--mark);
  transition:height .15s}
.ptr-on{height:52px}
.ptr-ico{width:20px;height:20px;transition:transform .1s}
.ptr-listo .ptr-ico{transform:rotate(180deg)}
.ptr-cargando .ptr-ico{animation:gira 0.7s linear infinite}
@keyframes gira{to{transform:rotate(360deg)}}

/* ---------- navegación de familias de mercado: tira + rejilla ---------- */
/* Con hasta trece familias, envolverlas en varias filas de píldoras
   no organiza nada — solo alarga la pantalla. Se quedan en una sola
   tira que se desliza (como cualquier fila de pestañas de Android) y
   el botón de rejilla al final abre todas de un vistazo, para saltar
   directo sin deslizar una por una. */
.famnav{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.famnav::-webkit-scrollbar{display:none}
.fambtn{flex:0 0 auto;white-space:nowrap}
.fambtn-grid{flex:0 0 auto;padding:6px 10px;position:sticky;right:0;background:var(--surface);
  box-shadow:-10px 0 8px -4px var(--surface)}
.fam-tile-n{font-size:9px;color:var(--faint);font-weight:600}
`}</style>
  );
}
