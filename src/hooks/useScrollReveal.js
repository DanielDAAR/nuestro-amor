import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollReveal(options = {}) {
  const {
    trigger,
    start = 'top 80%',
    end = 'bottom 20%',
    scrub = false,
    onEnter,
    onLeave,
    onEnterBack,
    onLeaveBack,
    ...rest
  } = options;

  const elementRef = useRef(null);
  const tlRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Crear timeline para esta animación
    tlRef.current = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
        end,
        scrub,
        onEnter: () => onEnter?.(),
        onLeave: () => onLeave?.(),
        onEnterBack: () => onEnterBack?.(),
        onLeaveBack: () => onLeaveBack?.(),
        ...rest,
      },
    });

    return () => {
      tlRef.current?.kill();
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [start, end, scrub, onEnter, onLeave, onEnterBack, onLeaveBack]);

  return { ref: elementRef, tl: tlRef.current };
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

  useEffect(() => {
    const el = containerRef.current || container;
    if (!el) return;

    const items = el.querySelectorAll(children);
    if (!items.length) return;

    tlRef.current = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
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

  return { ref: containerRef, tl: tlRef.current };
}

export function useParallax(options = {}) {
  const {
    speed = 0.5,
    start = 'top bottom',
    end = 'bottom top',
    ...rest
  } = options;

  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

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