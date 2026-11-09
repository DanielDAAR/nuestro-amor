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

Un "scrapbook digital" interactivo: una carta de amor animada con música sintetizada, jardín de flores que crecen, foto ampliable, tarjetas y mensajes personales. Todo en **un solo archivo `index.html`** (HTML + CSS + JavaScript vanilla).

---

## 🛠 Stack real

| Capa | Tecnología | Notas |
|---|---|---|
| Estructura | HTML5 | Un solo archivo, semántico (`<section>`, `<header>`, `<footer>`) |
| Estilos | CSS3 | Variables `:root`, CSS Grid/Flexbox, iOS safe-area, media queries |
| Lógica | JS vanilla | Web Audio API (carillón sintetizado), IntersectionObserver, CSS 3D, SVG inline |
| Audio | Web Audio API | Sin archivos mp3; se genera el carillón con osciladores |
| Deploy | Netlify | Sitio estático directo, fuente: GitHub |
| Versionado | Git | Rama `master` |

**Por qué no hay React / Vite / Tailwind:** Durante el desarrollo el proyecto pasó por una versión con React + Vite + Tailwind + GSAP que causó errores persistentes de refs y build (`TypeError: b is not a function`, bucle infinito de re-renders). Se rescató a HTML puro y funciona garantizado.

---

## 📂 Estructura del proyecto

```
nuestro-amor/
├── index.html            ← TODO el sitio (33 KB: HTML + CSS + JS)
├── foto-nuestra.jpg      ← La foto (se muestra y se amplía en lightbox)
├── 64271C1D-....png      ← Imagen suelta (pendiente de organizar)
├── imagenes/             ← Carpeta vacía, para futuras fotos
├── .netlify/             ← Config de publicación de Netlify (no tocar)
└── README.md             ← Este documento
```

---

## 🗺 Mapa de `index.html`

Todas las secciones del sitio viven dentro de `<div id="app">` y se navegan con scroll suave.

| Líneas | Qué hay | Cómo editarlo |
|---|---|---|
| **1–10** | `<head>`: metas iOS, viewport, title | Cambia el `<title>` para cambiar la pestaña del navegador (línea 10) |
| **11–360** | `<style>`: diseño completo | Colores en `:root` (líneas 18–51), componentes abajo |
| **362–373** | **Hero** — "Solo para ti" + nombre | Línea 371 `<h1>Kitzya</h1>`; línea 372 `<p class="lede">` |
| **376–438** | **Caja de música** — sello, tarjeta flip, "otro mensaje" | Audio en JS (ver más abajo), mensajes en array `messages` |
| **442–452** | **Nuestra foto** — tarjeta + caption | `src="foto-nuestra.jpg"` línea 446; caption línea 449 |
| **455–460** | **Jardín** — flores SVG que crecen | `buildGarden()` en JS (línea 591) |
| **463–466** | **Cosas de nosotros** — tarjetas divertidas | Array `funCards` en JS (línea 561) |
| **472–483** | Lightbox de foto + sheet iOS (mensajes) | — |
| **489–540** | Motor de audio (carillón sintetizado) | `bell()`, `sndMelody()`, `sndFlip()`, etc. |
| **545–556** | `messages` — 10 mensajes personales | Editar aquí los textos de la carta |
| **561–569** | `funCards` — 7 tarjetas "cosas de nosotros" | Emoji + texto HTML (`<br>` permitido) |
| **574–605** | `flowerSVG` + `buildGarden` | Colores en línea 593; cantidad en línea 594 |
| **610–712** | Interacción principal | Abrir caja, girar carta, "otro mensaje", sheets |
| **715–730** | `burst()` — partículas emoji | Emojis en línea 716 |
| **740–797** | Jardín: observer, touch, pétalos sueltos | — |
| **800–816** | Lightbox de la foto | `src="foto-nuestra.jpg"` línea 475 |
| **818–822** | Arranque del sitio | `buildGarden(); buildFun(); observeGarden(); ...` |

---

## ✏ Recetas de personalización (busca → cambia)

### Cambiar su nombre
- Línea 371: `<h1>Kitzya</h1>`
- Línea 10: `<title>Para ti, Kitzya</title>`
- Línea 470: `<footer>Hecho con 💕 · solo para ti, Kitzya</footer>`

### Cambiar los mensajes de la carta
Busca el array `messages` (línea 545). Cada objeto es `{emoji, title, desc}`. Puedes añadir, quitar o editar los 10 mensajes.

### Cambiar las tarjetas "cosas de nosotros"
Busca `funCards` (línea 561) y `funExtras` (línea 674). **Deben tener el mismo orden**: la tarjeta `i` abre el extra `i`. Si añades una tarjeta, añade su extra correspondiente.

### Cambiar la foto
Hay dos sitios con `src="foto-nuestra.jpg"`:
- Línea 446 (tarjeta principal)
- Línea 475 (lightbox a pantalla completa)

Sustituye `foto-nuestra.jpg` por tu archivo y deja la imagen junto a `index.html`.

### Cambiar colores
Busca `:root` (línea 18). Las variables clave:
- `--ios-pink: #FF375F` — color principal (botones, bordes)
- `--ios-pearl: #FDEEF4` — frente de tarjetas flip
- `--bg-grouped: #F2F2F7` — fondo del jardín y body
- `--ios-deep: #8E4162` — texto oscuro

### Cambiar cantidad y colores de las flores
- Línea 593: `cols` — array de pares `[color pétalo, color centro]`
- Línea 594: `innerWidth<400 ? 7 : 9` — cuántas flores crecen (móvil vs desktop)

### Cambiar el audio / melodía
No hay archivo mp3. El carillón se sintetiza con osciladores:
- `sndUnlock()` (línea 530): sonido al abrir la caja
- `sndMelody()` (línea 531): melodía principal (array de `[frecuencia, duración]`)
- `sndFlip()`, `sndChime()`, `sndPop()`: efectos pequeños

### Añadir una sección nueva
1. Añade un `<section>` dentro de `<div id="app">` con su clase o id.
2. Añade sus estilos en `<style>` después de las secciones existentes.
3. Si tiene interacción, añade el código JS al final del `<script>` (antes del cierre `</script>`) y llama a su función de init en las líneas 818–822.

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
git commit -m "❤️ descripci�n del cambio"
git push origin master
netlify deploy --prod --dir=.
```

O si ya está conectado Netlify con GitHub, solo hacer `git push origin master` y se despliega solo.

> ⚠️ **Nota actual:** `git status` muestra `index.html` y `foto-nuestra.jpg` modificados pero **sin commitear**. Antes de publicar cambios nuevos, haz `git add .` y `git commit`.

---

## 📜 Reglas de oro (para no repetir el desastre)

1. **Un archivo, sin build.** Todo vive en `index.html`. Si algún día se quiere React/Vite, hacerlo en una rama aparte y con build verificado.
2. **Nunca callbacks de ref inline ni bucles de re-render.** Eso fue la causa del `TypeError: b is not a function` y el bucle infinito que rompió la versión React.
3. **Probar local antes de desplegar.** Abrir `index.html` directo o `npx serve` en la carpeta.
4. **Un cambio = un commit con mensaje claro.** Ejemplos: `❤️ Cambiar nombre`, `📸 Nueva foto`, `💬 Nuevo mensaje`.
5. **Respetar `prefers-reduced-motion`.** Ya está en el CSS (líneas 353–355).

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
| *(sin commitear)* | Hoy | Rediseño iOS completo: Web Audio API, jardín SVG, lightbox, bottom sheet, foto real, para Kitzya | Versión actual en disco; pendiente de `git add . && commit && push` |

---

*Última actualización: 09 de noviembre de 2026 · Para ti, Kitzya 🎀*
