import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import type { Target } from '@/lib/sapreadyCore';
import { getObjectLabel } from './objectMetadata';
import type { CsvRow } from '@/types/csv';

interface Sheet {
  name: string;
  columns: string[];
  rows: CsvRow[];
}

interface OutputGeneratorProps {
  sheets: Sheet[];
  target?: Target;
}

const toCsv = (sheet: Sheet) =>
  [
    sheet.columns.join(','),
    ...sheet.rows.map((row) =>
      sheet.columns
        .map((col) => {
          const value = row[col] ?? '';
          const normalized = String(value).replace(/"/g, '""');
          return `"${normalized}"`;
        })
        .join(',')
    ),
  ].join('\n');

export const OutputGenerator = ({ sheets, target }: OutputGeneratorProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = (sheet: Sheet) => {
    const csvContent = toCsv(sheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${sheet.name}.csv`;
    link.click();

    toast.success('Téléchargement démarré', {
      description: `${sheet.name}.csv`,
    });
  };

  const handleExportZip = async () => {
    if (!sheets.length) {
      toast.warning('Aucune feuille LTMC', {
        description: 'Importez un fichier reconnu pour générer les feuilles CSV.',
      });
      return;
    }

    setIsExporting(true);

    try {
      const zip = new JSZip();
      sheets.forEach((sheet) => {
        zip.file(`${sheet.name}.csv`, toCsv(sheet));
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const suffix = target && target !== 'unknown' ? getObjectLabel(target).replace(/\s+/g, '_') : 'LTMC';
      const fileName = `LTMC_${suffix}_${Date.now()}.zip`;
      saveAs(blob, fileName);

      toast.success('Export ZIP généré', {
        description: `${sheets.length} feuille(s) LTMC`,
      });
    } catch (error) {
      console.error(error);
      toast.error('Impossible de générer le ZIP', {
        description: error instanceof Error ? error.message : 'Réessayez ou contactez le support.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Fichiers LTMC générés</h3>
        <Button onClick={() => void handleExportZip()} disabled={isExporting}>
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Génération…' : 'Exporter ZIP LTMC'}
        </Button>
      </div>

      <div className="space-y-3">
        {sheets.map((sheet, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{sheet.name}.csv</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {sheet.rows.length} lignes
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {sheet.columns.length} colonnes
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(sheet)}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        ))}
        {!sheets.length && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune feuille générée pour l’instant. Importez un fichier reconnu pour préparer l’export LTMC.
          </p>
        )}
      </div>
    </Card>
  );
};
