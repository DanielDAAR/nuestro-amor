# 💕 nuestro-amor — Carta interactiva para Kitzya

Sitio de una sola página, estilo iOS, hecho con ❤️ para Kitzya.
Cero dependencias, cero build, se abre directo en el navegador.

---

## 🌐 Enlaces

| Servicio | Enlace |
|---|---|
| **Web en vivo** | https://idyllic-wisp-bf5826.netlify.app |
| **Repositorio** | https://github.com/DanielDAAR/nuestro-amor.git |
| **Rama** | `master` |

---

## 🧠 Qué es

Un "scrapbook digital" interactivo: una carta de amor animada con música sintetizada, jardín de flores que crecen, foto ampliable, tarjetas y mensajes personales. Todo en **archivos planos: `index.html` + `css/` + `js/`** (HTML + CSS + JavaScript vanilla, sin build).

---

## 🛠 Stack real

| Capa | Tecnología | Notas |
|---|---|---|
| Estructura | HTML5 | Marcado semántico en `index.html` (`<section>`, `<header>`, `<footer>`) |
| Estilos | CSS3 | `css/base.css` + `css/ui.css` + `css/home.css`; tokens `:root`, Grid/Flexbox, safe-area |
| Lógica | JS vanilla | `js/audio.js` + `js/ui.js` + `js/home.js` (con `defer`, sin ES modules); Web Audio, IntersectionObserver, CSS 3D |
| Audio | Web Audio API | Sin archivos mp3; se genera el carillón con osciladores |
| Deploy | Netlify | Sitio estático directo, fuente: GitHub |
| Versionado | Git | Rama `master` |

**Por qué no hay React / Vite / Tailwind:** Durante el desarrollo el proyecto pasó por una versión con React + Vite + Tailwind + GSAP que causó errores persistentes de refs y build (`TypeError: b is not a function`, bucle infinito de re-renders). Se rescató a HTML puro y funciona garantizado.

---

## 📂 Estructura del proyecto

```
nuestro-amor/
├── index.html            ← Solo el marcado HTML (sin CSS ni JS inline)
├── css/
│   ├── base.css          ← Reset, tokens :root, botones, partículas, footer, reduced-motion
│   ├── ui.css            ← Primitivas compartidas: bottom sheet iOS + lightbox
│   └── home.css          ← Secciones de Inicio: hero, caja, foto, jardín, tarjetas, tu turno
├── js/
│   ├── audio.js          ← Web Audio API: carillón, melodías, efectos de sonido
│   ├── ui.js             ← Guiño dev, haptic, sheet iOS, burst, pétalos
│   └── home.js           ← Mensajes, jardín, tarjetas, foto, tu turno, init
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
| `index.html` | `<head>` (metas iOS, Open Graph, iconos), todas las `<section>` dentro de `#app`, lightbox y sheet |
| `css/base.css` | Reset, `:root` (tokens de color), botones `.btn`/`.btn-small`/`:disabled`, partículas `.pop`, footer, `prefers-reduced-motion` |
| `css/ui.css` | Bottom sheet iOS (backdrop, sheet, grabber, título) y lightbox de foto |
| `css/home.css` | Hero, caja de música, foto, jardín, "cosas de nosotros", "tu turno" |
| `js/audio.js` | `ensureAudio()`, `bell()`, `sndUnlock/sndMelody/sndFlip/sndChime/sndPop` — sin mp3 |
| `js/ui.js` | Guiño de consola, título de pestaña, `haptic()`, `openSheet/closeSheet`, `burst()`, `dropPetal()` |
| `js/home.js` | Arrays `messages`/`funCards`/`funExtras`, `buildGarden()`, caja, foto, "tu turno" (`REPLY_KEY`) y el bloque `Init` |

> Busca con Ctrl+F: los IDs (`#waxSeal`, `#replyInput`…) no cambian.
> **Orden de carga:** `audio.js` → `ui.js` → `home.js`. No repitas `const`/`let` en dos archivos (colisionan en el scope global).

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

Busca `REPLY_KEY = 'kitzya-reply-v1'` en `js/home.js`.
- Guarda lo que ella escriba en `localStorage` (solo en su teléfono, no sale del dispositivo).
- Al volver, aparece *"La última vez me escribiste…"* con un botón ✕ para borrar.
- El botón "Enviármelo 💌" abre la hoja nativa de iOS (`navigator.share`) para elegir WhatsApp; si falla, copia al portapapeles.
- **Tu número de teléfono nunca queda escrito en el código** (la web es pública).


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

### Añadir una sección nueva
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

1. **Sin build, sin framework, sin npm.** Archivos planos `index.html` + `css/` + `js/` con `<link>`/`<script defer>` (nada de ES modules: se sigue abriendo con doble clic). Si algún día se quiere React/Vite, hacerlo en una rama aparte y con build verificado.
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
- [ ] PWA instalable en iPhone

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

---

*Última actualización: 10 de noviembre de 2026 · Para ti, Kitzya 🎀*
