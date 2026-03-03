import { MoreHorizontal, Shield, GraduationCap, BookOpen } from 'lucide-react';
import type { IUser } from '@exam-portal/shared';
import { UserRole } from '@exam-portal/shared';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserTableProps {
  users: IUser[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (user: IUser) => void;
  onToggleStatus: (user: IUser) => void;
  onDelete: (user: IUser) => void;
  isLoading: boolean;
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  [UserRole.SUPER_ADMIN]: {
    label: 'Super Admin',
    icon: Shield,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  [UserRole.ADMIN]: {
    label: 'Admin',
    icon: Shield,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  [UserRole.TEACHER]: {
    label: 'Teacher',
    icon: BookOpen,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  [UserRole.STUDENT]: {
    label: 'Student',
    icon: GraduationCap,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
};

export function UserTable({
  users,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onToggleStatus,
  onDelete,
  isLoading,
}: UserTableProps) {
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u._id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading users...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden sm:table-cell">Role</TableHead>
            <TableHead className="hidden lg:table-cell">Batch</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG[UserRole.STUDENT];
            const RoleIcon = roleConfig.icon;

            return (
              <TableRow key={user._id} className={cn(selectedIds.has(user._id) && 'bg-muted/50')}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(user._id)}
                    onCheckedChange={() => onToggleSelect(user._id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary" className={cn('gap-1 font-normal', roleConfig.className)}>
                    <RoleIcon className="h-3 w-3" />
                    {roleConfig.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {user.batch || '—'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={user.isActive ? 'default' : 'secondary'}
                    className={cn(
                      user.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                    )}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(user)}>
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(user)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
