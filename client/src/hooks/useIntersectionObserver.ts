// useIntersectionObserver Hook - For lazy loading and viewport detection
import { useEffect, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  target: RefObject<Element>;
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
}

interface UseIntersectionObserverReturn {
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | undefined;
}

export function useIntersectionObserver({
  target,
  threshold = 0,
  rootMargin = '0px',
  root = null
}: UseIntersectionObserverOptions): UseIntersectionObserverReturn {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | undefined>();

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      {
        threshold,
        rootMargin,
        root
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [target, threshold, rootMargin, root]);

  return { isIntersecting, entry };
}