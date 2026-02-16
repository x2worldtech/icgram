import { useState } from 'react';
import { useGetComments, useAddComment, useGetUserProfile, useLikeComment, useUnlikeComment } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Send, Heart, Check } from 'lucide-react';
import type { Post, Comment } from '../backend';

interface CommentsModalProps {
  post: Post;
  onClose: () => void;
}

export default function CommentsModal({ post, onClose }: CommentsModalProps) {
  const [commentText, setCommentText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { identity } = useInternetIdentity();
  const { data: comments, isLoading } = useGetComments(post.id);
  const addComment = useAddComment();

  const currentUserPrincipal = identity?.getPrincipal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim() || !currentUserPrincipal) {
      return;
    }

    try {
      await addComment.mutateAsync({ postId: post.id, text: commentText.trim(), userPrincipal: currentUserPrincipal });
      setCommentText('');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  const sortedComments = comments ? [...comments].sort((a, b) => Number(b.timestamp - a.timestamp)) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl rounded-t-3xl bg-card sm:rounded-3xl sm:max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-lg font-light">Comments</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedComments.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No comments yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedComments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} postId={post.id} />
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-full"
              disabled={addComment.isPending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!commentText.trim() || addComment.isPending}
              className={`rounded-full transition-all ${
                showSuccess ? 'bg-green-500 hover:bg-green-600' : ''
              }`}
            >
              {showSuccess ? (
                <Check className="h-4 w-4" />
              ) : addComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommentItem({ comment, postId }: { comment: Comment; postId: string }) {
  const { identity } = useInternetIdentity();
  const { data: authorProfile } = useGetUserProfile(comment.author);
  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();

  const currentUserPrincipal = identity?.getPrincipal();
  const isLiked = currentUserPrincipal ? comment.likes.some((p) => p.toString() === currentUserPrincipal.toString()) : false;

  const authorImageUrl = authorProfile?.profilePicture
    ? authorProfile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_200x200.png';

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const handleToggleLike = async () => {
    if (!currentUserPrincipal) return;

    try {
      if (isLiked) {
        await unlikeComment.mutateAsync({ commentId: comment.id, postId, userPrincipal: currentUserPrincipal });
      } else {
        await likeComment.mutateAsync({ commentId: comment.id, postId, userPrincipal: currentUserPrincipal });
      }
    } catch (error: any) {
      // Silent error
    }
  };

  return (
    <div className="flex gap-3">
      <img
        src={authorImageUrl}
        alt={authorProfile?.displayName || 'User'}
        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-semibold">{authorProfile?.username || 'user'}</span>{' '}
            {comment.text}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatTimestamp(comment.timestamp)}
          </p>
        </div>
        <button
          onClick={handleToggleLike}
          disabled={likeComment.isPending || unlikeComment.isPending}
          className="flex-shrink-0 flex items-center gap-1 transition-all active:scale-90 disabled:opacity-50"
          aria-label={isLiked ? 'Unlike comment' : 'Like comment'}
        >
          <Heart
            className={`h-3.5 w-3.5 transition-all duration-200 ${
              isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-muted-foreground'
            }`}
          />
          {comment.likes.length > 0 && (
            <span className="text-xs text-muted-foreground">{comment.likes.length}</span>
          )}
        </button>
      </div>
    </div>
  );
}
