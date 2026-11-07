import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registrar plugin solo una vez
if (typeof window !== 'undefined' && !gsap.getById('_scrollTriggerRegistered')) {
  gsap.registerPlugin(ScrollTrigger);
  gsap.set(ScrollTrigger, { id: '_scrollTriggerRegistered' });
}

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
  const [isVisible, setIsVisible] = useState(true); // Default visible por si falla ScrollTrigger
  const tlRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || initializedRef.current) return;
    initializedRef.current = true;

    // Si ScrollTrigger no está disponible, mantener visible
    if (!ScrollTrigger) {
      setIsVisible(true);
      return;
    }

    tlRef.current = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
        end,
        scrub,
        onEnter: () => {
          setIsVisible(true);
          onEnter?.();
        },
        onLeave: () => {
          setIsVisible(false);
          onLeave?.();
        },
        onEnterBack: () => {
          setIsVisible(true);
          onEnterBack?.();
        },
        onLeaveBack: () => {
          setIsVisible(false);
          onLeaveBack?.();
        },
        ...rest,
      },
    });

    return () => {
      tlRef.current?.kill();
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
      initializedRef.current = false;
    };
  }, [start, end, scrub, onEnter, onLeave, onEnterBack, onLeaveBack]);

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
    if (!el) return;

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
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [container, children, stagger, start]);

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
  }, [speed, start, end]);

  return { ref: elementRef };
}