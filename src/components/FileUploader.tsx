import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFileProcessed: (data: any) => void;
}

export const FileUploader = ({ onFileProcessed }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const processFile = useCallback((selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx?|csv)$/i)) {
      toast.error('Format non supporté', {
        description: 'Veuillez uploader un fichier Excel (.xlsx, .xls) ou CSV.'
      });
      return;
    }

    setFile(selectedFile);
    
    // Simulation: parse basic data
    const reader = new FileReader();
    reader.onload = (e) => {
      const mockData = {
        filename: selectedFile.name,
        headers: ['Account', 'Acct Group', 'Type', 'Short Name', 'Company', 'Currency', 'OIM', 'FSG'],
        sample_rows: [
          { Account: '101100', 'Acct Group': 'ACTV', Type: 'B/S', 'Short Name': 'Cash', Company: 'FR01', Currency: 'EUR', OIM: 'N', FSG: 'YB00' },
          { Account: '101200', 'Acct Group': 'ACTV', Type: 'B/S', 'Short Name': 'Bank', Company: 'FR01', Currency: 'EUR', OIM: 'Y', FSG: 'YB01' },
          { Account: '400100', 'Acct Group': 'REVN', Type: 'P&L', 'Short Name': 'Sales', Company: 'FR01', Currency: 'EUR', OIM: 'N', FSG: 'YP00' }
        ],
        rowCount: 3
      };
      
      onFileProcessed(mockData);
      toast.success('Fichier chargé', {
        description: `${mockData.rowCount} lignes détectées`
      });
    };
    reader.readAsText(selectedFile);
  }, [onFileProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  }, [processFile]);

  const removeFile = useCallback(() => {
    setFile(null);
    onFileProcessed(null);
  }, [onFileProcessed]);

  return (
    <Card className="p-6 border-2 border-dashed transition-all duration-300"
          style={{
            borderColor: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            background: isDragging ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--card))'
          }}>
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center py-12 cursor-pointer"
        >
          <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            Glissez-déposez votre fichier
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Excel (.xlsx, .xls) ou CSV
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload">
            <Button asChild>
              <span>Parcourir les fichiers</span>
            </Button>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={removeFile}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );
};
