import { Home, PlusSquare, User, Bell } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === '/') return 'feed';
    if (location.pathname === '/create') return 'create';
    if (location.pathname === '/inbox') return 'inbox';
    if (location.pathname === '/profile') return 'profile';
    return 'feed';
  };

  const activeTab = getActiveTab();

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-xl z-10">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-center px-4 gap-2">
          <img 
            src="/assets/generated/icgram-logo-new-transparent.dim_200x200.png" 
            alt="ICgram" 
            className="h-8 w-8"
          />
          <h1 className="text-xl font-light tracking-tight">ICgram</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-2xl h-full">
          <Outlet />
        </div>
      </main>

      <nav className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-xl z-10">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-4">
          <button
            onClick={() => navigate({ to: '/' })}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'feed' ? 'text-foreground' : 'text-muted-foreground'
            }`}
            aria-label="Home"
          >
            <Home className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </button>

          <button
            onClick={() => navigate({ to: '/create' })}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'create' ? 'text-foreground' : 'text-muted-foreground'
            }`}
            aria-label="Create"
          >
            <PlusSquare className="h-6 w-6" />
            <span className="text-xs">Create</span>
          </button>

          <button
            onClick={() => navigate({ to: '/inbox' })}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'inbox' ? 'text-foreground' : 'text-muted-foreground'
            }`}
            aria-label="Inbox"
          >
            <Bell className="h-6 w-6" />
            <span className="text-xs">Inbox</span>
          </button>

          <button
            onClick={() => navigate({ to: '/profile' })}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'profile' ? 'text-foreground' : 'text-muted-foreground'
            }`}
            aria-label="Profile"
          >
            <User className="h-6 w-6" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
