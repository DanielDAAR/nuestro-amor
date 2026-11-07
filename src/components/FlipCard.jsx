import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function FlipCard({
  id,
  front,
  back,
  className = '',
  flipDirection = 'y', // 'x' | 'y'
  autoFlip = false,
  flipInterval = 5000,
  onFlip,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const cardRef = useRef(null);
  const innerRef = useRef(null);
  const intervalRef = useRef(null);

  const { ref: revealRef } = useScrollReveal({
    trigger: cardRef.current,
    start: 'top 85%',
    onEnter: () => {
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.2)' }
      );
    },
  });

  const flip = () => {
    if (isFlipping) return;
    setIsFlipping(true);

    const rotation = flipDirection === 'y' ? 'rotateY' : 'rotateX';
    const nextRotation = isFlipped ? 0 : 180;

    gsap.to(innerRef.current, {
      [rotation]: nextRotation,
      duration: 0.7,
      ease: 'power2.inOut',
      onComplete: () => {
        setIsFlipped(!isFlipped);
        setIsFlipping(false);
        onFlip?.(!isFlipped);
      },
    });
  };

  // Auto-flip
  useEffect(() => {
    if (!autoFlip) return;
    intervalRef.current = setInterval(() => {
      if (!isFlipping) flip();
    }, flipInterval);
    return () => clearInterval(intervalRef.current);
  }, [autoFlip, flipInterval, isFlipping, flip]);

  // Pausar auto-flip al hover
  const handleMouseEnter = () => {
    if (autoFlip && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (autoFlip) {
      intervalRef.current = setInterval(() => {
        if (!isFlipping) flip();
      }, flipInterval);
    }
  };

  const combinedRef = (el) => {
    cardRef.current = el;
    revealRef(el);
  };

  return (
    <div
      ref={combinedRef}
      className={`
        relative w-full max-w-xs cursor-pointer perspective-1000
        ${className}
      `}
      onClick={flip}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flip();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={isFlipped ? 'Ver frente de la tarjeta' : 'Ver reverso de la tarjeta'}
      aria-pressed={isFlipped}
    >
      <div
        ref={innerRef}
        className={`
          relative w-full h-64 transform-style-3d transition-transform duration-700 ease-in-out
          ${isFlipped ? (flipDirection === 'y' ? 'rotate-y-180' : 'rotate-x-180') : ''}
        `}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped
            ? (flipDirection === 'y' ? 'rotateY(180deg)' : 'rotateX(180deg)')
            : 'none',
        }}
      >
        {/* Frente */}
        <div className={`
          absolute inset-0 backface-hidden rounded-xl shadow-paperLift p-6 flex flex-col items-center justify-center text-center
          ${flipDirection === 'y' ? '' : 'rotate-x-180'}
        `} style={{ backfaceVisibility: 'hidden', transform: flipDirection === 'y' ? 'rotateY(0deg)' : 'rotateX(0deg)' }}>
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            {typeof front === 'string' ? (
              <div className="font-handwritingBold text-ink text-2xl leading-relaxed whitespace-pre-wrap">
                {front}
              </div>
            ) : (
              front
            )}

            {/* Indicador de voltear */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-heart/60 text-xs font-mono animate-bounce">
              <kbd className="px-1.5 py-0.5 bg-paperDark/30 rounded border border-ink/10">Click</kbd>
              <span className={flipDirection === 'y' ? 'rotate-y-180 inline-block' : 'rotate-x-180 inline-block'}>↻</span>
            </div>
          </div>

          {/* Decoración frontal */}
          <div className="absolute -top-3 -right-3 text-3xl opacity-20">💕</div>
          <div className="absolute -bottom-3 -left-3 text-3xl opacity-20">✨</div>
        </div>

        {/* Reverso */}
        <div className={`
          absolute inset-0 backface-hidden rounded-xl shadow-paper p-6 flex flex-col items-center justify-center text-center
          bg-white/95 backdrop-blur-sm
          ${flipDirection === 'y' ? 'rotate-y-180' : 'rotate-x-180'}
        `} style={{ backfaceVisibility: 'hidden', transform: flipDirection === 'y' ? 'rotateY(180deg)' : 'rotateX(180deg)' }}>
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4">
            {typeof back === 'string' ? (
              <div className="font-handwriting text-ink leading-relaxed whitespace-pre-wrap text-center">
                {back}
              </div>
            ) : (
              back
            )}

            {/* Indicador de volver */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-heart/60 text-xs font-mono animate-bounce">
              <kbd className="px-1.5 py-0.5 bg-paperDark/30 rounded border border-ink/10">Click</kbd>
              <span>↺</span>
            </div>
          </div>

          {/* Decoración reverso */}
          <div className="absolute -top-3 -left-3 text-3xl opacity-20">💖</div>
          <div className="absolute -bottom-3 -right-3 text-3xl opacity-20">💗</div>
        </div>
      </div>

      {/* Contador si es parte de una serie */}
      {id && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-heart/10 border border-heart/30 flex items-center justify-center text-heart text-xs font-mono">
          {id}
        </div>
      )}
    </div>
  );
}

export function FlipCardGrid({ cards, className = '', columns = 3, ...props }) {
  return (
    <div
      className={`
        relative grid gap-6
        grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}
        ${className}
      `}
      {...props}
    >
      {cards.map((card, index) => (
        <FlipCard
          key={card.id || index}
          id={index + 1}
          {...card}
        />
      ))}
    </div>
  );
}