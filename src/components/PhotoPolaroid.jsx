import { useRef, useState, useCallback } from 'react';
import { useDraggable } from '../hooks/useDraggable';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ROTATIONS = [-3, 2, -1.5, 1, -2.5, -2, 1.5, -1];

export function PhotoPolaroid({
  src,
  alt = '',
  caption = '',
  date = '',
  sticker = '📷',
  className = '',
  draggable = false,
  bounds,
  visible = true,
  revealDelay = 0,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lifted, setLifted] = useState(false);
  const imgRef = useRef(null);
  const rotationRef = useRef(ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)]);

  const { ref: draggableRef, draggable: draggableInstance } = useDraggable({
    enabled: draggable,
    bounds,
    type: 'x,y',
    inertia: true,
    edgeResistance: 0.65,
    onPress: () => setLifted(true),
    onRelease: () => setLifted(false),
  });

  const { ref: revealRef } = useScrollReveal({
    trigger: imgRef.current,
    start: 'top 85%',
  });

  const combinedRef = useCallback((el) => {
    draggableRef(el);
    revealRef(el);
    imgRef.current = el;
  }, [draggableRef, revealRef, imgRef]);

  const handleClick = (e) => {
    if (draggable) return;
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setIsExpanded(false);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={combinedRef}
      className={`
        relative inline-block cursor-pointer transition-card
        shadow-paper ${lifted || isHovered ? 'shadow-paperLift scale-105 z-20' : ''}
        ${draggable ? 'active:cursor-grabbing' : ''}
        ${isExpanded ? 'z-50 fixed inset-0 m-auto max-w-2xl max-h-[80vh]' : ''}
        ${className}
      `}
      style={{
        rotation: `${rotationRef.current}deg`,
        transformOrigin: 'center center',
        zIndex: isExpanded ? 9999 : undefined,
      }}
      onMouseEnter={() => !draggable && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setLifted(false); }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Foto: ${caption || alt}. Click para expandir.`}
    >
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 pointer-events-none rounded-t-sm"
        style={{
          backgroundImage: 'var(--background-image-tape-texture)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative bg-white p-3 pb-8" style={{
        backgroundImage: 'var(--background-image-paper-texture)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div className="absolute -top-2 -right-2 text-2xl rotate-6 transition-transform hover:scale-110">
          {sticker}
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-t-sm bg-paperDark/30">
          {src ? (
            <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-inkLight/50 text-4xl">📸</div>
          )}
        </div>

        {(caption || date) && (
          <div className="mt-3 pt-3 border-t border-ink/10 font-handwriting text-ink text-sm leading-relaxed">
            {caption && <p className="mb-1">{caption}</p>}
            {date && <p className="text-inkLight/60 text-xs font-display">{date}</p>}
          </div>
        )}

        <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-white border-b-white" />
        <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-paperDark/50 border-b-paperDark/50" style={{ transform: 'translate(2px, 2px)' }} />
      </div>

      {isExpanded && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]" onClick={() => setIsExpanded(false)} aria-hidden="true" />
      )}
    </div>
  );
}

export function PhotoGrid({ photos, className = '', ...props }) {
  return (
    <div className={`relative flex flex-wrap gap-6 justify-center ${className}`} {...props}>
      {photos.map((photo, index) => (
        <PhotoPolaroid key={photo.id || index} {...photo} revealDelay={index * 0.1} className={`stagger-${(index % 5) + 1}`} />
      ))}
    </div>
  );
}