import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

export function useDraggable(options = {}) {
  const {
    bounds,
    type = 'x,y',
    edgeResistance = 0.65,
    inertia = true,
    onDragStart,
    onDrag,
    onDragEnd,
    onPress,
    onRelease,
    ...rest
  } = options;

  const elementRef = useRef(null);
  const draggableRef = useRef(null);

  const kill = useCallback(() => {
    draggableRef.current?.kill();
    draggableRef.current = null;
  }, []);

  const update = useCallback(() => {
    draggableRef.current?.update();
  }, []);

  const enable = useCallback(() => {
    draggableRef.current?.enable();
  }, []);

  const disable = useCallback(() => {
    draggableRef.current?.disable();
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    draggableRef.current = Draggable.create(el, {
      type,
      bounds,
      edgeResistance,
      inertia,
      onDragStart: function() { onDragStart?.(this); },
      onDrag: function() { onDrag?.(this); },
      onDragEnd: function() { onDragEnd?.(this); },
      onPress: function() { onPress?.(this); },
      onRelease: function() { onRelease?.(this); },
      ...rest,
    })[0];

    return () => {
      draggableRef.current?.kill();
    };
  }, [type, bounds, edgeResistance, inertia, onDragStart, onDrag, onDragEnd, onPress, onRelease]);

  return {
    ref: elementRef,
    draggable: draggableRef.current,
    kill,
    update,
    enable,
    disable,
  };
}

export function useDropZone(options = {}) {
  const {
    onDrop,
    onHover,
    onLeave,
    ...rest
  } = options;

  const zoneRef = useRef(null);
  const draggablesRef = useRef([]);

  const registerDraggable = useCallback((draggable) => {
    draggablesRef.current.push(draggable);
  }, []);

  const unregisterDraggable = useCallback((draggable) => {
    draggablesRef.current = draggablesRef.current.filter(d => d !== draggable);
  }, []);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const handleDrag = (draggable) => {
      const rect = zone.getBoundingClientRect();
      const centerX = draggable.x + draggable.target.offsetWidth / 2;
      const centerY = draggable.y + draggable.target.offsetHeight / 2;

      const isOver = centerX >= rect.left && centerX <= rect.right &&
                     centerY >= rect.top && centerY <= rect.bottom;

      if (isOver) {
        zone.classList.add('drop-zone-active');
        onHover?.(draggable);
      } else {
        zone.classList.remove('drop-zone-active');
        onLeave?.(draggable);
      }
    };

    const checkAll = () => {
      draggablesRef.current.forEach(handleDrag);
    };

    const interval = setInterval(checkAll, 50);

    return () => {
      clearInterval(interval);
      zone.classList.remove('drop-zone-active');
    };
  }, [onHover, onLeave]);

  return { ref: zoneRef, registerDraggable, unregisterDraggable };
}