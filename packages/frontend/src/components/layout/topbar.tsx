import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell, Moon, Sun, Monitor } from 'lucide-react';

import { useUIStore } from '@/stores/ui.store';
import { Button } from '@/components/ui/button';
import { BreadcrumbTrail } from '@/components/common/breadcrumb-trail';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'User Management',
  '/questions': 'Question Bank',
  '/tests': 'Tests',
  '/results': 'Results',
  '/settings': 'Settings',
};

export function TopBar() {
  const location = useLocation();
  const toggleMobileSidebar = useUIStore((s) => s.toggleMobileSidebar);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const pageTitle = ROUTE_TITLES[location.pathname] || 'Dashboard';

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

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
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-4 w-4" />
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          3
        </span>
      </Button>
    </header>
  );
}
