# Goldfish Annotated Review Report

**Status:** resolved
**Resolution:** 30/30 `PROPOSE FIX` aplicados al documento el 2026-11-11. 0 contestados, 0 escalados, 0 declinados, 0 pendientes.
**Target:** `docs/designs/fase-2-apartados.md` (`L326-L417`, Detailed Implementation Plan)
**Source report:** `implementation_readiness_report.md`
**Reviewers:** implementation-readiness, codebase-details, style
**Date:** 2026-11-11

Todas las propuestas están en español porque el documento y el proyecto están en español. Ningún hallazgo se contesta ni se escala: los 30 se consideran válidos. Los 9 nits se corrigen porque el coste es de una línea.

---

## Bloqueadores

### CA-01 · El evento de arranque no existe después del login [`implementation-readiness`] - Severity: Blocker

* **Affected Scope:** [L236-L247](docs/designs/fase-2-apartados.md#L236-L247) (§Módulos del front) y [L338](docs/designs/fase-2-apartados.md#L338) (Fase 2, `portal.js`)
* **Discrepancy Description:** `portal:ready` se emite en `DOMContentLoaded`. `startPortal()` corre al cargar con sesión y otra vez dentro de `login()`; un visitante sin sesión recibe el evento sin token, los módulos piden `/api` sin cabeceras y `portal.js` limpia la sesión. Tras el login nadie reemite.
* **Rationale:** Es el camino normal del primer acceso y de "Cambiar de perfil". Los módulos nunca cargarían datos en esa visita.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** El código real (`js/portal.js`) arranca en dos rutas; el evento debe vivir en la función que ambas comparten.
* **Proposed Edit:**
  * Location: §Módulos del front, después de los tres bullets.
  * Change: añadir
    > `portal:ready` se emite al final de `startPortal(profile)`, la función que corre tanto al restaurar una sesión guardada como dentro de `login()`. Nunca se emite desde `DOMContentLoaded`. Cada módulo arranca una sola vez (`if (mod.ready) return;`) y no hace `fetch` antes de ese evento.
  * Location: Fase 2, celda `js/portal.js`.
  * Change: sustituir "Emite los tres eventos (el primero en `DOMContentLoaded`, después de que los módulos se hayan suscrito)" por "Emite `portal:ready` al final de `startPortal(profile)` (cubre restaurar sesión y login), y `portal:tab` / `portal:heartbeat` cuando corresponde. Nunca desde `DOMContentLoaded`."

### CA-02 · La capa compartida no tiene contrato y choca con el scope global [`implementation-readiness` / `codebase-details`] - Severity: Blocker

* **Affected Scope:** [L236-L247](docs/designs/fase-2-apartados.md#L236-L247), [L336-L337](docs/designs/fase-2-apartados.md#L336-L337)
* **Discrepancy Description:** El bus aparece como dueño en `api.js` y como emisor en `portal.js`; `PortalAPI` no define URL, método, cuerpo/query ni retorno; `portal.js` ya declara `const API_URL`, `const SESSION_KEY` y `let session`, así que redeclararlos en `api.js` lanza `SyntaxError`; y `sync()`/`login()` quedarían con dos manejadores de 401.
* **Rationale:** Un error de scope rompe todos los scripts, no solo un módulo. Sin contrato, cada módulo inventa su llamada.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** `api.js` carga antes que `portal.js`, así que debe leer la sesión de `localStorage`, no de la variable global. El bus necesita un solo dueño.
* **Proposed Edit:**
  * Location: §Módulos del front, sustituir los tres bullets por:
    > * `js/api.js` es el único archivo que expone algo en `window`: `window.PortalAPI` y `window.PortalBus`. Declara el bus (`PortalBus.on/emit`) y el cliente HTTP. Lee la sesión de `localStorage['portal-session-v1']` en cada llamada, así no depende del scope de `portal.js`. Usa nombres únicos (`PORTAL_API_ACTION`, `PORTAL_SESSION_KEY`) para no redeclarar `API_URL` ni `SESSION_KEY`. Firma: `PortalAPI(action, {method='GET', body, query, binary=false})` → `{ok, status, data, error}`; en `401` emite `portal:auth-lost` y `portal.js` limpia la sesión y muestra el gate. `sync()` y `login()` de `portal.js` pasan a usar `PortalAPI`.
    > * `portal.js`: dueño de la sesión, el gate, el latido y las pestañas. Es el **único** emisor de `portal:ready`, `portal:tab` y `portal:heartbeat`. Pinta la cuenta regresiva y reserva el contenedor del globo; el globo lo pinta `music.js`.
    > * Cada módulo escucha esos eventos y se inicializa solo, una vez. Ningún módulo llama a otro directamente.
  * Location: Fase 2, celda `js/api.js`.
  * Change: sustituir "Bus de eventos (`portal:ready`, `portal:tab`, `portal:heartbeat`), envoltorio `PortalAPI(action, options)`…" por "Define `PortalBus` (nadie más lo define) y `PortalAPI(action, {method, body, query, binary})` → `{ok, status, data, error}`. Lee la sesión de `localStorage['portal-session-v1']`; en `401` emite `portal:auth-lost`. Se declara como única excepción a la regla de IIFE porque necesita `window`."

### CA-03 · La cuenta regresiva no tiene dueño ni contrato de fecha [`implementation-readiness`] - Severity: Blocker

* **Affected Scope:** [L334](docs/designs/fase-2-apartados.md#L334), [L344](docs/designs/fase-2-apartados.md#L344), [L390](docs/designs/fase-2-apartados.md#L390)
* **Discrepancy Description:** El marcado del contador queda en `index.html` y solo se asigna el pintado a `portal.js`; nadie envía el formulario ni borra. `countdown` espera epoch en ms (`parseWhen(Number(value))`), pero `datetime-local` devuelve `YYYY-MM-DDTHH:mm`.
* **Rationale:** Sin conversión, el 100% de los envíos devuelve `400 fecha-invalida`. Afecta también a cartas, cápsula y álbum.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Una sola función de conversión evita cuatro bugs iguales.
* **Proposed Edit:**
  * Location: Fase 2, celda `js/portal.js`: añadir "Dueño del formulario de cuenta regresiva (`#countdownForm`, `#countdownClear`): convierte la fecha local a epoch, envía `{when, label}` o `{clear:true}` y repinta con la respuesta."
  * Location: Fase 2, tras los bordes: añadir
    > Toda fecha de formulario (`countdown`, `letters.opensAt`, `capsule`, `#photoDate`) pasa por `toEpoch(value)`: interpreta el valor de `datetime-local` en `America/Mexico_City` y devuelve milisegundos. Prohibido `new Date('YYYY-MM-DD')` (eso es UTC).

### CA-04 · El esquema de juegos no soporta memoria ni ahorcado [`implementation-readiness`] - Severity: Blocker

* **Affected Scope:** [L366](docs/designs/fase-2-apartados.md#L366) (mapa de datos), [L132](docs/designs/fase-2-apartados.md#L132), [L187](docs/designs/fase-2-apartados.md#L187)
* **Discrepancy Description:** `{id, kind, players, turn, board, secret, guesses, status, winner, rev, at}` no incluye `deck`/`flipped`/`matched` para memoria ni el campo donde viaja la palabra al crear el ahorcado. No se define qué devuelve `create` si ya hay partida abierta.
* **Rationale:** El implementador tendría que inventar el esquema de dos de los cuatro juegos.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Un esquema por tipo mantiene la clave plana y evita campos nulos.
* **Proposed Edit:**
  * Location: mapa de datos, fila `game-<uuid>.json`.
  * Change: sustituir por
    > | `game-<uuid>.json` | `{ id, kind, players, turn, status, winner, rev, at }` más, según el tipo: `ttt { board:[9] }`; `four { board:[42] }`; `memory { deck:[N], flipped:[], matched:[] }`; `hangman { secret, guesses:[], wrong:0 }` | ambos, con `secret` y el mazo ocultos al adivinador |
  * Location: Fase 4, celda `api.mjs`.
  * Change: sustituir por "Acción `games`: `GET` lista; `POST {op:'create', kind, word?}` crea (si ya hay una abierta del mismo tipo, la devuelve con `reused:true`); `POST {op:'move', id, rev, cell?|letter?}` valida turno y `rev` y calcula victoria/empate en servidor; `DELETE {id}`. `rev` lo incrementa el servidor; el cliente solo lo devuelve."

### CA-05 · Borrado de partidas contradictorio y callejón sin salida [`style` / `implementation-readiness`] - Severity: Blocker

* **Affected Scope:** [L366](docs/designs/fase-2-apartados.md#L366) contra [L369](docs/designs/fase-2-apartados.md#L369)
* **Discrepancy Description:** "delete solo partidas terminadas" contra "una partida abandonada se puede borrar". Con una abierta por tipo, la abandonada bloquea crear otra y no se puede borrar.
* **Rationale:** Dos reglas excluyentes a tres líneas de distancia obligan al implementador a elegir.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** La regla de 7 días cubre el abandono sin permitir borrar una partida viva.
* **Proposed Edit:**
  * Location: Fase 4, bordes.
  * Change: sustituir "una partida abandonada se puede borrar" por "`delete` se permite si la partida terminó o si no tiene jugadas en 7 días; cualquiera de los dos puede borrarla. Mientras haya una abierta, crear otra del mismo tipo devuelve la existente (`reused:true`), no un error."

### CA-06 · `music-now` nunca se escribe y el globo tiene dos dueños [`style` / `implementation-readiness`] - Severity: Blocker

* **Affected Scope:** [L350-L352](docs/designs/fase-2-apartados.md#L350-L352), [L238](docs/designs/fase-2-apartados.md#L238)
* **Discrepancy Description:** El globo pinta desde `now`, pero ningún paso escribe `music-now`. §Módulos dice que lo pinta `portal.js`; la Fase 3 dice `music.js`. `now` solo se lee al entrar en Música, así que el globo no aparece en Inicio ni en Juegos.
* **Rationale:** El CUJ 1 no se cumple si el globo solo existe dentro de su pestaña.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Una sola escritura en el mismo POST y un solo dueño del DOM.
* **Proposed Edit:**
  * Location: §Globo de canción, tras el paso 2.
  * Change: añadir
    > `POST music` escribe `song-<uuid>.json` **y** `music-now.json` en la misma petición. Si se borra la canción que era `now`, se borra `music-now`. `music.js` es el único dueño de `#songBubble`; `portal.js` solo reserva el contenedor. El globo se refresca con `GET music?view=now` en cada latido, aunque la pestaña visible no sea Música. Al cerrarlo se guarda `sessionStorage['bubble-dismissed']` con el `songId`; no reaparece hasta que cambie.

### CA-07 · La Fase 5 no es entregable: los retos dependen de la Fase 6 [`implementation-readiness` / `style`] - Severity: Blocker

* **Affected Scope:** [L375-L384](docs/designs/fase-2-apartados.md#L375-L384), [L390-L397](docs/designs/fase-2-apartados.md#L390-L397), [L416](docs/designs/fase-2-apartados.md#L416)
* **Discrepancy Description:** Los retos usan `photoId` y "la tubería de fotos", pero compresión, `photo-<uuid>` y `action=photo` llegan en la Fase 6. `garden` suma desde `photo-` y `diary-`, claves inexistentes en la Fase 5. `#challengeCard` no tiene módulo dueño.
* **Rationale:** La Fase 5 no se puede cerrar ni probar como está escrita.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Mover la **escritura** de fotos a la Fase 5 conserva el orden visible del brief (el álbum se ve en la Fase 6) y desbloquea retos y jardín.
* **Proposed Edit:**
  * Location: Fase 5, celda `index.html`: añadir "La escritura de fotos entra en esta fase: compresión, `album POST` y `photo GET`; la rejilla del álbum queda oculta hasta la Fase 6."
  * Location: Fase 5, celda `api.mjs`: añadir `album` (POST) y `photo` (GET) a la lista de acciones.
  * Location: Fase 5, celda `js/garden.js`: añadir "También es dueño de los retos: `#challengePrompt`, `#challengePhoto`, `#challengeNote`."
  * Location: Fase 5, bordes: añadir "Si una clave del jardín no existe (por ejemplo `diary-` antes de la Fase 6), suma 0; nunca falla."
  * Location: Fase 6, título y tabla: renombrar a "Fase 6 — Álbum visible y diario a dos voces"; en `index.html` quitar `#photoInput`, `#photoPhrase` y `#photoDate` (ya existen) y dejar solo `#photoGrid`; en `api.mjs` dejar solo `diary`.

### CA-08 · Etiquetas `<link>`/`<script>` inválidas y orden de carga indefinido [`style`] - Severity: Blocker

* **Affected Scope:** [L334](docs/designs/fase-2-apartados.md#L334), [L350](docs/designs/fase-2-apartados.md#L350), [L363](docs/designs/fase-2-apartados.md#L363), [L375](docs/designs/fase-2-apartados.md#L375), [L390](docs/designs/fase-2-apartados.md#L390)
* **Discrepancy Description:** Las celdas escriben `<link css/memories.css>` y `<script js/api.js>`, que no son HTML válido, y no fijan el orden respecto a `portal.js`.
* **Rationale:** Copiadas literalmente, no cargan nada.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Una regla única evita repetir la explicación en cinco tablas.
* **Proposed Edit:**
  * Location: intro del plan detallado, tras "Una fase = un bloque de commits…".
  * Change: añadir
    > Cada fase añade sus etiquetas así: `<link rel="stylesheet" href="css/<módulo>.css">` después de `portal.css`, y `<script src="js/<módulo>.js" defer></script>` después de `portal.js`. Todos los scripts llevan `defer`.

### CA-09 · Marca diaria: regla doble, sin idempotencia, con UTC [`implementation-readiness` / `style`] - Severity: Blocker

* **Affected Scope:** [L338-L340](docs/designs/fase-2-apartados.md#L338-L340), [L322](docs/designs/fase-2-apartados.md#L322)
* **Discrepancy Description:** Se dice "el cliente envía `day` una vez por sesión" y "el servidor escribe si el cliente manda `day: true`", sin idempotencia ni zona horaria; y el NFR promete "una lectura extra por ciclo", que la comprobación en servidor rompe.
* **Rationale:** Sin regla única, la marca se escribe varias veces o con la fecha UTC equivocada.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** El cliente ya sabe la fecha local; el servidor solo debe escribir si falta.
* **Proposed Edit:**
  * Location: Fase 2, celda `api.mjs`.
  * Change: sustituir por "En `presence`: si llega `day`, escribe `day-<YYYY-MM-DD>-<perfil>.json` solo si no existe. La fecha la calcula el cliente con `Intl` y `America/Mexico_City`; el servidor no reinterpreta zonas."
  * Location: NFR, rendimiento.
  * Change: sustituir "el latido añade como máximo una lectura extra por ciclo (la pestaña visible)" por "el latido añade una lectura extra por ciclo (la pestaña visible); la marca diaria se envía una sola vez al día desde el cliente, sin lectura extra".

### CA-10 · `sw.js` sin diff concreto [`implementation-readiness` / `style`] - Severity: Blocker

* **Affected Scope:** [L354](docs/designs/fase-2-apartados.md#L354), [L394](docs/designs/fase-2-apartados.md#L394)
* **Discrepancy Description:** "solo asegurar que los archivos nuevos entran en la ruta de caché de respaldo" no dice qué líneas tocar. `sw.js` tiene una lista `ASSETS` explícita y `CACHE='nosotros-v1'`.
* **Rationale:** El SW no cachea archivos que no estén en `ASSETS` durante la instalación; sin el cambio, offline no incluye los módulos nuevos.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** La lista es explícita y barata de mantener.
* **Proposed Edit:**
  * Location: Fase 2, celda `sw.js`.
  * Change: sustituir por "Añadir a `ASSETS` `./css/memories.css`, `./js/api.js` y `./js/memories.js`; subir `CACHE` a `nosotros-v2`. El handler `fetch` no cambia."
  * Location: Fases 3, 4 y 5, celda `sw.js` (crear fila si falta).
  * Change: "Añadir a `ASSETS` los archivos de la fase (`./css/music.css`, `./js/music.js`, …). No cambiar `CACHE`."
  * Location: Fase 6, celda `sw.js`.
  * Change: "Añadir la regla `cache-first` solo para `url.pathname === '/api' && url.searchParams.get('action') === 'photo'`; el resto de `/api` sigue fuera de caché."

---

## Mayores

### CA-11 · `games` con doble protocolo (`op` vs método) [`implementation-readiness` / `style`] - Severity: Major

* **Affected Scope:** [L365-L366](docs/designs/fase-2-apartados.md#L365-L366)
* **Discrepancy Description:** La tabla de API usa `POST {kind, op, rev, move}` y la Fase 4 usa `POST` con `create`/`move`, sin decir si `op` va en el cuerpo o el método cambia. `rev` no tiene dueño declarado.
* **Rationale:** Dos lecturas posibles del mismo contrato.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Un solo protocolo, alineado con `countdown` y `letters`, que ya usan cuerpo con `op`/campos.
* **Proposed Edit:**
  * Location: tabla de acciones, fila `games`.
  * Change: sustituir la entrada por `| games | GET / POST / DELETE | POST: {op:'create', kind, word?} o {op:'move', id, rev, cell?\\|letter?} | lista, partida o 409 | 4 |`
  * Location: Fase 4, celda `js/games.js`.
  * Change: sustituir "manda jugadas con `rev`" por "manda `{op:'move', id, rev, cell?|letter?}` y repinta con la respuesta o con el `409`".

### CA-12 · `quiz` sin preguntas, fórmula ni esquema [`implementation-readiness` / `style`] - Severity: Major

* **Affected Scope:** [L378-L381](docs/designs/fase-2-apartados.md#L378-L381)
* **Discrepancy Description:** Se menciona "¿Cuánto me conoces?" y "Esto o aquello" sin banco de preguntas, sin forma de respuesta ni fórmula de coincidencia.
* **Rationale:** El implementador tendría que inventar contenido y contrato.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** El banco fijo en la function evita otra clave de datos y permite cambiar preguntas con un commit.
* **Proposed Edit:**
  * Location: Fase 5, celda `api.mjs`, tras `quiz`.
  * Change: añadir "`quiz` usa un banco fijo en `api.mjs` (`[{id, text, options[]}]`); `GET` devuelve `{questions, mine, theirs}` con `theirs:null` hasta que ambos respondan; la coincidencia es `aciertos / respondidas`, entero."
  * Location: mapa de datos, fila `quiz-<uuid>.json`.
  * Change: sustituir por "| `quiz-<uuid>.json` | `{ id, kind, answers: { daniel:{}, kitzya:{} } }` | ambos; lo ajeno se oculta hasta que ambos respondan |"

### CA-13 · Ruleta con dos predicados y sin persistencia [`implementation-readiness` / `style`] - Severity: Major

* **Affected Scope:** [L378](docs/designs/fase-2-apartados.md#L378), [L384](docs/designs/fase-2-apartados.md#L384)
* **Discrepancy Description:** "lo no visto" contra "sin calificar de uno de los dos no entra"; no se dice qué pasa si no hay nada ni dónde vive "el último elegido".
* **Rationale:** Dos criterios incompatibles y un estado sin dueño.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Exigir ambas calificaciones es el único criterio que usa datos que ya existen en `watch-`.
* **Proposed Edit:**
  * Location: Fase 5, bordes.
  * Change: sustituir por "La ruleta solo considera títulos calificados por los dos; sin ninguno, muestra \"Nada que sortear todavía\". El último elegido se guarda en `localStorage['roulette-last-v1']` de ese teléfono y no se repite en el sorteo siguiente."

### CA-14 · Dos módulos re-renderizan el mismo panel [`implementation-readiness`] - Severity: Major

* **Affected Scope:** [L350-L352](docs/designs/fase-2-apartados.md#L350-L352), [L375](docs/designs/fase-2-apartados.md#L375)
* **Discrepancy Description:** `music.js` y `cinema.js` comparten `#panel-musica`; si ambos pintan la raíz, cada refresco borra el bloque del otro.
* **Rationale:** El latido refresca cada módulo por separado y produce parpadeo o pérdida de foco.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Contenedores fijos eliminan la coordinación entre módulos.
* **Proposed Edit:**
  * Location: Fase 3, celda `index.html`, y Fase 5, celda `index.html`.
  * Change: declarar contenedores `#musicBlock`, `#cinemaBlock`, `#gamesBlock`, `#quizBlock` y añadir "Cada módulo pinta solo su bloque; prohibido `innerHTML` sobre la raíz de un `tab-panel`."

### CA-15 · Diario: `a`/`b` sin mapear y "ronda actual" sin regla [`implementation-readiness` / `style`] - Severity: Major

* **Affected Scope:** [L393-L397](docs/designs/fase-2-apartados.md#L393-L397)
* **Discrepancy Description:** Las claves usan `a`/`b` sin decir quién es quién, no se define qué ronda se edita al enviar sin `id`, y se promete que una ronda revelada "no se borra" sin existir `DELETE`.
* **Rationale:** Sin mapeo ni regla de ronda, el servidor no puede decidir qué ocultar.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Una sola ronda abierta simplifica el estado y hace el revelado determinista.
* **Proposed Edit:**
  * Location: §Diario a dos voces.
  * Change: sustituir el párrafo por
    > `daniel→a`, `kitzya→b`. Un `POST {text}` sin `id` se une a la única ronda abierta o la crea. Solo hay una ronda abierta. El servidor devuelve lo ajeno solo con ambos textos; editar una revelada devuelve `409 {error:'revelada'}`. No existe borrado.

### CA-16 · Límite de foto contradictorio y estado HTTP sin decidir [`implementation-readiness` / `style`] - Severity: Major

* **Affected Scope:** [L199-L200](docs/designs/fase-2-apartados.md#L199-L200), [L397](docs/designs/fase-2-apartados.md#L397), [L403](docs/designs/fase-2-apartados.md#L403)
* **Discrepancy Description:** "máximo 1.5 MB" contra "si pasa de 1.5 MB baja la calidad otra vez", sin decir qué ocurre si sigue pesando más ni con qué código responde.
* **Rationale:** El cliente y el servidor podrían rechazar en momentos distintos.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Una escalera acotada y un único 413 hacen el borde comprobable.
* **Proposed Edit:**
  * Location: §Álbum y fotos privadas, paso 1.
  * Change: sustituir por "El teléfono redimensiona a 1600 px de lado mayor y prueba calidades 0.82, 0.7 y 0.6. Si la tercera sigue por encima de 1.5 MB, el servidor responde `413 {error:'foto-grande'}` y el cliente muestra \"La foto pesa demasiado, elige otra\". Solo se aceptan `data:image/jpeg` y `data:image/png`."

### CA-17 · Álbum pierde `#photoDate` y el borrado no tiene orden [`implementation-readiness` / `style`] - Severity: Major

* **Affected Scope:** [L133](docs/designs/fase-2-apartados.md#L133), [L157](docs/designs/fase-2-apartados.md#L157), [L390-L393](docs/designs/fase-2-apartados.md#L390-L393)
* **Discrepancy Description:** `#photoDate` aparece en el marcado pero `album POST {dataUrl, phrase}` no lo recibe ni lo guarda; el `DELETE` no dice si borra metadatos o bytes primero.
* **Rationale:** La fecha del recuerdo se perdería y un borrado a medias dejaría huérfanos.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Guardar `date` en metadatos y borrar primero el JSON deja el blob huérfano solo si falla la segunda llamada, que se reintenta al listar.
* **Proposed Edit:**
  * Location: tabla de acciones, fila `album` POST.
  * Change: `{dataUrl, phrase, date}`.
  * Location: mapa de datos, fila `photo-<uuid>.json`.
  * Change: añadir `date` a los metadatos.
  * Location: Fase 6, celda `api.mjs`.
  * Change: añadir "`album POST` valida `date` en epoch (por defecto hoy). `DELETE` borra primero el JSON y luego el blob y devuelve `{ok:true}` aunque el blob falte."

### CA-18 · La verificación no es ejecutable [`implementation-readiness` / `style`] - Severity: Major

* **Affected Scope:** [L399-L403](docs/designs/fase-2-apartados.md#L399-L403)
* **Discrepancy Description:** `npx serve` no proxya `/api`; `netlify dev` requiere `ACCESS_CODE` local y no se menciona; `curl` en PowerShell es alias de `Invoke-WebRequest`; no hay aserciones por fase.
* **Rationale:** El implementador no puede ejecutar la lista tal cual.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Comandos concretos con `netlify dev` y `curl.exe` evitan falsos verdes.
* **Proposed Edit:**
  * Location: §Verificación.
  * Change: sustituir por
    > * **Sintaxis:** `node --check` sobre cada archivo de `js/` tocado y sobre `netlify/functions/api.mjs`.
    > * **Local:** `netlify dev` con `ACCESS_CODE` en `.env` (nunca en el repo). `npx serve` solo sirve estáticos y no prueba `/api`.
    > * **API:** canjear el código, guardar el token y usar `curl.exe` con `-H "x-portal-profile: daniel" -H "x-portal-token: <token>"`. Aserciones: `rev` vieja → `409`; host no permitido → `400`; sin token → `401`; foto > 1.5 MB → `413`; victoria y empate en cada juego; 6 fallos cierran el ahorcado; coincidencia del quiz correcta.
    > * **Privacidad:** con el perfil contrario, `GET letters` y `GET capsule` antes de `opensAt` no contienen `body` ni `title` en la respuesta.
    > * **iPhone (cada fase):** Safari y PWA; modo avión tras una visita; rotación; teclado abierto; VoiceOver; `prefers-reduced-motion`.
    > * **Diseño:** detector impeccable en `[]` y revisión visual contra Inicio.

### CA-19 · `memories.js` solo escucha `portal:tab` [`style`] - Severity: Major

* **Affected Scope:** [L337](docs/designs/fase-2-apartados.md#L337)
* **Discrepancy Description:** El plan dice que solo relee al entrar; el CUJ 4 y la regla del latido exigen refrescar la pestaña visible cada 15 s.
* **Rationale:** Una carta nueva del otro no aparecería hasta cambiar de pestaña.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Es la misma regla que ya usan los demás módulos.
* **Proposed Edit:**
  * Location: Fase 2, celda `js/memories.js`.
  * Change: sustituir "Se suscribe a `portal:tab` y relee al entrar" por "Se suscribe a `portal:tab` y `portal:heartbeat`; relee solo si su panel está visible y guarda `cache-memories-v1`."

---

## Nits

### N-01 · Las clases no viven en `home.css` [`codebase-details`] - Severity: Nit

* **Affected Scope:** [L335](docs/designs/fase-2-apartados.md#L335)
* **Discrepancy Description:** `.ios-card`, `.group-header` y `.btn` están en `css/base.css` (líneas 78, 96 y 104); `home.css` solo tiene las del jardín.
* **Rationale:** El implementador buscaría en el archivo equivocado.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Verificado con `grep` sobre `css/`.
* **Proposed Edit:**
  * Location: Fase 2, celda `css/memories.css`.
  * Change: sustituir "Reutiliza tokens y patrones de `home.css` (`.ios-card`, `.group-header`, `.btn`)" por "Reutiliza `.ios-card`, `.group-header` y `.btn` de `css/base.css`, más los tokens de color."

### N-02 · "Nunca el título" también aplica al autor [`implementation-readiness`] - Severity: Nit

* **Affected Scope:** [L344](docs/designs/fase-2-apartados.md#L344)
* **Discrepancy Description:** La regla absoluta contradice que el autor ve su propia carta.
* **Rationale:** Un lector literal rompería la vista del autor.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Es una aclaración de dos palabras.
* **Proposed Edit:**
  * Location: Fase 2, bordes.
  * Change: sustituir "Una carta sellada muestra remitente y fecha, nunca título." por "Quien recibe una carta sellada ve remitente y fecha, nunca el título; el autor ve la suya completa."

### N-03 · "Abrir" una carta no es una acción de API [`implementation-readiness`] - Severity: Nit

* **Affected Scope:** [L337](docs/designs/fase-2-apartados.md#L337)
* **Discrepancy Description:** "compone, abre, borra" sugiere un POST de apertura que no existe.
* **Rationale:** El servidor revela por fecha, no por acción.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Precisión del contrato.
* **Proposed Edit:**
  * Location: Fase 2, celda `js/memories.js`.
  * Change: sustituir "compone, abre, borra lo propio" por "compone, expande (abrir es solo revelar en cliente cuando `opensAt` ya pasó) y borra lo propio".

### N-04 · Ubicación del bloque de cuenta regresiva [`implementation-readiness`] - Severity: Nit

* **Affected Scope:** [L334](docs/designs/fase-2-apartados.md#L334)
* **Discrepancy Description:** No se dice si va dentro de la sección Presencia o como sección hermana, ni qué pasa con el wrapper `.soon`.
* **Rationale:** Cambia el marcado y el CSS.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Una frase cierra la decisión.
* **Proposed Edit:**
  * Location: Fase 2, celda `index.html`.
  * Change: añadir "El bloque vive como sección hermana de Presencia dentro de `#panel-inicio` y reemplaza el wrapper `.soon` si queda solo."

### N-05 · Clases del jardín compartido [`implementation-readiness`] - Severity: Nit

* **Affected Scope:** [L380](docs/designs/fase-2-apartados.md#L380)
* **Discrepancy Description:** No se dice qué clases hereda `#gardenShared` ni quién aplica `.grown`.
* **Rationale:** Sin `.grown`, las flores quedan a escala 0 (`transform:scaleY(0)` en `home.css`).
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Evita un jardín invisible.
* **Proposed Edit:**
  * Location: Fase 5, celda `js/garden.js`.
  * Change: añadir "`#gardenShared` usa `.garden`, `.flower` y `.grown` de `home.css`; `garden.js` añade `.grown` cuando termina el pintado."

### N-06 · "Solo al entrar y cada 4.º latido" se lee como exclusión [`style`] - Severity: Nit

* **Affected Scope:** [L380](docs/designs/fase-2-apartados.md#L380)
* **Discrepancy Description:** La frase sugiere que relee solo en esos dos casos y nunca en los demás, cuando la intención es "en esos dos, no en todos".
* **Rationale:** Ambigüedad de frecuencia.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Redacción de una línea.
* **Proposed Edit:**
  * Location: Fase 5, celda `js/garden.js`.
  * Change: sustituir "Relee solo al entrar y cada 4.º latido (60 s) para no multiplicar lecturas." por "Relee en dos casos: al entrar en la pestaña y en cada 4.º latido (60 s); no en todos."

### N-07 · La columna promete un motivo que casi nunca trae [`style`] - Severity: Nit

* **Affected Scope:** [L332](docs/designs/fase-2-apartados.md#L332) y las tablas de las fases 3-6
* **Discrepancy Description:** "Qué cambia y por qué" en una tabla donde la mayoría de filas no explica el porqué.
* **Rationale:** Promesa incumplida por el propio formato.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Renombrar es más honesto que rellenar motivos triviales.
* **Proposed Edit:**
  * Location: encabezados de las cinco tablas.
  * Change: "Qué cambia y por qué" → "Qué cambia".

### N-08 · Regla de cierre de fase duplicada [`style`] - Severity: Nit

* **Affected Scope:** [L328](docs/designs/fase-2-apartados.md#L328) y [L406](docs/designs/fase-2-apartados.md#L406)
* **Discrepancy Description:** "no abrir la fase siguiente hasta pasar la lista" aparece dos veces con redacciones distintas.
* **Rationale:** Dos fuentes para la misma regla.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Se conserva la del intro, que es la canónica.
* **Proposed Edit:**
  * Location: §Verificación, cierre de fase.
  * Change: eliminar "y no abrir la fase siguiente hasta pasar la lista".

### N-09 · "Pendientes" se confunde con tareas [`style`] - Severity: Nit

* **Affected Scope:** [L371](docs/designs/fase-2-apartados.md#L371) y [L384](docs/designs/fase-2-apartados.md#L384)
* **Discrepancy Description:** "pendientes" puede leerse como tareas del proyecto, no como películas por ver.
* **Rationale:** Vocabulario ambiguo en un documento de trabajo.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Cambio de una palabra.
* **Proposed Edit:**
  * Location: Fase 5 y bordes.
  * Change: "pendientes" → "películas por ver" (y "un pendiente sin calificar" → "una película sin calificar").

---

## Resumen de clasificación

| Categoría | Cantidad | Elementos |
|---|---|---|
| PROPOSE FIX | 30 | CA-01 … CA-19, N-01 … N-09 |
| CONTEST | 0 | — |
| ESCALATE | 0 | — |
| DECLINE | 0 | — |

No hay hallazgos que necesiten conocimiento fuera de los archivos: los tres revisores citaron código verificable y todas las afirmaciones se comprobaron contra `js/portal.js`, `css/`, `sw.js` y `netlify/functions/api.mjs`.
