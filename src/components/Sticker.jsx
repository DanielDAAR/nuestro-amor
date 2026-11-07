import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useDraggable } from '../hooks/useDraggable';

const ROTATIONS = [-3, 2, -1.5, 1, -2.5];
const TAPE_STYLES = [
  'bg-heart/20',
  'bg-accent-1/20',
  'bg-accent-2/20',
  'bg-accent-3/20',
  'bg-accent-4/20',
];

export function Sticker({
  children,
  className = '',
  draggable = false,
  bounds,
  rotation,
  tape = true,
  shadow = 'paper',
  onClick,
  style,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [lifted, setLifted] = useState(false);
  const rotationRef = useRef(rotation ?? ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)]);
  const tapeStyleRef = useRef(TAPE_STYLES[Math.floor(Math.random() * TAPE_STYLES.length)]);

  const { ref, draggable: draggableInstance } = useDraggable({
    enabled: draggable,
    bounds,
    type: 'x,y',
    inertia: true,
    edgeResistance: 0.65,
    onPress: () => setLifted(true),
    onRelease: () => setLifted(false),
  });

  useEffect(() => {
    if (draggableInstance) {
      gsap.set(ref.current, {
        rotation: rotationRef.current,
        transformOrigin: 'center center',
      });
    }
  }, [draggableInstance]);

  const handleMouseEnter = () => {
    if (!draggable) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setLifted(false);
  };

  return (
    <div
      ref={ref}
      className={`
        relative inline-block cursor-pointer transition-all duration-300
        ${shadow === 'paper' ? 'shadow-paper' : ''}
        ${shadow === 'paperLift' ? 'shadow-paperLift' : ''}
        ${lifted || isHovered ? 'shadow-paperLift scale-105 z-10' : ''}
        ${draggable ? 'active:cursor-grabbing' : ''}
        ${className}
      `}
      style={{
        ...style,
        rotation: `${rotationRef.current}deg`,
        transformOrigin: 'center center',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...props}
    >
      {/* Cinta adhesiva */}
      {tape && (
        <div
          className={`
            absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 pointer-events-none
            ${tapeStyleRef.current}
            rounded-t-sm
          `}
          style={{
            backgroundImage: 'var(--background-image-tape-texture)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Contenido con textura de papel */}
      <div
        className={`
          relative bg-white rounded-sm p-4 min-w-[120px] min-h-[120px]
          flex flex-col items-center justify-center
        `}
        style={{
          backgroundImage: 'var(--background-image-paper-texture)',
        }}
      >
        {children}
      </div>

      {/* Esquina doblada */}
      <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-white border-b-white" />
      <div className="absolute bottom-0 right-0 w-0 h-0 border-4 border-transparent border-r-paperDark/50 border-b-paperDark/50" style={{ transform: 'translate(2px, 2px)' }} />
    </div>
  );
}

export function StickerGroup({ children, className = '', ...props }) {
  return (
    <div className={`relative inline-flex flex-wrap gap-4 ${className}`} {...props}>
      {children}
    </div>
  );
}