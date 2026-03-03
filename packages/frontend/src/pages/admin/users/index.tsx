import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Trash2, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import type { IUser, ICreateUserRequest, IUpdateUserRequest } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/common/pagination';
import { userService, type UserFilters as Filters } from '@/services/user.service';
import { UserFilters } from './user-filters';
import { UserTable } from './user-table';
import { UserDialog } from './user-dialog';
import { BulkImportDialog } from './bulk-import-dialog';

export function UserListPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Dialogs
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Filters = { page, limit };
      if (search) filters.search = search;
      if (role && role !== 'all') filters.role = role;
      if (status && status !== 'all') filters.status = status;

      const result = await userService.getAll(filters);
      setUsers(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, role, status, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (users.every((u) => selectedIds.has(u._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u._id)));
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setUserDialogOpen(true);
  };

  const handleEdit = (user: IUser) => {
    setEditingUser(user);
    setUserDialogOpen(true);
  };

  const handleDialogSubmit = async (data: ICreateUserRequest | IUpdateUserRequest) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await userService.update(editingUser._id, data as IUpdateUserRequest);
        toast.success('User updated');
      } else {
        await userService.create(data as ICreateUserRequest);
        toast.success('User created');
      }
      setUserDialogOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Operation failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: IUser) => {
    try {
      await userService.update(user._id, { isActive: !user.isActive });
      toast.success(`${user.firstName} ${user.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (user: IUser) => {
    if (!confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
    try {
      await userService.delete(user._id);
      toast.success('User deleted');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleBulkActivate = async () => {
    const ids = Array.from(selectedIds);
    try {
      await userService.bulkUpdateStatus(ids, true);
      toast.success(`${ids.length} user(s) activated`);
      setSelectedIds(new Set());
      fetchUsers();
    } catch {
      toast.error('Bulk activate failed');
    }
  };

  const handleBulkDeactivate = async () => {
    const ids = Array.from(selectedIds);
    try {
      await userService.bulkUpdateStatus(ids, false);
      toast.success(`${ids.length} user(s) deactivated`);
      setSelectedIds(new Set());
      fetchUsers();
    } catch {
      toast.error('Bulk deactivate failed');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Delete ${ids.length} users? This cannot be undone.`)) return;
    try {
      await userService.bulkDelete(ids);
      toast.success(`${ids.length} user(s) deleted`);
      setSelectedIds(new Set());
      fetchUsers();
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handleImport = async (
    users: Array<{ email: string; firstName: string; lastName: string; role: string; phone?: string; batch?: string }>,
  ) => {
    const result = await userService.bulkImport(users);
    if (result.created > 0) fetchUsers();
    return result;
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setRole('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">{total} total users</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <UserFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        role={role}
        onRoleChange={(v) => { setRole(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        onClear={handleClearFilters}
      />

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
          <span className="text-sm font-medium ml-2">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleBulkActivate}>
            <UserCheck className="h-4 w-4 mr-1" />
            Activate
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkDeactivate}>
            <UserX className="h-4 w-4 mr-1" />
            Deactivate
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <UserTable
            users={users}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {/* Dialogs */}
      <UserDialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        user={editingUser}
        isSubmitting={isSubmitting}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
