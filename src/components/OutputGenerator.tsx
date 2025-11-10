import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface Sheet {
  name: string;
  columns: string[];
  rows: Record<string, any>[];
}

interface OutputGeneratorProps {
  sheets: Sheet[];
}

export const OutputGenerator = ({ sheets }: OutputGeneratorProps) => {
  const handleDownload = (sheet: Sheet) => {
    // Simulation de téléchargement CSV
    const csvContent = [
      sheet.columns.join(','),
      ...sheet.rows.map(row => 
        sheet.columns.map(col => row[col] || '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${sheet.name}.csv`;
    link.click();

    toast.success('Téléchargement démarré', {
      description: `${sheet.name}.csv`
    });
  };

  const handleDownloadAll = () => {
    sheets.forEach(sheet => handleDownload(sheet));
    toast.success('Tous les fichiers ont été téléchargés', {
      description: `${sheets.length} fichiers CSV`
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Fichiers LTMC générés</h3>
        <Button onClick={handleDownloadAll}>
          <Download className="w-4 h-4 mr-2" />
          Tout télécharger
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
      </div>
    </Card>
  );
};
