# Specification

## Summary
**Goal:** Make the app feel faster by implementing consistent optimistic UI updates for key user actions using React Query cache-first mutations with rollback.

**Planned changes:**
- Move optimistic behavior for key mutations into React Query mutation hooks in `frontend/src/hooks/useQueries.ts` using `onMutate` (optimistic cache update), `onError` (rollback), and minimal targeted invalidation/refetch only when needed.
- Update UI components to rely on the unified optimistic React Query cache state (instead of per-component local optimistic state) so all entry points behave identically (e.g., PostCard vs PostDetailModal; CommentsModal vs PostDetailModal).
- Apply optimistic cache updates for post create/delete to the feed (`['feed']`) and user posts (`['userPosts', principal]`) lists so changes appear immediately without requiring a full refetch when navigating.

**User-visible outcome:** Likes, comments, follows, profile saves, and post create/delete update immediately in the UI across the app, and automatically roll back to the previous state if a request fails, while staying consistent with backend data once mutations complete.
