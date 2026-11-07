import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useScrollReveal } from '../hooks/useScrollReveal';

import { Sticker } from './Sticker';
import { PhotoPolaroid } from './PhotoPolaroid';
import { HandwrittenNote } from './HandwrittenNote';
import { Timeline } from './TimelineEntry';
import { EnvelopeLetter } from './EnvelopeLetter';
import { FlipCard } from './FlipCard';
import { MemoryBoard, DraggableMemory } from './DraggableMemory';
import { KonamiEasterEgg } from './KonamiEasterEgg';
import { MusicPlayer } from './MusicPlayer';
import { TerminalLove } from './TerminalLove';

import {
  ourStory,
  letters,
  thingsILove,
  bucketList,
  devEasterEggs,
  meta,
} from '../data/memories';

gsap.registerPlugin(ScrollTrigger);

const SECTION_IDS = [
  'hero',
  'timeline',
  'letters',
  'things-i-love',
  'bucket-list',
  'memory-board',
  'terminal',
  'footer',
];

export function ScrapbookPage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const [memoryBoardElement, setMemoryBoardElement] = useState(null);
  const sectionRefs = useRef({});
  const progressRef = useRef(null);

  // Scroll progress indicator
  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      if (progressRef.current) {
        progressRef.current.style.width = `${progress}%`;
      }
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  // Smooth scroll to section
  const scrollToSection = (index) => {
    const ref = sectionRefs.current[SECTION_IDS[index]];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <KonamiEasterEgg>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-heart to-accent-1 z-50" style={{ width: '0%' }} ref={progressRef} />

      {/* Navegación lateral */}
      <nav className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-2" aria-label="Navegación por secciones">
        {SECTION_IDS.map((id, index) => (
          <button
            key={id}
            onClick={() => scrollToSection(index)}
            className={`
              w-3 h-3 rounded-full border-2 transition-all duration-300
              ${currentSection === index
                ? 'bg-heart border-heart scale-125'
                : 'border-white/50 hover:border-heart hover:scale-110'
              }
            `}
            aria-label={`Ir a ${id}`}
            aria-current={currentSection === index ? 'true' : 'false'}
          />
        ))}
      </nav>

      {/* Música */}
      <MusicPlayer
        src={meta.song}
        title={meta.motto}
        artist={meta.names.join(' & ')}
        autoPlay={false}
        loop
        volume={0.4}
      />

      <main className="relative min-h-screen">
        {/* HERO */}
        <section
          ref={(el) => { sectionRefs.current.hero = el; }}
          id="hero"
          className="relative min-h-screen flex items-center justify-center px-4 py-20"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Partículas flotantes de fondo */}
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="particle text-2xl opacity-20"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${8 + Math.random() * 10}s`,
                }}
              >
                ['💕', '✨', '💖', '🌸', '💫', '🦋', '🌙', '⭐'][i % 8]
              </div>
            ))}
          </div>

          <div className="relative z-10 text-center max-w-4xl mx-auto">
            {/* Sticker decorativo superior */}
            <Sticker
              className="mb-8"
              tape={false}
              shadow="none"
              draggable={false}
              rotation={0}
            >
              <span className="text-6xl animate-float">💕</span>
            </Sticker>

            {/* Título principal con typewriter */}
            <HeroTitle />

            {/* Subtítulo */}
            <HandwrittenNote
              paperType={1}
              className="mx-auto max-w-xl mt-8"
              animated={true}
              speed={40}
            >
              {meta.motto}
            </HandwrittenNote>

            {/* Nombres */}
            <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
              <Sticker
                className="min-w-[140px]"
                tape={true}
                shadow="paper"
                draggable={false}
                rotation={-2}
              >
                <div className="text-center">
                  <p className="font-mono text-xs text-inkLight/60 mb-1">developer</p>
                  <p className="font-handwritingBold text-ink text-lg">{meta.names[0]}</p>
                </div>
              </Sticker>

              <span className="text-heart text-3xl animate-heartbeat">+</span>

              <Sticker
                className="min-w-[140px]"
                tape={true}
                shadow="paper"
                draggable={false}
                rotation={2}
              >
                <div className="text-center">
                  <p className="font-mono text-xs text-inkLight/60 mb-1">musa</p>
                  <p className="font-handwritingBold text-ink text-lg">{meta.names[1]}</p>
                </div>
              </Sticker>
            </div>

            {/* Fecha de inicio */}
            <HandwrittenNote
              paperType={2}
              className="mx-auto max-w-xs mt-8"
              animated={true}
              speed={30}
              delay={1000}
            >
              Juntos desde: {meta.startDate}
            </HandwrittenNote>

            {/* CTA principal */}
            <button className="btn-primary stagger-1 mt-12" onClick={() => scrollToSection(1)}>
              Ver nuestra historia →
            </button>

            {/* Scroll indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce stagger-2">
              <svg className="w-8 h-8 text-heart/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </section>

        {/* TIMELINE - NUESTRA HISTORIA */}
        <section
          ref={(el) => { sectionRefs.current.timeline = el; }}
          id="timeline"
          className="relative py-20 px-4 bg-gradient-to-b from-paper to-paperDark/50"
        >
          <div className="max-w-4xl mx-auto">
            <SectionHeader title="Nuestra Historia" sticker="📖" />

            <Timeline
              entries={ourStory.map((entry, i) => ({
                ...entry,
                index: i,
              }))}
            />
          </div>
        </section>

        {/* CARTAS */}
        <section
          ref={(el) => { sectionRefs.current.letters = el; }}
          id="letters"
          className="relative py-20 px-4"
        >
          <div className="max-w-4xl mx-auto">
            <SectionHeader title="Cartas para Ti" sticker="💌" subtitle="Click en cada sobre para leer" />

            <div className="flex flex-wrap gap-8 justify-center mt-12">
              {letters.map((letter, index) => (
                <EnvelopeLetter
                  key={letter.id}
                  {...letter}
                  className="transition-all duration-500 hover:z-10"
                />
              ))}
            </div>
          </div>
        </section>

        {/* COSAS QUE AMO */}
        <section
          ref={(el) => { sectionRefs.current['things-i-love'] = el; }}
          id="things-i-love"
          className="relative py-20 px-4 bg-paperDark/30"
        >
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              title="Cosas que Amo de Ti"
              sticker="💖"
              subtitle={`Total: ${thingsILove.length} razones (y contando...)`}
            />

            <FlipCardGrid
              cards={thingsILove.map((thing, index) => ({
                id: index + 1,
                front: thing,
                back: `Razón #${index + 1}`,
              }))}
              columns={2}
              className="mt-12"
            />
          </div>
        </section>

        {/* BUCKET LIST - FUTURO JUNTOS */}
        <section
          ref={(el) => { sectionRefs.current['bucket-list'] = el; }}
          id="bucket-list"
          className="relative py-20 px-4"
        >
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              title="Nuestro Futuro Juntos"
              sticker="🌍"
              subtitle="Click en las tarjetas para marcar como cumplidas"
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
              {bucketList.map((item, index) => (
                <BucketListCard key={item.id} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* MEMORY BOARD - DRAG & DROP */}
        <section
          ref={el => { sectionRefs.current['memory-board'] = el; setMemoryBoardElement(el); }}
          id="memory-board"
          className="relative py-20 px-4 bg-gradient-to-b from-paper to-paperDark/50"
        >
          <div className="max-w-5xl mx-auto">
            <SectionHeader
              title="Tablero de Recuerdos"
              sticker="📌"
              subtitle="Arrastra fotos, notas y stickers. ¡Organiza tu scrapbook!"
            />

            <MemoryBoard
              memories={[
                { id: 'mem-1', type: 'photo', src: '/images/memory1.jpg', caption: 'Ese día perfecto', sticker: '📸', position: { x: -200, y: -100, rotation: -3 } },
                { id: 'mem-2', type: 'note', note: 'Te amo más que ayer pero menos que mañana ❤️', sticker: '💌', position: { x: 150, y: -50, rotation: 2 } },
                { id: 'mem-3', type: 'sticker', sticker: '🦋', position: { x: -100, y: 100, rotation: -1 } },
                { id: 'mem-4', type: 'ticket', caption: 'Cine: Nuestra película', note: 'Primera cita oficial 🎬', sticker: '🎟️', position: { x: 200, y: 80, rotation: 1 } },
                { id: 'mem-5', type: 'photo', src: '/images/memory2.jpg', caption: 'Atardecer juntos', sticker: '🌅', position: { x: -180, y: 180, rotation: -2 } },
                { id: 'mem-6', type: 'note', note: 'Gracias por ser mi persona favorita 💕', sticker: '📝', position: { x: 120, y: 150, rotation: 3 } },
              ]}
              bounds={memoryBoardElement}
              className="min-h-[500px]"
            />
          </div>
        </section>

        {/* TERMINAL - RINCÓN DEV */}
        <section
          ref={(el) => { sectionRefs.current.terminal = el; }}
          id="terminal"
          className="relative py-20 px-4 bg-gray-950"
        >
          <div className="max-w-4xl mx-auto">
            <SectionHeader
              title="Rincón de Developer 💻"
              sticker="⌨️"
              subtitle="Comandos románticos para tu terminal del corazón"
              titleColor="text-green-400"
              stickerColor="text-green-400"
            />

            <div className="mt-12">
              <TerminalLove
                startDate={meta.startDate}
                initialCommands={['git commit -m "te amo"', 'npm install love --save']}
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {devEasterEggs.slice(0, 4).map((egg, index) => (
                <DevCommandCard key={egg.command} command={egg.command} response={egg.response} />
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <section
          ref={(el) => { sectionRefs.current.footer = el; }}
          id="footer"
          className="relative py-20 px-4 bg-paperDark"
        >
          <div className="max-w-4xl mx-auto text-center">
            <Sticker
              tape={false}
              shadow="none"
              draggable={false}
              rotation={0}
              className="mb-8"
            >
              <span className="text-6xl animate-heartbeat">💕</span>
            </Sticker>

            <h2 className="font-display text-3xl md:text-4xl font-light text-ink mb-6">
              Esta página es solo una excusa para decirte...
            </h2>

            <HandwrittenNote
              paperType={0}
              className="mx-auto max-w-xl mb-12"
              animated={true}
              speed={50}
            >
              Te amo con todo mi código.
              Eres mi main branch,
              mi production deploy,
              mi commit más importante.
              💕
            </HandwrittenNote>

            <div className="flex items-center justify-center gap-8 flex-wrap mb-12">
              <Sticker
                className="min-w-[120px]"
                tape={true}
                shadow="paper"
                draggable={false}
                rotation={-1}
              >
                <div className="text-center">
                  <p className="font-mono text-xs text-inkLight/60">Hecho con</p>
                  <p className="text-3xl">💕</p>
                  <p className="font-mono text-xs text-inkLight/60">y React + GSAP</p>
                </div>
              </Sticker>

              <Sticker
                className="min-w-[120px]"
                tape={true}
                shadow="paper"
                draggable={false}
                rotation={1}
              >
                <div className="text-center">
                  <p className="font-mono text-xs text-inkLight/60">Para</p>
                  <p className="font-handwritingBold text-ink text-lg">{meta.names[1]}</p>
                  <p className="font-mono text-xs text-inkLight/60">mi persona favorita</p>
                </div>
              </Sticker>
            </div>

            <TerminalButton
              onClick={() => setShowTerminal(true)}
              className="mb-8"
            >
              Abrir Terminal Secreta 💻
            </TerminalButton>

            <p className="font-mono text-xs text-inkLight/50">
              v1.0.0 • Deployed with love • {new Date().getFullYear()}
            </p>

            {/* Modal Terminal */}
            {showTerminal && (
              <TerminalModal onClose={() => setShowTerminal(false)} startDate={meta.startDate} />
            )}
          </div>
        </section>
      </main>

      {/* Scroll spy para actualizar nav */}
      <ScrollSpy sections={SECTION_IDS} onChange={setCurrentSection} />
    </KonamiEasterEgg>
  );
}

// Componentes auxiliares

function HeroTitle() {
  const lines = [
    'Nuestra Historia,',
    'Nuestro Código',
  ];

  const { lines: typedLines } = useTypewriterLines(lines, {
    speed: 50,
    lineDelay: 600,
  });

  return (
    <h1 className="font-display font-light text-4xl md:text-6xl lg:text-7xl leading-tight text-ink mb-6">
      {typedLines.map((line, i) => (
        <div key={i} className="relative">
          <span className={line.isCurrent ? 'text-heart' : ''}>
            {line.text}
          </span>
          {line.showCursor && <span className="animate-pulse text-heart">{line.cursorChar}</span>}
        </div>
      ))}
    </h1>
  );
}

function useTypewriterLines(lines, options) {
  // Simplified version for hero
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [allComplete, setAllComplete] = useState(false);

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      setAllComplete(true);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentLineIndex(prev => prev + 1);
    }, options.lineDelay || 800);
    return () => clearTimeout(timer);
  }, [currentLineIndex, lines.length, options.lineDelay]);

  const displayLines = lines.map((line, i) => ({
    text: i < currentLineIndex ? line : (i === currentLineIndex ? line.slice(0, Math.floor(Date.now() / 50) % (line.length + 1)) : ''),
    isCurrent: i === currentLineIndex,
    showCursor: i === currentLineIndex && !allComplete,
    cursorChar: '|',
  }));

  return { lines: displayLines };
}

function SectionHeader({ title, sticker, subtitle, titleColor = 'text-ink', stickerColor = 'text-heart' }) {
  return (
    <div className="text-center mb-12">
      <Sticker
        tape={false}
        shadow="none"
        draggable={false}
        rotation={0}
        className="inline-block mb-4"
      >
        <span className={`text-5xl ${stickerColor}`}>{sticker}</span>
      </Sticker>
      <h2 className={`font-display font-light text-3xl md:text-4xl ${titleColor} mb-2`}>
        {title}
      </h2>
      {subtitle && (
        <p className="font-mono text-sm text-inkLight/60">{subtitle}</p>
      )}
    </div>
  );
}

function FlipCardGrid({ cards, columns = 2, className = '' }) {
  return (
    <div className={`grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} ${className}`}>
      {cards.map((card) => (
        <FlipCard
          key={card.id}
          id={card.id}
          front={card.front}
          back={card.back}
          flipDirection="y"
        />
      ))}
    </div>
  );
}

function BucketListCard({ item, index }) {
  const [done, setDone] = useState(item.done);

  const toggleDone = () => {
    setDone(!done);
    gsap.fromTo(
      `.bucket-card-${item.id}`,
      { scale: 1 },
      { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out' }
    );
  };

  return (
    <div className={`bucket-card-${item.id} relative group`}>
      <FlipCard
        id={index + 1}
        front={
          <div className="text-center p-6 h-full flex flex-col items-center justify-center">
            <span className="text-5xl mb-3 animate-float">{item.emoji}</span>
            <h3 className="font-handwritingBold text-ink text-lg mb-2">{item.title}</h3>
            <p className="font-handwriting text-inkLight/70 text-sm text-center">{item.description}</p>
            <div className="mt-4 font-mono text-xs text-heart/60">Click para voltear ↻</div>
          </div>
        }
        back={
          <div className="text-center p-6 h-full flex flex-col items-center justify-center">
            <span className="text-6xl mb-3 animate-heartbeat">✨</span>
            <h3 className="font-handwritingBold text-heart text-lg mb-2">{done ? '¡CUMPLIDO!' : 'PENDIENTE'}</h3>
            <p className="font-handwriting text-ink/70 text-sm mb-4">
              {done ? '¡Lo logramos juntos! 💕' : 'Un sueño por cumplir...'}
            </p>
            <button
              onClick={toggleDone}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                done
                  ? 'bg-heart/10 text-heart border border-heart/30 hover:bg-heart/20'
                  : 'bg-heart text-white hover:bg-heart/90'
              }`}
            >
              {done ? 'Desmarcar' : 'Marcar como hecho ✓'}
            </button>
          </div>
        }
        flipDirection="y"
      />
    </div>
  );
}

function DevCommandCard({ command, response }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sticker
      className="group cursor-pointer min-h-[140px] min-w-[160px] p-4"
      tape={false}
      shadow="paper"
      draggable={false}
      onClick={copyToClipboard}
    >
      <div className="text-left">
        <div className="font-mono text-xs text-green-400 mb-2">
          $ {command}
        </div>
        <div className="font-mono text-xs text-inkLight/60 line-clamp-3">
          {response.split('\n').slice(0, 3).join('\n')}
        </div>
        <div className="mt-3 text-center text-heart/60 font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? '¡Copiado! ✓' : 'Click para copiar'}
        </div>
      </div>
    </Sticker>
  );
}

function TerminalModal({ onClose, startDate }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl max-h-[90vh]">
        <TerminalLove startDate={startDate} />
      </div>
      <button
        onClick={onClose}
        className="fixed top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        aria-label="Cerrar terminal"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ScrollSpy({ sections, onChange }) {
  useEffect(() => {
    const observers = sections.map((id, index) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            onChange(index);
          }
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 }
      );

      observer.observe(el);
      return observer;
    });

    return () => observers.forEach(obs => obs?.disconnect());
  }, [sections, onChange]);

  return null;
}

export default ScrapbookPage;