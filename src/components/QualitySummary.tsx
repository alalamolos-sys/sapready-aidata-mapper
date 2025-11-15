import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, FileSpreadsheet } from 'lucide-react';

interface QualitySummaryProps {
  summary: { errors: number; warnings: number; infos: number };
  sheetCount: number;
}

const metrics = (
  summary: QualitySummaryProps['summary'],
  sheetCount: number,
) => [
  {
    label: 'Erreurs',
    value: summary.errors,
    icon: AlertCircle,
    badgeVariant: 'destructive' as const,
    description: "Points bloquants à corriger avant l'import.",
  },
  {
    label: 'Warnings',
    value: summary.warnings,
    icon: AlertTriangle,
    badgeVariant: 'secondary' as const,
    description: 'Points à vérifier pour sécuriser le chargement.',
  },
  {
    label: 'Infos',
    value: summary.infos,
    icon: Info,
    badgeVariant: 'outline' as const,
    description: 'Recommandations et informations complémentaires.',
  },
  {
    label: 'Feuilles LTMC',
    value: sheetCount,
    icon: FileSpreadsheet,
    badgeVariant: 'default' as const,
    description: 'Exports générés automatiquement par le moteur.',
  },
];

export const QualitySummary = ({ summary, sheetCount }: QualitySummaryProps) => {
  const items = metrics(summary, sheetCount);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Synthèse de l'analyse</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ label, value, icon: Icon, badgeVariant, description }) => (
          <div
            key={label}
            className="rounded-lg border bg-card/70 backdrop-blur-sm p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-full bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <Badge variant={badgeVariant}>{value}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">{description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
