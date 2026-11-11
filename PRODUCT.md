# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Daniel y Kitzya: una pareja con dos iPhones y acceso compartido (mismo código, dos perfiles). Ella, Kitzya, es quien más escribe y responde; él, Daniel, mantiene el portal and despliega. Cualquiera de los dos entra desde su propio teléfono y el portal debe funcionarle a ambos por igual.

## Product Purpose

Portal privado de dos personas cuyo trabajo principal es **estar presentes entre encuentros**: presencia en línea, "pensando en ti", relojes de ambos, música sincronizada, juegos y retos compartidos. Secundario pero duradero: conservar la historia (cartas con fecha, cápsulas, álbum, diario a dos voces).

Éxito = que ambos lo abran a diario desde el iPhone (Safari o PWA instalada), que siga funcionando offline con lo último guardado, y que nada de lo privado quede expuesto.

## Positioning

No es una app de citas ni un cuaderno de notas: es un portal **solo para dos, sin cuentas ni registros** — se entra con un código compartido que vive en variables de entorno (nunca en el código fuente) y todo estado compartido pasa por su propio backend (Netlify Functions + Blobs). Ese mecanismo — cero claves en el repo, cero registros, exactamente dos perfiles — es lo que un producto vecino no podría copiar sin construir exactamente lo mismo.

## Operating Context

- iPhone 14 (Safari y PWA instalada) como superficie principal; desktop básico de apoyo.
- Producción: https://idyllic-wisp-bf5826.netlify.app · repo `DanielDAAR/nuestro-amor`, rama `master` · Netlify CLI pre-autenticado.
- Ambos en la misma zona horaria: `America/Mexico_City`.
- Cadencia de trabajo: fases 0–6, una fase a la vez, checklist de iPhone al final de cada fase, commits pequeños y un cambio = un commit.
- Verificación: `node --check`, servidor local estático, detector impeccable manual (`detect --json`, objetivo `[]`).

## Capabilities and Constraints

- Fase 0 completada: sitio en módulos planos `css/` (base, ui, home) + `js/` (audio, ui, home); fixes de "Tu turno" (toast honesto, botón enviar disabled, `.btn-small` de 44px).
- Fase 1 completada: tab bar de 5 pestañas (Inicio · Juegos · Música y cine · Cartas · Jardín), acceso por código de 6 dígitos, presencia (latido ~15 s), PWA instalable con offline.
- Fase 2 en curso: cuenta regresiva compartida del próximo encuentro en Inicio (se fija, cambia y quita desde la app, fecha aún por decidirse) y pestaña **Cartas** completa (cartas con fecha de apertura + cápsula del tiempo). El latido de 15 s es el único canal de lectura: `js/api.js` expone `PortalBus`/`PortalAPI` y cada apartado se refresca cuando su pestaña está visible.
- Backend elegido: Netlify Functions + Blobs (mismo proveedor, sin SDK en el front); secretos solo en env vars de Netlify (`ACCESS_CODE`); **cero claves en el repo**.
- Presencia por latido (~15 s), no websockets.
- Zona horaria de todo lo programado: `America/Mexico_City` (misma para ambos).
- Restricciones duras: cero build, cero framework, cero npm, sin ES modules en el front; sin refs inline ni bucles de re-render; `prefers-reduced-motion` respetado; targets táctiles ≥44px; contraste AA; español de tú.
- **Sin decidir (registro, no invención):** ¿notificaciones push? De momento "pensando en ti" y la presencia se ven al abrir la app.
- **Sin decidir (registro):** fecha real del próximo encuentro — el campo existe y es editable desde la propia app; nace vacío, nadie lo inventa.
- **Sin decidir (registro):** el contenido de los 10 mensajes de Inicio mantiene hoy su voz original (Daniel → Kitzya); adaptarlo por perfil queda para la fase de contenido de cartas.

## Brand Commitments

- Identidad existente y vinculante: título "Para ti, Kitzya" y OG correspondiente; sistema visual iOS rosa (`--ios-pink #FF375F` y tokens de `css/base.css`); tarjetas iOS, sheets inferiores, partículas, carillón WebAudio, guiño dev en consola y "🥺 vuelve" en la pestaña.
- Voz: español, tuteo, romántico y directo.
- **App instalada en pantalla de inicio: "Nosotros 💕"** (manifest + `apple-mobile-web-app-title`).
- El portal habla de los dos: Inicio también se adapta por perfil (saludo y textos identificables según quién entra); la pestaña Inicio conserva su carta y su lenguaje visual.

## Evidence on Hand

- `foto-nuestra.jpg` (foto real de ambos, usada en tarjeta y lightbox), `og-image.jpg`, `apple-touch-icon.png`, `favicon.svg`.
- Contenido real en `js/home.js`: 10 mensajes personales, 7 tarjetas "cosas de nosotros" + 7 extras.
- `README.md` con reglas de oro, recetas y changelog histórico; git limpio en `master`.
- Ausencias que futuros trabajos **no deben inventar**: no hay fecha de encuentro; el álbum de fotos aún no tiene fotos (solo `imagenes/` local); no aplica licencias, testimonios ni métricas (producto privado de dos).

## Product Principles

1. Privacidad primero: nada privado en el repo, en URLs ni en HTML público; el código de acceso vive solo en env vars.
2. Presencia > archivo: entre encuentros, sentir al otro pesa más que acumular contenido.
3. Sin build, sin fricción: archivos planos que abren con doble clic y se despliegan con un comando.
4. iPhone primero: todo se diseña para Safari/PWA en iPhone (safe-areas, ≥44px, reduced-motion, contraste AA).
5. Una fase a la vez: nada nuevo hasta cerrar la anterior con su checklist.

## Accessibility & Inclusion

Reduced-motion obligatorio (regla del proyecto), targets táctiles ≥44px, foco visible (`:focus-visible`), contraste AA verificado con el detector impeccable en cada fase, etiquetas `aria-*` en controles de icono, sin dependencia del color solo para estados.
