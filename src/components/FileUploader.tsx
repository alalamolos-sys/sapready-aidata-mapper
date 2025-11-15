import { useState, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { CsvRow } from '@/types/csv';

export interface ProcessedFileData {
  filename: string;
  headers: string[];
  rows: CsvRow[];
  sampleRows: CsvRow[];
  rowCount: number;
  uploadedAt: Date;
  size: number;
}

interface FileUploaderProps {
  onFileProcessed: (data: ProcessedFileData | null) => void;
  activeFile?: ProcessedFileData | null;
}

const ACCEPTED_FORMAT = /\.csv$/i;

async function parseCsv(file: File): Promise<{ headers: string[]; rows: CsvRow[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      beforeFirstChunk: (chunk) => chunk.replace(/^\ufeff/, ''),
      delimitersToGuess: [',', ';', '\t', '|'],
      complete: (result) => {
        try {
          const rows = (result.data as CsvRow[]).map((row) => {
            const cleaned: CsvRow = {};
            Object.entries(row as Record<string, unknown>).forEach(([key, value]) => {
              if (typeof value === 'string') {
                cleaned[key] = value.trim();
              } else if (
                typeof value === 'number' ||
                typeof value === 'boolean' ||
                value === null ||
                typeof value === 'undefined'
              ) {
                cleaned[key] = value;
              } else {
                cleaned[key] = String(value ?? '').trim();
              }
            });
            return cleaned;
          });

          const headers = result.meta.fields ?? Object.keys(rows[0] ?? {});
          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      },
      error: reject,
    });
  });
}

export const FileUploader = ({ onFileProcessed, activeFile = null }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeFile) {
      setFileInfo({ name: activeFile.filename, size: activeFile.size });
    } else {
      setFileInfo(null);
    }
  }, [activeFile]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const processFile = useCallback(async (selectedFile: File) => {
    if (isProcessing) {
      return;
    }

    if (!ACCEPTED_FORMAT.test(selectedFile.name)) {
      toast.error('Format non supporté', {
        description: 'Veuillez uploader un fichier CSV (séparateur virgule ou point-virgule).',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { headers, rows } = await parseCsv(selectedFile);

      if (!headers.length) {
        toast.error('Aucune colonne détectée', {
          description: 'Vérifiez la ligne d’en-tête de votre fichier CSV.',
        });
        onFileProcessed(null);
        return;
      }

      setFileInfo({ name: selectedFile.name, size: selectedFile.size });

      const processed: ProcessedFileData = {
        filename: selectedFile.name,
        headers,
        rows,
        sampleRows: rows.slice(0, 20),
        rowCount: rows.length,
        uploadedAt: new Date(),
        size: selectedFile.size,
      };

      onFileProcessed(processed);

      toast.success('Fichier importé', {
        description: `${processed.rowCount} lignes analysées`,
      });
      } catch (error) {
        console.error(error);
        toast.error('Erreur lors de la lecture du fichier', {
          description: error instanceof Error ? error.message : 'Vérifiez le format du CSV.',
        });
        onFileProcessed(null);
        setFileInfo(null);
      } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onFileProcessed]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      void processFile(droppedFile);
    }
    event.dataTransfer.clearData();
  }, [processFile]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      void processFile(selectedFile);
    }
    event.target.value = '';
  }, [processFile]);

  const removeFile = useCallback(() => {
    setFileInfo(null);
    onFileProcessed(null);
  }, [onFileProcessed]);

  return (
    <Card
      className="p-6 border-2 border-dashed transition-all duration-300"
      style={{
        borderColor: isDragging ? 'hsl(var(--primary))' : 'hsl(var(--border))',
        background: isDragging ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--card))',
      }}
    >
      {!fileInfo ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center py-12 cursor-pointer text-center"
        >
          <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            Glissez-déposez votre fichier CSV
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Lignes d’en-tête requises, séparateur virgule ou point-virgule
          </p>
          <input
            ref={inputRef}
            type="file"
            id="file-upload"
            className="hidden"
            accept=".csv"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            disabled={isProcessing}
            onClick={() => inputRef.current?.click()}
          >
            {isProcessing ? 'Analyse en cours...' : 'Parcourir les fichiers'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{fileInfo.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(fileInfo.size / 1024).toFixed(2)} KB
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

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyse en cours…</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
