import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Mapping {
  source: string;
  sap_field: string;
}

interface ColumnMapperProps {
  required: Mapping[];
  optional: Mapping[];
  missing: Array<{ sap_field: string; note: string }>;
}

export const ColumnMapper = ({ required, optional, missing }: ColumnMapperProps) => {
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
                <h4 className="font-medium">Champs requis mappés</h4>
                <Badge variant="secondary" className="ml-auto">
                  {required.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {required.map((mapping, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20"
                  >
                    <Badge variant="outline" className="font-mono text-xs">
                      {mapping.source}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-success" />
                    <Badge className="bg-success text-success-foreground">
                      {mapping.sap_field}
                    </Badge>
                  </div>
                ))}
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
              <div className="space-y-2">
                {optional.map((mapping, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <Badge variant="outline" className="font-mono text-xs">
                      {mapping.source}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-primary" />
                    <Badge className="bg-primary text-primary-foreground">
                      {mapping.sap_field}
                    </Badge>
                  </div>
                ))}
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
