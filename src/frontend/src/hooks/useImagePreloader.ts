import { useCallback, useEffect, useRef, useState } from "react";

interface UseImagePreloaderOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Custom hook for preloading images using IntersectionObserver.
 * Preloads images slightly before they enter the viewport.
 *
 * Internal state is kept in refs so finishing a preload does not
 * tear down and recreate the observer (which used to happen on every
 * state update and caused unnecessary work + dropped observations).
 * Consumers re-render via a small version counter only when an
 * image actually finishes loading.
 */
export function useImagePreloader(
  _imageUrls: string[],
  options: UseImagePreloaderOptions = {},
) {
  const { rootMargin = "400px", threshold = 0 } = options;

  const preloadedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const preloadImage = useCallback(
    (url: string) => {
      if (preloadedRef.current.has(url) || inFlightRef.current.has(url)) return;
      inFlightRef.current.add(url);
      const img = new Image();
      img.onload = () => {
        inFlightRef.current.delete(url);
        preloadedRef.current.add(url);
        bump();
      };
      img.onerror = () => {
        inFlightRef.current.delete(url);
        bump();
      };
      img.src = url;
    },
    [bump],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const url = entry.target.getAttribute("data-image-url");
            if (url) preloadImage(url);
          }
        }
      },
      { rootMargin, threshold },
    );
    observerRef.current = observer;

    // Re-observe elements that may have been registered before this run.
    for (const el of elementsRef.current.values()) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [rootMargin, threshold, preloadImage]);

  const registerElement = useCallback(
    (url: string, element: HTMLElement | null) => {
      if (!element) return;
      elementsRef.current.set(url, element);
      element.setAttribute("data-image-url", url);
      observerRef.current?.observe(element);
    },
    [],
  );

  const unregisterElement = useCallback((url: string) => {
    const el = elementsRef.current.get(url);
    if (el) {
      observerRef.current?.unobserve(el);
      elementsRef.current.delete(url);
    }
  }, []);

  const isImagePreloaded = useCallback(
    (url: string): boolean => preloadedRef.current.has(url),
    [],
  );

  return {
    registerElement,
    unregisterElement,
    isImagePreloaded,
    preloadedImages: preloadedRef.current,
  };
}

/**
 * Hook for priority preloading of initial images.
 * Immediately preloads the first N images for instant visibility.
 *
 * Loaded URLs are tracked in a ref; the effect only depends on the
 * input URL list and the count, so it does not re-run on every
 * completed load (which previously caused redundant iterations).
 */
export function usePriorityImagePreload(imageUrls: string[], count = 3) {
  const loadedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());
  const [, setVersion] = useState(0);

  useEffect(() => {
    const priorityUrls = imageUrls.slice(0, count);
    for (const url of priorityUrls) {
      if (loadedRef.current.has(url) || inFlightRef.current.has(url)) continue;
      inFlightRef.current.add(url);
      const img = new Image();
      img.fetchPriority = "high";
      img.onload = () => {
        inFlightRef.current.delete(url);
        loadedRef.current.add(url);
        setVersion((v) => v + 1);
      };
      img.onerror = () => {
        inFlightRef.current.delete(url);
        loadedRef.current.add(url);
        setVersion((v) => v + 1);
      };
      img.src = url;
    }
  }, [imageUrls, count]);

  const isPriorityLoaded = useCallback(
    (url: string) => loadedRef.current.has(url),
    [],
  );

  return {
    isPriorityLoaded,
    loadedUrls: loadedRef.current,
  };
}

/**
 * Hook for background preloading of thumbnail images.
 * Preloads images in the background without blocking UI.
 */
export function useBackgroundImagePreload(imageUrls: string[], delay = 2000) {
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => {
      for (const url of imageUrls) {
        if (!cacheRef.current.has(url)) {
          const img = new Image();
          img.onload = () => {
            cacheRef.current.set(url, img);
          };
          img.src = url;
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [imageUrls, delay]);

  return {
    isPreloaded: (url: string) => cacheRef.current.has(url),
  };
}
