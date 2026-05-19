import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Grid3x3, Loader2, LogOut, Trash2 } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import {
  useDeletePost,
  useGetCallerUserProfile,
  useGetTotalLikesForUser,
  useGetUserPosts,
} from "../hooks/useQueries";
import type { Post } from "../types";

// Lazy load heavy modals
const EditProfileModal = lazy(() => import("../components/EditProfileModal"));
const PostDetailModal = lazy(() => import("../components/PostDetailModal"));

function ProfileSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="text-center space-y-2">
              <Skeleton className="h-6 w-32 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
            <Skeleton className="h-12 w-full max-w-xs" />
            <div className="flex gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center space-y-1">
                  <Skeleton className="h-6 w-12 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: userProfile, isLoading } = useGetCallerUserProfile();
  const { identity, clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [imageLoadStates, setImageLoadStates] = useState<
    Record<string, boolean>
  >({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const currentUserPrincipal = identity?.getPrincipal();
  const { data: userPosts, isLoading: postsLoading } = useGetUserPosts(
    currentUserPrincipal || null,
  );
  const { data: totalLikes, isLoading: totalLikesLoading } =
    useGetTotalLikesForUser(currentUserPrincipal || null);
  const deletePost = useDeletePost();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
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
    try {
      await deletePost.mutateAsync(postId);
      setDeleteConfirmId(null);
    } catch (_error: any) {
      // Silent error handling
    }
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!userProfile) {
    return null;
  }

  const profileImageUrl = userProfile.profilePicture
    ? userProfile.profilePicture.getDirectURL()
    : "/assets/generated/default-avatar.dim_200x200.png";

  const sortedPosts = userPosts
    ? [...userPosts].sort((a, b) => Number(b.timestamp - a.timestamp))
    : [];

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="p-4">
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <img
                src={profileImageUrl}
                alt={userProfile.displayName}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
              />
              <div className="text-center">
                <h2 className="text-xl font-light">
                  {userProfile.displayName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{userProfile.username}
                </p>
              </div>

              {userProfile.bio && (
                <p className="max-w-md text-center text-sm text-muted-foreground">
                  {userProfile.bio}
                </p>
              )}

              <div className="flex gap-8 text-center">
                <div>
                  <p className="text-lg font-light">
                    {userProfile.followers.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="text-lg font-light">
                    {userProfile.following.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
                <div>
                  {totalLikesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                  ) : (
                    <p className="text-lg font-light">{totalLikes ?? 0}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
              </div>

              <Button
                onClick={() => setEditModalOpen(true)}
                variant="outline"
                className="rounded-full"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>

            <div className="border-t border-border -mx-4">
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
                        type="button"
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
                          alt={post.caption || "Post"}
                          className={`h-full w-full object-cover transition-opacity duration-300 ${
                            isLoaded ? "opacity-100" : "opacity-0"
                          }`}
                          onLoad={() => handleImageLoad(post.id)}
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(e, post.id)}
                          className={`absolute top-2 right-2 backdrop-blur-sm rounded-full p-1.5 transition-all ${
                            isConfirming
                              ? "bg-destructive opacity-100"
                              : "bg-background/80 opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Trash2
                            className={`h-4 w-4 ${isConfirming ? "text-white" : "text-destructive"}`}
                          />
                        </button>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-3xl bg-muted/20 p-6">
              <h3 className="text-sm font-medium text-muted-foreground">
                Settings
              </h3>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full rounded-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {editModalOpen && (
        <Suspense fallback={null}>
          <EditProfileModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            currentProfile={userProfile}
          />
        </Suspense>
      )}

      {selectedPost && (
        <Suspense fallback={null}>
          <PostDetailModal
            post={selectedPost}
            onClose={handleClosePostDetail}
          />
        </Suspense>
      )}
    </>
  );
}
