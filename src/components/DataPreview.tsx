import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CsvRow } from '@/types/csv';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataPreviewProps {
  headers: string[];
  rows: CsvRow[];
  totalRows?: number;
  mappedHeaders?: string[];
  unmappedHeaders?: string[];
}

export const DataPreview = ({ headers, rows, totalRows, mappedHeaders, unmappedHeaders }: DataPreviewProps) => {
  const mappedSet = new Set(mappedHeaders ?? []);
  const unmappedSet = new Set(unmappedHeaders ?? []);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Aperçu des données</h3>
        <Badge variant="secondary">
          {rows.length} {totalRows ? `/ ${totalRows}` : ''} lignes
        </Badge>
      </div>

      <ScrollArea className="h-[300px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header, idx) => (
                <TableHead
                  key={idx}
                  className={cn(
                    'font-semibold whitespace-nowrap',
                    mappedSet.has(header) && 'bg-success/10 text-success border-y border-success/30',
                    !mappedSet.has(header) && unmappedSet.has(header) && 'bg-muted/40 text-muted-foreground',
                  )}
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {headers.map((header, cellIdx) => (
                  <TableCell
                    key={cellIdx}
                    className={cn(
                      'font-mono text-xs whitespace-nowrap',
                      mappedSet.has(header) && 'bg-success/5',
                      !mappedSet.has(header) && unmappedSet.has(header) && 'bg-muted/20 text-muted-foreground',
                    )}
                  >
                    {row[header] || '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
};
