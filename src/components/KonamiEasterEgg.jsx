import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA'
];

const SECRET_CODES = {
  'love': { sequence: ['KeyL', 'KeyO', 'KeyV', 'KeyE'], message: '💕 Love mode activated!', effect: 'hearts' },
  'kiss': { sequence: ['KeyK', 'KeyI', 'KeyS', 'KeyS'], message: '💋 Kiss mode!', effect: 'kisses' },
  'hug': { sequence: ['KeyH', 'KeyU', 'KeyG'], message: '🤗 Hug mode!', effect: 'hugs' },
  'forever': { sequence: ['KeyF', 'KeyO', 'KeyR', 'KeyE', 'KeyV', 'KeyE', 'KeyR'], message: '♾️ Forever mode!', effect: 'infinity' },
  'dev': { sequence: ['KeyD', 'KeyE', 'KeyV'], message: '💻 Dev mode!', effect: 'code' },
};

export function KonamiEasterEgg({
  onKonami,
  onSecretCode,
  enabled = true,
  children,
}) {
  const [konamiProgress, setKonamiProgress] = useState(0);
  const [secretProgress, setSecretProgress] = useState({});
  const [showMessage, setShowMessage] = useState(null);
  const inputBufferRef = useRef([]);
  const messageTimeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignorar si está escribiendo en un input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.target.isContentEditable) return;

      const key = e.code;
      inputBufferRef.current.push(key);

      // Mantener solo los últimos 20 keys
      if (inputBufferRef.current.length > 20) {
        inputBufferRef.current.shift();
      }

      // Check Konami
      checkKonami(inputBufferRef.current);

      // Check secret codes
      checkSecretCodes(inputBufferRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onKonami, onSecretCode]);

  const checkKonami = (buffer) => {
    const recent = buffer.slice(-KONAMI_CODE.length);
    const match = recent.every((key, i) => key === KONAMI_CODE[i]);

    if (match) {
      triggerKonami();
      inputBufferRef.current = []; // Reset buffer
    }
  };

  const checkSecretCodes = (buffer) => {
    Object.entries(SECRET_CODES).forEach(([codeName, { sequence, message, effect }]) => {
      const recent = buffer.slice(-sequence.length);
      const match = recent.every((key, i) => key === sequence[i]);

      if (match && !secretProgress[codeName]) {
        setSecretProgress(prev => ({ ...prev, [codeName]: true }));
        triggerSecretCode(codeName, message, effect);
        onSecretCode?.(codeName, message, effect);
      }
    });
  };

  const triggerKonami = () => {
    setShowMessage({
      text: '🎮 ¡KONAMI CODE ACTIVADO! 🎮',
      subtext: 'Modo desarrollador romántico desbloqueado',
      type: 'konami',
    });
    onKonami?.();
    launchConfetti('heart');
  };

  const triggerSecretCode = (codeName, message, effect) => {
    setShowMessage({
      text: message,
      subtext: `Código secreto: ${codeName}`,
      type: 'secret',
      effect,
    });
    launchConfetti(effect);
  };

  const launchConfetti = (type) => {
    const emojis = {
      heart: ['💕', '💖', '💗', '💓', '💞', '❤️', '🧡', '💛', '💚', '💙', '💜'],
      kisses: ['💋', '😘', '😚', '😗', '💏'],
      hugs: ['🤗', '🫂', '🤗', '💕', '🤗'],
      infinity: ['♾️', '💕', '∞', '💖', '♾️'],
      code: ['💻', '💕', '⌨️', '🖥️', '💾', '💕'],
    };

    const particles = emojis[type] || emojis.heart;

    for (let i = 0; i < 30; i++) {
      createParticle(particles[Math.floor(Math.random() * particles.length)]);
    }
  };

  const createParticle = (emoji) => {
    const particle = document.createElement('div');
    particle.textContent = emoji;
    particle.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: 110vh;
      font-size: ${1.5 + Math.random() * 1.5}rem;
      pointer-events: none;
      z-index: 9999;
      transform: rotate(${Math.random() * 360}deg);
      transition: all ${2 + Math.random() * 2}s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      opacity: 1;
    `;
    document.body.appendChild(particle);

    requestAnimationFrame(() => {
      particle.style.transform = `
        translate(${(Math.random() - 0.5) * 200}px, -${120 + Math.random() * 40}vh)
        rotate(${Math.random() * 720}deg)
        scale(${0.5 + Math.random() * 0.5})
      `;
      particle.style.opacity = '0';
    });

    setTimeout(() => particle.remove(), 4000);
  };

  const hideMessage = () => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setShowMessage(null);
  };

  useEffect(() => {
    if (showMessage) {
      messageTimeoutRef.current = setTimeout(hideMessage, 4000);
      return () => clearTimeout(messageTimeoutRef.current);
    }
  }, [showMessage]);

  return (
    <>
      {children}
      {showMessage && (
        <div
          className={`
            fixed top-20 left-1/2 -translate-x-1/2 z-[10000]
            animate-fade-in-scale
            px-8 py-6 rounded-2xl shadow-paperLift
            bg-white/95 backdrop-blur-sm border-2
            ${showMessage.type === 'konami'
              ? 'border-heart bg-gradient-to-r from-heart/10 to-accent-1/10'
              : 'border-accent-2 bg-gradient-to-r from-accent-2/10 to-accent-4/10'
            }
            text-center
          `}
          onClick={hideMessage}
          role="alert"
          aria-live="polite"
        >
          <div className="text-2xl mb-1">{showMessage.text}</div>
          <div className="font-mono text-xs text-inkLight/60">{showMessage.subtext}</div>
          <div className="mt-2 font-mono text-xs text-heart/60">Click para cerrar</div>
        </div>
      )}
    </>
  );
}

// Hook para usar en cualquier componente
export function useKonami(callback) {
  useEffect(() => {
    let buffer = [];
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      buffer.push(e.code);
      if (buffer.length > KONAMI_CODE.length) buffer.shift();
      if (buffer.join(',') === KONAMI_CODE.join(',')) {
        callback();
        buffer = [];
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [callback]);
}