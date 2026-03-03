import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBatchSchema, updateBatchSchema } from '@exam-portal/shared';
import type { IBatch } from '@exam-portal/shared';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type CreateFormData = z.infer<typeof createBatchSchema>;
type UpdateFormData = z.infer<typeof updateBatchSchema>;

interface BatchDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFormData | UpdateFormData) => Promise<void>;
  batch?: IBatch | null;
  isSubmitting: boolean;
}

export function BatchDialog({ open, onClose, onSubmit, batch, isSubmitting }: BatchDialogProps) {
  const isEditing = !!batch;
  const schema = isEditing ? updateBatchSchema : createBatchSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(schema as z.ZodType<CreateFormData>),
  });

  useEffect(() => {
    if (open) {
      if (batch) {
        reset({
          name: batch.name,
          code: batch.code,
          description: batch.description || '',
          startDate: batch.startDate ? batch.startDate.slice(0, 10) : '',
          endDate: batch.endDate ? batch.endDate.slice(0, 10) : '',
        });
      } else {
        reset({
          name: '',
          code: '',
          description: '',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: '',
        });
      }
    }
  }, [open, batch, reset]);

  const handleFormSubmit = async (data: CreateFormData) => {
    // Remove empty optional fields
    const cleaned = { ...data };
    if (!cleaned.description) delete cleaned.description;
    if (!cleaned.endDate) delete cleaned.endDate;
    await onSubmit(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Batch' : 'Create Batch'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch Name</Label>
              <Input id="name" {...register('name')} placeholder="JEE 2026 Batch A" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Batch Code</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="JEE-2026-A"
                className="uppercase"
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Brief description of this batch"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
