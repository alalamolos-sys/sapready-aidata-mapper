import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface Issue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: { row?: number; source?: string };
  hint?: string;
}

interface ValidationPanelProps {
  issues: Issue[];
  summary: { errors: number; warnings: number; infos: number };
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
    borderColor: 'border-destructive/20',
    label: 'Erreurs'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/5',
    borderColor: 'border-warning/20',
    label: 'Avertissements'
  },
  info: {
    icon: Info,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
    label: 'Informations'
  }
};

export const ValidationPanel = ({ issues, summary }: ValidationPanelProps) => {
  const errorIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');

  const renderIssues = (filteredIssues: Issue[]) => (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mb-3" />
            <p>Aucun problème détecté</p>
          </div>
        ) : (
          filteredIssues.map((issue, idx) => {
            const config = severityConfig[issue.severity];
            const Icon = config.icon;

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-1">{issue.message}</p>
                    {issue.location && (
                      <div className="flex items-center gap-2 mb-2">
                        {issue.location.row && (
                          <Badge variant="outline" className="text-xs">
                            Ligne {issue.location.row}
                          </Badge>
                        )}
                        {issue.location.source && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {issue.location.source}
                          </Badge>
                        )}
                      </div>
                    )}
                    {issue.hint && (
                      <p className="text-sm text-muted-foreground">{issue.hint}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Validation des données</h3>
        <div className="flex items-center gap-2">
          {summary.errors > 0 && (
            <Badge variant="destructive">{summary.errors} erreurs</Badge>
          )}
          {summary.warnings > 0 && (
            <Badge className="bg-warning text-warning-foreground">
              {summary.warnings} warnings
            </Badge>
          )}
          {summary.infos > 0 && (
            <Badge variant="secondary">{summary.infos} infos</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Tous ({issues.length})
          </TabsTrigger>
          <TabsTrigger value="errors">
            Erreurs ({summary.errors})
          </TabsTrigger>
          <TabsTrigger value="warnings">
            Warnings ({summary.warnings})
          </TabsTrigger>
          <TabsTrigger value="info">
            Info ({summary.infos})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {renderIssues(issues)}
        </TabsContent>

        <TabsContent value="errors" className="mt-4">
          {renderIssues(errorIssues)}
        </TabsContent>

        <TabsContent value="warnings" className="mt-4">
          {renderIssues(warningIssues)}
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          {renderIssues(infoIssues)}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
