import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, Moon, Sun, Monitor, LogOut, User } from 'lucide-react';

import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { BreadcrumbTrail } from '@/components/common/breadcrumb-trail';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'User Management',
  '/questions': 'Question Bank',
  '/tests': 'Tests',
  '/results': 'Results',
  '/settings': 'Settings',
  '/batches': 'Batch Management',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

  // Match dynamic routes by prefix
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    // e.g. /tests/:id/builder → "Test Builder", /tests/:id → "Test Details"
    const base = `/${segments[0]}`;
    const suffix = segments[segments.length - 1];
    const baseTitle = ROUTE_TITLES[base];
    if (baseTitle) {
      if (suffix === 'builder') return 'Test Builder';
      if (suffix === 'create') return `Create ${baseTitle.replace(' Management', '')}`;
      return baseTitle;
    }
  }

  // Student routes
  if (pathname.startsWith('/student')) return 'Dashboard';

  return 'Dashboard';
}

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const pageTitle = getPageTitle(location.pathname);

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '?';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggleMobileSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title + Breadcrumbs */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-heading font-semibold text-foreground truncate">
          {pageTitle}
        </h1>
        <BreadcrumbTrail />
      </div>

      {/* Search */}
      <div className="hidden lg:flex items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search... (Ctrl+K)"
            className="h-9 w-[240px] rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            readOnly
          />
        </div>
      </div>

      {/* Theme toggle */}
      <Button variant="ghost" size="icon" onClick={cycleTheme} title={`Theme: ${theme}`}>
        <ThemeIcon className="h-4 w-4" />
      </Button>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              0
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="py-6 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <User className="mr-2 h-4 w-4" />
            Profile & Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
