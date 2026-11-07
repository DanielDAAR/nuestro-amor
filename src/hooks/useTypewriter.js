import { useState, useEffect, useCallback, useRef } from 'react';

export function useTypewriter(text, options = {}) {
  const {
    speed = 30,
    delay = 0,
    onComplete,
    loop = false,
    cursor = true,
    cursorChar = '|',
    cursorBlinkSpeed = 530,
  } = options;

  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(cursor);
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);
  const cursorIntervalRef = useRef(null);

  const start = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);

    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);

    // Cursor blink
    if (cursor) {
      cursorIntervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, cursorBlinkSpeed);
    }

    const type = () => {
      if (indexRef.current < text.length) {
        setDisplayText(prev => prev + text[indexRef.current]);
        indexRef.current++;
        timeoutRef.current = setTimeout(type, speed + Math.random() * 40);
      } else {
        setIsComplete(true);
        onComplete?.();
        if (loop) {
          timeoutRef.current = setTimeout(() => {
            start();
          }, 2000);
        } else if (cursor) {
          setShowCursor(true);
        }
      }
    };

    timeoutRef.current = setTimeout(type, delay);
  }, [text, speed, delay, onComplete, loop, cursor, cursorBlinkSpeed]);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
    setShowCursor(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);
  }, [stop]);

  useEffect(() => {
    start();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
    };
  }, [start]);

  // Reiniciar cuando cambia el texto
  useEffect(() => {
    if (text !== displayText && !isComplete) {
      reset();
      start();
    }
  }, [text]);

  return {
    text: displayText,
    isComplete,
    showCursor: cursor ? showCursor : false,
    cursorChar,
    start,
    stop,
    reset,
  };
}

export function useTypewriterLines(lines, options = {}) {
  const {
    lineDelay = 800,
    ...rest
  } = options;

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [allComplete, setAllComplete] = useState(false);

  const {
    text,
    isComplete,
    showCursor,
    cursorChar,
    start,
    stop,
    reset,
  } = useTypewriter(lines[currentLineIndex] || '', {
    ...rest,
    onComplete: () => {
      if (currentLineIndex < lines.length - 1) {
        setTimeout(() => {
          setCurrentLineIndex(prev => prev + 1);
        }, lineDelay);
      } else {
        setAllComplete(true);
        options.onComplete?.();
      }
    },
  });

  const restart = useCallback(() => {
    setCurrentLineIndex(0);
    setAllComplete(false);
    reset();
    start();
  }, [reset, start]);

  return {
    lines: lines.slice(0, currentLineIndex + 1).map((line, i) => ({
      text: i === currentLineIndex ? text : line,
      isCurrent: i === currentLineIndex,
      showCursor: i === currentLineIndex ? showCursor : false,
      cursorChar,
    })),
    currentLine: text,
    isComplete: allComplete,
    showCursor,
    cursorChar,
    start: restart,
    stop,
    reset: restart,
  };
}