# 💕 nuestro-amor — Portal privado de Daniel y Kitzya

Portal de dos personas, estilo iOS, hecho con ❤️.
Cero build, cero framework: **archivos planos que se abren con doble clic**.
La carta original sigue viva en la pestaña **Inicio**; el acceso por código y la presencia van por Netlify Functions.

---

## 🌐 Enlaces

| Servicio | Enlace |
|---|---|
| **Web en vivo** | https://idyllic-wisp-bf5826.netlify.app |
| **Repositorio** | https://github.com/DanielDAAR/nuestro-amor.git |
| **Rama** | `master` |

> **Acceso:** el código de 6 dígitos vive en variables de entorno de Netlify (`ACCESS_CODE`), nunca en el repo. Para cambiarlo: `netlify env:set ACCESS_CODE "nuevo-código"` y redesplegar.

---

## 🧠 Qué es

Un "scrapbook digital" interactivo: una carta de amor animada con música sintetizada, jardín de flores que crecen, foto ampliable, tarjetas y mensajes personales. Todo en **archivos planos: `index.html` + `css/` + `js/`** (HTML + CSS + JavaScript vanilla, sin build).

---

## 🛠 Stack real

| Capa | Tecnología | Notas |
|---|---|---|
| Estructura | HTML5 | Marcado semántico en `index.html` (`<section>`, `<header>`, `<footer>`); 5 pestañas con paneles |
| Estilos | CSS3 | `css/base.css` + `css/ui.css` + `css/home.css` + `css/portal.css` + `css/memories.css` + `css/music.css` + `css/games.css` + `css/cinema.css` + `css/garden.css`; tokens `:root`, Grid/Flexbox, safe-area |
| Lógica | JS vanilla | `js/audio.js` + `js/ui.js` + `js/api.js` + `js/home.js` + `js/portal.js` + `js/memories.js` + `js/music.js` + `js/games.js` + `js/cinema.js` + `js/garden.js` (con `defer`, sin ES modules); Web Audio, IntersectionObserver, CSS 3D |
| Audio | Web Audio API | Sin archivos mp3; se genera el carillón con osciladores |
| Backend | Netlify Functions + Blobs | `netlify/functions/api.mjs`: acceso por código (HMAC), presencia, cuenta regresiva, cartas selladas, cápsula, música con oEmbed, juegos por turnos, películas por ver, álbum, diario a dos voces, reto, quizzes y jardín derivado (`/api?action=…`); secretos en env vars |
| PWA | Manifest + Service Worker | `manifest.json` + `sw.js`: instalable como "Nosotros 💕" y offline con lo último guardado; caché `nosotros-v3` y `action=photo` en Cache API |
| Deploy | Netlify | Sitio estático + 1 function, fuente: GitHub |
| Versionado | Git | Rama `master` |

**Por qué no hay React / Vite / Tailwind:** Durante el desarrollo el proyecto pasó por una versión con React + Vite + Tailwind + GSAP que causó errores persistentes de refs y build (`TypeError: b is not a function`, bucle infinito de re-renders). Se rescató a HTML puro y funciona garantizado.

---

## 📂 Estructura del proyecto

```
nuestro-amor/
├── index.html            ← Solo el marcado HTML (sin CSS ni JS inline)
├── PRODUCT.md            ← Verdad de producto (init de impeccable)
├── manifest.json         ← PWA: "Nosotros 💕" instalable
├── sw.js                 ← Service Worker: offline con lo último guardado
├── package.json          ← SOLO de la function /api (back); el front no tiene build
├── package-lock.json
├── css/
│   ├── base.css          ← Reset, tokens :root, botones, partículas, footer, reduced-motion
│   ├── ui.css            ← Primitivas compartidas: bottom sheet iOS + lightbox
│   ├── home.css          ← Secciones de Inicio: hero, caja, foto, jardín, tarjetas, tu turno
│   ├── portal.css        ← Tab bar, acceso, presencia, cuenta regresiva, formularios, aviso sin conexión
│   ├── memories.css      ← Pestaña Cartas: cartas selladas, compositor, cápsula, álbum, diario
│   ├── music.css         ← Pestaña Música y cine: canción del día, playlist, globo
│   ├── games.css         ← Pestaña Juegos: tableros, memoria, ahorcado, quizzes
│   ├── cinema.css        ← Pestaña Música y cine: películas por ver, ruleta
│   └── garden.css        ← Pestaña Jardín: flores, logros, reto de la semana
├── js/
│   ├── audio.js          ← Web Audio API: carillón, melodías, efectos de sonido
│   ├── ui.js             ← Guiño dev, haptic, sheet iOS, burst, pétalos
│   ├── api.js            ← Único archivo que expone en `window`: PortalBus, PortalAPI, toEpoch
│   ├── home.js           ← Mensajes, jardín, tarjetas, foto, tu turno, init
│   ├── portal.js         ← Acceso, pestañas, presencia, relojes, cuenta regresiva, flor, SW
│   ├── memories.js       ← Pestaña Cartas: cartas con fecha + cápsula + álbum + diario
│   ├── music.js          ← Pestaña Música y cine: canción del día, playlist, globo, escucha juntos
│   ├── games.js          ← Pestaña Juegos: partidas por turnos y quizzes
│   ├── cinema.js         ← Pestaña Música y cine: películas por ver, calificación, ruleta
│   └── garden.js         ← Pestaña Jardín: flores derivadas, logros, reto de la semana
├── netlify/functions/
│   └── api.mjs           ← Function /api: auth (HMAC) + presencia (Blobs, claves por perfil)
├── icons/                ← Iconos PWA 192 y 512 (mismo arte del apple-touch-icon)
├── foto-nuestra.jpg      ← La foto (se muestra y se amplía en lightbox)
├── og-image.jpg          ← Imagen de preview de WhatsApp (1200×630)
├── favicon.svg           ← Icono de la pestaña del navegador
├── apple-touch-icon.png  ← Icono al añadir a pantalla de inicio (iPhone)
├── imagenes/             ← Fotos locales, fuera del repo (.gitignore)
├── .netlify/             ← Estado local del CLI de Netlify (.gitignore, no se sube)
└── README.md             ← Este documento
```

---

## 🗺 Mapa del código: qué vive dónde

`index.html` solo tiene marcado. Cada cosa vive en su archivo y se carga con `<link>` / `<script defer>` — **sin ES modules ni build**, para seguir pudiendo abrir `index.html` con doble clic.

| Archivo | Qué contiene |
|---|---|
| `index.html` | `<head>` (metas iOS, Open Graph, manifest, iconos), las 5 pestañas (panel Inicio + estados vacíos), presencia, gate de acceso, tab bar, flor, lightbox y sheet |
| `css/base.css` | Reset, `:root` (tokens de color), botones `.btn`/`.btn-small`/`:disabled`, partículas `.pop`, footer, `prefers-reduced-motion` |
| `css/ui.css` | Bottom sheet iOS (backdrop, sheet, grabber, título) y lightbox de foto |
| `css/home.css` | Hero, caja de música, foto, jardín, "cosas de nosotros", "tu turno" |
| `css/portal.css` | Tab bar iOS, pantalla de acceso (gate), tarjeta de presencia, cuenta regresiva, formularios, aviso sin conexión |
| `css/memories.css` | Pestaña Cartas: cartas selladas, compositor, cápsula, álbum y diario |
| `css/music.css` | Pestaña Música y cine: canción del día, playlist, globo flotante |
| `css/games.css` | Pestaña Juegos: tableros, memoria, ahorcado, quizzes |
| `css/cinema.css` | Pestaña Música y cine: películas por ver, calificación, ruleta |
| `css/garden.css` | Pestaña Jardín: flores, logros, reto de la semana |
| `js/audio.js` | `ensureAudio()`, `bell()`, `sndUnlock/sndMelody/sndFlip/sndChime/sndPop` — sin mp3 |
| `js/ui.js` | Guiño de consola, título de pestaña, `haptic()`, `openSheet/closeSheet`, `burst()`, `dropPetal()` |
| `js/api.js` | `PortalBus.on/emit` (eventos `portal:ready` / `portal:tab` / `portal:heartbeat`), `PortalAPI(action,{method,body,query,binary})` → `{ok,status,data,error}`, `PortalCache` y `toEpoch()` (fechas `datetime-local` en `America/Mexico_City`). **Único archivo que expone en `window`** |
| `js/home.js` | Arrays `messages`/`funCards`/`funExtras`, `buildGarden()`, caja, foto, "tu turno" (`replyKey()` por perfil) y el bloque `Init` |
| `js/portal.js` | Sesión/`localStorage`, gate, pestañas, latido de presencia (~15 s), relojes (`America/Mexico_City`), cuenta regresiva, marca diaria de presencia, flor "pensando en ti", emite `portal:ready`/`portal:tab`/`portal:heartbeat`, `register('sw.js')` |
| `js/memories.js` | Pestaña Cartas: cartas con fecha + cápsula del tiempo + álbum de fotos privadas + diario a dos voces. Guarda `cache-memories-v1` |
| `js/music.js` | Pestaña Música y cine: canción del día, playlist, globo flotante, escucha sincronizada. Único dueño de `#songBubble` |
| `js/games.js` | Pestaña Juegos: partidas por turnos (tres en raya, 4 en línea, memoria, ahorcado) y quizzes |
| `js/cinema.js` | Pestaña Música y cine: películas por ver, calificación por perfil y ruleta de sorteo |
| `js/garden.js` | Pestaña Jardín: flores y logros derivados de la actividad, reto de la semana con foto privada |
| `netlify/functions/api.mjs` | `?action=auth` (código → token HMAC por perfil, throttle por IP), `?action=presence` (latido + thinking + marca diaria), `?action=countdown`, `?action=letters`, `?action=capsule`, `?action=music`/`music-now`/`music-sync`, `?action=games`, `?action=album`/`photo`, `?action=diary`, `?action=watch`, `?action=challenge`, `?action=quiz`, `?action=garden` |
| `manifest.json` | Nombre de app "Nosotros 💕", standalone, iconos 192/512 |
| `sw.js` | Network-first con caché de respaldo: online fresco, offline lo último guardado; `action=photo` en caché primero; el resto de `/api` queda fuera |

> Busca con Ctrl+F: los IDs (`#waxSeal`, `#countdownCard`, `#letterForm`, `#songBubble`, `#gameBoard`, `#gardenShared`…) no cambian.
> **Orden de carga:** `audio.js` → `ui.js` → `api.js` → `home.js` → `portal.js` → módulos (`memories.js`, `music.js`, `cinema.js`, `games.js`, `garden.js`). No repitas `const`/`let` en dos archivos (colisionan en el scope global).

---

## ✏ Recetas de personalización (busca → cambia)

### Cambiar su nombre
- `index.html`: `<h1>Kitzya</h1>`
- `index.html`: `<title>Para ti, Kitzya</title>` (y las metas `og:title` / `og:site_name`)
- `index.html`: `<footer>Hecho con 💕 · solo para ti, Kitzya</footer>`

### Cambiar los mensajes de la carta
Busca el array `messages` en `js/home.js`. Cada objeto es `{emoji, title, desc}`. Puedes añadir, quitar o editar los 10 mensajes.

### Cambiar las tarjetas "cosas de nosotros"
Busca `funCards` y `funExtras` en `js/home.js`. **Deben tener el mismo orden**: la tarjeta `i` abre el extra `i`. Si añades una tarjeta, añade su extra correspondiente.

### Cambiar la foto
Hay dos sitios con `src="foto-nuestra.jpg"` en `index.html`:
- La tarjeta principal (botón `#photoFrame`)
- El lightbox (`#lightbox`)

Sustituye `foto-nuestra.jpg` por tu archivo y deja la imagen junto a `index.html`.

### Cambiar la vista previa de WhatsApp (Open Graph)

Cuando mandes el link por WhatsApp, el preview usa `<head>`:
- **Título/descripción:** meta `og:title` y `og:description` al inicio del `<head>`.
- **Imagen:** `og-image.jpg` (1200×630) generada con la foto real + "Para ti, Kitzya". Para regenerarla, edita `gen-og.ps1` (PowerShell, `System.Drawing`) y corre el script.
- **⚠️ WhatsApp cachea el preview días:** al probar, manda el link con `?v=2` al final.

### Cambiar la sección "Tu turno"

Busca `replyKey()` en `js/home.js`.
- Cada perfil guarda lo suyo por separado (`daniel-reply-v1` / `kitzya-reply-v1`) en `localStorage` (solo en ese teléfono, no sale del dispositivo).
- Al volver, aparece *"La última vez me escribiste…"* con un botón ✕ para borrar.
- El botón "Enviármelo 💌" abre la hoja nativa de iOS (`navigator.share`) para elegir WhatsApp; si falla, copia al portapapeles.
- **Tu número de teléfono nunca queda escrito en el código** (la web es pública).

### Cambiar el código de acceso

El código de 6 dígitos **no está en el repo**: vive en Netlify como env var.

```powershell
netlify env:set ACCESS_CODE "nuevo-código-de-6-dígitos"
netlify deploy --prod --dir=.
```

Al cambiarlo, ambos deben entrar otra vez (los tokens viejos dejan de valer).

### Cuenta regresiva, cartas y cápsula (Fase 2)

- **Cuenta regresiva** (Inicio, bajo Presencia): `#countdownValue` muestra los días que faltan, "Sin fecha todavía" o "Ya pasó". El formulario (`#countdownForm`) guarda `{when, label}`; el botón `#countdownEdit` lo abre y `#countdownClear` lo borra. La fecha se interpreta en `America/Mexico_City` con `toEpoch()` (`js/api.js`) — nunca `new Date('YYYY-MM-DD')`.
- **Cartas** (`#lettersList`, `#letterForm`): título, texto y fecha de apertura opcional. Mientras esté sellada, **el otro solo ve el sobre** (el servidor no manda el texto); el autor ve la suya completa. Cada quien borra lo suyo (`Borrar`).
- **Cápsula del tiempo** (`#capsuleCard`, `#capsuleForm`, `#capsuleList`): se fija la fecha de apertura, ambos pueden añadir mientras esté sellada y al abrir se lee todo. Lo del otro se oculta hasta la fecha.
- **Sin conexión:** píldora "Sin conexión · mostrando lo último" (`#offlinePill`, `js/portal.js`) y botones de guardar deshabilitados; `memories.js` repinta desde `cache-memories-v1`.

### Añadir una pestaña nueva (siguientes fases)

1. Crea el panel en `index.html`: `<div class="tab-panel" id="panel-NOMBRE" role="tabpanel" hidden>…</div>` (fuera de `#panel-inicio`, dentro de `#app`).
2. Añade su botón en `<nav class="tabbar">` con `data-tab="NOMBRE"` y `aria-controls="panel-NOMBRE"` (icono SVG dibujado, no emoji).
3. Estilos en `css/NOMBRE.css` (usa los patrones existentes: `.ios-card`/`.group-header` de `css/base.css`, y `.field-label`/`.input`/`.form-actions` de `css/portal.css`).
4. Lógica en `js/NOMBRE.js` **dentro de un IIFE**, cargado después de `portal.js`: escucha `portal:ready` (una sola vez), `portal:tab` y `portal:heartbeat`, y llama a la API con `PortalAPI()`. No declares nada en el scope global (solo `js/api.js` toca `window`).
5. Si consume datos nuevos, añade un `action` en `netlify/functions/api.mjs`.
6. Añade el CSS y el JS nuevos a `ASSETS` en `sw.js`.


### Cambiar colores
Busca `:root` en `css/base.css`. Las variables clave:
- `--ios-pink: #FF375F` — color principal (botones, bordes)
- `--ios-pearl: #FDEEF4` — frente de tarjetas flip
- `--bg-grouped: #F2F2F7` — fondo del jardín y body
- `--ios-deep: #8E4162` — texto oscuro

### Cambiar cantidad y colores de las flores
- `js/home.js`: `cols` — array de pares `[color pétalo, color centro]`
- `js/home.js`: `innerWidth<400 ? 7 : 9` — cuántas flores crecen (móvil vs desktop)

### Cambiar el audio / melodía
No hay archivo mp3. El carillón se sintetiza con osciladores:
- `sndUnlock()` en `js/audio.js`: sonido al abrir la caja
- `sndMelody()` en `js/audio.js`: melodía principal (array de `[frecuencia, duración]`)
- `sndFlip()`, `sndChime()`, `sndPop()`: efectos pequeños

### Añadir una canción
Pega un link de YouTube o Spotify en "Música y cine" → "Nuestra playlist" y dale a "Dedicar canción". El servidor pide los metadatos (oEmbed), guarda título, artista y portada, y la pone como canción del día. El globo flotante aparece en todas las pestañas; tocarlo abre el link fuera del portal. Si el proveedor no responde, se usa la dedicatoria escrita a mano.

### "Escuchar juntos"
Desde la canción del día, toca "Escuchar juntos": el portal fija un segundo de inicio a 10 s vista y hace cuenta regresiva. Cada quien da play en su propia app de música. El portal no reproduce audio (sin cookies ni rastreadores de terceros).

### Añadir una película a ver
En "Música y cine" → "Para ver juntos", escribe un título y dale a "Añadir a la lista". Cada quien califica con 1-5 estrellas; la ruleta solo sortea entre las que los dos calificaron, sin repetir la última elegida.

### Añadir un juego
En "Juegos", elige Tres en raya, 4 en línea, Memoria o Ahorcado y toca "Empezar partida". Si ya hay una partida abierta de ese tipo, se reutiliza. Cada jugada lleva `rev` del servidor: si dos personas tocan a la vez, el segundo recibe `409` y el tablero se repinta con la versión fresca.

### Reto de la semana
En "Jardín" → "Reto de la semana", cualquiera puede proponer el reto. Para responder, sube una foto (se comprime en el teléfono a 1600 px, máx. 1,5 MB) y una nota; la foto se guarda en Blobs privados y solo se ve dentro del portal.

---
1. Añade un `<section>` dentro de `<div id="app">` en `index.html`.
2. Añade sus estilos en `css/home.css` (o en `css/base.css` si son primitivas que reutilizarán varias pestañas).
3. Si tiene interacción, añade el código en `js/home.js` y llama a su `init()` en el bloque `── Init ──` del final.
4. Sin ES modules ni build: todo es global vía `defer` — no repitas `const`/`let` entre archivos.

---

## 🔊 Sobre el audio

**No hay canción mp3.** El sitio genera un carillón con la Web Audio API (osciladores + delay para reverb).

**Por qué no suena automáticamente:** iOS y Chrome bloquean el AudioContext hasta que el usuario interactúe. Por eso el sonido empieza al tocar el sello de la caja de música (`waxSeal`).

Si algún día quieres poner una canción real:
```html
<audio id="musica" src="audio/nuestra-cancion.mp3" loop></audio>
```
Y en JS: `document.getElementById('musica').play()` tras el primer toque del usuario.

---

## 🚀 Cómo publicar cambios

Desde PowerShell, **un comando por línea** (PowerShell no acepta `&&`):

```powershell
cd C:\Users\espec\OneDrive\Desktop\web K\nuestro-amor
git add .
git commit -m "❤️ descripción del cambio"
git push origin master
netlify deploy --prod --dir=.
```

O si ya está conectado Netlify con GitHub, solo hacer `git push origin master` y se despliega solo.

---

## 📜 Reglas de oro (para no repetir el desastre)

1. **Sin build, sin framework, sin npm en el front.** Archivos planos `index.html` + `css/` + `js/` con `<link>`/`<script defer>` (nada de ES modules: se sigue abriendo con doble clic). El único `package.json` es el de la function `/api` (back, para `@netlify/blobs`); no hay build en ningún lado. Si algún día se quiere React/Vite, hacerlo en una rama aparte y con build verificado.
2. **Nunca callbacks de ref inline ni bucles de re-render.** Eso fue la causa del `TypeError: b is not a function` y el bucle infinito que rompió la versión React.
3. **Probar local antes de desplegar.** Abrir `index.html` directo o `npx serve` en la carpeta.
4. **Un cambio = un commit con mensaje claro.** Ejemplos: `❤️ Cambiar nombre`, `📸 Nueva foto`, `💬 Nuevo mensaje`.
5. **Respetar `prefers-reduced-motion`.** Ya está en `css/base.css`.

---

## 🗺 Backlog (ideas v2)

- [ ] Canción real opcional (`<audio>`)
- [ ] Más fotos / galería tipo polaroid
- [ ] Modo oscuro
- [ ] Contador de días juntos
- [ ] Mapa de lugares donde han estado
- [ ] Comando secreto (Konami code)
- [x] PWA instalable en iPhone (Fase 1: manifest + SW, app "Nosotros 💕")

---

## 📓 Changelog detallado

| Commit | Fecha | Qué cambió | Por qué |
|---|---|---|---|
| `7752b04` | — | Initial commit: scrapbook digital | Inicio del proyecto |
| `c9f65c6` | — | Fix: Tailwind v4 compatibility & production build | Problemas con Tailwind CSS v4 y PostCSS |
| `b11b211` | — | Contenido real: historia, cartas, bucket list, recuerdos, comandos dev | Se pobló el scrapbook con contenido romántico y dev |
| `0f5dfba` | — | Auditoría y mejora de diseño (impeccable + apple-design + emil-design-eng) | Aplicó skills de diseño para pulir la UI |
| `ddf2e40` | — | Fix: página en blanco — ErrorBoundary, GSAP defensivo, ScrollTrigger resiliente | Intento de corregir la página en blanco |
| `50ec96d` | — | Fix: página en blanco — try/catch en main.jsx, ErrorBoundary, estilos fallback | Más intentos de estabilizar React |
| `eb54f91` | — | Fix: TerminalButton not defined | Import faltante que causaba crash de render |
| `d541f07` | — | Fix: eliminar refs inline problemáticos | Intento de corregir bucles de re-render en React |
| `aa5855f` | — | Fix: eliminar callbacks de ref inline, useCallback, useScrollReveal simplificado, GSAP removido | Último intento dentro del stack React |
| `6193acb` | — | **Fix: sitio simple HTML/CSS/JS sin React ni build — funciona garantizado** | **Rescate definitivo: se descartó React/Vite/Tailwind/GSAP por errores persistentes; se volvió a HTML puro** |
| `7d78ace` | 09-11-2026 | Rediseño iOS completo: Web Audio API, jardín SVG, lightbox, bottom sheet, foto real + README y `.gitignore` | Sitio iOS publicado |
| `297d647` | 09-11-2026 | Preview de WhatsApp (`og-image.jpg`, OG tags), `favicon.svg`, `apple-touch-icon.png`, sección "Tu turno" (localStorage + `navigator.share`), guiño dev en consola y título de pestaña | Primera impresión al mandar el link + que ella pueda responder |

| **Fase 0** | 10-11-2026 | Sitio separado en `css/` (base, ui, home) y `js/` (audio, ui, home) sin build; toast de "Tu turno" honesto (ya no promete WhatsApp); botón enviar nace disabled con estilo propio `.btn-small` de 44px; PNG suelta movida a `imagenes/`; `.netlify/` fuera de git | Limpieza de base antes del portal con pestañas (Fase 1) |

| **Fase 1** | 10-11-2026 | `PRODUCT.md` (init impeccable); tab bar de 5 pestañas (iconos SVG) con estados vacíos; pantalla de acceso por código de 6 dígitos (dos perfiles, token HMAC, throttle por IP en `netlify/functions/api.mjs` + Blobs); presencia con latido ~15 s, relojes de ambos y flor "pensando en ti"; PWA (manifest "Nosotros 💕", SW offline, iconos 192/512); "Tu turno" por perfil; detector impeccable `[]`; API 18/18 en prod | El portal pasa de carta única a casa privada de dos personas |

| **Fase 2** | 11-11-2026 | `js/api.js` (PortalBus + PortalAPI + `toEpoch`) y `js/memories.js`; `css/memories.css`; cuenta regresiva en Inicio (`#countdownCard`, fijar/cambiar/quitar) alimentada desde `state.countdown`; pestaña **Cartas** completa (cartas con fecha de apertura + cápsula del tiempo, `#lettersList`, `#letterForm`, `#capsuleCard`); eventos `portal:ready`/`portal:tab`/`portal:heartbeat`; marca diaria de presencia (`day-<fecha>-<perfil>.json`); píldora "sin conexión" y `cache-memories-v1`; SW `nosotros-v2` | El latido que ya existía se convierte en el canal de los módulos y las pestañas dejan de estar vacías |

| **Fases 3-6** | 11-11-2026 | Música: playlist, dedicatura con oEmbed (YouTube/Spotify), canción del día, globo flotante (`#songBubble`) y escucha sincronizada (`music-sync`); Juegos: tres en raya, 4 en línea, memoria y ahorcado por turnos con `rev` y 409; Quizzes: "¿Cuánto me conoces?" y "Esto o aquello"; Cine: películas por ver con calificación 1-5 y ruleta de sorteo; Jardín: flores y logros derivados de la actividad, reto de la semana con foto privada comprimida en canvas; Álbum: fotos privadas con `photo?id=` autenticado y compresión 1600px/0.82→0.7→0.6 (1,5 MB); Diario a dos voces con revelado doble y `409 revelada`; CSS: `css/music.css`, `css/games.css`, `css/cinema.css`, `css/garden.css`; SW `nosotros-v3` con caché `action=photo` | Todas las pestañas quedan funcionales; el latido de 15 s es el único canal de tiempo real |

---

*Última actualización: 11 de noviembre de 2026 · Para ti, Kitzya 🎀*
