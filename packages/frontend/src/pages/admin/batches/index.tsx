import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { IBatch, ICreateBatchRequest, IUpdateBatchRequest } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/common/pagination';
import { batchService, type BatchFilters as Filters } from '@/services/batch.service';
import { BatchFilters } from './batch-filters';
import { BatchTable } from './batch-table';
import { BatchDialog } from './batch-dialog';

type BatchWithCount = IBatch & { studentCount: number };

export function BatchListPage() {
  const [batches, setBatches] = useState<BatchWithCount[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchWithCount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Filters = { page, limit };
      if (search) filters.search = search;
      if (status && status !== 'all') filters.status = status;

      const result = await batchService.getAll(filters);
      setBatches(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status, limit]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

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
    if (batches.every((b) => selectedIds.has(b._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(batches.map((b) => b._id)));
    }
  };

  const handleCreate = () => {
    setEditingBatch(null);
    setDialogOpen(true);
  };

  const handleEdit = (batch: BatchWithCount) => {
    setEditingBatch(batch);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (data: ICreateBatchRequest | IUpdateBatchRequest) => {
    setIsSubmitting(true);
    try {
      if (editingBatch) {
        await batchService.update(editingBatch._id, data as IUpdateBatchRequest);
        toast.success('Batch updated');
      } else {
        await batchService.create(data as ICreateBatchRequest);
        toast.success('Batch created');
      }
      setDialogOpen(false);
      fetchBatches();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Operation failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (batch: BatchWithCount) => {
    try {
      await batchService.update(batch._id, { isActive: !batch.isActive });
      toast.success(`${batch.name} ${batch.isActive ? 'deactivated' : 'activated'}`);
      fetchBatches();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (batch: BatchWithCount) => {
    if (!confirm(`Delete batch "${batch.name}"? This cannot be undone.`)) return;
    try {
      await batchService.delete(batch._id);
      toast.success('Batch deleted');
      fetchBatches();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete batch';
      toast.error(message);
    }
  };

  const handleBulkActivate = async () => {
    const ids = Array.from(selectedIds);
    try {
      await batchService.bulkUpdateStatus(ids, true);
      toast.success(`${ids.length} batch(es) activated`);
      setSelectedIds(new Set());
      fetchBatches();
    } catch {
      toast.error('Bulk activate failed');
    }
  };

  const handleBulkDeactivate = async () => {
    const ids = Array.from(selectedIds);
    try {
      await batchService.bulkUpdateStatus(ids, false);
      toast.success(`${ids.length} batch(es) deactivated`);
      setSelectedIds(new Set());
      fetchBatches();
    } catch {
      toast.error('Bulk deactivate failed');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Delete ${ids.length} batches? Only empty batches (no students) will be deleted.`)) return;
    try {
      const result = await batchService.bulkDelete(ids);
      toast.success(`${result.deletedCount} batch(es) deleted`);
      setSelectedIds(new Set());
      fetchBatches();
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold">Batches</h2>
          <p className="text-sm text-muted-foreground">{total} total batches</p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Create Batch
        </Button>
      </div>

      {/* Filters */}
      <BatchFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onClear={handleClearFilters}
      />

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
          <span className="text-sm font-medium ml-2">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleBulkActivate}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Activate
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkDeactivate}>
            <XCircle className="h-4 w-4 mr-1" />
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
          <BatchTable
            batches={batches}
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

      {/* Dialog */}
      <BatchDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        batch={editingBatch}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
