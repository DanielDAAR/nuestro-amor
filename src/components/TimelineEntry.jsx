import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { PhotoPolaroid } from './PhotoPolaroid';
import { HandwrittenNote } from './HandwrittenNote';
import { Sticker } from './Sticker';

const CONNECTOR_COLORS = ['heart', 'accent-1', 'accent-2', 'accent-4'];

export function TimelineEntry({
  id,
  date,
  title,
  description,
  photo,
  sticker = '✨',
  position = 'left', // 'left' | 'right' | 'alternate'
  index = 0,
  className = '',
  connectorColor = CONNECTOR_COLORS[index % CONNECTOR_COLORS.length],
}) {
  const [isVisible, setIsVisible] = useState(false);
  const entryRef = useRef(null);
  const connectorRef = useRef(null);
  const contentRef = useRef(null);

  const { ref: revealRef } = useScrollReveal({
    trigger: entryRef.current,
    start: 'top 75%',
    onEnter: () => {
      setIsVisible(true);
      gsap.timeline()
        .fromTo(connectorRef.current,
          { scaleY: 0, transformOrigin: position === 'left' ? 'top' : 'bottom' },
          { scaleY: 1, duration: 0.8, ease: 'power2.out' }
        )
        .fromTo(contentRef.current,
          { opacity: 0, x: position === 'left' ? -50 : 50, y: 20 },
          { opacity: 1, x: 0, y: 0, duration: 0.6, ease: 'power2.out' },
          '-=0.4'
        );
    },
    onEnterBack: () => setIsVisible(true),
    onLeave: () => setIsVisible(false),
    onLeaveBack: () => setIsVisible(false),
  });

  const isLeft = position === 'left' || (position === 'alternate' && index % 2 === 0);

  return (
    <div
      ref={el => { entryRef.current = el; revealRef(el); }}
      className="relative w-full"
    >
      {/* Línea conector vertical */}
      <div
        ref={connectorRef}
        className={`
          absolute top-0 bottom-0 w-1 pointer-events-none
          ${isLeft ? 'left-1/2 -translate-x-1/2' : 'right-1/2 translate-x-1/2'}
          bg-gradient-to-b
          from-${connectorColor}/40
          via-${connectorColor}/60
          to-${connectorColor}/40
        `}
        style={{
          transformOrigin: isLeft ? 'top center' : 'bottom center',
          scaleY: isVisible ? 1 : 0,
        }}
      />

      {/* Punto en la línea */}
      <div
        className={`
          absolute top-0 w-4 h-4 rounded-full border-4 border-white z-10
          bg-${connectorColor}
          ${isLeft ? 'left-1/2 -translate-x-1/2' : 'right-1/2 translate-x-1/2'}
          shadow-lg shadow-${connectorColor}/30
        `}
        style={{
          boxShadow: `0 0 0 4px white, 0 4px 12px rgba(0,0,0,0.15)`,
        }}
      >
        <span className="absolute inset-0 flex items-center justify-center text-white text-xs">
          {sticker}
        </span>
      </div>

      {/* Contenido de la entrada */}
      <div
        ref={contentRef}
        className={`
          relative w-[calc(50%-2rem)] px-6 py-4 transition-all duration-500
          ${isLeft ? 'ml-auto text-right' : 'mr-auto text-left'}
          ${!isVisible ? 'opacity-0' : 'opacity-100'}
          ${isLeft ? (isVisible ? 'translate-x-0' : 'translate-x-10') : (isVisible ? 'translate-x-0' : '-translate-x-10')}
        `}
      >
        {/* Fecha */}
        <div className="font-mono text-xs text-heart/80 mb-2 tracking-wider">
          {date}
        </div>

        {/* Título */}
        <h3 className="font-handwritingBold text-ink text-xl mb-3">
          {title}
        </h3>

        {/* Foto si existe */}
        {photo && (
          <PhotoPolaroid
            src={photo}
            alt={title}
            caption={description}
            date={date}
            sticker={sticker}
            className={isLeft ? 'ml-auto' : 'mr-auto'}
            draggable={false}
          />
        )}

        {/* Descripción */}
        {!photo && description && (
          <HandwrittenNote
            title=""
            paperType={index}
            className={isLeft ? 'ml-auto' : 'mr-auto'}
          >
            {description}
          </HandwrittenNote>
        )}

        {photo && description && (
          <HandwrittenNote
            title=""
            paperType={index + 10}
            className={`mt-4 ${isLeft ? 'ml-auto' : 'mr-auto'}`}
          >
            {description}
          </HandwrittenNote>
        )}

        {/* Sticker decorativo */}
        <Sticker
          className={`mt-4 ${isLeft ? 'ml-auto' : 'mr-auto'}`}
          tape={false}
          shadow="none"
          draggable={false}
        >
          <span className="text-3xl">{sticker}</span>
        </Sticker>
      </div>
    </div>
  );
}

export function Timeline({ entries, className = '', ...props }) {
  return (
    <div className={`relative ${className}`} {...props}>
      {/* Línea central decorativa */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-heart/20 via-heart/40 to-heart/20" />
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-accent-1/10 via-accent-2/10 to-accent-4/10" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)' }} />

      <div className="relative space-y-16 pb-20">
        {entries.map((entry, index) => (
          <TimelineEntry
            key={entry.id || index}
            {...entry}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}