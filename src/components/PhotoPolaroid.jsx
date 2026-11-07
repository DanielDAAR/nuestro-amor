import { useRef, useState } from 'react';
import { gsap } from 'gsap';
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
  onClick,
  initiallyVisible = false,
  revealDelay = 0,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lifted, setLifted] = useState(false);
  const imgRef = useRef(null);
  const rotationRef = useRef(ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)]);

  const { ref, draggable: draggableInstance } = useDraggable({
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
    onEnter: () => {
      gsap.fromTo(imgRef.current,
        { opacity: 0, y: 50, rotation: rotationRef.current + 10, scale: 0.9 },
        { opacity: 1, y: 0, rotation: rotationRef.current, scale: 1, duration: 0.8, ease: 'back.out(1.5)', delay: revealDelay }
      );
    },
  });

  const handleClick = (e) => {
    if (draggable) return;
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    onClick?.(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setIsExpanded(false);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      ref={el => { ref(el); revealRef(el); imgRef.current = el; }}
      className={`
        relative inline-block cursor-pointer transition-all duration-300
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
      {/* Cinta adhesiva */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 pointer-events-none rounded-t-sm"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0,0 L100,0 L95,20 L5,20 Z\' fill=\'rgba(255,255,255,0.6)\'/%3E%3Cpath d=\'M0,0 L100,0 L95,20 L5,20 Z\' fill=\'none\' stroke=\'rgba(0,0,0,0.05)\' stroke-width=\'0.5\'/%3E%3C/svg\')',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />

      {/* Marco tipo Polaroid */}
      <div
        className="relative bg-white p-3 pb-8"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg\')',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Sticker decorativo */}
        <div className="absolute -top-2 -right-2 text-2xl rotate-6 transition-transform hover:scale-110">
          {sticker}
        </div>

        {/* Imagen */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-sm bg-paperDark/30">
          {src ? (
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-inkLight/50">
              <span className="text-4xl">📸</span>
            </div>
          )}
        </div>

        {/* Caption escrito a mano */}
        {(caption || date) && (
          <div className="mt-3 pt-3 border-t border-ink/10 font-handwriting text-ink text-sm leading-relaxed">
            {caption && <p className="mb-1">{caption}</p>}
            {date && <p className="text-inkLight/60 text-xs font-display">{date}</p>}
          </div>
        )}

        {/* Esquina doblada */}
        <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-white border-b-white" />
        <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-paperDark/50 border-b-paperDark/50" style={{ transform: 'translate(2px, 2px)' }} />
      </div>

      {/* Overlay al expandir */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] animate-fade-in"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function PhotoGrid({ photos, className = '', ...props }) {
  return (
    <div className={`relative flex flex-wrap gap-6 justify-center ${className}`} {...props}>
      {photos.map((photo, index) => (
        <PhotoPolaroid
          key={photo.id || index}
          {...photo}
          revealDelay={index * 0.1}
        />
      ))}
    </div>
  );
}