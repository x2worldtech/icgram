import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, Post, Comment, Activity } from '../backend';
import { ExternalBlob } from '../backend';
import { Principal } from '@icp-sdk/core/principal';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(userPrincipal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return null;
      return actor.getUserProfile(userPrincipal);
    },
    enabled: !!actor && !actorFetching && !!userPrincipal,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onMutate: async (profile) => {
      await queryClient.cancelQueries({ queryKey: ['currentUserProfile'] });
      const previousProfile = queryClient.getQueryData<UserProfile | null>(['currentUserProfile']);
      queryClient.setQueryData(['currentUserProfile'], profile);
      return { previousProfile };
    },
    onError: (err, variables, context) => {
      if (context?.previousProfile !== undefined) {
        queryClient.setQueryData(['currentUserProfile'], context.previousProfile);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ image, caption, authorPrincipal }: { image: ExternalBlob; caption: string; authorPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPost(image, caption);
    },
    onMutate: async ({ image, caption, authorPrincipal }) => {
      const tempId = `temp-post-${Date.now()}`;
      const optimisticPost: Post = {
        id: tempId,
        author: authorPrincipal,
        image,
        caption,
        timestamp: BigInt(Date.now() * 1000000),
        likes: [],
      };

      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['userPosts', authorPrincipal.toString()] });

      const previousFeed = queryClient.getQueryData<Post[]>(['feed']);
      const previousUserPosts = queryClient.getQueryData<Post[]>(['userPosts', authorPrincipal.toString()]);

      queryClient.setQueryData<Post[]>(['feed'], (old) => [optimisticPost, ...(old || [])]);
      queryClient.setQueryData<Post[]>(['userPosts', authorPrincipal.toString()], (old) => [optimisticPost, ...(old || [])]);

      return { previousFeed, previousUserPosts, tempId, authorPrincipal: authorPrincipal.toString() };
    },
    onSuccess: (realId, variables, context) => {
      if (!context) return;
      
      const updatePost = (posts: Post[] | undefined) => {
        if (!posts) return posts;
        return posts.map(p => p.id === context.tempId ? { ...p, id: realId } : p);
      };

      queryClient.setQueryData<Post[]>(['feed'], updatePost);
      queryClient.setQueryData<Post[]>(['userPosts', context.authorPrincipal], updatePost);
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousFeed !== undefined) {
        queryClient.setQueryData(['feed'], context.previousFeed);
      }
      if (context.previousUserPosts !== undefined) {
        queryClient.setQueryData(['userPosts', context.authorPrincipal], context.previousUserPosts);
      }
    },
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, authorPrincipal }: { postId: string; authorPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deletePost(postId);
    },
    onMutate: async ({ postId, authorPrincipal }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['userPosts', authorPrincipal.toString()] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      const previousFeed = queryClient.getQueryData<Post[]>(['feed']);
      const previousUserPosts = queryClient.getQueryData<Post[]>(['userPosts', authorPrincipal.toString()]);
      const previousPost = queryClient.getQueryData<Post | null>(['post', postId]);

      queryClient.setQueryData<Post[]>(['feed'], (old) => old?.filter(p => p.id !== postId) || []);
      queryClient.setQueryData<Post[]>(['userPosts', authorPrincipal.toString()], (old) => old?.filter(p => p.id !== postId) || []);
      queryClient.setQueryData(['post', postId], null);

      return { previousFeed, previousUserPosts, previousPost, authorPrincipal: authorPrincipal.toString(), postId };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousFeed !== undefined) {
        queryClient.setQueryData(['feed'], context.previousFeed);
      }
      if (context.previousUserPosts !== undefined) {
        queryClient.setQueryData(['userPosts', context.authorPrincipal], context.previousUserPosts);
      }
      if (context.previousPost !== undefined) {
        queryClient.setQueryData(['post', context.postId], context.previousPost);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['totalLikes'] });
    },
  });
}

export function useGetFeed() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['feed'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeed();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePrefetchFeed() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return () => {
    if (actor) {
      queryClient.prefetchQuery({
        queryKey: ['feed'],
        queryFn: async () => actor.getFeed(),
        staleTime: 30 * 1000,
      });
    }
  };
}

export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userPrincipal }: { postId: string; userPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.likePost(postId);
    },
    onMutate: async ({ postId, userPrincipal }) => {
      const userPrincipalStr = userPrincipal.toString();

      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['userPosts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      const previousFeed = queryClient.getQueryData<Post[]>(['feed']);
      const previousPost = queryClient.getQueryData<Post | null>(['post', postId]);
      
      const previousUserPosts: Record<string, Post[]> = {};
      queryClient.getQueriesData<Post[]>({ queryKey: ['userPosts'] }).forEach(([key, data]) => {
        if (data) previousUserPosts[JSON.stringify(key)] = data;
      });

      const updatePost = (post: Post) => ({
        ...post,
        likes: [...post.likes, userPrincipal],
      });

      queryClient.setQueryData<Post[]>(['feed'], (old) =>
        old?.map(p => p.id === postId ? updatePost(p) : p)
      );

      queryClient.setQueryData<Post | null>(['post', postId], (old) =>
        old ? updatePost(old) : old
      );

      queryClient.getQueriesData<Post[]>({ queryKey: ['userPosts'] }).forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData<Post[]>(key, data.map(p => p.id === postId ? updatePost(p) : p));
        }
      });

      return { previousFeed, previousPost, previousUserPosts, postId, userPrincipalStr };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousFeed !== undefined) {
        queryClient.setQueryData(['feed'], context.previousFeed);
      }
      if (context.previousPost !== undefined) {
        queryClient.setQueryData(['post', context.postId], context.previousPost);
      }
      Object.entries(context.previousUserPosts).forEach(([key, data]) => {
        queryClient.setQueryData(JSON.parse(key), data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['totalLikes'] });
    },
  });
}

export function useUnlikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userPrincipal }: { postId: string; userPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.unlikePost(postId);
    },
    onMutate: async ({ postId, userPrincipal }) => {
      const userPrincipalStr = userPrincipal.toString();

      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['userPosts'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      const previousFeed = queryClient.getQueryData<Post[]>(['feed']);
      const previousPost = queryClient.getQueryData<Post | null>(['post', postId]);
      
      const previousUserPosts: Record<string, Post[]> = {};
      queryClient.getQueriesData<Post[]>({ queryKey: ['userPosts'] }).forEach(([key, data]) => {
        if (data) previousUserPosts[JSON.stringify(key)] = data;
      });

      const updatePost = (post: Post) => ({
        ...post,
        likes: post.likes.filter(p => p.toString() !== userPrincipalStr),
      });

      queryClient.setQueryData<Post[]>(['feed'], (old) =>
        old?.map(p => p.id === postId ? updatePost(p) : p)
      );

      queryClient.setQueryData<Post | null>(['post', postId], (old) =>
        old ? updatePost(old) : old
      );

      queryClient.getQueriesData<Post[]>({ queryKey: ['userPosts'] }).forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData<Post[]>(key, data.map(p => p.id === postId ? updatePost(p) : p));
        }
      });

      return { previousFeed, previousPost, previousUserPosts, postId, userPrincipalStr };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousFeed !== undefined) {
        queryClient.setQueryData(['feed'], context.previousFeed);
      }
      if (context.previousPost !== undefined) {
        queryClient.setQueryData(['post', context.postId], context.previousPost);
      }
      Object.entries(context.previousUserPosts).forEach(([key, data]) => {
        queryClient.setQueryData(JSON.parse(key), data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['totalLikes'] });
    },
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, text, userPrincipal }: { postId: string; text: string; userPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addComment(postId, text);
    },
    onMutate: async ({ postId, text, userPrincipal }) => {
      const tempId = `temp-comment-${Date.now()}`;
      const optimisticComment: Comment = {
        id: tempId,
        postId,
        author: userPrincipal,
        text,
        timestamp: BigInt(Date.now() * 1000000),
        likes: [],
      };

      await queryClient.cancelQueries({ queryKey: ['comments', postId] });

      const previousComments = queryClient.getQueryData<Comment[]>(['comments', postId]);

      queryClient.setQueryData<Comment[]>(['comments', postId], (old) => [...(old || []), optimisticComment]);

      return { previousComments, tempId, postId };
    },
    onSuccess: (realId, variables, context) => {
      if (!context) return;
      
      queryClient.setQueryData<Comment[]>(['comments', context.postId], (old) =>
        old?.map(c => c.id === context.tempId ? { ...c, id: realId } : c)
      );
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousComments !== undefined) {
        queryClient.setQueryData(['comments', context.postId], context.previousComments);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useGetComments(postId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getComments(postId);
    },
    enabled: !!actor && !actorFetching && !!postId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useLikeComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId, userPrincipal }: { commentId: string; postId: string; userPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.likeComment(commentId);
    },
    onMutate: async ({ commentId, postId, userPrincipal }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });

      const previousComments = queryClient.getQueryData<Comment[]>(['comments', postId]);

      queryClient.setQueryData<Comment[]>(['comments', postId], (old) =>
        old?.map(c => c.id === commentId ? { ...c, likes: [...c.likes, userPrincipal] } : c)
      );

      return { previousComments, postId };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousComments !== undefined) {
        queryClient.setQueryData(['comments', context.postId], context.previousComments);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    },
  });
}

export function useUnlikeComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId, userPrincipal }: { commentId: string; postId: string; userPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.unlikeComment(commentId);
    },
    onMutate: async ({ commentId, postId, userPrincipal }) => {
      const userPrincipalStr = userPrincipal.toString();

      await queryClient.cancelQueries({ queryKey: ['comments', postId] });

      const previousComments = queryClient.getQueryData<Comment[]>(['comments', postId]);

      queryClient.setQueryData<Comment[]>(['comments', postId], (old) =>
        old?.map(c => c.id === commentId ? { ...c, likes: c.likes.filter(p => p.toString() !== userPrincipalStr) } : c)
      );

      return { previousComments, postId };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousComments !== undefined) {
        queryClient.setQueryData(['comments', context.postId], context.previousComments);
      }
    },
  });
}

export function useFollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userToFollow, currentUserPrincipal }: { userToFollow: Principal; currentUserPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.followUser(userToFollow);
    },
    onMutate: async ({ userToFollow, currentUserPrincipal }) => {
      const userToFollowStr = userToFollow.toString();

      await queryClient.cancelQueries({ queryKey: ['currentUserProfile'] });
      await queryClient.cancelQueries({ queryKey: ['userProfile', userToFollowStr] });

      const previousCurrentProfile = queryClient.getQueryData<UserProfile | null>(['currentUserProfile']);
      const previousTargetProfile = queryClient.getQueryData<UserProfile | null>(['userProfile', userToFollowStr]);

      queryClient.setQueryData<UserProfile | null>(['currentUserProfile'], (old) =>
        old ? { ...old, following: [...old.following, userToFollow] } : old
      );

      queryClient.setQueryData<UserProfile | null>(['userProfile', userToFollowStr], (old) =>
        old ? { ...old, followers: [...old.followers, currentUserPrincipal] } : old
      );

      return { previousCurrentProfile, previousTargetProfile, userToFollowStr };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousCurrentProfile !== undefined) {
        queryClient.setQueryData(['currentUserProfile'], context.previousCurrentProfile);
      }
      if (context.previousTargetProfile !== undefined) {
        queryClient.setQueryData(['userProfile', context.userToFollowStr], context.previousTargetProfile);
      }
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userToUnfollow, currentUserPrincipal }: { userToUnfollow: Principal; currentUserPrincipal: Principal }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.unfollowUser(userToUnfollow);
    },
    onMutate: async ({ userToUnfollow, currentUserPrincipal }) => {
      const userToUnfollowStr = userToUnfollow.toString();
      const currentUserPrincipalStr = currentUserPrincipal.toString();

      await queryClient.cancelQueries({ queryKey: ['currentUserProfile'] });
      await queryClient.cancelQueries({ queryKey: ['userProfile', userToUnfollowStr] });

      const previousCurrentProfile = queryClient.getQueryData<UserProfile | null>(['currentUserProfile']);
      const previousTargetProfile = queryClient.getQueryData<UserProfile | null>(['userProfile', userToUnfollowStr]);

      queryClient.setQueryData<UserProfile | null>(['currentUserProfile'], (old) =>
        old ? { ...old, following: old.following.filter(p => p.toString() !== userToUnfollowStr) } : old
      );

      queryClient.setQueryData<UserProfile | null>(['userProfile', userToUnfollowStr], (old) =>
        old ? { ...old, followers: old.followers.filter(p => p.toString() !== currentUserPrincipalStr) } : old
      );

      return { previousCurrentProfile, previousTargetProfile, userToUnfollowStr };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      if (context.previousCurrentProfile !== undefined) {
        queryClient.setQueryData(['currentUserProfile'], context.previousCurrentProfile);
      }
      if (context.previousTargetProfile !== undefined) {
        queryClient.setQueryData(['userProfile', context.userToUnfollowStr], context.previousTargetProfile);
      }
    },
  });
}

export function useGetUserPosts(userPrincipal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post[]>({
    queryKey: ['userPosts', userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return [];
      return actor.getUserPosts(userPrincipal);
    },
    enabled: !!actor && !actorFetching && !!userPrincipal,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useGetTotalLikesForUser(userPrincipal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<number>({
    queryKey: ['totalLikes', userPrincipal?.toString()],
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
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Activity[]>({
    queryKey: ['inbox'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInbox();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useGetPost(postId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Post | null>({
    queryKey: ['post', postId],
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

export function usePrefetchUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return (userPrincipal: Principal) => {
    if (actor) {
      queryClient.prefetchQuery({
        queryKey: ['userProfile', userPrincipal.toString()],
        queryFn: async () => actor.getUserProfile(userPrincipal),
        staleTime: 3 * 60 * 1000,
      });
    }
  };
}

export function usePrefetchUserPosts() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return (userPrincipal: Principal) => {
    if (actor) {
      queryClient.prefetchQuery({
        queryKey: ['userPosts', userPrincipal.toString()],
        queryFn: async () => actor.getUserPosts(userPrincipal),
        staleTime: 2 * 60 * 1000,
      });
    }
  };
}
