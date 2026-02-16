import { useState, useRef } from 'react';
import { useLikePost, useUnlikePost, useGetUserProfile, useGetComments, useAddComment, useLikeComment, useUnlikeComment, useDeletePost } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Heart, MessageCircle, X, Send, Loader2, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Post, Comment } from '../backend';
import { useNavigate } from '@tanstack/react-router';

interface PostDetailModalProps {
  post: Post;
  onClose: () => void;
}

export default function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { data: authorProfile } = useGetUserProfile(post.author);
  const { data: comments } = useGetComments(post.id);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const addComment = useAddComment();
  const deletePost = useDeletePost();

  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showCommentSuccess, setShowCommentSuccess] = useState(false);
  const lastTapRef = useRef<number>(0);

  const currentUserPrincipal = identity?.getPrincipal();
  const isLiked = currentUserPrincipal ? post.likes.some((p) => p.toString() === currentUserPrincipal.toString()) : false;
  const isOwnPost = currentUserPrincipal ? post.author.toString() === currentUserPrincipal.toString() : false;

  const handleLike = async () => {
    if (!currentUserPrincipal) return;

    if (isLiked) {
      setIsLikeAnimating(false);
      try {
        await unlikePost.mutateAsync({ postId: post.id, userPrincipal: currentUserPrincipal });
      } catch (error: any) {
        // Silent error
      }
    } else {
      setIsLikeAnimating(true);
      setTimeout(() => setIsLikeAnimating(false), 600);
      try {
        await likePost.mutateAsync({ postId: post.id, userPrincipal: currentUserPrincipal });
      } catch (error: any) {
        // Silent error
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
    const principalId = post.author.toString();
    onClose();
    navigate({ to: '/user/$principalId', params: { principalId } });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserPrincipal) return;

    try {
      await addComment.mutateAsync({ postId: post.id, text: commentText.trim(), userPrincipal: currentUserPrincipal });
      setCommentText('');
      
      setShowCommentSuccess(true);
      setTimeout(() => setShowCommentSuccess(false), 2000);
    } catch (error) {
      // Silent error
    }
  };

  const handleDeleteClick = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    } else {
      handleDeletePost();
    }
  };

  const handleDeletePost = async () => {
    if (!currentUserPrincipal) return;
    
    try {
      await deletePost.mutateAsync({ postId: post.id, authorPrincipal: post.author });
      onClose();
    } catch (error: any) {
      // Silent error
    }
  };

  const authorImageUrl = authorProfile?.profilePicture
    ? authorProfile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_200x200.png';

  const postImageUrl = post.image.getDirectURL();

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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwnPost && (
              <Button
                onClick={handleDeleteClick}
                variant="ghost"
                size="icon"
                className={`rounded-full transition-all ${
                  deleteConfirm
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'text-destructive hover:text-destructive hover:bg-destructive/10'
                }`}
                disabled={deletePost.isPending}
              >
                {deletePost.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {deleteConfirm && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center border-b border-destructive/20">
            Tap delete again to confirm
          </div>
        )}

        <div 
          className="relative bg-muted flex-1 min-h-0 flex items-center justify-center"
          onTouchStart={handleDoubleTap}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={postImageUrl}
            alt={post.caption || 'Post image'}
            className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          {isLikeAnimating && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="h-24 w-24 animate-ping fill-white text-white opacity-80" />
            </div>
          )}
        </div>

        <div className="border-t border-border flex-shrink-0 bg-background">
          <div className="flex items-center gap-4 px-4 py-3">
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
            <MessageCircle className="h-7 w-7" />
          </div>

          <div className="px-4 pb-3 space-y-2">
            <p className="text-sm font-semibold">
              {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
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
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {formatTimestamp(post.timestamp)}
            </p>
          </div>

          <div className="border-t border-border">
            <ScrollArea className="h-48">
              <div className="px-4 py-3 space-y-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} postId={post.id} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <form onSubmit={handleAddComment} className="border-t border-border px-4 py-3 flex gap-2">
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
              className={`rounded-full flex-shrink-0 transition-all ${
                showCommentSuccess ? 'bg-green-500 hover:bg-green-600' : ''
              }`}
            >
              {showCommentSuccess ? (
                <Check className="h-4 w-4" />
              ) : addComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, postId }: { comment: Comment; postId: string }) {
  const { identity } = useInternetIdentity();
  const { data: commentAuthor } = useGetUserProfile(comment.author);
  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();

  const currentUserPrincipal = identity?.getPrincipal();
  const isLiked = currentUserPrincipal ? comment.likes.some((p) => p.toString() === currentUserPrincipal.toString()) : false;

  const authorImageUrl = commentAuthor?.profilePicture
    ? commentAuthor.profilePicture.getDirectURL()
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
        alt={commentAuthor?.displayName || 'User'}
        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-semibold">{commentAuthor?.username || 'user'}</span>{' '}
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
