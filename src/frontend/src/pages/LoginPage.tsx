import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#04060f] px-6 text-white">
      {/* ---------- Animated background layer ---------- */}
      {/* Base radial gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, #0b1a3a 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, #0a1330 0%, transparent 55%), linear-gradient(180deg, #04060f 0%, #02030a 100%)",
        }}
      />

      {/* Subtle moving grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.08) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, transparent 80%)",
          animation: "icgram-grid-pan 40s linear infinite",
        }}
      />

      {/* Floating blue orbs */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 60%)",
          filter: "blur(60px)",
          animation: "icgram-orb-1 22s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -right-40 top-1/4 h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(37,99,235,0.45) 0%, rgba(37,99,235,0) 60%)",
          filter: "blur(70px)",
          animation: "icgram-orb-2 26s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/4 h-[600px] w-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(96,165,250,0.35) 0%, rgba(96,165,250,0) 65%)",
          filter: "blur(80px)",
          animation: "icgram-orb-3 30s ease-in-out infinite",
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ---------- Foreground content ---------- */}
      <main className="relative z-10 flex w-full max-w-sm flex-col items-center">
        {/* Wordmark – pb-2 so descender of 'g' isn't clipped by the gradient mask */}
        <h1
          className="bg-gradient-to-b from-white via-white to-blue-200 bg-clip-text pb-2 text-center text-6xl font-bold tracking-tight text-transparent"
          style={{
            letterSpacing: "-0.04em",
            animation:
              "icgram-fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s both",
          }}
        >
          ICgram
        </h1>

        {/* Tagline */}
        <p
          className="mt-3 text-center text-[15px] font-medium text-slate-400"
          style={{
            animation:
              "icgram-fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.18s both",
          }}
        >
          Share your moments with the world
        </p>

        {/* CTA */}
        <div
          className="mt-12 w-full"
          style={{
            animation:
              "icgram-fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.28s both",
          }}
        >
          <Button
            onClick={login}
            disabled={isLoggingIn}
            size="lg"
            className="group relative h-12 w-full overflow-hidden rounded-full border-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 text-base font-semibold text-white shadow-[0_10px_30px_-8px_rgba(59,130,246,0.55),inset_0_1px_0_0_rgba(255,255,255,0.2)] transition-all duration-300 hover:translate-y-[-1px] hover:from-blue-500 hover:via-blue-400 hover:to-blue-600 hover:shadow-[0_14px_40px_-8px_rgba(59,130,246,0.75),inset_0_1px_0_0_rgba(255,255,255,0.25)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-80"
          >
            {/* Shimmer sweep — fades in and out across full travel, then idle */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
              style={{
                animation: "icgram-shimmer 4.8s ease-in-out infinite 0.4s",
              }}
            />
            {isLoggingIn ? (
              <span className="relative flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                Logging in...
              </span>
            ) : (
              <span className="relative flex items-center justify-center gap-2">
                <LogIn className="h-5 w-5" />
                Login with Internet Identity
              </span>
            )}
          </Button>
        </div>

        <p
          className="mt-5 text-center text-xs text-slate-500"
          style={{
            animation:
              "icgram-fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.36s both",
          }}
        >
          By logging in, you agree to our terms of service
        </p>
      </main>

      <footer className="absolute bottom-4 z-10 text-center text-xs text-slate-500">
        © 2025. Built with love using{" "}
        <a
          href="https://caffeine.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 underline decoration-slate-600 underline-offset-2 transition-colors hover:text-blue-300"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
