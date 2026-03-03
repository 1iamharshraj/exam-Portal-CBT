import { MoreHorizontal, Users } from 'lucide-react';
import type { IBatch } from '@exam-portal/shared';
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

interface BatchWithCount extends IBatch {
  studentCount: number;
}

interface BatchTableProps {
  batches: BatchWithCount[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (batch: BatchWithCount) => void;
  onToggleStatus: (batch: BatchWithCount) => void;
  onDelete: (batch: BatchWithCount) => void;
  isLoading: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BatchTable({
  batches,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onToggleStatus,
  onDelete,
  isLoading,
}: BatchTableProps) {
  const allSelected = batches.length > 0 && batches.every((b) => selectedIds.has(b._id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading batches...
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No batches found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Code</TableHead>
            <TableHead className="hidden md:table-cell">Students</TableHead>
            <TableHead className="hidden lg:table-cell">Start Date</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch._id} className={cn(selectedIds.has(batch._id) && 'bg-muted/50')}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(batch._id)}
                  onCheckedChange={() => onToggleSelect(batch._id)}
                />
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{batch.name}</p>
                  {batch.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{batch.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground sm:hidden">{batch.code}</p>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline" className="font-mono text-xs">
                  {batch.code}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {batch.studentCount}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {formatDate(batch.startDate)}
                {batch.endDate && ` – ${formatDate(batch.endDate)}`}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge
                  variant={batch.isActive ? 'default' : 'secondary'}
                  className={cn(
                    batch.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                  )}
                >
                  {batch.isActive ? 'Active' : 'Inactive'}
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
                    <DropdownMenuItem onClick={() => onEdit(batch)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(batch)}>
                      {batch.isActive ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(batch)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
