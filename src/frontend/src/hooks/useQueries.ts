import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ExternalBlob, createActor } from "../backend";
import type { Activity, Comment, Post, UserProfile } from "../types";

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetches
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(userPrincipal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return null;
      return actor.getUserProfile(userPrincipal);
    },
    enabled: !!actor && !actorFetching && !!userPrincipal,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useCreatePost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      image,
      caption,
    }: { image: ExternalBlob; caption: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createPost(image, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      queryClient.invalidateQueries({ queryKey: ["totalLikes"] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      queryClient.invalidateQueries({ queryKey: ["totalLikes"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useGetFeed() {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  return useQuery<Post[]>({
    queryKey: ["feed"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeed();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30 * 1000, // 30 seconds - fresh feed data
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, // Disable aggressive refetch on focus
  });
}

// Prefetch feed data - call this on login
export function usePrefetchFeed() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return () => {
    if (actor) {
      queryClient.prefetchQuery({
        queryKey: ["feed"],
        queryFn: async () => actor.getFeed(),
        staleTime: 30 * 1000,
      });
    }
  };
}

export function useLikePost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.likePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      queryClient.invalidateQueries({ queryKey: ["totalLikes"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useUnlikePost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unlikePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      queryClient.invalidateQueries({ queryKey: ["totalLikes"] });
    },
  });
}

export function useAddComment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addComment(postId, text);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      // The post's commentCount changes too — refresh anything that reads it.
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}

export function useGetComments(postId: string) {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  return useQuery<Comment[]>({
    queryKey: ["comments", postId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getComments(postId);
    },
    enabled: !!actor && !actorFetching && !!postId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}

export function useLikeComment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId: _postId,
    }: { commentId: string; postId: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.likeComment(commentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useUnlikeComment() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId: _postId,
    }: { commentId: string; postId: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unlikeComment(commentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
    },
  });
}

export function useFollowUser() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userToFollow: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.followUser(userToFollow);
    },
    onSuccess: (_, userToFollow) => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({
        queryKey: ["userProfile", userToFollow.toString()],
      });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userToUnfollow: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.unfollowUser(userToUnfollow);
    },
    onSuccess: (_, userToUnfollow) => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({
        queryKey: ["userProfile", userToUnfollow.toString()],
      });
    },
  });
}

export function useGetUserPosts(userPrincipal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  return useQuery<Post[]>({
    queryKey: ["userPosts", userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return [];
      return actor.getUserPosts(userPrincipal);
    },
    enabled: !!actor && !actorFetching && !!userPrincipal,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });
}

export function useGetTotalLikesForUser(userPrincipal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  return useQuery<number>({
    queryKey: ["totalLikes", userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return 0;
      const result = await actor.getTotalLikesForUser(userPrincipal);
      return Number(result);
    },
    enabled: !!actor && !actorFetching && !!userPrincipal,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useGetInbox() {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  return useQuery<Activity[]>({
    queryKey: ["inbox"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInbox();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}

export function useGetPost(postId: string) {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  return useQuery<Post | null>({
    queryKey: ["post", postId],
    queryFn: async () => {
      if (!actor) return null;
      const feed = await actor.getFeed();
      return feed.find((p) => p.id === postId) || null;
    },
    enabled: !!actor && !actorFetching && !!postId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Prefetch user profile - useful for profile navigation
export function usePrefetchUserProfile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return (userPrincipal: Principal) => {
    if (actor) {
      queryClient.prefetchQuery({
        queryKey: ["userProfile", userPrincipal.toString()],
        queryFn: async () => actor.getUserProfile(userPrincipal),
        staleTime: 3 * 60 * 1000,
      });
    }
  };
}

// Prefetch user posts - useful for profile navigation
export function usePrefetchUserPosts() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return (userPrincipal: Principal) => {
    if (actor) {
      queryClient.prefetchQuery({
        queryKey: ["userPosts", userPrincipal.toString()],
        queryFn: async () => actor.getUserPosts(userPrincipal),
        staleTime: 2 * 60 * 1000,
      });
    }
  };
}
