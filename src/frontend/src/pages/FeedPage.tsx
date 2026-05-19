import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import PostCard from "../components/PostCard";
import {
  useImagePreloader,
  usePriorityImagePreload,
} from "../hooks/useImagePreloader";
import { useGetFeed } from "../hooks/useQueries";

function FeedSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2].map((i) => (
        <div key={i} className="border-b border-border bg-background">
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="w-full post-image-skeleton" />
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const { data: feed, isLoading, isFetching } = useGetFeed();

  const sortedFeed = useMemo(() => {
    return feed
      ? [...feed].sort((a, b) => Number(b.timestamp - a.timestamp))
      : [];
  }, [feed]);

  const imageUrls = useMemo(() => {
    return sortedFeed.map((post) => post.image.getDirectURL());
  }, [sortedFeed]);

  const { isPriorityLoaded } = usePriorityImagePreload(imageUrls, 3);
  const { registerElement, unregisterElement, isImagePreloaded } =
    useImagePreloader(imageUrls, {
      rootMargin: "400px",
      threshold: 0,
    });

  // Preload remaining images in background after priority images load
  useEffect(() => {
    if (imageUrls.length > 3) {
      const remainingUrls = imageUrls.slice(3, 10); // Preload next 7 images
      const timer = setTimeout(() => {
        for (const url of remainingUrls) {
          const img = new Image();
          img.src = url;
        }
      }, 1000); // Start after 1 second

      return () => clearTimeout(timer);
    }
  }, [imageUrls]);

  if (isLoading) {
    return <FeedSkeleton />;
  }

  if (!sortedFeed.length) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Modern minimal motif: stacked photo frames with a soft camera glyph */}
          <div className="relative h-32 w-32">
            {/* Soft blue glow behind the motif */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 70%)",
                filter: "blur(20px)",
                transform: "scale(1.4)",
              }}
            />
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 120 120"
              className="relative h-full w-full"
              fill="none"
            >
              <defs>
                <linearGradient
                  id="emptyFrameStroke"
                  x1="20"
                  y1="20"
                  x2="100"
                  y2="100"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0.45"
                  />
                </linearGradient>
              </defs>

              {/* Back frame – tilted left */}
              <g
                transform="rotate(-8 60 60)"
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="1.6"
                fill="none"
              >
                <rect x="22" y="28" width="60" height="60" rx="10" />
              </g>

              {/* Front frame – tilted right */}
              <g
                transform="rotate(6 60 60)"
                stroke="url(#emptyFrameStroke)"
                strokeWidth="2"
                fill="none"
              >
                <rect x="32" y="34" width="64" height="64" rx="12" />
                {/* Mountain silhouette inside front frame */}
                <path
                  d="M 38 80 L 54 60 L 66 72 L 78 56 L 92 80"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Sun / lens dot */}
                <circle
                  cx="80"
                  cy="48"
                  r="3.5"
                  fill="currentColor"
                  stroke="none"
                />
              </g>
            </svg>
          </div>

          <div className="flex flex-col items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              Your feed is quiet
            </h3>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              When you or people you follow post something, it'll show up here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {isFetching && !isLoading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm border border-border">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Updating...</span>
          </div>
        </div>
      )}
      <div className="feed-container">
        {sortedFeed.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            isPriority={index < 3}
            isPriorityLoaded={isPriorityLoaded(post.image.getDirectURL())}
            isPreloaded={isImagePreloaded(post.image.getDirectURL())}
            registerPreload={registerElement}
            unregisterPreload={unregisterElement}
          />
        ))}
      </div>
    </div>
  );
}
