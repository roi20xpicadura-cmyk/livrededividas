import { useState, useEffect, useRef } from 'react';

export function useCountUp(end: number, duration = 1000, delay = 0) {
  const [count, setCount] = useState(0);
  const prevEnd = useRef(end);

  useEffect(() => {
    let startTime: number;
    let animFrame: number;
    const startVal = prevEnd.current !== end ? count : 0;
    prevEnd.current = end;

    const timer = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(startVal + eased * (end - startVal)));
        if (progress < 1) animFrame = requestAnimationFrame(animate);
        else setCount(end);
      };
      animFrame = requestAnimationFrame(animate);
    }, delay);

    return () => { clearTimeout(timer); cancelAnimationFrame(animFrame); };
    // `count` is intentionally excluded: it's only read as the starting value
    // for the next animation; including it would restart animation on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, duration, delay]);

  return count;
}
