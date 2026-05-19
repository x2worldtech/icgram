import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect } from "react";
import MainLayout from "./components/MainLayout";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { useGetCallerUserProfile, usePrefetchFeed } from "./hooks/useQueries";
import FeedPage from "./pages/FeedPage";
import LoginPage from "./pages/LoginPage";

// Lazy load heavy components for code splitting
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CreatorProfilePage = lazy(() => import("./pages/CreatorProfilePage"));
const InboxPage = lazy(() => import("./pages/InboxPage"));

// Lightweight in-app loader for lazy-loaded route transitions
function PageSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background py-16">
      <div className="relative h-16 w-16">
        <svg
          aria-hidden="true"
          focusable="false"
          className="absolute inset-0"
          width="64"
          height="64"
          viewBox="0 0 100 100"
          fill="none"
          style={{ animation: "icgram-spin 1.4s linear infinite" }}
        >
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="rgba(120,120,140,0.12)"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="264"
            strokeDashoffset="180"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}

// Premium full-screen loading screen — no PNG, just SVG animation
function AppLoadingScreen({ message = "Loading" }: { message?: string }) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#04060f] text-white">
      {/* Same animated background as login, slightly more restrained */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, #0b1a3a 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, #0a1330 0%, transparent 55%), linear-gradient(180deg, #04060f 0%, #02030a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0) 60%)",
          filter: "blur(60px)",
          animation: "icgram-orb-1 22s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-0 h-[460px] w-[460px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(96,165,250,0.35) 0%, rgba(96,165,250,0) 65%)",
          filter: "blur(70px)",
          animation: "icgram-orb-3 30s ease-in-out infinite",
        }}
      />

      {/* Loader */}
      <div className="relative z-10 flex flex-col items-center gap-7">
        <div className="relative h-24 w-24">
          {/* Soft pulsing glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 70%)",
              filter: "blur(20px)",
              animation: "icgram-glow-pulse 2.4s ease-in-out infinite",
            }}
          />
          {/* Outer ring – arc that rotates */}
          <svg
            aria-hidden="true"
            focusable="false"
            className="absolute inset-0"
            width="96"
            height="96"
            viewBox="0 0 100 100"
            fill="none"
            style={{ animation: "icgram-spin 1.6s linear infinite" }}
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="2"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="url(#icgramLoaderGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="276"
              strokeDashoffset="200"
              fill="none"
            />
            <defs>
              <linearGradient
                id="icgramLoaderGrad"
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
          </svg>
          {/* Inner ring – counter-rotates */}
          <svg
            aria-hidden="true"
            focusable="false"
            className="absolute inset-0"
            width="96"
            height="96"
            viewBox="0 0 100 100"
            fill="none"
            style={{
              animation: "icgram-spin-reverse 2.6s linear infinite",
            }}
          >
            <circle
              cx="50"
              cy="50"
              r="34"
              stroke="rgba(96,165,250,0.18)"
              strokeWidth="1"
              fill="none"
              strokeDasharray="4 6"
            />
          </svg>
        </div>

        <p
          className="text-sm font-medium tracking-wide text-slate-300"
          style={{
            animation: "icgram-loader-text 1.8s ease-in-out infinite",
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: MainLayout,
});

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: FeedPage,
});

const createRoute_ = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create",
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <CreatePostPage />
    </Suspense>
  ),
});

const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inbox",
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <InboxPage />
    </Suspense>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <ProfilePage />
    </Suspense>
  ),
});

const creatorProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user/$principalId",
  component: () => (
    <Suspense fallback={<PageSkeleton />}>
      <CreatorProfilePage />
    </Suspense>
  ),
});

const routeTree = rootRoute.addChildren([
  feedRoute,
  createRoute_,
  inboxRoute,
  profileRoute,
  creatorProfileRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  const prefetchFeed = usePrefetchFeed();

  const isAuthenticated = !!identity;

  // Prefetch feed data after login to speed up first visit
  useEffect(() => {
    if (isAuthenticated && userProfile && !profileLoading) {
      prefetchFeed();
    }
  }, [isAuthenticated, userProfile, profileLoading, prefetchFeed]);

  if (isInitializing) {
    return <AppLoadingScreen message="Loading" />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show minimal loading for profile check to enable instant transition
  if (profileLoading && !isFetched) {
    return <AppLoadingScreen message="Loading profile" />;
  }

  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  return (
    <>
      {showProfileSetup ? (
        <ProfileSetupModal />
      ) : (
        <RouterProvider router={router} />
      )}
    </>
  );
}
