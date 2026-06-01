import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps {
  title: string;
  columns: Column[];
  rows?: Record<string, ReactNode>[];
  emptyMessage?: string;
  onRowClick?: (index: number) => void;
  footer?: ReactNode;
}

export function DataTable({ title, columns, rows, emptyMessage = 'Nenhum dado disponível', onRowClick, footer }: DataTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.headerClassName ?? col.className}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows && rows.length > 0 ? (
              rows.map((row, i) => (
                <TableRow
                  key={i}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => onRowClick?.(i)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>{row[col.key] ?? '—'}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  {/* TODO: Conectar dados reais via Supabase */}
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {footer && (
          <div className="mt-4 border-t border-border pt-3">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
