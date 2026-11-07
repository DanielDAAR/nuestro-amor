/**
 * 💕 NUESTRO-AMOR — Contenido personalizado
 * ============================================
 * Edita los valores abajo con vuestra historia real.
 * Las fotos van en public/images/ y la canción en public/audio/
 */

export const meta = {
  // Cambia por vuestros nombres reales
  names: ['Daniel', '[Su nombre]'],
  // Fecha en que empezaron (YYYY-MM-DD)
  startDate: '2024-01-01',
  // Canción que sonará (pon tu .mp3/.ogg en public/audio/)
  song: '/audio/our-song.mp3',
  motto: 'Nuestra historia, nuestro código ❤️',
};

/**
 * TIMELINE — Nuestra historia
 * position: 'left' | 'right' | 'alternate'
 */
export const ourStory = [
  {
    id: 'meet',
    date: '2024-01-15',
    title: 'El primer "hola"',
    description: 'Ese día en que nos cruzamos y todo cambió. Tu sonrisa fue el mejor commit de mi vida.',
    photo: '/images/meet.jpg',
    sticker: '💫',
    position: 'left',
  },
  {
    id: 'first-date',
    date: '2024-02-14',
    title: 'Primera cita',
    description: 'San Valentín. Nervios, risas y la certeza de que quería verte otra vez. Eres mi fecha favorita del calendario.',
    photo: '/images/first-date.jpg',
    sticker: '🌸',
    position: 'right',
  },
  {
    id: 'first-kiss',
    date: '2024-03-08',
    title: 'Nuestro primer beso',
    description: 'Bajo la lluvia, sin prisa, sin código, solo tú y yo. El mejor bug que nunca quise arreglar.',
    photo: '/images/first-kiss.jpg',
    sticker: '💋',
    position: 'left',
  },
  {
    id: 'together',
    date: '2024-04-01',
    title: 'Nos hicimos novios',
    description: 'Te pedí que fueras mi persona favorita. Dijiste que sí. Mejor decisión de mi vida, sin merge conflicts.',
    photo: '/images/together.jpg',
    sticker: '💍',
    position: 'right',
  },
  {
    id: 'trip',
    date: '2024-07-20',
    title: 'Primer viaje juntos',
    description: 'Maletas listas, mapa en blanco y tú a mi lado. Cada kilómetro fue una aventura escrita por nosotros dos.',
    photo: '/images/trip.jpg',
    sticker: '🧳',
    position: 'left',
  },
  {
    id: 'anniversary',
    date: '2025-01-15',
    title: 'Nuestro primer año',
    description: '365 días de risas, abrazos, café compartido y amor incondicional. Te elijo una y otra vez.',
    photo: '/images/anniversary.jpg',
    sticker: '🎂',
    position: 'right',
  },
];

/**
 * CARTAS — Sobres que se abren al click
 */
export const letters = [
  {
    id: 'letter-1',
    title: 'Para ti, mi amor',
    envelopeColor: 'heart',
    content: `Mi amor,\n\nDesde que llegaste a mi vida, todo tiene más sentido. Eres mi persona favorita, mi mejor amiga, mi todo.\n\nGracias por cada risa, cada abrazo, cada "te amo" susurrado al oído. Por soportar mis bugs, mis horarios raros de desarrollador, mis días de mucho código y poca conversación.\n\nPrometo amarte en cada commit, en cada deploy, en cada versión de nosotros. Eres mi main branch, mi production, mi release perfecta.\n\nGracias por existir, por elegirme y por hacer que cada día sea mejor que el anterior.\n\nCon todo mi amor,\nTu dev ❤️`,
    sealed: true,
  },
  {
    id: 'letter-2',
    title: 'Carta abierta',
    envelopeColor: 'accent-1',
    content: `Hey,\n\nSolo quería que supieras que pienso en ti todo el tiempo. Incluso cuando estoy debuggeando ese bug imposible a las 3 de la mañana, mi mente vuelve a ti.\n\nEres mi feature favorita. Mi hot reload en días fríos. Mi breakpoint en el caos. Mi puerto 443, siempre seguro.\n\nTe amo más de lo que cualquier variable puede almacenar. Más de lo que cualquier función puede retornar.\n\nTu dev 💕`,
    sealed: true,
  },
  {
    id: 'letter-3',
    title: 'Promesas',
    envelopeColor: 'accent-4',
    content: `Mi vida,\n\nTe prometo:\n- Siempre tener café listo cuando despiertes.\n- Debuggear tus problemas como si fueran míos.\n- Nunca dejar de decirte "te amo", aunque el código falle.\n- Ser tu lugar seguro cuando el mundo esté en producción rota.\n- Seguir eligeti, siempre.\n\nEres mi forever loop.\n\n❤️`,
    sealed: true,
  },
];

/**
 * COSAS QUE AMO DE TI
 */
export const thingsILove = [
  'Tu risa cuando ves mis bugs',
  'Cómo me apoyas en mis proyectos de código',
  'Tus ojos cuando hablas de lo que amas',
  'El olor de tu café por las mañanas',
  'Cómo te concentras cuando lees un libro',
  'Tus manos entrelazadas con las mías',
  'Que seas mi persona favorita',
  'Nuestras charlas infinitas hasta tarde',
  'Tu paciencia infinita conmigo',
  'Cómo haces que todo sea mejor solo con estar',
  'Tus mensajes random en medio del día',
  'Que me escuches de verdad, sin prisa',
  'Tus besos sorpresa cuando menos lo espero',
  'Cómo te ilusionas con las cosas simples',
  'Nuestro idioma secreto, solo nuestro',
  'Que seas mi hogar, mi lugar seguro',
  'Tus consejos sabios y sinceros',
  'Cómo cuidas de mí cuando estoy cansado',
  'Tus playlist compartidas con canciones nuestras',
  'Nuestros planes a futuro, soñando juntos',
  'Que confíes en mí con tu corazón',
  'Tus abrazos largos que sanan todo',
  'Cómo me haces reír hasta llorar',
  'Que seas tú, siempre tú, auténtica',
  'Nuestro primer "te amo", inolvidable',
  'Cada "buenos días" tuyo, mi mejor amanecer',
  'Que me elijas cada día, una y otra vez',
  'Tus ojos brillando cuando hablas de sueños',
  'Nuestras aventuras, grandes y pequeñas',
  'Que seas mi paz en medio del ruido',
  'Todo de ti, simplemente todo',
  'Tu forma de decir mi nombre',
  'Cómo bailas sin música en la cocina',
  'Tus manos dibujando en el aire',
  'Que me mires como si fuera tu favorito',
  'Nuestros silencios cómodos, nunca incómodos',
  'Cómo me haces sentir visto y querido',
  'Tu fuerza y tu dulzura al mismo tiempo',
  'Que seas mi mejor amiga y mi amor',
  'Cada pequeño detalle que recuerdas de mí',
  'Cómo haces que el mundo sea más bonito',
  'Que estés en mi vida, simplemente',
];

/**
 * BUCKET LIST — Futuro juntos
 */
export const bucketList = [
  {
    id: 'trip-1',
    title: 'Japón en primavera',
    emoji: '🌸',
    description: 'Ver los sakura juntos en Kioto y Tokyo',
    done: false,
    coords: { lat: 35.6762, lng: 139.6503 },
  },
  {
    id: 'trip-2',
    title: 'Aurora boreal',
    emoji: '✨',
    description: 'Cazar auroras en Islandia o Noruega, acurrucados',
    done: false,
    coords: { lat: 64.9631, lng: -19.0208 },
  },
  {
    id: 'trip-3',
    title: 'Road trip por la costa',
    emoji: '🚗',
    description: 'Sin destino fijo, solo nosotros, el mar y buena música',
    done: false,
    coords: { lat: 36.7783, lng: -119.4179 },
  },
  {
    id: 'trip-4',
    title: 'Vivir en otra ciudad',
    emoji: '🏠',
    description: 'Un año en Barcelona, Berlín o donde soñemos juntos',
    done: false,
    coords: { lat: 41.3851, lng: 2.1734 },
  },
  {
    id: 'trip-5',
    title: 'Aprender algo juntos',
    emoji: '📚',
    description: 'Cocina, baile, un nuevo idioma, lo que se te ocurra',
    done: false,
    coords: null,
  },
  {
    id: 'trip-6',
    title: 'Nuestro perrito o gatito',
    emoji: '🐾',
    description: 'Adoptar y llenar la casa de patitas y amor',
    done: false,
    coords: null,
  },
  {
    id: 'trip-7',
    title: 'Ver las estrellas en el desierto',
    emoji: '🌌',
    description: 'Acampar bajo la Vía Láctea, solo nosotros dos',
    done: false,
    coords: { lat: -24.5, lng: -69.25 },
  },
  {
    id: 'trip-8',
    title: 'Nuestro hogar',
    emoji: '🔑',
    description: 'Comprar nuestra primera casa, llenarla de recuerdos',
    done: false,
    coords: null,
  },
];

/**
 * TERMINAL DEV — Comandos románticos secretos
 */
export const devEasterEggs = [
  { command: 'git commit -m "te amo"', response: '💕 Commit pushed to heart/main\n📝 Changes: +∞ love, -0 doubts\n✅ Build passing | Tests: ♾️ passing' },
  { command: 'npm install love --save', response: '📦 love@∞.∞.∞ installed successfully\n💕 Dependencies: patience, kindness, laughter\n🚀 Ready to import in your heart' },
  { command: 'sudo make us-happy', response: '🏗️ Building happiness... ████████████ 100%\n✨ Deployment successful!\n💕 Love server running on port 443 (HTTPS only)' },
  { command: 'console.log("te amo")', response: '💖 "te amo" → undefined\n💡 Note: Return value is undefined, but side effect is eternal 💕' },
  { command: 'while(true) { love++; }', response: '♾️ Infinite loop detected.\n💕 Heart overflow: Maximum love exceeded\n🔄 Restarting with more capacity...' },
  { command: 'git push origin us --force', response: '🚀 Force pushing "us" to remote...\n✨ History rewritten: only beautiful memories remain\n💕 Branch protected: nobody can delete us' },
  { command: 'docker run -d --name us --restart=always love', response: '🐳 Container "us" started\n💕 Restart policy: always\n🔒 Health check: heartbeat every second\n📊 Status: healthy & growing' },
  { command: 'npm run us', response: '🎯 Starting us...\n💕 App running on http://localhost:443\n📡 WebSocket connection: established\n💖 Real-time love sync: active' },
];

/**
 * RECUERDOS PARA MEMORY BOARD (drag & drop)
 * Las fotos van en public/images/
 */
export const memoryBoardItems = [
  { id: 'mem-1', type: 'photo', src: '/images/memory1.jpg', caption: 'Ese día perfecto', sticker: '📸', position: { x: -200, y: -100, rotation: -3 } },
  { id: 'mem-2', type: 'note', note: 'Te amo más que ayer pero menos que mañana ❤️', sticker: '💌', position: { x: 150, y: -50, rotation: 2 } },
  { id: 'mem-3', type: 'sticker', sticker: '🦋', position: { x: -100, y: 100, rotation: -1 } },
  { id: 'mem-4', type: 'ticket', caption: 'Cine: Nuestra película', note: 'Primera cita oficial 🎬', sticker: '🎟️', position: { x: 200, y: 80, rotation: 1 } },
  { id: 'mem-5', type: 'photo', src: '/images/memory2.jpg', caption: 'Atardecer juntos', sticker: '🌅', position: { x: -180, y: 180, rotation: -2 } },
  { id: 'mem-6', type: 'note', note: 'Gracias por ser mi persona favorita 💕', sticker: '📝', position: { x: 120, y: 150, rotation: 3 } },
];