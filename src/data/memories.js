/**
 * 💕 TU CONTENIDO AQUÍ — Edita esto sin tocar código
 * Agrega fotos en public/images/ y referéncialas aquí
 * Para stickers: usa emojis o pon rutas a imágenes en public/images/stickers/
 */

export const ourStory = [
  {
    id: 'meet',
    date: '202X-XX-XX',
    title: 'El primer "hola"',
    description: 'Cuenta cómo se conocieron...',
    photo: '/images/meet.jpg',
    sticker: '💫',
    position: 'left',
  },
  {
    id: 'first-date',
    date: '202X-XX-XX',
    title: 'Primera cita',
    description: 'Detalles lindos de ese día...',
    photo: '/images/first-date.jpg',
    sticker: '🌸',
    position: 'right',
  },
  {
    id: 'first-kiss',
    date: '202X-XX-XX',
    title: 'Nuestro primer beso',
    description: 'El momento en que todo cambió...',
    photo: '/images/first-kiss.jpg',
    sticker: '💋',
    position: 'left',
  },
  {
    id: 'anniversary',
    date: '202X-XX-XX',
    title: 'Nuestro aniversario',
    description: 'Celebrando nuestro amor...',
    photo: '/images/anniversary.jpg',
    sticker: '💍',
    position: 'right',
  },
];

export const letters = [
  {
    id: 'letter-1',
    title: 'Para ti, mi amor',
    envelopeColor: 'heart',
    content: `Mi amor,\n\nDesde que llegaste a mi vida, todo tiene más sentido. Eres mi persona favorita, mi mejor amiga, mi todo.\n\nGracias por cada risa, cada abrazo, cada "te amo" susurrado. Por soportar mis bugs, mis horarios raros, mis días de mucho código.\n\nPrometo amarte en cada commit, en cada deploy, en cada versión de nosotros. Eres mi main branch, mi production, mi release perfecta.\n\nCon todo mi amor,\nTu dev ❤️`,
    sealed: true,
  },
  {
    id: 'letter-2',
    title: 'Carta abierta',
    envelopeColor: 'accent-1',
    content: `Hey,\n\nSolo quería que supieras que pienso en ti todo el tiempo. Incluso cuando estoy debuggeando ese bug imposible, mi mente vuelve a ti.\n\nEres mi feature favorita. Mi hot reload en días fríos. Mi breakpoint en el caos.\n\nTe amo más de lo que cualquier variable puede almacenar.\n\nTu dev 💕`,
    sealed: true,
  },
];

export const thingsILove = [
  'Tu risa cuando ves mis bugs',
  'Cómo me apoyas en mis proyectos',
  'Tus ojos cuando hablas de lo que amas',
  'El olor de tu café por las mañanas',
  'Cómo te concentras cuando lees',
  'Tus manos en las mías',
  'Que seas mi persona favorita',
  'Nuestras charlas infinitas',
  'Tu paciencia conmigo',
  'Cómo haces que todo sea mejor',
  'Tus mensajes random en el día',
  'Que me escuches de verdad',
  'Tus besos sorpresa',
  'Cómo te ilusionas con lo simple',
  'Nuestro idioma secreto',
  'Que seas mi hogar',
  'Tus consejos sabios',
  'Cómo cuidas de mí',
  'Tus playlist compartidas',
  'Nuestros planes a futuro',
  'Que confíes en mí',
  'Tus abrazos largos',
  'Cómo me haces reír',
  'Que seas tú, siempre tú',
  'Nuestro primer "te amo"',
  'Cada "buenos días" tuyo',
  'Que me elijas cada día',
  'Tus ojos brillando',
  'Nuestras aventuras',
  'Que seas mi paz',
  'Todo de ti, simplemente',
];

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
    description: 'Cazar auroras en Islandia o Noruega',
    done: false,
    coords: { lat: 64.9631, lng: -19.0208 },
  },
  {
    id: 'trip-3',
    title: 'Road trip por la costa',
    emoji: '🚗',
    description: 'Sin destino fijo, solo nosotros y el mar',
    done: false,
    coords: { lat: 36.7783, lng: -119.4179 },
  },
  {
    id: 'trip-4',
    title: 'Vivir en otra ciudad',
    emoji: '🏠',
    description: 'Un año en Barcelona, Berlín o donde soñemos',
    done: false,
    coords: { lat: 41.3851, lng: 2.1734 },
  },
  {
    id: 'trip-5',
    title: 'Aprender algo juntos',
    emoji: '📚',
    description: 'Cocina, baile, idioma, lo que sea',
    done: false,
    coords: null,
  },
  {
    id: 'trip-6',
    title: 'Nuestro perrito/gatito',
    emoji: '🐾',
    description: 'Adoptar y llenar la casa de patitas',
    done: false,
    coords: null,
  },
];

export const devEasterEggs = [
  { command: 'git commit -m "te amo"', response: '💕 Commit pushed to heart/main\n📝 Changes: +∞ love, -0 doubts' },
  { command: 'npm install love --save', response: '📦 love@∞.∞.∞ installed successfully\n💕 Dependencies: patience, kindness, laughter\n🚀 Ready to import in your heart' },
  { command: 'sudo make us-happy', response: '🏗️ Building happiness... ████████████ 100%\n✨ Deployment successful!\n💕 Love server running on port 443 (HTTPS only)' },
  { command: 'console.log("te amo")', response: '💖 "te amo" → undefined\n💡 Note: Return value is undefined, but side effect is eternal 💕' },
  { command: 'while(true) { love++; }', response: '♾️ Infinite loop detected.\n💕 Heart overflow: Maximum love exceeded\n🔄 Restarting with more capacity...' },
  { command: 'git push origin us --force', response: '🚀 Force pushing "us" to remote...\n✨ History rewritten: only beautiful memories remain\n💕 Branch protected: nobody can delete us' },
  { command: 'docker run -d --name us --restart=always love', response: '🐳 Container "us" started\n💕 Restart policy: always\n🔒 Health check: heartbeat every second\n📊 Status: healthy & growing' },
];

export const meta = {
  names: ['Tu nombre', 'Su nombre'],
  startDate: '202X-XX-XX',
  song: '/audio/our-song.mp3',
  motto: 'Nuestra historia, nuestro código ❤️',
};