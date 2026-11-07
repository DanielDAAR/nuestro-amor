import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { useTypewriter } from '../hooks/useTypewriter';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ENVELOPE_COLORS = {
  heart: { bg: 'bg-heart', border: 'border-heart/50', seal: 'bg-heart/90', wax: 'bg-heart' },
  'accent-1': { bg: 'bg-accent-1', border: 'border-accent-1/50', seal: 'bg-accent-1/90', wax: 'bg-accent-1' },
  'accent-2': { bg: 'bg-accent-2', border: 'border-accent-2/50', seal: 'bg-accent-2/90', wax: 'bg-accent-2' },
  'accent-3': { bg: 'bg-accent-3', border: 'border-accent-3/50', seal: 'bg-accent-3/90', wax: 'bg-accent-3' },
  'accent-4': { bg: 'bg-accent-4', border: 'border-accent-4/50', seal: 'bg-accent-4/90', wax: 'bg-accent-4' },
  'accent-5': { bg: 'bg-accent-5', border: 'border-accent-5/50', seal: 'bg-accent-5/90', wax: 'bg-accent-5' },
};

export function EnvelopeLetter({
  id,
  title,
  content,
  envelopeColor = 'heart',
  sealed = true,
  className = '',
  onOpen,
  onClose,
}) {
  const [isOpen, setIsOpen] = useState(!sealed);
  const [isAnimating, setIsAnimating] = useState(false);
  const envelopeRef = useRef(null);
  const flapRef = useRef(null);
  const letterRef = useRef(null);
  const sealRef = useRef(null);
  const colors = ENVELOPE_COLORS[envelopeColor] || ENVELOPE_COLORS.heart;

  const { text, isComplete, showCursor, cursorChar, start, reset } = useTypewriter(content, {
    speed: 25,
    delay: 500,
    cursor: true,
  });

  useEffect(() => {
    if (isOpen && !isAnimating) {
      start();
    } else if (!isOpen) {
      reset();
    }
  }, [isOpen, isAnimating, start, reset]);

  const handleToggle = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (isOpen) {
      // Cerrar
      gsap.timeline({
        onComplete: () => {
          setIsOpen(false);
          setIsAnimating(false);
          onClose?.();
        }
      })
        .to(letterRef.current, { y: 100, opacity: 0, rotationX: 90, duration: 0.4, ease: 'power2.in' })
        .to(flapRef.current, { rotationX: 0, duration: 0.4, ease: 'power2.out' }, '-=0.2')
        .to(sealRef.current, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' }, '-=0.1');
    } else {
      // Abrir
      gsap.timeline({
        onComplete: () => {
          setIsAnimating(false);
          onOpen?.();
        }
      })
        .to(sealRef.current, { scale: 0, opacity: 0, rotation: 180, duration: 0.3, ease: 'power2.in' })
        .to(flapRef.current, { rotationX: -180, duration: 0.6, ease: 'power2.out' }, '-=0.1')
        .to(letterRef.current, { y: -20, opacity: 1, rotationX: 0, duration: 0.5, ease: 'back.out(1.5)' }, '-=0.3');
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
    if (e.key === 'Escape' && isOpen) {
      handleToggle();
    }
  };

  const { ref: revealRef } = useScrollReveal({
    trigger: envelopeRef.current,
    start: 'top 85%',
    onEnter: () => {
      gsap.fromTo(envelopeRef.current,
        { opacity: 0, y: 40, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.5)' }
      );
    },
  });

  return (
    <div
      ref={el => { envelopeRef.current = el; revealRef(el); }}
      className={`relative inline-block cursor-pointer ${className}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={isOpen ? `Cerrar carta: ${title}` : `Abrir carta: ${title}`}
      aria-expanded={isOpen}
    >
      {/* Sobre - Parte trasera */}
      <div className={`
        relative w-48 h-36 rounded-lg shadow-paperLift
        ${colors.bg} ${colors.border} border-2
        transition-all duration-300
        ${isOpen ? 'shadow-paper' : 'hover:shadow-paperLift hover:scale-[1.02]'}
      `} style={{ transformStyle: 'preserve-3d' }}>
        {/* Solapa del sobre */}
        <div
          ref={flapRef}
          className={`
            absolute top-0 left-0 right-0 h-1/2 rounded-t-lg
            ${colors.bg} ${colors.border} border-2 border-b-0
            transform-origin-top transform-gpu
            ${isOpen ? 'rotate-x-[-180deg]' : 'rotate-x-0'}
          `}
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            zIndex: isOpen ? 10 : 20,
          }}
        >
          {/* Sello de cera */}
          <div
            ref={sealRef}
            className={`
              absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full
              ${colors.wax} border-2 border-white/30
              flex items-center justify-center text-white text-sm
              transition-all duration-300
              ${isOpen ? 'scale-0 opacity-0 rotate-180' : 'scale-100 opacity-100 rotate-0'}
            `}
            style={{
              transformOrigin: 'center center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(0,0,0,0.1)',
            }}
          >
            <span className="text-xs">💕</span>
          </div>

          {/* Título en la solapa */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-center px-2">
            <p className="font-handwritingBold text-white text-sm drop-shadow">{title}</p>
            <p className="font-mono text-white/70 text-xs mt-1">Click para abrir</p>
          </div>
        </div>

        {/* Cuerpo del sobre */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 rounded-b-lg bg-white/5" />

        {/* Carta dentro */}
        <div
          ref={letterRef}
          className={`
            absolute bottom-full left-4 right-4 h-[calc(100%-2rem)] mb-2
            bg-white rounded-lg shadow-paper p-6
            transform-gpu transition-all duration-500
            ${isOpen ? 'translate-y-[-20px] opacity-100 rotate-x-0' : 'translate-y-[100px] opacity-0 rotate-x-[90deg]'}
          `}
          style={{
            transformOrigin: 'bottom center',
            transformStyle: 'preserve-3d',
            zIndex: isOpen ? 15 : 5,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg\')',
          }}
        >
          <div className="font-handwriting text-ink leading-relaxed whitespace-pre-wrap h-full overflow-y-auto">
            {isOpen && isComplete ? (
              <>
                {text}
                {showCursor && <span className="animate-pulse text-heart">{cursorChar}</span>}
              </>
            ) : isOpen ? (
              <div className="animate-pulse text-inkLight/50">Desdoblando la carta...</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Partículas de corazón al abrir */}
      {isOpen && !isAnimating && (
        <HeartBurst />
      )}
    </div>
  );
}

function HeartBurst() {
  const heartsRef = useRef([]);

  useEffect(() => {
    const container = document.createElement('div');
    container.className = 'absolute inset-0 pointer-events-none overflow-visible';
    container.style.transformStyle = 'preserve-3d';

    for (let i = 0; i < 8; i++) {
      const heart = document.createElement('span');
      heart.className = 'absolute text-2xl';
      heart.textContent = ['💕', '💖', '💗', '💓', '💞', '❤️', '🧡', '💛'][i];
      heart.style.left = '50%';
      heart.style.top = '50%';
      heart.style.transform = 'translate(-50%, -50%) scale(0)';
      heart.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
      container.appendChild(heart);
      heartsRef.current.push(heart);
    }

    // Añadir al DOM después del sobre
    const envelope = document.querySelector(`[data-envelope-id="${Math.random()}"]`) ||
                     document.querySelector('.relative.inline-block.cursor-pointer:has(.absolute.bottom-full)');

    // Simpler: just append to the envelope container
    setTimeout(() => {
      const envelopes = document.querySelectorAll('.relative.inline-block.cursor-pointer');
      const lastEnvelope = envelopes[envelopes.length - 1];
      if (lastEnvelope) {
        lastEnvelope.style.position = 'relative';
        lastEnvelope.appendChild(container);

        // Animar
        requestAnimationFrame(() => {
          heartsRef.current.forEach((heart, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const distance = 80 + Math.random() * 40;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance - 60;
            heart.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1) rotate(${Math.random() * 360}deg)`;
            heart.style.opacity = '1';
          });
        });

        // Limpiar
        setTimeout(() => {
          heartsRef.current.forEach(heart => {
            heart.style.opacity = '0';
            heart.style.transform += ' scale(0)';
          });
          setTimeout(() => container.remove(), 800);
        }, 1500);
      }
    }, 100);

    return () => {
      heartsRef.current.forEach(h => h.remove());
    };
  }, []);

  return null;
}

export function LetterStack({ letters, className = '', ...props }) {
  return (
    <div className={`relative flex flex-wrap gap-6 justify-center ${className}`} {...props}>
      {letters.map((letter, index) => (
        <EnvelopeLetter
          key={letter.id || index}
          {...letter}
          className="transition-all duration-500 hover:z-10"
        />
      ))}
    </div>
  );
}