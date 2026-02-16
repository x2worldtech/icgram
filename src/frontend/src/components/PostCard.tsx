import { useState, useRef, useEffect } from 'react';
import { useLikePost, useUnlikePost, useGetUserProfile, useGetComments, usePrefetchUserProfile, usePrefetchUserPosts } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Heart, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Post } from '../backend';
import CommentsModal from './CommentsModal';
import { useNavigate } from '@tanstack/react-router';

interface PostCardProps {
  post: Post;
  isPriority?: boolean;
  isPriorityLoaded?: boolean;
  isPreloaded?: boolean;
  registerPreload?: (url: string, element: HTMLElement | null) => void;
  unregisterPreload?: (url: string) => void;
}

export default function PostCard({
  post,
  isPriority = false,
  isPriorityLoaded = false,
  isPreloaded = false,
  registerPreload,
  unregisterPreload,
}: PostCardProps) {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: authorProfile } = useGetUserProfile(post.author);
  const { data: comments } = useGetComments(post.id);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const prefetchUserProfile = usePrefetchUserProfile();
  const prefetchUserPosts = usePrefetchUserPosts();

  const [showComments, setShowComments] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentUserPrincipal = identity?.getPrincipal();
  const isLiked = currentUserPrincipal ? post.likes.some((p) => p.toString() === currentUserPrincipal.toString()) : false;
  const likeCount = post.likes.length;

  const postImageUrl = post.image.getDirectURL();

  useEffect(() => {
    if (!isPriority && containerRef.current && registerPreload) {
      registerPreload(postImageUrl, containerRef.current);
    }

    return () => {
      if (!isPriority && unregisterPreload) {
        unregisterPreload(postImageUrl);
      }
    };
  }, [postImageUrl, isPriority, registerPreload, unregisterPreload]);

  useEffect(() => {
    if (isPriority && isPriorityLoaded) {
      setImageLoaded(true);
    }
  }, [isPriority, isPriorityLoaded]);

  useEffect(() => {
    if (!isPriority && isPreloaded && !imageLoaded) {
      setImageLoaded(true);
    }
  }, [isPriority, isPreloaded, imageLoaded]);

  const handleLike = async () => {
    if (!currentUserPrincipal) return;

    if (isLiked) {
      setIsLikeAnimating(false);
      try {
        await unlikePost.mutateAsync({ postId: post.id, userPrincipal: currentUserPrincipal });
      } catch (error: any) {
        // Silent error - optimistic update will rollback
      }
    } else {
      setIsLikeAnimating(true);
      setTimeout(() => setIsLikeAnimating(false), 600);
      try {
        await likePost.mutateAsync({ postId: post.id, userPrincipal: currentUserPrincipal });
      } catch (error: any) {
        // Silent error - optimistic update will rollback
      }
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0 && !isLiked) {
      handleLike();
    }

    lastTapRef.current = now;
  };

  const handleNavigateToProfile = () => {
    prefetchUserProfile(post.author);
    prefetchUserPosts(post.author);
    
    const principalId = post.author.toString();
    navigate({ to: '/user/$principalId', params: { principalId } });
  };

  const authorImageUrl = authorProfile?.profilePicture
    ? authorProfile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_200x200.png';

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <article className="flex flex-col border-b border-border bg-background post-card" ref={containerRef}>
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
          <button
            onClick={handleNavigateToProfile}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <img
              src={authorImageUrl}
              alt={authorProfile?.displayName || 'User'}
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{authorProfile?.displayName || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{authorProfile?.username || 'user'}
              </p>
            </div>
          </button>
        </div>

        <div 
          className="relative bg-muted flex-shrink-0 post-image-container" 
          onTouchStart={handleDoubleTap}
        >
          {!imageLoaded && (
            <div className="w-full post-image-skeleton">
              <Skeleton className="h-full w-full" />
            </div>
          )}
          <img
            src={postImageUrl}
            alt={post.caption || 'Post image'}
            className={`w-full h-full object-contain transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0 absolute'
            }`}
            onLoad={() => setImageLoaded(true)}
            loading={isPriority ? 'eager' : 'lazy'}
            fetchPriority={isPriority ? 'high' : 'auto'}
          />
          {isLikeAnimating && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="h-24 w-24 animate-ping fill-white text-white opacity-80" />
            </div>
          )}
        </div>

        <div className="px-4 py-3 flex-shrink-0 post-footer">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={handleLike}
              disabled={likePost.isPending || unlikePost.isPending}
              className="transition-transform active:scale-90 disabled:opacity-50"
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`h-7 w-7 transition-colors ${
                  isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'
                }`}
              />
            </button>
            <button
              onClick={() => setShowComments(true)}
              className="transition-transform active:scale-90"
              aria-label="Comments"
            >
              <MessageCircle className="h-7 w-7" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </p>
            {post.caption && (
              <p className="text-sm">
                <button
                  onClick={handleNavigateToProfile}
                  className="font-semibold hover:opacity-80 transition-opacity"
                >
                  {authorProfile?.username || 'user'}
                </button>{' '}
                {post.caption}
              </p>
            )}
            {comments && comments.length > 0 && (
              <button
                onClick={() => setShowComments(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </button>
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {formatTimestamp(post.timestamp)}
            </p>
          </div>
        </div>
      </article>

      {showComments && <CommentsModal post={post} onClose={() => setShowComments(false)} />}
    </>
  );
}
