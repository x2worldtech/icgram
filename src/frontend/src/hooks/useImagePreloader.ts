import { useEffect, useRef, useState } from 'react';

interface UseImagePreloaderOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Custom hook for preloading images using IntersectionObserver
 * Preloads images slightly before they enter the viewport
 */
export function useImagePreloader(
  imageUrls: string[],
  options: UseImagePreloaderOptions = {}
) {
  const { rootMargin = '400px', threshold = 0 } = options;
  const [preloadedImages, setPreloadedImages] = useState<Map<string, boolean>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const imageElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const preloadCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imageUrl = entry.target.getAttribute('data-image-url');
            if (imageUrl && !preloadedImages.get(imageUrl)) {
              preloadImage(imageUrl);
            }
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // Clean up cached images
      preloadCacheRef.current.clear();
    };
  }, [rootMargin, threshold]);

  const preloadImage = (url: string) => {
    // Check if already cached
    if (preloadCacheRef.current.has(url)) {
      setPreloadedImages((prev) => new Map(prev).set(url, true));
      return;
    }

    const img = new Image();
    img.onload = () => {
      preloadCacheRef.current.set(url, img);
      setPreloadedImages((prev) => new Map(prev).set(url, true));
    };
    img.onerror = () => {
      setPreloadedImages((prev) => new Map(prev).set(url, false));
    };
    img.src = url;
  };

  const registerElement = (url: string, element: HTMLElement | null) => {
    if (!element) return;

    imageElementsRef.current.set(url, element);
    element.setAttribute('data-image-url', url);

    if (observerRef.current) {
      observerRef.current.observe(element);
    }
  };

  const unregisterElement = (url: string) => {
    const element = imageElementsRef.current.get(url);
    if (element && observerRef.current) {
      observerRef.current.unobserve(element);
      imageElementsRef.current.delete(url);
    }
  };

  const isImagePreloaded = (url: string): boolean => {
    return preloadedImages.get(url) === true;
  };

  return {
    registerElement,
    unregisterElement,
    isImagePreloaded,
    preloadedImages,
  };
}

/**
 * Hook for priority preloading of initial images
 * Immediately preloads the first N images for instant visibility
 */
export function usePriorityImagePreload(imageUrls: string[], count: number = 3) {
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const priorityUrls = imageUrls.slice(0, count);
    
    priorityUrls.forEach((url) => {
      if (!loadedUrls.has(url) && !cacheRef.current.has(url)) {
        const img = new Image();
        img.onload = () => {
          cacheRef.current.set(url, img);
          setLoadedUrls((prev) => new Set(prev).add(url));
        };
        img.onerror = () => {
          setLoadedUrls((prev) => new Set(prev).add(url));
        };
        // Set high priority for critical images
        img.fetchPriority = 'high';
        img.src = url;
      }
    });

    return () => {
      // Keep cache for reuse
    };
  }, [imageUrls, count]);

  return {
    isPriorityLoaded: (url: string) => loadedUrls.has(url),
    loadedUrls,
  };
}

/**
 * Hook for background preloading of thumbnail images
 * Preloads images in the background without blocking UI
 */
export function useBackgroundImagePreload(imageUrls: string[], delay: number = 2000) {
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => {
      imageUrls.forEach((url) => {
        if (!cacheRef.current.has(url)) {
          const img = new Image();
          img.onload = () => {
            cacheRef.current.set(url, img);
          };
          img.src = url;
        }
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [imageUrls, delay]);

  return {
    isPreloaded: (url: string) => cacheRef.current.has(url),
  };
}
