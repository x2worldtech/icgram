import { useGetInbox, useGetUserProfile, useGetPost, useGetComments } from '../hooks/useQueries';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useState, lazy, Suspense } from 'react';
import type { Activity, Post } from '../backend';
import { Variant_like_comment } from '../backend';

const PostDetailModal = lazy(() => import('../components/PostDetailModal'));

function InboxSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 border border-border rounded-lg">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-16 w-16 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const navigate = useNavigate();
  const { data: activities, isLoading } = useGetInbox();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (isLoading) {
    return <InboxSkeleton />;
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-6">
          <Heart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Activity Yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          When someone likes or comments on your posts, you'll see it here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-3">
          <h1 className="text-2xl font-semibold mb-4">Activity</h1>
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onPostClick={(post) => setSelectedPost(post)}
            />
          ))}
        </div>
      </div>

      {selectedPost && (
        <Suspense fallback={null}>
          <PostDetailModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
          />
        </Suspense>
      )}
    </>
  );
}

interface ActivityItemProps {
  activity: Activity;
  onPostClick: (post: Post) => void;
}

function ActivityItem({ activity, onPostClick }: ActivityItemProps) {
  const navigate = useNavigate();
  const { data: actorProfile } = useGetUserProfile(activity.activityActor);
  const { data: post } = useGetPost(activity.postId);
  const { data: comments } = useGetComments(activity.postId);

  const actorImageUrl = actorProfile?.profilePicture
    ? actorProfile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_200x200.png';

  const postImageUrl = post?.image.getDirectURL();

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

  const handleNavigateToProfile = () => {
    const principalId = activity.activityActor.toString();
    navigate({ to: '/user/$principalId', params: { principalId } });
  };

  const getActivityText = () => {
    const username = actorProfile?.username || 'Someone';
    
    if (activity.activityType === Variant_like_comment.like) {
      if (activity.commentId) {
        return (
          <>
            <button
              onClick={handleNavigateToProfile}
              className="font-semibold hover:opacity-80 transition-opacity"
            >
              {username}
            </button>
            {' liked your comment'}
          </>
        );
      }
      return (
        <>
          <button
            onClick={handleNavigateToProfile}
            className="font-semibold hover:opacity-80 transition-opacity"
          >
            {username}
          </button>
          {' liked your post'}
        </>
      );
    }

    if (activity.activityType === Variant_like_comment.comment) {
      const comment = comments?.find((c) => c.id === activity.commentId);
      const commentText = comment?.text || '';
      const truncatedComment = commentText.length > 50 
        ? commentText.substring(0, 50) + '...' 
        : commentText;

      return (
        <>
          <button
            onClick={handleNavigateToProfile}
            className="font-semibold hover:opacity-80 transition-opacity"
          >
            {username}
          </button>
          {' commented: '}
          <span className="text-muted-foreground">{truncatedComment}</span>
        </>
      );
    }

    return null;
  };

  const getActivityIcon = () => {
    if (activity.activityType === Variant_like_comment.like) {
      return <Heart className="h-5 w-5 fill-red-500 text-red-500" />;
    }
    return <MessageCircle className="h-5 w-5 text-primary" />;
  };

  const handlePostClick = () => {
    if (post) {
      onPostClick(post);
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
      <button
        onClick={handleNavigateToProfile}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <img
          src={actorImageUrl}
          alt={actorProfile?.displayName || 'User'}
          className="h-12 w-12 rounded-full object-cover"
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <div className="flex-shrink-0 mt-1">{getActivityIcon()}</div>
          <p className="text-sm flex-1">{getActivityText()}</p>
        </div>
        <p className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</p>
      </div>

      {postImageUrl && (
        <button
          onClick={handlePostClick}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <img
            src={postImageUrl}
            alt="Post"
            className="h-16 w-16 rounded object-cover"
          />
        </button>
      )}
    </div>
  );
}
