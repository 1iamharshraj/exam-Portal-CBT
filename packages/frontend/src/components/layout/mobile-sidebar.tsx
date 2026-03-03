import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  X,
  GraduationCap,
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
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER] },
  { label: 'Users', icon: Users, path: '/users', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { label: 'Question Bank', icon: BookOpen, path: '/questions', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER] },
  { label: 'Tests', icon: ClipboardList, path: '/tests', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER] },
  { label: 'Results', icon: BarChart3, path: '/results', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
];

export function MobileSidebar() {
  const isOpen = useUIStore((s) => s.isMobileSidebarOpen);
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const filteredItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  );

  const handleLogout = async () => {
    closeMobileSidebar();
    await logout();
    navigate('/login');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={closeMobileSidebar}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-[280px] bg-navy-900 text-white z-50 md:hidden flex flex-col animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-blue-400" />
            <span className="font-heading font-semibold text-lg">CBT Platform</span>
          </div>
          <button onClick={closeMobileSidebar} className="text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-white/50">{user.role}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {filteredItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={closeMobileSidebar}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
