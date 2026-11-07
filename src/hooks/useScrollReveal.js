/**
 * useScrollReveal - Versión simplificada y segura
 * Solo registra el elemento, no crea callbacks inline problemáticos
 */
import { useRef, useEffect, useState } from 'react';

export function useScrollReveal(options = {}) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  // IntersectionObserver simple, sin GSAP
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref: elementRef, isVisible };
}

export function useStaggerReveal(options = {}) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref: elementRef, isVisible };
}

export function useParallax(options = {}) {
  const elementRef = useRef(null);
  return { ref: elementRef };
}