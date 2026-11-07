import { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { useTypewriter } from '../hooks/useTypewriter';
import { useScrollReveal } from '../hooks/useScrollReveal';

const PAPER_TYPES = [
  { bg: 'bg-white', border: 'border-paperDark/20', shadow: 'shadow-paper' },
  { bg: 'bg-paper', border: 'border-heartSoft/50', shadow: 'shadow-paper' },
  { bg: 'bg-heartSoft/30', border: 'border-heart/20', shadow: 'shadow-paper' },
  { bg: 'bg-accent-3/30', border: 'border-accent-1/20', shadow: 'shadow-paper' },
];

const ROTATIONS = [-2, 1.5, -1, 1, -1.5, 2];

export function HandwrittenNote({
  children,
  title = '',
  className = '',
  paperType = 0,
  rotation,
  animated = true,
  speed = 30,
  delay = 0,
  onComplete,
  draggable = false,
  bounds,
  visible = true,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  const noteRef = useRef(null);
  const rotationRef = useRef(rotation ?? ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)]);
  const paper = PAPER_TYPES[paperType % PAPER_TYPES.length];

  const { ref: revealRef } = useScrollReveal({
    trigger: noteRef.current,
    start: 'top 85%',
    onEnter: () => setIsVisible(true),
  });

  const textContent = typeof children === 'string' ? children : '';
  const { text, isComplete, showCursor, cursorChar, start, reset } = useTypewriter(textContent, {
    speed, delay, onComplete, cursor: animated,
  });

  useEffect(() => {
    if (animated && textContent) start();
  }, [animated, textContent, start]);

  const combinedRef = useCallback((el) => {
    noteRef.current = el;
    revealRef(el);
  }, [noteRef, revealRef]);

  if (!isVisible) return null;

  return (
    <div
      ref={combinedRef}
      className={`
        relative inline-block transition-card
        ${paper.bg} ${paper.border} ${paper.shadow} ${paper.border ? 'border-2' : ''}
        rounded-lg p-6 min-w-[200px] max-w-[400px]
        ${isHovered ? 'shadow-paperLift scale-[1.02] z-10' : ''}
        ${className}
      `}
      style={{ rotation: `${rotationRef.current}deg`, transformOrigin: 'center center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 pointer-events-none rounded-t-sm" style={{
        backgroundImage: 'var(--background-image-tape-texture)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }} />

      <div className="relative" style={{ backgroundImage: 'var(--background-image-paper-texture)' }}>
        {title && <h3 className="font-handwritingBold text-ink text-lg mb-3 pb-2 border-b border-ink/10">{title}</h3>}
        <div className="font-handwriting text-ink leading-relaxed whitespace-pre-wrap">
          {animated && textContent ? (
            <>
              {text}
              {showCursor && <span className="animate-pulse text-heart">{cursorChar}</span>}
            </>
          ) : children}
        </div>
      </div>

      <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-white border-b-white" />
      <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-paperDark/50 border-b-paperDark/50" style={{ transform: 'translate(2px, 2px)' }} />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 border-t-2 border-t-ink/20 rounded-t-full" />
    </div>
  );
}

export function NoteStack({ notes, className = '', ...props }) {
  return (
    <div className={`relative ${className}`} {...props}>
      {notes.map((note, index) => (
        <HandwrittenNote key={note.id || index} {...note} paperType={index} rotation={note.rotation ?? ROTATIONS[index % ROTATIONS.length]} animated={index === 0} />
      ))}
    </div>
  );
}