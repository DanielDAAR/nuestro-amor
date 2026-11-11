# Portal de dos — Fases 2 a 6

* **Author:** DanielDAAR
* **Status:** Draft
* **Date:** 2026-11-10

---

## Overview

La Fase 1 dejó el portal con acceso por código, presencia, tab bar de cinco pestañas y PWA. **Inicio** está construida; **Juegos**, **Música y cine**, **Cartas** y **Jardín** muestran "Muy pronto". La function `/api` ya tiene cuenta regresiva, cartas con sellado y cápsula del tiempo, sin interfaz que las use.

Este diseño cubre las fases 2 a 6 del portal completo: música con globo flotante, juegos por turnos, cartas y recuerdos, álbum, diario a dos voces, jardín con logros y cuenta regresiva. Mantiene el stack actual: archivos planos (`index.html` + `css/` + `js/`, sin build, sin ES modules), una sola Netlify Function y Netlify Blobs como único almacén. No hay websockets, no hay servicio nuevo y no hay claves en el repo.

## The Problem

1. **Cuatro de cinco pestañas están vacías.** La promesa de PRODUCT.md — presencia, juegos y retos compartidos — no se cumple al abrirlas.
2. **La cuenta regresiva está huérfana.** El backend la entrega en cada latido (`state.countdown`) y ninguna pantalla la pinta.
3. **Cartas y cápsula no tienen interfaz.** El sellado en servidor no se puede probar ni usar.
4. **La música no existe.** No hay playlist, dedicatoria, canción del día ni forma de escuchar algo "a la vez". El brief pide además un globo flotante que muestre la canción a partir de un link.
5. **Riesgo de crecer mal.** El camino obvio (Supabase, websockets, subir fotos sin control) rompe las reglas de oro: cero build, cero framework, cero claves y nada privado fuera del portal.

## Conflictos con las reglas del proyecto

El brief pide cosas que chocan con las reglas duras. Gana la regla; esto es lo que se propone en cada choque.

| El brief pide | La regla dice | Decisión propuesta |
|---|---|---|
| Supabase para tiempo real, storage y push | Cero dependencias nuevas en el front, cero claves en el repo, backend ya implementado y probado en Netlify | **Netlify Functions + Blobs.** Tiempo real = latido cada 15 s que ya existe. Sin push en estas fases. |
| Escucha sincronizada | No se aloja audio ni se incrustan reproductores | **Reloj compartido:** el portal guarda el segundo de inicio y ambos dan play en su app de música. El portal sincroniza la cuenta, no el sonido. |
| Álbum y retos con prueba en foto | Nada privado expuesto y ningún servicio extra | **Compresión en el teléfono** (~1600 px, ~250 KB) y **Blobs privados** servidos solo por `/api` autenticado. Nunca una URL pública. |
| Globo con la canción "según el link" | Sin reproductores incrustados ni rastreo de terceros en el cliente | **Metadatos por oEmbed desde el servidor** (YouTube/Spotify), cacheados en Blobs. Del portal sale solo el link, una vez, sin cookies ni identificadores. |
| Retos semanales con prueba en foto | Presencia > archivo; una fase a la vez | Los retos entran en la **Fase 5**, no antes. La foto se comprime y se guarda como el álbum. |

## Goals

1. Cada apartado ofrece al menos una interacción completa usable desde Safari y PWA en iPhone, con un pulgar.
2. Todo estado compartido pasa por `/api`; ninguna clave, token, texto sellado ni foto se escribe en HTML público ni en el repo.
3. Cada apartado abre sin red con el último estado guardado y deshabilita lo que escribe, en vez de fallar en silencio.
4. La cuenta regresiva se ve en Inicio, se fija y se borra desde la app, y ambos ven la misma fecha.
5. El globo de canción muestra portada y título reales del link, con respaldo manual si el proveedor no responde.
6. Cero dependencias nuevas en el front y cero pasos de build; `node --check` limpio y detector impeccable en `[]`.
7. Se mantienen los mínimos del proyecto: objetivos ≥44 px, contraste AA, `prefers-reduced-motion`, foco visible, `aria-label` en controles de icono.

## Non-Goals

* **No hay chat, llamadas ni notificaciones push** en estas fases.
* **No se aloja audio ni video**, ni se incrustan reproductores de terceros.
* **No hay cuentas, registro ni tercer perfil.** Dos perfiles y un código.
* **No se toca Inicio** salvo el bloque de cuenta regresiva bajo Presencia y el globo de canción, que es global y flota sobre cualquier pestaña.
* **No se introduce build, framework, npm en el front ni ES modules.**
* **No se reescribe `api.mjs`**: se parte de la versión actual (con `countdown`, `letters`, `capsule`) y se le añaden las acciones nuevas.
* **No se inventa la fecha del próximo encuentro.** El campo nace vacío y editable.

## Open Questions

* **Diario a dos voces:** "se revela cuando ambos escriben" exige que el servidor oculte la entrada de quien ya escribió hasta que el otro también escriba. ¿Aplica también a la carta sellada por fecha, o son dos reglas distintas? Propuesta: son dos reglas distintas y el diario se revela con el segundo texto, sin fecha.
* **Logros:** ¿se derivan de la actividad (como el jardín) o son un catálogo fijo con fechas de desbloqueo? Derivar evita otra fuente de verdad.
* **Fecha real del próximo encuentro:** sigue sin decidirse. El campo queda vacío.

## Critical User Journeys

### CUJ 1: Pegar un link y ver el globo con la canción

* **Given**: Daniel entra en Música y cine y pega un link de Spotify o YouTube con una dedicatoria.
* **When**: guarda.
* **Then**: el servidor pide los metadatos, guarda título, artista y portada, y el globo flotante aparece sobre la pestaña actual con la portada, el título y quién la dedicó. Tocar el globo abre el link en la app externa. Si el proveedor no responde, el globo usa el título escrito a mano.

### CUJ 2: Escuchar "a la vez" estando lejos

* **Given**: ambos tienen la canción del día abierta.
* **When**: uno toca "Escuchar juntos" y el portal fija un segundo de inicio a 10 s vista.
* **Then**: ambos ven la misma cuenta regresiva; a cero, cada uno da play en su app. El portal no reproduce nada, pero los dos empiezan en el mismo instante.

### CUJ 3: Jugar una partida por turnos desde dos teléfonos

* **Given**: uno crea una partida de Tres en raya.
* **When**: juega su casilla y espera; el otro abre Juegos en los próximos 15 s.
* **Then**: el segundo ve el tablero actualizado, la partida le indica que es su turno y puede responder. Al terminar, el resultado queda visible y el Jardín suma una flor.

### CUJ 4: Escribir una carta que se abre en su fecha

* **Given**: Daniel escribe título, texto y fecha futura.
* **When**: guarda.
* **Then**: él ve "sellada, abre el 24 de diciembre"; Kitzya ve solo el sobre, sin título ni texto. El texto no viaja en la respuesta antes de la fecha. El día de apertura ambos lo leen.

### CUJ 5: Álbum, reto y diario

* **Given**: la pareja quiere guardar un recuerdo y responder un reto.
* **When**: suben una foto desde el teléfono con frase y fecha, o responden el reto de la semana.
* **Then**: la foto se comprime antes de salir, se guarda en Blobs privados y se ve solo dentro del portal. En el diario, el texto de uno permanece oculto hasta que el otro escribe el suyo.

### CUJ 6: Abrir el portal sin red

* **Given**: el teléfono perdió señal después de una visita anterior.
* **When**: se abre la PWA.
* **Then**: las cinco pestañas abren con el último estado guardado, con aviso discreto de "sin conexión" y acciones de escritura deshabilitadas.

### CUJ 7: Ver crecer el jardín

* **Given**: hubo cartas, entradas de cápsula, partidas y días con presencia.
* **When**: cualquiera abre Jardín.
* **Then**: ve flores nuevas atribuidas a quien las ganó y logros desbloqueados, con el lenguaje visual del jardín de Inicio (SVG, paleta rosa, sin imágenes nuevas).

## Technical Plan (Architecture)

### Principio de lectura: un canal, un latido

No hay websockets ni segundo mecanismo de refresco. El latido de presencia que ya corre cada 15 s se queda como único reloj del portal. Cuando una pestaña de módulo está visible, el cliente hace **una** lectura adicional de ese módulo en cada latido. Cuando no está visible, no hace ninguna, salvo el globo de canción: si hay una canción activa, se refresca con una lectura ligera de `music?view=now` en cada latido. No se añaden números de versión ni archivos de señal: cada módulo se lee completo desde su acción y el servidor es la única verdad.

Consecuencia aceptada: lo que escribe el otro puede tardar hasta 15 s en verse. Los juegos son por turnos; la escucha sincronizada se corrige con el reloj del cliente, no con el del servidor.

```text
Portal.js ──latido 15 s──► /api?action=presence ──► presence-<perfil>.json
   │                                              └► thinking.json + countdown.json
   ├─ evento portal:tab ──► módulo visible hace 1 lectura de su acción
   ├─ evento portal:heartbeat ──► si su pestaña está visible, relee su acción
   └─ globo de canción ──► GET /api?action=music&view=now (si hay canción)
```

`portal:ready` se emite al final de `startPortal(profile)`, la función que corre tanto al restaurar una sesión guardada como dentro de `login()`. Nunca se emite desde `DOMContentLoaded`. Cada módulo arranca una sola vez (`if (mod.ready) return;`) y no hace `fetch` antes de ese evento.

### Mapa de datos (Netlify Blobs, store `portal`)

| Clave | Contenido | Quién puede leerla |
|---|---|---|
| `presence-daniel.json`, `presence-kitzya.json` | `{ lastSeen }` | ambos (ya existe) |
| `thinking.json` | `{ by, to, at }` | ambos (ya existe) |
| `countdown.json` | `{ when, label, by, setAt }` | ambos (ya existe) |
| `letter-<uuid>.json` | `{ id, from, title, body, createdAt, opensAt }` | autor siempre; el otro solo cuando ya pasó `opensAt` (ya existe) |
| `capsule.json`, `cap-<uuid>.json` | fecha de apertura y entradas | ambos; lo del otro se oculta mientras está sellada (ya existe) |
| `song-<uuid>.json` | `{ id, by, url, note, meta: {title, artist, thumb, provider}, at }` | ambos |
| `music-now.json` | `{ songId, by, at }` | ambos |
| `music-sync.json` | `{ songId, startAt, by }` | ambos |
| `game-<uuid>.json` | `{ id, kind, players, turn, status, winner, rev, at }` más, según el tipo: `ttt { board:[9] }`; `four { board:[42] }`; `memory { deck:[N], flipped:[], matched:[] }`; `hangman { secret, guesses:[], wrong:0 }` | ambos, con `secret` y el mazo ocultos al adivinador |
| `photo-<uuid>.json` + blob `photo-<uuid>` | metadatos (`{ id, by, phrase, date, bytes }`) y bytes de la imagen | ambos, solo vía function |
| `diary-<uuid>.json` | `{ id, a: {text,at}, b: {text,at} }` | cada uno ve lo suyo; lo del otro solo con ambos textos |
| `watch-<uuid>.json` | `{ id, title, by, ratingA, ratingB, at }` | ambos |
| `quiz-<uuid>.json` | `{ id, kind, answers: { daniel:{}, kitzya:{} } }` | ambos; lo ajeno se oculta hasta que ambos respondan |
| `challenge-<uuid>.json` | `{ id, week, prompt, by, photoId, note, at }` | ambos |
| `day-<YYYY-MM-DD>-<perfil>.json` | marca de un día con presencia | ambos (solo se cuenta) |

Regla de nombres: prefijo del módulo, `kebab-case`, `.json`, uuid v4 cuando hay varias entradas. Una entrada por clave: dos personas nunca escriben la misma clave, salvo `music-now.json`, `music-sync.json` y `countdown.json`, donde el último gana y eso es correcto.

### Acciones de la API

Se conservan `auth`, `presence`, `countdown`, `letters` y `capsule`. Se añaden:

| Acción | Método | Entrada | Salida | Fase |
|---|---|---|---|---|
| `music` | GET | `?view=now` opcional | `{ songs, now, sync }` | 3 |
| `music` | POST | `{ url, note }` | canción con metadatos y `now` | 3 |
| `music` | DELETE | `{ id }` | `{ ok }` | 3 |
| `music-now` | POST | `{ songId }` | `{ songId }` | 3 |
| `music-sync` | POST | `{ songId }` | `{ startAt }` | 3 |
| `games` | GET | — | `{ games }` (sin secretos ajenos) | 4 |
| `games` | POST | `{ op:'create', kind, word? }` o `{ op:'move', id, rev, cell?\|letter? }` | partida o `409` | 4 |
| `games` | DELETE | `{ id }` | `{ ok }` | 4 |
| `album` | GET | — | `{ photos }` | 6 |
| `album` | POST | `{ dataUrl, phrase, date }` | foto con metadatos | 6 |
| `album` | DELETE | `{ id }` | `{ ok }` | 6 |
| `photo` | GET | `?id=` | bytes de la imagen | 6 |
| `diary` | GET | — | rondas con lo ajeno oculto | 6 |
| `diary` | POST | `{ id?, text }` | ronda actualizada | 6 |
| `garden` | GET | — | `{ flowers, achievements, days }` | 5 |
| `watch` | GET/POST/DELETE | `{ id?, title?, rating? }` | lista o entrada | 5 |
| `quiz` | GET/POST | `{ kind, answers }` | `{ questions, mine, theirs }` y % de coincidencia | 5 |
| `challenge` | GET/POST | `{ week?, prompt?, photoId?, note? }` | reto de la semana | 5 |

Todas exigen `x-portal-profile` y `x-portal-token`; ninguna se sirve sin sesión.

### Globo de canción (oEmbed en el servidor)

1. El cliente manda `{ url, note }` a `music`.
2. El servidor valida el link: `https`, sin credenciales, sin puerto raro, y **solo** hosts permitidos (`youtube.com`, `music.youtube.com`, `youtu.be`, `open.spotify.com`). Cualquier otro host se rechaza con `400`. Esto evita que la function se use para pedir direcciones internas.
3. Pide metadatos por oEmbed con un límite de 3 s:
   * YouTube: `https://www.youtube.com/oembed?url=<link>&format=json` → `title`, `author_name`, `thumbnail_url`.
   * Spotify: `https://open.spotify.com/oembed?url=<link>` → `title`, `thumbnail_url`.
4. Guarda `{ title, artist, thumb, provider }` dentro de `song-<uuid>.json`. Si el proveedor falla o tarda, guarda el link con `meta: null` y el globo cae al título escrito a mano en `note`.
5. La portada se muestra con la URL del proveedor (`<img loading="lazy">`); no se descarga ni se re-aloja.
6. `POST music` escribe `song-<uuid>.json` **y** `music-now.json` en la misma petición. Si se borra la canción que era `now`, se borra `music-now`.

El globo es un elemento fijo, encima de la tab bar, en todas las pestañas. Muestra portada, título y "de parte de <perfil>". Tocar abre el link fuera del portal. `music.js` es el único dueño de `#songBubble`; `portal.js` solo reserva el contenedor. El globo se refresca con `GET music?view=now` en cada latido, aunque la pestaña visible no sea Música. Al cerrarlo se guarda `sessionStorage['bubble-dismissed']` con el `songId`; no reaparece hasta que cambie. Respeta `prefers-reduced-motion` (sin flotación) y tiene `aria-label` completo.

### Escucha sincronizada

`music-sync` guarda `startAt = ahora + 10 s`. El cliente calcula la diferencia con su propio reloj cada segundo: "faltan 7 s", luego "empezó hace 3 s si ya le diste play". No se reproduce audio dentro del portal: el botón "Escuchar juntos" abre el link y arranca la cuenta. Si `startAt` ya pasó por más de 30 s, se ofrece "volver a sincronizar", que fija un nuevo `startAt`.

### Juegos por turnos

* Una partida abierta por tipo entre los dos. Si no hay ninguna, se ofrece crear; si hay una, `create` la devuelve con `reused:true`.
* Tres en raya: tablero de 9 celdas, turno alterno, detección de línea o empate en el servidor.
* 4 en línea: tablero de 7×6, turno alterno, victoria por cuatro en línea en el servidor.
* Memoria: mazo barajado en el servidor; cada turno voltea dos cartas y el servidor decide si coinciden. El mazo no revelado nunca viaja al cliente.
* Ahorcado: quien crea escribe la palabra; el servidor la guarda y **no la envía** al adivinador hasta que la partida termina. El adivinador manda letras; el servidor responde acierto/fallo y actualiza el dibujo.
* Cada POST lleva `rev`. Si el servidor ve otra `rev`, devuelve `409` con la partida fresca y el cliente repinta; así un toque doble o dos jugadas simultáneas no corrompen el tablero. Ventana de carrera de milisegundos: se acepta, son dos personas.
* Al cerrar una partida, el Jardín la cuenta. No hay chat dentro del juego.

### Cartas y cápsula

Se usan las acciones existentes tal cual. La pantalla de Cartas tiene dos bloques: **Cartas** (componer, lista de sobres, abrir) y **Cápsula** (fijar fecha, añadir mientras está sellada, revelar al abrir). El cliente nunca recibe el texto sellado; si la respuesta trae solo el sobre, la tarjeta muestra "sellada hasta el <fecha>" sin título.

### Álbum y fotos privadas

1. El teléfono redimensiona a 1600 px de lado mayor y prueba calidades 0.82, 0.7 y 0.6. Si la tercera sigue por encima de 1.5 MB, el servidor responde `413 {error:'foto-grande'}` y el cliente muestra "La foto pesa demasiado, elige otra". Solo se aceptan `data:image/jpeg` y `data:image/png`.
2. Se envía como `dataUrl` en JSON. La function valida el prefijo, decodifica, comprueba el tamaño y guarda bytes en `photo-<uuid>` y metadatos en `photo-<uuid>.json`.
3. Para verla, el cliente pide `photo?id=` **con las cabeceras de sesión** por `fetch`, recibe un blob y lo pinta con `URL.createObjectURL` (se revoca al salir). No hay URL pública ni token en la barra de direcciones.
4. El service worker guarda la respuesta de `action=photo` en Cache API y la sirve sin red; si no está cacheada, muestra un marcador gris con "sin conexión".

### Diario a dos voces

`daniel→a`, `kitzya→b`. Un `POST {text}` sin `id` se une a la única ronda abierta o la crea. Solo hay una ronda abierta. El servidor devuelve lo ajeno solo con ambos textos; editar una revelada devuelve `409 {error:'revelada'}`. No existe borrado.

### Jardín y logros derivados

No hay contador propio. `garden` calcula en el servidor, a partir de lo que ya existe:

| Acción | Puntos |
|---|---|
| Carta escrita | 2 |
| Entrada de cápsula | 1 |
| Partida ganada | 3 (empate: 1 a cada uno) |
| Canción dedicada | 1 |
| Foto del álbum | 2 |
| Ronda de diario completa | 2 |
| Día con presencia | 1 |

Cada 3 puntos = una flor, máximo 60 flores en pantalla (el resto se resume en "y N más"). Los logros son umbrales fijos: primera carta, primera partida, 10 flores, 25 flores, 50 flores, 30 días. Se calculan al vuelo y se pintan con el mismo SVG del jardín de Inicio, cambiando solo colores de la paleta. Si una clave aún no existe (por ejemplo `diary-` antes de la Fase 6), suma 0; nunca falla.

### Módulos del front y orden de carga

Se añade un solo archivo compartido y un módulo por pestaña. Todos los módulos nuevos van dentro de un IIFE para no repetir `const`/`let` en el scope global, salvo `api.js`, que es la única excepción y expone `window.PortalAPI` y `window.PortalBus`.

```text
js/audio.js → js/ui.js → js/api.js → js/home.js → js/portal.js
                                              ├─ js/music.js
                                              ├─ js/cinema.js
                                              ├─ js/games.js
                                              ├─ js/memories.js
                                              └─ js/garden.js
```

* `js/api.js` es el único archivo que expone algo en `window`: `window.PortalAPI` y `window.PortalBus`. Declara el bus (`PortalBus.on/emit`) y el cliente HTTP. Lee la sesión de `localStorage['portal-session-v1']` en cada llamada, así no depende del scope de `portal.js`. Usa nombres únicos (`PORTAL_API_ACTION`, `PORTAL_SESSION_KEY`) para no redeclarar `API_URL` ni `SESSION_KEY`. Firma: `PortalAPI(action, {method='GET', body, query, binary=false})` → `{ok, status, data, error}`; en `401` emite `portal:auth-lost` y `portal.js` limpia la sesión y muestra el gate. `sync()` y `login()` de `portal.js` pasan a usar `PortalAPI`. También expone `toEpoch(value)`.
* `portal.js`: dueño de la sesión, el gate, el latido y las pestañas. Es el **único** emisor de `portal:ready`, `portal:tab` y `portal:heartbeat`. Pinta la cuenta regresiva y reserva el contenedor del globo; el globo lo pinta `music.js`.
* Cada módulo escucha esos eventos y se inicializa solo, una vez. Ningún módulo llama a otro directamente.
* CSS: `css/music.css`, `css/cinema.css`, `css/games.css`, `css/memories.css`, `css/garden.css`. El globo vive en `music.css`.

### Comportamiento sin red

Cada módulo guarda su última respuesta en `localStorage` (`cache-music-v1`, `cache-games-v1`, …). Al fallar la red: pinta la caché, muestra una píldora "sin conexión" y deshabilita los controles de escritura. Las fotos dependen de la Cache API del service worker. Nada se queda en blanco ni finge que guardó.

### Seguridad y límites

* Toda acción nueva pasa por `requireAuth`; ninguna clave de Blobs se expone directamente.
* oEmbed solo consulta hosts de una lista cerrada y con timeout.
* Fotos: máximo 1.5 MB por imagen, solo JPEG/PNG, servidas con las cabeceras de sesión.
* Textos: carta 4000 caracteres, cápsula 1000, diario 1000, nota de canción 140, título 80 (los límites actuales se mantienen).
* Sin telemetría, sin terceros en el cliente, sin datos personales en logs.
* Riesgo aceptado: no hay límite de escritura por perfil más allá del tamaño. Con dos usuarios y sesión válida, el coste de añadirlo supera el beneficio.

## Alternatives Considered

### A. Supabase para tiempo real, storage y push

* **Pros:** tiempo real verdadero, almacenamiento de fotos y notificaciones en un solo servicio; menos código de sincronización.
* **Cons:** servicio nuevo y segundo modelo de autenticación; el cliente necesitaría SDK o llamadas REST nuevas; duplica el backend que ya funciona; las políticas de acceso hay que escribirlas y probarlas aparte.
* **Motivo del rechazo (autor):** choca con "cero claves en el repo" y "cero dependencias nuevas"; el backend de Netlify ya está implementado y probado con 18/18 en producción.

### B. WebSockets o canal en tiempo real

* **Pros:** latencia de milisegundos.
* **Cons:** exige un servidor que mantenga conexiones abiertas; las Netlify Functions son de vida corta; habría que añadir un servicio externo.
* **Motivo del rechazo (autor):** un servicio más para dos usuarios y un techo de 15 s que ya es suficiente para turnos y presencia.

### C. Reproductor incrustado de YouTube o Spotify (iframe)

* **Pros:** la canción suena dentro del portal.
* **Cons:** cookies y rastreadores de terceros en el cliente, no funciona sin red, puede quedar bloqueado en la PWA, y revela qué escucha cada uno al proveedor.
* **Motivo del rechazo (autor):** contradice "nada privado se expone" y "sin terceros en el cliente".

### D. Alojar los archivos de audio en el repo

* **Pros:** control total, sin terceros.
* **Cons:** licencias, peso del repo, restricciones de reproducción automática en iOS.
* **Motivo del rechazo (autor):** no hay derechos sobre las canciones y el repo debe seguir siendo ligero.

### E. URLs públicas de Blobs para las fotos

* **Pros:** `<img src>` directo, cero código extra.
* **Cons:** cualquiera con el enlace ve la foto; una URL filtrada no se puede revocar.
* **Motivo del rechazo (autor):** viola la regla de privacidad. Las fotos se leen con sesión.

### F. Fotos en IndexedDB del teléfono

* **Pros:** sin backend y sin coste.
* **Cons:** no se comparten entre los dos; se pierden al limpiar datos; cuota pequeña.
* **Motivo del rechazo (autor):** el álbum es de los dos, no de un teléfono.

### G. Juegos locales en un solo teléfono

* **Pros:** cero trabajo de backend.
* **Cons:** contradice el motivo del portal (larga distancia) y el brief.
* **Motivo del rechazo (autor):** no hay partida si no están juntos.

### H. Jardín con contador propio

* **Pros:** escritura simple, una clave.
* **Cons:** segunda fuente de verdad que puede desviarse de las cartas, partidas y fotos reales; requiere reparaciones.
* **Motivo del rechazo (autor):** derivar del actividad existente hace imposible que el jardín "mienta".

### I. oEmbed desde el navegador

* **Pros:** menos código en el servidor.
* **Cons:** expone la IP de cada teléfono al proveedor, falla por CORS en algunos casos y no cachea.
* **Motivo del rechazo (autor):** se eligió la variante en servidor con caché.

### J. Reescritura en React + Vite

* **Pros:** ecosistema y componentes.
* **Cons:** build, dependencias y el historial de fallos que ya obligó a rescatar el proyecto a HTML puro.
* **Motivo del rechazo (autor):** regla de oro número uno del README.

## Non-Functional Requirements

* **Privacidad:** ninguna acción nueva responde sin token; ninguna foto tiene URL pública; el texto sellado no viaja antes de su fecha; el link de una canción sale del portal una sola vez hacia el proveedor, sin cookies ni identificadores.
* **Rendimiento:** el latido añade una lectura extra por ciclo (la pestaña visible); la marca diaria se envía una sola vez al día desde el cliente, sin lectura extra. Las fotos se comprimen antes de salir. Las portadas se cargan con `loading="lazy"`. Ningún módulo bloquea el primer pintado: todos se inicializan con `defer` y pintan desde caché.
* **Coste:** el latido escribe 2 claves cada 15 s por perfil (ya ocurre hoy). Las fotos suman ~250 KB cada una; 100 fotos ≈ 25 MB. Dentro del plan gratuito de Blobs para dos personas.
* **Compatibilidad:** iOS Safari 16+ y PWA instalada; safe-areas; `prefers-reduced-motion`. Desktop es apoyo, no objetivo.
* **Despliegue y vuelta atrás:** una fase = commits pequeños; el service worker es network-first, así que un despliegue nuevo se sirve sin purgar caché. Si una acción nueva falla, el módulo muestra su caché y no rompe la pestaña. Volver atrás = revertir el commit de la fase; los datos en Blobs se quedan y no estorban.
* **Accesibilidad:** objetivos ≥44 px, contraste AA, foco visible, `aria-label` en iconos, estados no comunicados solo por color (el globo y las flores llevan texto).

## Detailed Implementation Plan

Una fase = un bloque de commits. Ninguna fase empieza hasta que la anterior pase su checklist de iPhone.

Cada fase añade sus etiquetas así: `<link rel="stylesheet" href="css/<módulo>.css">` después de `portal.css`, y `<script src="js/<módulo>.js" defer></script>` después de `portal.js`. Todos los scripts llevan `defer`.

### Fase 2 — Cuenta regresiva, cartas y cápsula

| Archivo | Acción | Qué cambia |
|---|---|---|
| `index.html` | Modificar | Bloque de cuenta regresiva como sección hermana de Presencia dentro de `#panel-inicio` (`#countdownCard`, `#countdownValue`, `#countdownLabel`, `#countdownForm` con `input[type=datetime-local]` y `#countdownClear`); reemplaza el wrapper `.soon` si queda solo. Reemplazar el estado vacío de `#panel-cartas` por dos bloques: Cartas (lista `#lettersList`, formulario `#letterForm` con título, texto y fecha) y Cápsula (`#capsuleCard`, `#capsuleForm`, `#capsuleList`). Añadir `<link rel="stylesheet" href="css/memories.css">` después de `portal.css`, `<script src="js/api.js" defer></script>` después de `ui.js` y `<script src="js/memories.js" defer></script>` después de `portal.js`. |
| `css/memories.css` | Crear | Tarjetas, sobres sellados, formularios desplegables y lista de cápsula. Reutiliza `.ios-card`, `.group-header` y `.btn` de `css/base.css`, más los tokens de color. |
| `js/api.js` | Crear | Define `PortalBus` (nadie más lo define) y `PortalAPI(action, {method, body, query, binary})` → `{ok, status, data, error}`. Lee la sesión de `localStorage['portal-session-v1']`; en `401` emite `portal:auth-lost`. Expone `toEpoch(value)`. Se declara como única excepción a la regla de IIFE porque necesita `window`. |
| `js/memories.js` | Crear | IIFE. Pinta cartas y cápsula, compone, expande (abrir es solo revelar en cliente cuando `opensAt` ya pasó) y borra lo propio. Se suscribe a `portal:tab` y `portal:heartbeat`; relee solo si su panel está visible y guarda `cache-memories-v1`. |
| `js/portal.js` | Modificar | Emite `portal:ready` al final de `startPortal(profile)` (cubre restaurar sesión y login), y `portal:tab` / `portal:heartbeat` cuando corresponde. Nunca desde `DOMContentLoaded`. Pinta la cuenta regresiva desde `state.countdown` en cada latido. Dueño del formulario de cuenta regresiva (`#countdownForm`, `#countdownClear`): convierte la fecha local a epoch, envía `{when, label}` o `{clear:true}` y repinta con la respuesta. Envía la marca diaria (`day`) en el primer latido de cada día local. |
| `css/portal.css` | Modificar | Estilos del bloque de cuenta regresiva y de la píldora "sin conexión". |
| `netlify/functions/api.mjs` | Modificar | En `presence`: si llega `day`, escribe `day-<YYYY-MM-DD>-<perfil>.json` solo si no existe. La fecha la calcula el cliente con `Intl` y `America/Mexico_City`; el servidor no reinterpreta zonas. Nada más: `countdown`, `letters` y `capsule` ya existen. |
| `sw.js` | Modificar | Añadir a `ASSETS` `./css/memories.css`, `./js/api.js` y `./js/memories.js`; subir `CACHE` a `nosotros-v2`. El handler `fetch` no cambia. |
| `README.md` | Modificar | Estructura nueva, recetas de cartas/cápsula y changelog de la fase. |
| `PRODUCT.md` | Modificar | Estado de fase y capacidades nuevas. |

Bordes que el implementador no debe decidir: si `countdown.when` es `null`, la tarjeta muestra "Sin fecha todavía" y el botón "Fijar fecha"; si la fecha ya pasó, muestra "Ya pasó" y permite fijar otra. Quien recibe una carta sellada ve remitente y fecha, nunca el título; el autor ve la suya completa.

Toda fecha de formulario (`countdown`, `letters.opensAt`, `capsule`, `#photoDate`) pasa por `toEpoch(value)`: interpreta el valor de `datetime-local` en `America/Mexico_City` y devuelve milisegundos. Prohibido `new Date('YYYY-MM-DD')` (eso es UTC).

### Fase 3 — Música, globo y escucha sincronizada

| Archivo | Acción | Qué cambia |
|---|---|---|
| `index.html` | Modificar | Reemplazar el estado vacío de `#panel-musica` con un contenedor fijo `#musicBlock`: `#songForm` (link + dedicatoria), `#songsList`, `#nowCard` (canción del día), `#syncCard` con `#btnSync` y `#syncCountdown`. Añadir el globo global `#songBubble` (portada, título, "de parte de", botón cerrar) antes de la tab bar. `<link rel="stylesheet" href="css/music.css">` después de `portal.css`; `<script src="js/music.js" defer></script>` después de `portal.js`. |
| `css/music.css` | Crear | Lista de canciones, tarjeta de canción del día, globo fijo sobre la tab bar con `env(safe-area-inset-bottom)`, sin animación si `prefers-reduced-motion`. |
| `js/music.js` | Crear | IIFE. Alta de canción, dedicatoria, borrado propio, "escuchar juntos", cuenta sincronizada con `setInterval` de 1 s que se limpia al cambiar de pestaña. Único dueño de `#songBubble`: lo pinta desde `now` y lo refresca con `GET music?view=now` en cada latido, aunque la pestaña no sea Música. |
| `netlify/functions/api.mjs` | Modificar | Acciones `music` (GET/POST/DELETE), `music-now` y `music-sync`. `POST music` escribe `song-<uuid>.json` y `music-now.json` en la misma petición. Función interna `fetchOEmbed(url)`: valida con `new URL`, exige `https`, host en lista cerrada, `AbortController` de 3 s; devuelve `{title, artist, thumb, provider}` o `null`. Nunca lanza: si falla, la canción se guarda igual. |
| `sw.js` | Modificar | Añadir a `ASSETS` `./css/music.css` y `./js/music.js`. No cambiar `CACHE`. |
| `README.md`, `PRODUCT.md` | Modificar | Recetas de música, límites de oEmbed y changelog. |

Bordes: un link de host no permitido devuelve 400 con mensaje "Solo YouTube o Spotify". Si el globo está cerrado, no reaparece hasta que cambie `music-now`. Si `startAt` quedó más de 30 s atrás, el botón pasa a "Volver a sincronizar".

### Fase 4 — Juegos por turnos

| Archivo | Acción | Qué cambia |
|---|---|---|
| `index.html` | Modificar | Reemplazar `#panel-juegos` con un contenedor fijo `#gamesBlock`: selector de juego (Tres en raya / 4 en línea / Memoria / Ahorcado), `#gameBoard`, `#gameStatus`, `#btnNewGame`, `#hangmanKeyboard`, `#hangmanWord`. `<link rel="stylesheet" href="css/games.css">` después de `portal.css`; `<script src="js/games.js" defer></script>` después de `portal.js`. |
| `css/games.css` | Crear | Tablero de 3×3 y de 7×6 con celdas de ≥44 px, rejilla de memoria, teclado de letras de ≥44 px, estado de turno, mensajes de fin. |
| `js/games.js` | Crear | IIFE. Crea partida, pinta tablero, memoria o palabra, manda `{op:'move', id, rev, cell?\|letter?}` y repinta con la respuesta o con el `409`, bloquea el tablero cuando no es tu turno o no hay red. |
| `netlify/functions/api.mjs` | Modificar | Acción `games`: `GET` lista; `POST {op:'create', kind, word?}` crea (si ya hay una abierta del mismo tipo, la devuelve con `reused:true`); `POST {op:'move', id, rev, cell?\|letter?}` valida turno y `rev` y calcula victoria/empate en servidor; `DELETE {id}`. `rev` lo incrementa el servidor; el cliente solo lo devuelve. `list` oculta `secret` y el mazo no revelado. |
| `sw.js` | Modificar | Añadir a `ASSETS` `./css/games.css` y `./js/games.js`. No cambiar `CACHE`. |
| `README.md`, `PRODUCT.md` | Modificar | Reglas de cada juego y changelog. |

Bordes: no se puede jugar dos veces la misma celda; el ahorcado limita a 6 fallos; memoria usa un mazo barajado en el servidor y solo revela las cartas ya volteadas; `delete` se permite si la partida terminó o si no tiene jugadas en 7 días, y cualquiera de los dos puede borrarla. Mientras haya una abierta, crear otra del mismo tipo devuelve la existente (`reused:true`), no un error. Si no hay partida abierta se muestra "Empezar partida" en vez de un tablero vacío.

### Fase 5 — Cine, películas por ver, ruleta, retos, quizzes y jardín

| Archivo | Acción | Qué cambia |
|---|---|---|
| `index.html` | Modificar | En `#panel-musica`, añadir el contenedor fijo `#cinemaBlock`: `#watchForm` (título), `#watchList` con dos calificaciones por título, `#btnRoulette`, `#rouletteResult`. En `#panel-juegos`, añadir `#quizBlock`: `#quizQuestion`, `#quizOptions`, `#quizResult`. Reemplazar `#panel-jardin` con `#gardenShared`, `#gardenCount`, `#achievementsList`, `#challengeCard` (`#challengePrompt`, `#challengePhoto`, `#challengeNote`). La escritura de fotos entra en esta fase: `#photoInput`, `#photoPhrase`, `#photoDate` ocultos; la rejilla del álbum llega en la Fase 6. `<link rel="stylesheet" href="css/cinema.css">` y `<link rel="stylesheet" href="css/garden.css">` después de `portal.css`; `<script src="js/cinema.js" defer></script>` y `<script src="js/garden.js" defer></script>` después de `portal.js`. |
| `css/cinema.css` | Crear | Lista de películas por ver, calificación con botones de estrella accesibles, ruleta. |
| `css/garden.css` | Crear | Jardín compartido, contador, logros y tarjeta de reto. |
| `js/cinema.js` | Crear | IIFE. Películas por ver, calificación por perfil, ruleta que elige al azar entre los títulos calificados por los dos y la anuncia con texto. |
| `js/games.js` | Modificar | Añade "¿Cuánto me conoces?" (preguntas fijas, cada uno responde y se compara) y "Esto o aquello" (porcentaje de coincidencia), en el mismo módulo porque viven en la pestaña Juegos. |
| `js/garden.js` | Crear | IIFE. Pinta flores reutilizando `flowerSVG` de `home.js` (función global), contador y logros. `#gardenShared` usa `.garden`, `.flower` y `.grown` de `home.css`; `garden.js` añade `.grown` cuando termina el pintado. Relee en dos casos: al entrar en la pestaña y en cada 4.º latido (60 s); no en todos. También es dueño de los retos (`#challengePrompt`, `#challengePhoto`, `#challengeNote`). |
| `netlify/functions/api.mjs` | Modificar | Acciones `watch`, `challenge`, `quiz`, `garden`, `album` (POST) y `photo` (GET). `quiz` usa un banco fijo en `api.mjs` (`[{id, text, options[]}]`); `GET` devuelve `{questions, mine, theirs}` con `theirs:null` hasta que ambos respondan; la coincidencia es `aciertos / respondidas`, entero. `garden` suma puntos desde `letter-`, `cap-`, `game-`, `song-`, `photo-`, `diary-` y `day-`; devuelve flores, logros y días; si una clave no existe, suma 0. Los retos usan la tubería de fotos de esta misma fase. |
| `sw.js` | Modificar | Añadir a `ASSETS` `./css/cinema.css`, `./css/garden.css`, `./js/cinema.js` y `./js/garden.js`. No cambiar `CACHE`. |
| `README.md`, `PRODUCT.md` | Modificar | Reglas de puntos, logros y changelog. |

Bordes: la ruleta solo considera títulos calificados por los dos; sin ninguno, muestra "Nada que sortear todavía". El último elegido se guarda en `localStorage['roulette-last-v1']` de ese teléfono y no se repite en el sorteo siguiente. Una película sin calificar de uno de los dos no entra. El jardín se corta a 60 flores visibles y resume el resto.

### Fase 6 — Álbum visible y diario a dos voces

| Archivo | Acción | Qué cambia |
|---|---|---|
| `index.html` | Modificar | En `#panel-cartas`, añadir `#photoGrid` (la entrada y la frase ya existen desde la Fase 5) y Diario (`#diaryForm`, `#diaryList`). |
| `css/memories.css` | Modificar | Rejilla de fotos, estados bloqueado/revelado del diario. |
| `js/memories.js` | Modificar | Comprimir con `canvas` antes de enviar, pintar fotos desde blob, escribir y revelar diario. |
| `netlify/functions/api.mjs` | Modificar | Acción `diary` (GET/POST con revelado doble). `album POST` valida `date` en epoch (por defecto hoy). `album DELETE` borra primero el JSON y luego el blob y devuelve `{ok:true}` aunque el blob falte. |
| `sw.js` | Modificar | Regla `cache-first` solo para `url.pathname === '/api' && url.searchParams.get('action') === 'photo'`; el resto de `/api` sigue fuera de caché. |
| `README.md`, `PRODUCT.md` | Modificar | Límites de imagen, regla del diario y changelog. |

Bordes: una foto mayor a 1.5 MB se rechaza con `413` y mensaje claro; si el canvas falla, se ofrece reintentar; una ronda de diario revelada no se edita ni se borra.

### Verificación

* **Sintaxis:** `node --check` sobre cada archivo de `js/` tocado y sobre `netlify/functions/api.mjs`.
* **Local:** `netlify dev` con `ACCESS_CODE` en `.env` (nunca en el repo). `npx serve` solo sirve estáticos y no prueba `/api`.
* **API:** canjear el código, guardar el token y usar `curl.exe` con `-H "x-portal-profile: daniel" -H "x-portal-token: <token>"`. Aserciones: `rev` vieja → `409`; host no permitido → `400`; sin token → `401`; foto > 1.5 MB → `413`; victoria y empate en cada juego; 6 fallos cierran el ahorcado; coincidencia del quiz correcta.
* **Privacidad:** con el perfil contrario, `GET letters` y `GET capsule` antes de `opensAt` no contienen `body` ni `title` en la respuesta.
* **iPhone (cada fase):** Safari y PWA instalada; modo avión después de una visita; rotación; teclado abierto en los formularios; VoiceOver en los controles nuevos; `prefers-reduced-motion` activado en Ajustes.
* **Diseño:** detector impeccable en `[]` y revisión visual contra los patrones de Inicio.
* **Cierre de fase:** actualizar README y PRODUCT.md y hacer commit pequeño por cambio.

## Orden de implementación

| Fase | Qué entra | Qué queda fuera |
|---|---|---|
| 1 · Hecha | Base, acceso, presencia, PWA | — |
| 2 | Cuenta regresiva en Inicio + Cartas + cápsula | Álbum y diario |
| 3 | Música: playlist, dedicatoria, globo, canción del día, escucha sincronizada | Cine y ruleta |
| 4 | Juegos por turnos: tres en raya, 4 en línea, memoria y ahorcado | Quizzes |
| 5 | Cine, películas por ver con calificación, ruleta, retos con foto, quizzes y jardín con logros | Álbum visible y diario |
| 6 | Álbum visible y diario a dos voces | — |
