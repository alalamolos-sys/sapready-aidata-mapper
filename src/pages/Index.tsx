import { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { ObjectDetector } from '@/components/ObjectDetector';
import { DataPreview } from '@/components/DataPreview';
import { ColumnMapper } from '@/components/ColumnMapper';
import { ValidationPanel } from '@/components/ValidationPanel';
import { OutputGenerator } from '@/components/OutputGenerator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const Index = () => {
  const [fileData, setFileData] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleFileProcessed = (data: any) => {
    setFileData(data);
    
    if (!data) {
      setAnalysisResult(null);
      return;
    }

    // Simulation d'analyse - en production, appeler l'API AI
    const mockAnalysis = {
      object: 'gl_accounts',
      detection_reason: 'Présence de colonnes Account/Acct Group/Type/FSG → G/L master.',
      mapping: {
        required: [
          { source: 'Account', sap_field: 'G/L Account' },
          { source: 'Acct Group', sap_field: 'Account Group' },
          { source: 'Type', sap_field: 'Account Type' },
          { source: 'Short Name', sap_field: 'Short Text' },
          { source: 'Company', sap_field: 'Company Code' }
        ],
        optional: [
          { source: 'Currency', sap_field: 'Currency' },
          { source: 'OIM', sap_field: 'Open Item Managed' },
          { source: 'FSG', sap_field: 'Field Status Group' }
        ],
        missing: [
          { sap_field: 'Chart', note: 'Plan comptable requis (ex. YCOA).' }
        ]
      },
      data_quality: {
        summary: { errors: 1, warnings: 0, infos: 1 },
        issues: [
          {
            severity: 'error' as const,
            message: 'Champ requis "Chart" manquant.',
            location: { row: 1, source: '<header>' },
            hint: 'Ajouter colonne Chart avec valeur (ex. YCOA).'
          },
          {
            severity: 'info' as const,
            message: 'Devise EUR plausible.',
            location: { row: 1, source: 'Currency' },
            hint: 'OK'
          }
        ]
      },
      ltmc_payload: {
        sheets: [
          {
            name: 'GL_Chart',
            columns: ['Chart', 'G/L Account', 'Account Group', 'Account Type', 'Short Text'],
            rows: [
              { Chart: '', 'G/L Account': '101100', 'Account Group': 'ACTV', 'Account Type': 'B/S', 'Short Text': 'Cash' },
              { Chart: '', 'G/L Account': '101200', 'Account Group': 'ACTV', 'Account Type': 'B/S', 'Short Text': 'Bank' },
              { Chart: '', 'G/L Account': '400100', 'Account Group': 'REVN', 'Account Type': 'P&L', 'Short Text': 'Sales' }
            ]
          },
          {
            name: 'GL_CompanyCode',
            columns: ['G/L Account', 'Company Code', 'Currency', 'Open Item Managed', 'Field Status Group'],
            rows: [
              { 'G/L Account': '101100', 'Company Code': 'FR01', Currency: 'EUR', 'Open Item Managed': 'N', 'Field Status Group': 'YB00' },
              { 'G/L Account': '101200', 'Company Code': 'FR01', Currency: 'EUR', 'Open Item Managed': 'Y', 'Field Status Group': 'YB01' },
              { 'G/L Account': '400100', 'Company Code': 'FR01', Currency: 'EUR', 'Open Item Managed': 'N', 'Field Status Group': 'YP00' }
            ]
          }
        ]
      },
      value_hints: [
        { sap_field: 'Chart', suggestion: 'Utiliser YCOA si plan groupe standard.', suggested_only: true }
      ]
    };

    setAnalysisResult(mockAnalysis);
  };

  const steps = [
    { label: 'Upload', completed: !!fileData },
    { label: 'Détection', completed: !!analysisResult },
    { label: 'Mapping', completed: !!analysisResult },
    { label: 'Validation', completed: !!analysisResult },
    { label: 'Export', completed: !!analysisResult }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SAPReady AI Pro
              </h1>
              <p className="text-sm text-muted-foreground">
                Mapper & Validator pour SAP S/4HANA On-Premise 2025
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              LTMC Migration Cockpit
            </Badge>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    step.completed
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    step.completed ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 mx-3 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 pb-12">
        <div className="space-y-6">
          {/* File Upload */}
          <FileUploader onFileProcessed={handleFileProcessed} />

          {/* Analysis Results */}
          {analysisResult && (
            <>
              {/* Object Detection */}
              <ObjectDetector
                detectedObject={analysisResult.object}
                detectionReason={analysisResult.detection_reason}
              />

              {/* Data Preview */}
              {fileData && (
                <DataPreview
                  headers={fileData.headers}
                  rows={fileData.sample_rows}
                  totalRows={fileData.rowCount}
                />
              )}

              {/* Column Mapping & Validation in 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ColumnMapper
                  required={analysisResult.mapping.required}
                  optional={analysisResult.mapping.optional}
                  missing={analysisResult.mapping.missing}
                />

                <ValidationPanel
                  issues={analysisResult.data_quality.issues}
                  summary={analysisResult.data_quality.summary}
                />
              </div>

              {/* Output Generator */}
              <OutputGenerator sheets={analysisResult.ltmc_payload.sheets} />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
