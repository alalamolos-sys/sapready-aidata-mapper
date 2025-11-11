import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, Clock3, AlertTriangle, RotateCcw } from 'lucide-react';
import type { Target } from '@/lib/sapreadyCore';
import type { ProcessedFileData } from './FileUploader';
import { getObjectMetadata, getObjectLabel } from './objectMetadata';

export interface HistoryEntry {
  id: string;
  filename: string;
  target: Target;
  uploadedAt: Date;
  rowCount: number;
  errors: number;
  warnings: number;
  fileData: ProcessedFileData;
}

interface RecentImportsProps {
  entries: HistoryEntry[];
  onReload: (id: string) => void;
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);

export const RecentImports = ({ entries, onReload }: RecentImportsProps) => {
  return (
    <Card className="p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Imports récents</h3>
        </div>
        <Badge variant="secondary">{entries.length}</Badge>
      </div>

      {!entries.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-3">
          <Clock3 className="w-6 h-6" />
          <p className="text-sm">Importez un premier fichier pour alimenter l’historique.</p>
        </div>
      ) : (
        <ScrollArea className="h-[360px] pr-2">
          <div className="space-y-3">
            {entries.map((entry) => {
              const meta = getObjectMetadata(entry.target);
              const label = getObjectLabel(entry.target);

              return (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 bg-card/80 backdrop-blur-sm hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium truncate" title={entry.filename}>
                        {entry.filename}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={meta.colorClass}>
                          {label}
                        </Badge>
                        <span>{formatDate(entry.uploadedAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {(entry.errors > 0 || entry.warnings > 0) && (
                        <Badge
                          variant={entry.errors > 0 ? 'destructive' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {entry.errors} err. / {entry.warnings} warn.
                        </Badge>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onReload(entry.id)}
                        className="gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Recharger
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{entry.rowCount} lignes</Badge>
                    <Badge variant="outline">{entry.errors} erreurs</Badge>
                    <Badge variant="outline">{entry.warnings} warnings</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};
