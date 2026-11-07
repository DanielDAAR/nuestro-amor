import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { useScrollReveal } from '../hooks/useScrollReveal';

gsap.registerPlugin(Draggable);

const ROTATIONS = [-4, 3, -2, 2, -3, 1, -1.5, 2.5];

export function DraggableMemory({
  id,
  type = 'photo', // 'photo' | 'note' | 'sticker' | 'ticket'
  src,
  caption = '',
  note = '',
  sticker = '📎',
  position = { x: 0, y: 0, rotation: 0 },
  bounds,
  onDrop,
  onPositionChange,
  className = '',
  initiallyVisible = false,
  revealDelay = 0,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentPos, setCurrentPos] = useState(position);
  const elementRef = useRef(null);
  const draggableRef = useRef(null);
  const rotationRef = useRef(position.rotation ?? ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)]);

  const { ref: revealRef } = useScrollReveal({
    trigger: elementRef.current,
    start: 'top 85%',
    onEnter: () => {
      gsap.fromTo(elementRef.current,
        { opacity: 0, scale: 0.8, y: 50, rotation: rotationRef.current + 15 },
        { opacity: 1, scale: 1, y: 0, rotation: rotationRef.current, duration: 0.8, ease: 'back.out(1.5)', delay: revealDelay }
      );
    },
  });

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    draggableRef.current = Draggable.create(el, {
      type: 'x,y',
      bounds,
      edgeResistance: 0.65,
      inertia: true,
      onDragStart: function() {
        setIsDragging(true);
        gsap.to(this.target, { scale: 1.05, zIndex: 1000, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', duration: 0.2 });
      },
      onDrag: function() {
        setCurrentPos({ x: this.x, y: this.y, rotation: this.rotation });
        onPositionChange?.(id, { x: this.x, y: this.y, rotation: this.rotation });
      },
      onDragEnd: function() {
        setIsDragging(false);
        gsap.to(this.target, { scale: 1, zIndex: 10, boxShadow: '0 4px 20px -4px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.04)', duration: 0.3 });
        onDrop?.(id, { x: this.x, y: this.y, rotation: this.rotation });
      },
      onPress: function() {
        gsap.to(this.target, { scale: 1.02, duration: 0.1 });
      },
    })[0];

    // Aplicar posición inicial
    gsap.set(el, { x: position.x, y: position.y, rotation: rotationRef.current });

    return () => {
      draggableRef.current?.kill();
    };
  }, [bounds, onDrop, onPositionChange, id, position.x, position.y]);

  const combinedRef = (el) => {
    elementRef.current = el;
    revealRef(el);
  };

  const renderContent = () => {
    switch (type) {
      case 'photo':
        return (
          <div className="relative bg-white p-3 pb-8 shadow-paper">
            <div className="absolute -top-2 -right-2 text-2xl rotate-6">{sticker}</div>
            <div className="aspect-[4/3] overflow-hidden rounded-t-sm bg-paperDark/30 relative">
              {src ? (
                <img src={src} alt={caption} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-inkLight/50 text-4xl">📸</div>
              )}
            </div>
            {caption && (
              <div className="mt-3 pt-3 border-t border-ink/10 font-handwriting text-ink text-sm text-center">
                {caption}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-white border-b-white" />
            <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-paperDark/50 border-b-paperDark/50" style={{ transform: 'translate(2px, 2px)' }} />
          </div>
        );

      case 'note':
        return (
          <div className="relative bg-white p-5 shadow-paper min-w-[180px] max-w-[280px]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg\")' }}>
            <div className="font-handwriting text-ink leading-relaxed whitespace-pre-wrap">{note || caption}</div>
            <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-white border-b-white" />
            <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-paperDark/50 border-b-paperDark/50" style={{ transform: 'translate(2px, 2px)' }} />
          </div>
        );

      case 'sticker':
        return (
          <div className="relative bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-paper border border-heart/20 flex items-center justify-center">
            <span className="text-4xl filter drop-shadow-md">{sticker}</span>
          </div>
        );

      case 'ticket':
        return (
          <div className="relative bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg shadow-paper border-2 border-amber-200 min-w-[160px] max-w-[240px]">
            <div className="font-mono text-xs text-amber-700 mb-2 tracking-wider">TICKET</div>
            <div className="font-handwritingBold text-amber-900 mb-1">{caption}</div>
            <div className="font-handwriting text-amber-800/80 text-sm">{note}</div>
            <div className="absolute top-2 right-2 text-amber-600 text-xl">{sticker}</div>
            <div className="absolute bottom-2 left-2 font-mono text-xs text-amber-600/60">✂️</div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={combinedRef}
      className={`
        relative cursor-grab active:cursor-grabbing transition-all duration-200
        ${isDragging ? 'scale-105 z-50' : ''}
        ${isHovered && !isDragging ? 'scale-[1.02] z-20' : ''}
        ${className}
      `}
      style={{
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cinta adhesiva solo si no es sticker */}
      {type !== 'sticker' && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 pointer-events-none rounded-t-sm"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0,0 L100,0 L95,20 L5,20 Z\' fill=\'rgba(255,255,255,0.6)\'/%3E%3Cpath d=\'M0,0 L100,0 L95,20 L5,20 Z\' fill=\'none\' stroke=\'rgba(0,0,0,0.05)\' stroke-width=\'0.5\'/%3E%3C/svg\')',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      )}

      {renderContent()}

      {/* Indicador de arrastre */}
      {!isDragging && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 text-inkLight/40 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity">
          <kbd className="px-1.5 py-0.5 bg-paperDark/30 rounded border border-ink/10">Arrastra</kbd>
          <span className="animate-bounce">✦</span>
        </div>
      )}
    </div>
  );
}

export function MemoryBoard({
  memories,
  className = '',
  bounds,
  onMemoryDrop,
  onMemoryMove,
  ...props
}) {
  return (
    <div
      ref={(el) => {
        if (el && bounds) {
          // El bounds se maneja en cada DraggableMemory
        }
      }}
      className={`
        relative min-h-[600px] bg-paper/30 rounded-2xl p-8
        ${className}
      `}
      {...props}
    >
      {/* Área de drop visual */}
      <div className="absolute inset-0 border-2 border-dashed border-heart/20 rounded-xl pointer-events-none" />
      <div className="absolute top-4 left-4 font-mono text-xs text-heart/30">SUELTA AQUÍ TUS RECUERDOS</div>

      {memories.map((memory, index) => (
        <DraggableMemory
          key={memory.id || index}
          {...memory}
          bounds={bounds || '.relative.min-h-\\[600px\\]'}
          onDrop={onMemoryDrop}
          onPositionChange={onMemoryMove}
          revealDelay={index * 0.08}
        />
      ))}
    </div>
  );
}