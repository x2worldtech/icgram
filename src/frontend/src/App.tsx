import { lazy, Suspense, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, usePrefetchFeed } from './hooks/useQueries';
import LoginPage from './pages/LoginPage';
import ProfileSetupModal from './components/ProfileSetupModal';
import MainLayout from './components/MainLayout';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import FeedPage from './pages/FeedPage';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components for code splitting
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CreatorProfilePage = lazy(() => import('./pages/CreatorProfilePage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));

// Loading fallback component
function PageSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="w-full aspect-square rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: MainLayout,
});

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: FeedPage,
});

const createRoute_ = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <CreatePostPage />
    </Suspense>
  ),
});

const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inbox',
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <InboxPage />
    </Suspense>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <ProfilePage />
    </Suspense>
  ),
});

const creatorProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user/$principalId',
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <CreatorProfilePage />
    </Suspense>
  ),
});

const routeTree = rootRoute.addChildren([feedRoute, createRoute_, inboxRoute, profileRoute, creatorProfileRoute]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const prefetchFeed = usePrefetchFeed();

  const isAuthenticated = !!identity;

  // Prefetch feed data after login to speed up first visit
  useEffect(() => {
    if (isAuthenticated && userProfile && !profileLoading) {
      prefetchFeed();
    }
  }, [isAuthenticated, userProfile, profileLoading, prefetchFeed]);

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/assets/generated/app-logo.dim_200x200.png" alt="Logo" className="h-20 w-20 animate-pulse rounded-3xl" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show minimal loading for profile check to enable instant transition
  if (profileLoading && !isFetched) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/assets/generated/app-logo.dim_200x200.png" alt="Logo" className="h-20 w-20 animate-pulse rounded-3xl" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return <>{showProfileSetup ? <ProfileSetupModal /> : <RouterProvider router={router} />}</>;
}
