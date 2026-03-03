import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@exam-portal/shared';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER],
  },
  {
    label: 'Users',
    icon: Users,
    path: '/users',
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Batches',
    icon: Layers,
    path: '/batches',
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    label: 'Question Bank',
    icon: BookOpen,
    path: '/questions',
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER],
  },
  {
    label: 'Tests',
    icon: ClipboardList,
    path: '/tests',
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER],
  },
  {
    label: 'Results',
    icon: BarChart3,
    path: '/results',
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER],
  },
  {
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const filteredItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-navy-900 text-white transition-all duration-200 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-blue-400 shrink-0" />
            <span className="font-heading font-semibold text-lg truncate">
              CBT Platform
            </span>
          </div>
        )}
        {collapsed && (
          <GraduationCap className="h-7 w-7 text-blue-400 mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/15 text-white border-l-2 border-blue-400'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                    collapsed && 'justify-center px-2',
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-white/50 truncate">{user.role}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full',
              collapsed && 'justify-center px-2',
            )}
            title="Logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
