import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let scrollTriggerRegistered = false;

export function useScrollReveal(options = {}) {
  const {
    trigger,
    start = 'top 85%',
    end = 'bottom 20%',
    scrub = false,
    onEnter,
    onLeave,
    onEnterBack,
    onLeaveBack,
    ...rest
  } = options;

  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const tlRef = useRef(null);

  // Registrar ScrollTrigger una sola vez
  useEffect(() => {
    if (!scrollTriggerRegistered && typeof window !== 'undefined') {
      try {
        gsap.registerPlugin(ScrollTrigger);
        scrollTriggerRegistered = true;
      } catch (e) {
        console.warn('GSAP ScrollTrigger no disponible:', e);
      }
    }
  }, []);

  // Crear la animación una sola vez usando un ref estable
  useEffect(() => {
    const el = elementRef.current;
    if (!el || tlRef.current) return;

    if (!ScrollTrigger) {
      setIsVisible(true);
      return;
    }

    // Callback refs estables - no recrear en cada render
    const handleEnter = () => {
      setIsVisible(true);
      onEnter?.();
    };
    const handleLeave = () => {
      setIsVisible(false);
      onLeave?.();
    };
    const handleEnterBack = () => {
      setIsVisible(true);
      onEnterBack?.();
    };
    const handleLeaveBack = () => {
      setIsVisible(false);
      onLeaveBack?.();
    };

    tlRef.current = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
        end,
        scrub,
        onEnter: handleEnter,
        onLeave: handleLeave,
        onEnterBack: handleEnterBack,
        onLeaveBack: handleLeaveBack,
        ...rest,
      },
    });

    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, []); // Dependencias vacías - crear una sola vez

  return { ref: elementRef, tl: tlRef.current, isVisible };
}

export function useStaggerReveal(options = {}) {
  const {
    container,
    children = '.reveal-item',
    stagger = 0.1,
    start = 'top 80%',
    ...rest
  } = options;

  const containerRef = useRef(null);
  const tlRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current || container;
    if (!el || tlRef.current) return;

    if (!ScrollTrigger) {
      setIsVisible(true);
      return;
    }

    const items = el.querySelectorAll(children);
    if (!items.length) return;

    tlRef.current = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
        onEnter: () => setIsVisible(true),
        ...rest,
      },
    });

    tlRef.current.from(items, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power2.out',
      stagger,
      ...rest,
    });

    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, []);

  return { ref: containerRef, tl: tlRef.current, isVisible };
}

export function useParallax(options = {}) {
  const { speed = 0.5, start = 'top bottom', end = 'bottom top', ...rest } = options;
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !ScrollTrigger) return;

    const st = ScrollTrigger.create({
      trigger: el,
      start,
      end,
      onUpdate: (self) => {
        const progress = self.progress;
        const y = (progress - 0.5) * 200 * speed;
        gsap.set(el, { y, force3D: true });
      },
      ...rest,
    });

    return () => st.kill();
  }, []);

  return { ref: elementRef };
}