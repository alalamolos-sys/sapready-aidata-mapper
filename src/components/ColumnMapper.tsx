import { ChangeEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface ColumnMapperField {
  sap_field: string;
  source: string | null;
  autoSource: string | null;
  note?: string;
}

interface ColumnMapperProps {
  headers: string[];
  required: ColumnMapperField[];
  optional: ColumnMapperField[];
  missing: Array<{ sap_field: string; note: string }>;
  onMappingChange: (sapField: string, source: string | null) => void;
}

export const ColumnMapper = ({
  headers,
  required,
  optional,
  missing,
  onMappingChange,
}: ColumnMapperProps) => {
  const renderSelect = (entry: ColumnMapperField, isRequired: boolean) => {
    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onMappingChange(entry.sap_field, value ? value : null);
    };

    const hasValue = !!entry.source;
    const autoDifferent = entry.autoSource && entry.autoSource !== entry.source;

    return (
      <div
        key={entry.sap_field}
        className={cn(
          'flex flex-col gap-2 p-4 rounded-lg border transition-colors',
          isRequired
            ? hasValue
              ? 'bg-success/5 border-success/30'
              : 'bg-destructive/5 border-destructive/40'
            : hasValue
              ? 'bg-primary/5 border-primary/30'
              : 'bg-muted/40 border-muted',
        )}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {entry.sap_field}
          </Badge>
          <ArrowRight className={cn('w-4 h-4', hasValue ? 'text-foreground' : 'text-muted-foreground')} />
          <Badge
            variant={hasValue ? 'secondary' : 'outline'}
            className={cn(
              'font-mono text-xs min-w-[6rem] text-center',
              hasValue ? 'bg-background text-foreground border' : 'text-muted-foreground',
            )}
          >
            {entry.source ?? 'Non mappé'}
          </Badge>
        </div>

        <select
          value={entry.source ?? ''}
          onChange={handleChange}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
        >
          <option value="">Sélectionner une colonne…</option>
          {headers.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>

        <div className="space-y-1 text-xs text-muted-foreground">
          {entry.autoSource && (
            <p>
              Suggestion auto&nbsp;: <span className="font-medium">{entry.autoSource}</span>
              {autoDifferent ? ' (modifiée)' : ''}
            </p>
          )}
          {isRequired && !hasValue && (
            <p className="text-destructive">
              {entry.note ?? 'Champ requis non mappé'}
            </p>
          )}
          {!isRequired && !hasValue && <p>Champ optionnel non utilisé.</p>}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Mapping des colonnes</h3>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {/* Required mappings */}
          {required.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <h4 className="font-medium">Champs requis</h4>
                <Badge variant="secondary" className="ml-auto">
                  {required.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {required.map((entry) => renderSelect(entry, true))}
              </div>
            </div>
          )}

          {/* Optional mappings */}
          {optional.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-primary" />
                <h4 className="font-medium">Champs optionnels</h4>
                <Badge variant="secondary" className="ml-auto">
                  {optional.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {optional.map((entry) => renderSelect(entry, false))}
              </div>
            </div>
          )}

          {/* Missing fields */}
          {missing.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-destructive" />
                <h4 className="font-medium">Champs manquants</h4>
                <Badge variant="destructive" className="ml-auto">
                  {missing.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {missing.map((field, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                  >
                    <Badge variant="destructive" className="mb-2">
                      {field.sap_field}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{field.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
