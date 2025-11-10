import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataPreviewProps {
  headers: string[];
  rows: Record<string, any>[];
  totalRows?: number;
}

export const DataPreview = ({ headers, rows, totalRows }: DataPreviewProps) => {
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
                <TableHead key={idx} className="font-semibold whitespace-nowrap">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {headers.map((header, cellIdx) => (
                  <TableCell key={cellIdx} className="font-mono text-xs whitespace-nowrap">
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
