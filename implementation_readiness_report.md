# Informe de implementación — Etapa 9 (Implementation Readiness)

* **Documento:** `docs/designs/fase-2-apartados.md`
* **Rango auditado:** líneas 326-417 (`## Detailed Implementation Plan`)
* **Fecha:** 2026-11-11
* **Modo:** solo plan de implementación (preset 3), salto directo a Etapa 9
* **Estándar:** `implementation-readiness-standard`
* **Goldfish:** `egm-implementation-readiness` completado · `egm-codebase-details` completado (respuesta truncada en su último hallazgo; los anteriores están completos) · `egm-style` completado
* **Contexto de lectura:** `PRODUCT.md`, `README.md`, `index.html`, `js/portal.js`, `js/home.js`, `js/ui.js`, `css/base.css`, `css/home.css`, `css/portal.css`, `netlify/functions/api.mjs`, `sw.js`, `manifest.json`

## Resumen

Tras deduplicar 61 hallazgos crudos quedan **9 bloqueadores, 12 mayores y 9 nits**.

El plan describe bien el producto, pero todavía no es ejecutable sin tomar decisiones nuevas. Los cuatro huecos que más riesgo concentran: el arranque de módulos después del login, el contrato de la capa compartida, la fecha en epoch/timezone, y la Fase 5 apoyada en fotos que llegan en la Fase 6.

---

## Bloqueadores

### CA-01 · El evento de arranque no existe después del login

**Líneas:** 338 (y 118, 237-238).
**Qué está mal:** el plan emite `portal:ready` en `DOMContentLoaded`. En `js/portal.js` el arranque ocurre en dos rutas: al cargar con sesión (`startPortal()`, sincrónico) y dentro de `login()` tras canjear el código. Si el evento sale en `DOMContentLoaded`, un visitante sin sesión ya lo recibió cuando todavía no hay token: los módulos piden `/api` sin cabeceras, reciben 401 y `portal.js` limpia la sesión y muestra "Tu sesión ya no es válida". Al entrar después, nadie vuelve a emitir el evento y los módulos nunca cargan.
**Por qué importa:** es el camino normal del primer acceso y de "Cambiar de perfil".
**Fix:** emitir `portal:ready` **dentro de `startPortal(profile)`**, que cubre las dos rutas; los módulos se inicializan una sola vez con una guarda (`if (mod.ready) return;`); ningún módulo hace `fetch` antes de ese evento.

### CA-02 · La capa compartida no tiene contrato y choca con el scope global

**Líneas:** 336, 337, 238-239.
**Qué está mal:** cuatro huecos juntos.
1. El bus de eventos aparece como dueño en `api.js` (L336) y como emisor en `portal.js` (L238), sin decir quién define qué.
2. `PortalAPI(action, options)` no define URL (`?action=`), método, cuerpo vs query (`photo` es GET con `?id=`), valor de retorno, forma de error ni canal del 401.
3. `portal.js` ya declara `const API_URL`, `const SESSION_KEY` y `let session`. Si `api.js` redeclara esos nombres en el scope global, el script entero lanza `SyntaxError`. Además `api.js` carga antes, así que no puede leer `session`.
4. `api.js` "con cabeceras de sesión y manejo de 401" duplica `sync()` y `login()` sin decir que se migran. Habría dos manejadores de 401.
**Fix:** un solo dueño del bus (`api.js` expone `PortalBus.on/emit`; `portal.js` es el único que emite). `api.js` lee la sesión de `localStorage['portal-session-v1']` en cada llamada y usa nombres únicos (`PORTAL_API`, `PORTAL_TOKEN_KEY`). Se declara `api.js` como el único archivo que expone algo en `window` (`window.PortalAPI`), o como excepción explícita a la regla de IIFE. `sync()` y `login()` pasan a usar `PortalAPI`. Firma documentada: `PortalAPI(action, {method, body, query, binary})` → `{ok, status, data, error}`; 401 emite `portal:auth-lost` y `portal.js` limpia y muestra el gate.

### CA-03 · La cuenta regresiva no tiene dueño ni contrato de fecha

**Línea:** 334 (y 340, 350, 375).
**Qué está mal:** el marcado (`#countdownForm`, `#countdownClear`) queda en `index.html` y el plan solo asigna el *pintado* a `portal.js`. Nadie envía el formulario ni borra. Además `countdown` espera **epoch en milisegundos** (`parseWhen(Number(value))` en `api.mjs`); el valor crudo de un `input[type=datetime-local]` produce `400 fecha-invalida`. Lo mismo aplica a `letters.opensAt`, `capsule.setdate` y `#photoDate`.
**Fix:** en `portal.js`: `onCountdownSubmit` construye `when = fecha local America/Mexico_City → getTime()` y manda `{when, label}`; `#countdownClear` manda `{clear:true}`; ambos repintan con la respuesta. La misma función de conversión se usa en `memories.js` para cartas y cápsula. Regla escrita: nunca `new Date('YYYY-MM-DD')` (eso es UTC).

### CA-04 · El esquema de juegos no soporta memoria ni ahorcado

**Líneas:** 366 (con 132, 187, 363, 365).
**Qué está mal:** el mapa define `{id, kind, players, turn, board, secret, guesses, status, winner, rev, at}`. Falta dónde viaja la palabra al crear el ahorcado (`word` no está en el POST), y no existen `deck`, `flipped` ni `matched` para memoria, aunque L366 exige ocultar "el mazo no revelado". Tampoco se dice qué devuelve `create` si ya hay una partida abierta del mismo tipo.
**Fix:** esquema por tipo:
* `ttt`: `board: [9]`, `turn`.
* `four`: `board: [42]`, `turn`.
* `memory`: `deck: [N]` (barajado en servidor), `flipped: []`, `matched: []`, `turn`.
* `hangman`: `secret`, `guesses: []`, `wrong: 0`, `turn`.
Y cuerpos literales: `create {kind, word?}`, `move {id, rev, cell?|letter?}`, con `409 {error:'rev-vieja', game}`.

### CA-05 · Borrado de partidas contradictorio y callejón sin salida

**Líneas:** 366 vs 369, con 187.
**Qué está mal:** "delete solo partidas terminadas" contra "una partida abandonada se puede borrar". Con una partida abierta por tipo, una abandonada bloquea crear otra y no se puede borrar.
**Fix:** una sola regla: `delete` permitido si `status=finished` **o** si no hay jugadas en 7 días; cualquiera de los dos perfiles puede borrar. `create` con partida abierta devuelve `200` con esa partida y `reused: true` (sin `409`, para que el cliente pinte el tablero existente).

### CA-06 · `music-now` nunca se escribe y el globo tiene dos dueños

**Líneas:** 350-352, 238, 179-180.
**Qué está mal:** el globo pinta desde `now` (`music-now.json`), pero ningún paso escribe esa clave al añadir una canción. §Módulos dice que `portal.js` pinta el globo; la Fase 3 dice que lo pinta `music.js`. Y `now` solo se lee al entrar en la pestaña Música, así que el globo no aparece en Inicio ni en Juegos, contra el CUJ 1.
**Fix:** `POST music` escribe también `music-now` (una escritura, misma petición) y devuelve `{song, now}`. `music.js` es el único dueño de `#songBubble`; `portal.js` solo deja el contenedor. El globo refresca con un `GET music?view=now` ligero en cada latido, independiente de la pestaña visible. Si se borra la canción que era `now`, se limpia `music-now`. El cierre del globo se guarda en `sessionStorage['bubble-dismissed']` con el `songId`.

### CA-07 · La Fase 5 no es entregable: los retos dependen de la Fase 6

**Líneas:** 375, 378, 381, 384, 393-394, 416.
**Qué está mal:** los retos usan `photoId` y "la tubería de fotos", pero compresión, `photo-<uuid>` y `action=photo` llegan en la Fase 6. `garden` suma desde `photo-` y `diary-`, claves que en la Fase 5 aún no existen. `#challengeCard` no tiene módulo dueño (¿`cinema.js`? ¿`garden.js`?) y `garden.css` no cubre retos.
**Fix:** adelantar a la Fase 5 la escritura de fotos: compresión, `album POST` y `photo GET` se implementan en la Fase 5 con el álbum oculto en UI; los retos y el jardín los consumen. `challenge` vive en `garden.js` (es la pestaña Jardín) con IDs `#challengePrompt`, `#challengePhoto`, `#challengeNote`. La Fase 6 queda solo con la rejilla del álbum y el diario.

---

## Mayores

### CA-08 · Etiquetas `<link>`/`<script>` inválidas y orden de carga indefinido

**Líneas:** 334, 350, 363, 375, 390.
**Fix:** marcado literal en cada fase: `<link rel="stylesheet" href="css/memories.css">` después de `portal.css`; `<script src="js/api.js" defer></script>` después de `ui.js`; los módulos (`memories.js`, `music.js`, `games.js`, `cinema.js`, `garden.js`) al final, **después** de `portal.js`, todos con `defer`.

### CA-09 · Marca diaria: regla doble, sin idempotencia, con UTC

**Líneas:** 338, 340.
**Fix:** el cliente calcula `YYYY-MM-DD` con `Intl` y `America/Mexico_City` y manda `day` en el primer latido de cada día local; el servidor escribe `day-<fecha>-<perfil>.json` solo si no existe. Se declara el `get` extra por latido (contradice el NFR "una lectura extra" y hay que corregir el NFR o mover la comprobación al cliente).

### CA-10 · `sw.js` sin diff concreto

**Línea:** 354.
**Fix:** añadir a `ASSETS` las entradas exactas por fase (`css/music.css`, `js/music.js`, …) y subir `CACHE` a `nosotros-v2` en la Fase 2; el manejador `fetch` no cambia hasta la Fase 6, donde se añade `cache-first` solo para `action=photo`.

### CA-11 · `games` con doble protocolo (`op` vs método) y `rev` sin dueño

**Líneas:** 365-366.
**Fix:** una sola forma: `GET games` (lista), `POST games` con `{op:'create'|'move'}`, `DELETE games`. `rev` lo incrementa el servidor en cada escritura y el cliente solo lo devuelve. `409 {error:'rev-vieja', game}`.

### CA-12 · `quiz` sin preguntas, fórmula ni esquema

**Líneas:** 378, 379, 381.
**Fix:** preguntas en una constante de `api.mjs` (`[{id, text, options:[…]}]`), respuestas `{id, option}` por perfil. `GET quiz` devuelve `{questions, mine, theirs}` con `theirs:null` hasta que ambos respondan, y `match = aciertos / respondidas` redondeado a entero. `quiz-<uuid>.json` = `{id, kind, answers:{daniel:{}, kitzya:{}}}`.

### CA-13 · Ruleta con dos predicados y sin persistencia

**Líneas:** 378, 384.
**Fix:** entra en la ruleta todo título calificado por ambos (`ratingA != null && ratingB != null`). Estado vacío: "Nada que sortear todavía". El último elegido se guarda en `localStorage['roulette-last-v1']` (solo ese teléfono) y se excluye del sorteo siguiente.

### CA-14 · Dos módulos re-renderizan el mismo panel

**Líneas:** 350-352, 375.
**Fix:** contenedores fijos e independientes (`#musicBlock`, `#cinemaBlock`, `#gamesBlock`, `#quizBlock`). Prohibido `innerHTML` sobre la raíz de un `tab-panel`. `music.js` y `cinema.js` comparten un solo listener de `portal:tab` y cada uno lee solo cuando su bloque está visible.

### CA-15 · Diario: `a`/`b` sin mapear y "ronda actual" sin regla

**Líneas:** 393, 397.
**Fix:** `daniel→a`, `kitzya→b`. `POST {text}` sin `id` se une a la única ronda abierta (o la crea si no hay). Una sola ronda abierta a la vez. `GET` devuelve lo ajeno solo con ambos textos. Editar una ronda revelada devuelve `409 {error:'revelada'}`. No existe `DELETE`; se quita "ni se borra".

### CA-16 · Límite de foto contradictorio y estado HTTP sin decidir

**Líneas:** 199-200, 397, 403.
**Fix:** escalera 0.82 → 0.7 → 0.6, máximo 3 intentos; si sigue por encima de **1.5 MB**, se rechaza con `413 {error:'foto-grande'}` y mensaje "La foto pesa demasiado, elige otra". El servidor rechaza también cuerpos que no sean `data:image/jpeg` o `data:image/png`.

### CA-17 · Álbum pierde `#photoDate` y el borrado no tiene orden

**Líneas:** 133, 157, 390.
**Fix:** `album POST {dataUrl, phrase, date}` con `date` epoch (por defecto hoy, editable); `photo-<uuid>.json` incluye `date`. `DELETE` borra primero el JSON y luego el blob; si falta el blob, devuelve `{ok:true, warned:'blob-ausente'}`.

### CA-18 · La verificación no es ejecutable

**Líneas:** 399-403.
**Fix:** `npx serve` solo sirve estáticos; para `/api` hay que usar `netlify dev` con `ACCESS_CODE` en `.env` local (documentado en README). `curl.exe` (no el alias de PowerShell). Se añaden aserciones concretas por fase: victoria/empate en cada juego, 6 fallos del ahorcado, `rev` vieja → 409, puntos del jardín, porcentaje de quiz, y **privacidad: con el perfil contrario, `GET letters` y `GET capsule` antes de `opensAt` no contienen `body` ni `title`**.

### CA-19 · `memories.js` solo escucha `portal:tab`

**Línea:** 337, contra 109/117.
**Fix:** escucha `portal:tab` **y** `portal:heartbeat`, y relee solo si su panel está visible, con la caché `cache-memories-v1` como respaldo.

---

## Nits

* **N-01 (L335):** `.ios-card`, `.group-header` y `.btn` viven en `css/base.css`, no en `home.css`. Corregir la referencia para que el implementador no busque en el archivo equivocado.
* **N-02 (L344):** "una carta sellada nunca muestra título" es solo para quien la recibe; el autor la ve completa. Reformular.
* **N-03 (L337):** "abrir" una carta no es una acción de API; se revela al pasar `opensAt`. Aclarar que abrir es expandir en cliente.
* **N-04 (L334):** decir si el bloque de cuenta regresiva va dentro de la sección Presencia o como sección hermana, y si se elimina el wrapper `.soon`.
* **N-05 (L380):** `#gardenShared` debe heredar `.garden`, `.flower` y `.grown` de `home.css`; declarar quién aplica `grown`.
* **N-06 (L380):** "relee solo al entrar y cada 4.º latido" se lee como exclusión. Redactar "relee en dos casos: …".
* **N-07 (L332):** la columna se llama "Qué cambia y por qué" pero la mayoría de filas no trae motivo. Renombrar a "Qué cambia" y dejar el porqué donde no sea obvio.
* **N-08 (L328/406):** la regla de cierre de fase está dos veces con redacciones distintas. Dejarla una vez.
* **N-09 (L371):** "pendientes" se confunde con tareas del proyecto. Escribir "lista de películas por ver".

---

## Matriz de trazabilidad

| Hallazgo crudo | Consolidado |
|---|---|
| readiness-1 L338, codebase-1 L338 (bloqueadores), style-6 | CA-01 |
| readiness-2 L334/L344, readiness-Major L334 | CA-03 |
| readiness-3 L366, readiness-4 L366/L369, codebase-3 L366/L369, style-2 | CA-04, CA-05 |
| readiness-5 L353/L350, style-5 L352/L238, style-18 L352 | CA-06 |
| readiness-6 L375/L378/L381, style-1 L381 | CA-07 |
| readiness-Major L334 atributos, style-8 | CA-08 |
| readiness-Major L336 colisión `const`, codebase-Major L336 | CA-02 |
| readiness-Major L340, style-9 | CA-09 |
| readiness-Major L354, style-16 | CA-10 |
| readiness-Major L366/L365, style-10 | CA-11 |
| readiness-Major L378/L379, style-17 | CA-12 |
| readiness-Major L375/L378/L384, style-11, style-12 | CA-13 |
| readiness-Major L375/L350/L352 | CA-14 |
| readiness-Major L393/L134, style-27 | CA-15 |
| readiness-Major L397/L199/L403, style-13 | CA-16 |
| readiness-Major L390/L393, style-3 | CA-17 |
| readiness-Major L399-406, style-14, style-32 | CA-18 |
| style-4 L337 | CA-19 |
| readiness-Nit L335, codebase-Major L335, style-Nit | N-01 |
| readiness-Nit L344, style-20 | N-02 |
| readiness-Nit L337 | N-03 |
| readiness-Nit L334 | N-04 |
| readiness-Nit L380 | N-05, N-06 |
| style-15, style-19, style-21, style-22, style-23 | N-07, N-08, N-09 |
| style-24, style-25, style-26, style-28, style-29, style-30, style-31 | cubiertos por CA-13, CA-15, CA-16, CA-18 |

## Verificado sin hallazgo

`countdown`, `letters` y `capsule` existen con POST/DELETE; `flowerSVG` es global en `home.js` y se puede reutilizar; todos los scripts actuales usan `defer`; el service worker es network-first y ya excluye `/api`; ningún archivo o ID de los que el plan crea colisiona con el código actual.
