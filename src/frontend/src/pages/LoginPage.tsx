import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <img 
            src="/assets/generated/icgram-logo-new-transparent.dim_200x200.png" 
            alt="ICgram Logo" 
            className="h-24 w-24"
          />
          <h1 className="text-4xl font-light tracking-tight text-foreground">Welcome</h1>
          <p className="text-center text-sm text-muted-foreground">
            Share your moments with the world
          </p>
        </div>

        <Button
          onClick={login}
          disabled={isLoggingIn}
          size="lg"
          className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-200"
        >
          {isLoggingIn ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Logging in...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Login
            </span>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By logging in, you agree to our terms of service
        </p>
      </div>

      <footer className="absolute bottom-4 text-center text-xs text-muted-foreground">
        © 2025. Built with love using{' '}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="underline">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
