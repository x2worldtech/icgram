import { useParams, useNavigate } from '@tanstack/react-router';
import { Principal } from '@icp-sdk/core/principal';
import { useGetUserProfile, useGetUserPosts, useFollowUser, useUnfollowUser, useGetCallerUserProfile, useGetTotalLikesForUser, useDeletePost } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Grid3x3, Trash2, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, lazy, Suspense } from 'react';
import type { Post } from '../backend';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

const PostDetailModal = lazy(() => import('../components/PostDetailModal'));

function CreatorProfileSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex gap-8 justify-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-6 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function CreatorProfilePage() {
  const { principalId } = useParams({ from: '/user/$principalId' });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const [imageLoadStates, setImageLoadStates] = useState<Record<string, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [followSuccess, setFollowSuccess] = useState(false);

  let userPrincipal: Principal | null = null;
  try {
    userPrincipal = Principal.fromText(principalId);
  } catch (error) {
    console.error('Invalid principal:', error);
  }

  const { data: userProfile, isLoading: profileLoading } = useGetUserProfile(userPrincipal);
  const { data: userPosts, isLoading: postsLoading } = useGetUserPosts(userPrincipal);
  const { data: totalLikes, isLoading: totalLikesLoading } = useGetTotalLikesForUser(userPrincipal);
  const { data: currentUserProfile } = useGetCallerUserProfile();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const deletePost = useDeletePost();

  const currentUserPrincipal = identity?.getPrincipal();
  const isOwnProfile = currentUserPrincipal ? principalId === currentUserPrincipal.toString() : false;

  const isFollowing = currentUserProfile?.following.some(
    (p) => p.toString() === principalId
  ) || false;

  const handleFollowToggle = async () => {
    if (!userPrincipal || !currentUserPrincipal) return;

    try {
      if (isFollowing) {
        await unfollowUser.mutateAsync({ userToUnfollow: userPrincipal, currentUserPrincipal });
      } else {
        await followUser.mutateAsync({ userToFollow: userPrincipal, currentUserPrincipal });
        setFollowSuccess(true);
        setTimeout(() => setFollowSuccess(false), 2000);
      }
    } catch (error: any) {
      // Silent error
    }
  };

  const handleImageLoad = (postId: string) => {
    setImageLoadStates((prev) => ({ ...prev, [postId]: true }));
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleClosePostDetail = () => {
    setSelectedPost(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    
    if (deleteConfirmId === postId) {
      handleDeletePost(postId);
    } else {
      setDeleteConfirmId(postId);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUserPrincipal) return;

    try {
      await deletePost.mutateAsync({ postId, authorPrincipal: currentUserPrincipal });
      setDeleteConfirmId(null);
    } catch (error: any) {
      // Silent error
    }
  };

  if (profileLoading) {
    return <CreatorProfileSkeleton />;
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4">
        <p className="text-lg text-muted-foreground">User not found</p>
        <Button onClick={() => navigate({ to: '/' })} variant="outline" className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Feed
        </Button>
      </div>
    );
  }

  const profileImageUrl = userProfile.profilePicture
    ? userProfile.profilePicture.getDirectURL()
    : '/assets/generated/default-avatar.dim_200x200.png';

  const sortedPosts = userPosts ? [...userPosts].sort((a, b) => Number(b.timestamp - a.timestamp)) : [];

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate({ to: '/' })}
              className="rounded-full p-2 hover:bg-muted transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="font-medium">{userProfile.displayName}</h2>
              <p className="text-xs text-muted-foreground">@{userProfile.username}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-4">
          <div className="flex items-start gap-4">
            <img
              src={profileImageUrl}
              alt={userProfile.displayName}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-border flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-light truncate">{userProfile.displayName}</h1>
              <p className="text-sm text-muted-foreground truncate">@{userProfile.username}</p>
            </div>
          </div>

          {userProfile.bio && (
            <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
          )}

          <div className="flex gap-8 justify-center">
            <div className="text-center">
              <p className="text-lg font-light">{userProfile.followers.length}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-light">{userProfile.following.length}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            <div className="text-center">
              {totalLikesLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
              ) : (
                <p className="text-lg font-light">{totalLikes ?? 0}</p>
              )}
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
          </div>

          <Button
            onClick={handleFollowToggle}
            disabled={followUser.isPending || unfollowUser.isPending}
            variant={isFollowing ? 'outline' : 'default'}
            className={`w-full rounded-full transition-all ${
              followSuccess ? 'bg-green-500 hover:bg-green-600' : ''
            }`}
          >
            {followUser.isPending || unfollowUser.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isFollowing ? 'Unfollowing...' : 'Following...'}
              </>
            ) : followSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Following!
              </>
            ) : isFollowing ? (
              'Unfollow'
            ) : (
              'Follow'
            )}
          </Button>
        </div>

        <div className="border-t border-border">
          <div className="flex items-center justify-center gap-2 py-3 border-b border-border">
            <Grid3x3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Posts</span>
          </div>

          {postsLoading ? (
            <div className="grid grid-cols-3 gap-1 p-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-4">
              <p className="text-sm text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 p-1">
              {sortedPosts.map((post) => {
                const imageUrl = post.image.getDirectURL();
                const isLoaded = imageLoadStates[post.id];
                const isConfirming = deleteConfirmId === post.id;

                return (
                  <button
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity group"
                  >
                    {!isLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <img
                      src={imageUrl}
                      alt={post.caption || 'Post'}
                      className={`h-full w-full object-cover transition-opacity duration-300 ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      onLoad={() => handleImageLoad(post.id)}
                      loading="lazy"
                    />
                    {isOwnProfile && (
                      <div
                        onClick={(e) => handleDeleteClick(e, post.id)}
                        className={`absolute top-2 right-2 backdrop-blur-sm rounded-full p-1.5 transition-all ${
                          isConfirming
                            ? 'bg-destructive opacity-100'
                            : 'bg-background/80 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Trash2 className={`h-4 w-4 ${isConfirming ? 'text-white' : 'text-destructive'}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedPost && (
        <Suspense fallback={null}>
          <PostDetailModal post={selectedPost} onClose={handleClosePostDetail} />
        </Suspense>
      )}
    </>
  );
}
