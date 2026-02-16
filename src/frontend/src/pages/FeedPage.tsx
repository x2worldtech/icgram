import { useMemo, useEffect } from 'react';
import { useGetFeed } from '../hooks/useQueries';
import PostCard from '../components/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useImagePreloader, usePriorityImagePreload } from '../hooks/useImagePreloader';

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
    return feed ? [...feed].sort((a, b) => Number(b.timestamp - a.timestamp)) : [];
  }, [feed]);

  const imageUrls = useMemo(() => {
    return sortedFeed.map((post) => post.image.getDirectURL());
  }, [sortedFeed]);

  const { isPriorityLoaded } = usePriorityImagePreload(imageUrls, 3);
  const { registerElement, unregisterElement, isImagePreloaded } = useImagePreloader(imageUrls, {
    rootMargin: '400px',
    threshold: 0,
  });

  // Preload remaining images in background after priority images load
  useEffect(() => {
    if (imageUrls.length > 3) {
      const remainingUrls = imageUrls.slice(3, 10); // Preload next 7 images
      const timer = setTimeout(() => {
        remainingUrls.forEach((url) => {
          const img = new Image();
          img.src = url;
        });
      }, 1000); // Start after 1 second

      return () => clearTimeout(timer);
    }
  }, [imageUrls]);

  if (isLoading) {
    return <FeedSkeleton />;
  }

  if (!sortedFeed.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-4">
          <img
            src="/assets/generated/empty-feed.dim_400x300.png"
            alt="Empty feed"
            className="h-48 w-auto opacity-50"
          />
          <h3 className="text-lg font-light text-muted-foreground">No posts yet</h3>
          <p className="text-center text-sm text-muted-foreground max-w-sm">
            Be the first to share a photo with the community
          </p>
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
