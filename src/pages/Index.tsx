import { useEffect, useMemo, useState } from 'react';
import { FileUploader, type ProcessedFileData } from '@/components/FileUploader';
import { ObjectDetector } from '@/components/ObjectDetector';
import { DataPreview } from '@/components/DataPreview';
import { ColumnMapper, type ColumnMapperField } from '@/components/ColumnMapper';
import { ValidationPanel } from '@/components/ValidationPanel';
import { OutputGenerator } from '@/components/OutputGenerator';
import { RecentImports, type HistoryEntry } from '@/components/RecentImports';
import { QualitySummary } from '@/components/QualitySummary';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { detectObject, mapColumns, validate, shapeLTMC } from '@/lib/sapreadyCore';
import type { Mapping, ValidationResult, Target, Sheet } from '@/lib/sapreadyCore';
import { toast } from 'sonner';
import { getObjectLabel } from '@/components/objectMetadata';
import objectDefinitionsJson from '@/lib/objectDefinitions.json';

type KnownTarget = Exclude<Target, 'unknown'>;

interface ObjectDefinition {
  label: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldAliases?: Record<string, string[]>;
  validationRules?: unknown;
  ltmcSheets?: { name: string; columns: string[] }[];
}

type UserMappingState = Record<string, string | null>;

const objectDefinitions = objectDefinitionsJson as Record<KnownTarget, ObjectDefinition>;

const HISTORY_STORAGE_KEY = 'sapready.history.v1';
const USER_MAPPING_STORAGE_KEY = 'sapready.userMappings.v1';

type StoredMappingsState = Partial<Record<KnownTarget, UserMappingState>>;

type SerializedProcessedFileData = Omit<ProcessedFileData, 'uploadedAt'> & {
  uploadedAt: string;
};

type SerializedHistoryEntry = Omit<HistoryEntry, 'uploadedAt' | 'fileData'> & {
  uploadedAt: string;
  fileData: SerializedProcessedFileData;
};

const isKnownTargetKey = (value: string): value is KnownTarget =>
  Object.prototype.hasOwnProperty.call(objectDefinitions, value);

const serializeFileData = (data: ProcessedFileData): SerializedProcessedFileData => ({
  ...data,
  uploadedAt: data.uploadedAt.toISOString(),
});

const deserializeFileData = (data: SerializedProcessedFileData): ProcessedFileData => ({
  ...data,
  uploadedAt: new Date(data.uploadedAt),
});

const serializeHistoryEntry = (entry: HistoryEntry): SerializedHistoryEntry => ({
  ...entry,
  uploadedAt: entry.uploadedAt.toISOString(),
  fileData: serializeFileData(entry.fileData),
});

const deserializeHistoryEntry = (entry: SerializedHistoryEntry): HistoryEntry => ({
  ...entry,
  uploadedAt: new Date(entry.uploadedAt),
  fileData: deserializeFileData(entry.fileData),
});

const cloneProcessedFileData = (data: ProcessedFileData): ProcessedFileData => ({
  ...data,
  headers: [...data.headers],
  rows: data.rows.map((row) => ({ ...row })),
  sampleRows: data.sampleRows.map((row) => ({ ...row })),
  uploadedAt: new Date(data.uploadedAt),
});

const mergeMappingWithOverrides = (
  target: KnownTarget,
  baseMapping: Mapping,
  overrides: UserMappingState,
): Mapping => {
  const definition = objectDefinitions[target];
  const autoSource = new Map<string, string>();
  baseMapping.required.forEach((entry) => autoSource.set(entry.sap_field, entry.source));
  baseMapping.optional.forEach((entry) => autoSource.set(entry.sap_field, entry.source));
  const missingNotes = new Map<string, string>();
  baseMapping.missing.forEach((entry) => missingNotes.set(entry.sap_field, entry.note));

  const required: Mapping['required'] = [];
  const optional: Mapping['optional'] = [];
  const missing: Mapping['missing'] = [];
  const processed = new Set<string>();

  const resolveSelection = (field: string, kind: 'required' | 'optional') => {
    if (processed.has(field)) return;
    processed.add(field);
    const overrideRaw = overrides[field];
    const overrideValue =
      overrideRaw === undefined ? undefined : overrideRaw === null ? null : overrideRaw;
    const selected = overrideRaw === undefined ? autoSource.get(field) ?? null : overrideValue;

    if (selected) {
      const entry = { sap_field: field, source: selected };
      if (kind === 'required') {
        required.push(entry);
      } else {
        optional.push(entry);
      }
    } else {
      const note = missingNotes.get(field) ?? (kind === 'required' ? 'required' : 'optional');
      missing.push({ sap_field: field, note });
    }
  };

  definition.requiredFields.forEach((field) => resolveSelection(field, 'required'));
  definition.optionalFields.forEach((field) => resolveSelection(field, 'optional'));

  for (const [field, value] of Object.entries(overrides)) {
    if (!processed.has(field) && value) {
      optional.push({ sap_field: field, source: value });
      processed.add(field);
    }
  }

  return { required, optional, missing };
};

const normaliseNote = (note?: string) =>
  note === 'required' ? 'Champ requis non trouvé dans le fichier.' : note;

const buildColumnMapperData = (
  target: KnownTarget,
  baseMapping: Mapping,
  finalMapping: Mapping,
): { required: ColumnMapperField[]; optional: ColumnMapperField[] } => {
  const definition = objectDefinitions[target];
  const autoMap = new Map<string, string>();
  baseMapping.required.forEach((entry) => autoMap.set(entry.sap_field, entry.source));
  baseMapping.optional.forEach((entry) => autoMap.set(entry.sap_field, entry.source));
  const finalMap = new Map<string, string>();
  finalMapping.required.forEach((entry) => finalMap.set(entry.sap_field, entry.source));
  finalMapping.optional.forEach((entry) => finalMap.set(entry.sap_field, entry.source));
  const missingMap = new Map<string, string>();
  finalMapping.missing.forEach((entry) => missingMap.set(entry.sap_field, entry.note));

  const toField = (field: string): ColumnMapperField => ({
    sap_field: field,
    source: finalMap.get(field) ?? null,
    autoSource: autoMap.get(field) ?? null,
    note: normaliseNote(missingMap.get(field)),
  });

  const required = definition.requiredFields.map(toField);
  const optional = definition.optionalFields.map(toField);

  finalMapping.optional.forEach((entry) => {
    if (!definition.optionalFields.includes(entry.sap_field)) {
      optional.push({
        sap_field: entry.sap_field,
        source: entry.source,
        autoSource: autoMap.get(entry.sap_field) ?? null,
        note: normaliseNote(missingMap.get(entry.sap_field)),
      });
    }
  });

  return { required, optional };
};

interface AnalysisResult {
  target: Target;
  mapping: Mapping;
  dataQuality: ValidationResult;
  ltmcPayload: { sheets: Sheet[] };
  detectionReason: string | null;
}

const detectionExplanations: Partial<Record<Target, string>> = {
  gl_accounts: 'Présence des colonnes G/L Account, Account Group et Field Status Group.',
  opening_balances: 'Colonnes Debit / Credit détectées ainsi qu’une date comptable.',
  ytd_movements: 'Colonnes Document No et D/C repérées → mouvements périodiques.',
  suppliers: 'Colonnes Vendor, Address et Company Code identifiées.',
  customers: 'Colonnes Customer avec informations d’adresse détectées.',
  bank_details: 'Colonnes IBAN/BIC ou Bank Key trouvées.',
};

const Index = () => {
  const [fileData, setFileData] = useState<ProcessedFileData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [baseMapping, setBaseMapping] = useState<Mapping | null>(null);
  const [userMapping, setUserMapping] = useState<UserMappingState>({});
  const [storedMappings, setStoredMappings] = useState<StoredMappingsState>({});
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory) as SerializedHistoryEntry[];
        const entries = parsed.map(deserializeHistoryEntry).slice(0, 6);
        setHistory(entries);
      }
    } catch (error) {
      console.error("Impossible de charger l’historique", error);
    }

    try {
      const rawMappings = window.localStorage.getItem(USER_MAPPING_STORAGE_KEY);
      if (rawMappings) {
        const parsed = JSON.parse(rawMappings) as Record<string, UserMappingState>;
        const next: StoredMappingsState = {};
        Object.entries(parsed).forEach(([key, value]) => {
          if (isKnownTargetKey(key) && value && typeof value === 'object') {
            next[key] = { ...value };
          }
        });
        setStoredMappings(next);
      }
    } catch (error) {
      console.error('Impossible de charger les mappings utilisateurs', error);
    }

    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return;
    try {
      const payload = history.map(serializeHistoryEntry);
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Impossible d’enregistrer l’historique", error);
    }
  }, [history, storageReady]);

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(USER_MAPPING_STORAGE_KEY, JSON.stringify(storedMappings));
    } catch (error) {
      console.error("Impossible d’enregistrer les mappings utilisateurs", error);
    }
  }, [storedMappings, storageReady]);

  const runAnalysis = (data: ProcessedFileData, historyId?: string) => {
    const target = detectObject(data.headers);
    const rawMapping = mapColumns(data.headers, target);
    const overrides =
      target !== 'unknown' ? { ...(storedMappings[target] ?? {}) } : {};
    const finalMapping =
      target !== 'unknown' ? mergeMappingWithOverrides(target, rawMapping, overrides) : rawMapping;

    const dataQuality = validate({ target, headers: data.headers, rows: data.rows });
    const ltmcPayload = shapeLTMC({
      target,
      headers: data.headers,
      rows: data.rows,
      mapping: finalMapping,
      userHints: {},
    });
    const detectionReason = detectionExplanations[target] ?? null;

    const entry: HistoryEntry = {
      id: historyId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      filename: data.filename,
      target,
      uploadedAt: data.uploadedAt,
      rowCount: data.rowCount,
      errors: dataQuality.summary.errors,
      warnings: dataQuality.summary.warnings,
      fileData: cloneProcessedFileData(data),
    };

    setFileData(data);
    setBaseMapping(rawMapping);
    setUserMapping(overrides);
    setAnalysisResult({
      target,
      mapping: finalMapping,
      dataQuality,
      ltmcPayload,
      detectionReason,
    });
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== entry.id);
      const next = [entry, ...filtered];
      return next.slice(0, 6);
    });
    setCurrentHistoryId(entry.id);

    if (target === 'unknown') {
      toast.warning('Objet SAP non reconnu', {
        description: 'Vérifiez les en-têtes ou préparez un mapping manuel.',
      });
    } else {
      toast.success('Objet détecté', {
        description: getObjectLabel(target),
      });
    }
  };

  const handleFileProcessed = (data: ProcessedFileData | null) => {
    if (!data) {
      setFileData(null);
      setAnalysisResult(null);
      setBaseMapping(null);
      setUserMapping({});
      setCurrentHistoryId(null);
      return;
    }

    try {
      runAnalysis(data);
    } catch (error) {
      console.error(error);
      toast.error('Analyse impossible', {
        description:
          error instanceof Error
            ? error.message
            : 'Une erreur est survenue pendant le traitement.',
      });
      setFileData(null);
      setAnalysisResult(null);
      setBaseMapping(null);
      setUserMapping({});
      setCurrentHistoryId(null);
    }
  };

  const applyOverrides = (target: KnownTarget, overrides: UserMappingState) => {
    if (!fileData || !baseMapping) return;

    const merged = mergeMappingWithOverrides(target, baseMapping, overrides);
    const dataQuality = validate({ target, headers: fileData.headers, rows: fileData.rows });
    const ltmcPayload = shapeLTMC({
      target,
      headers: fileData.headers,
      rows: fileData.rows,
      mapping: merged,
      userHints: {},
    });

    setAnalysisResult((current) =>
      current
        ? {
            ...current,
            mapping: merged,
            dataQuality,
            ltmcPayload,
          }
        : current,
    );
    setUserMapping(overrides);

    setStoredMappings((prev) => {
      if (Object.keys(overrides).length === 0) {
        if (!prev[target]) return prev;
        const next = { ...prev };
        delete next[target];
        return next;
      }

      const overrideCopy = { ...overrides };
      const existing = prev[target];
      if (existing) {
        const same =
          Object.keys(overrideCopy).length === Object.keys(existing).length &&
          Object.entries(overrideCopy).every(([field, value]) => existing[field] === value);
        if (same) {
          return prev;
        }
      }

      return { ...prev, [target]: overrideCopy };
    });

    if (currentHistoryId) {
      setHistory((prev) =>
        prev.map((entry) =>
          entry.id === currentHistoryId
            ? {
                ...entry,
                errors: dataQuality.summary.errors,
                warnings: dataQuality.summary.warnings,
                fileData: cloneProcessedFileData(fileData),
              }
            : entry,
        ),
      );
    }
  };

  const handleMappingChange = (sapField: string, source: string | null) => {
    if (!analysisResult || !fileData || !baseMapping) return;
    if (analysisResult.target === 'unknown') return;

    const autoSource = new Map<string, string>();
    baseMapping.required.forEach((entry) => autoSource.set(entry.sap_field, entry.source));
    baseMapping.optional.forEach((entry) => autoSource.set(entry.sap_field, entry.source));
    const target = analysisResult.target;

    const nextOverrides: UserMappingState = { ...userMapping };

    if (source === null) {
      nextOverrides[sapField] = null;
    } else if (autoSource.get(sapField) === source) {
      delete nextOverrides[sapField];
    } else {
      nextOverrides[sapField] = source;
    }

    applyOverrides(target, nextOverrides);
  };

  const handleReloadHistoryEntry = (id: string) => {
    const entry = history.find((item) => item.id === id);
    if (!entry) return;

    try {
      const data = cloneProcessedFileData(entry.fileData);
      runAnalysis(data, id);
    } catch (error) {
      console.error(error);
      toast.error('Analyse impossible', {
        description:
          error instanceof Error
            ? error.message
            : 'Une erreur est survenue pendant le rechargement.',
      });
    }
  };

  const steps = useMemo(() => {
    const hasFile = !!fileData;
    const hasResult = !!analysisResult;
    const hasKnownTarget = hasResult && analysisResult?.target !== 'unknown';
    const hasSheets = (analysisResult?.ltmcPayload.sheets.length ?? 0) > 0;

    return [
      { label: 'Upload', completed: hasFile },
      { label: 'Détection', completed: hasResult },
      { label: 'Mapping', completed: hasKnownTarget },
      { label: 'Validation', completed: hasKnownTarget },
      { label: 'Export', completed: hasSheets },
    ];
  }, [analysisResult, fileData]);

  const columnMapperData = useMemo(() => {
    if (!analysisResult || !baseMapping) return null;
    if (analysisResult.target === 'unknown') return null;
    const { required, optional } = buildColumnMapperData(
      analysisResult.target,
      baseMapping,
      analysisResult.mapping,
    );
    const missing = analysisResult.mapping.missing.map((entry) => ({
      ...entry,
      note: normaliseNote(entry.note),
    }));
    return { required, optional, missing };
  }, [analysisResult, baseMapping]);

  const mappedHeaders = useMemo(() => {
    if (!analysisResult) return [] as string[];
    const sources = [...analysisResult.mapping.required, ...analysisResult.mapping.optional]
      .map((entry) => entry.source)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(sources));
  }, [analysisResult]);

  const unmappedHeaders = useMemo(() => {
    if (!fileData) return [] as string[];
    const mappedSet = new Set(mappedHeaders);
    return fileData.headers.filter((header) => !mappedSet.has(header));
  }, [fileData, mappedHeaders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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

      <main className="container mx-auto px-6 pb-12">
        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">SAP Mapping Tool</h2>
              <p className="text-sm text-muted-foreground">
                Importez vos extractions CSV (Finance v1) et générez automatiquement les feuilles LTMC prêtes pour SAP.
              </p>
            </section>

            <FileUploader onFileProcessed={handleFileProcessed} activeFile={fileData} />

            {analysisResult && (
              <div className="space-y-6">
                <ObjectDetector
                  detectedObject={analysisResult.target}
                  detectionReason={analysisResult.detectionReason}
                />

                <QualitySummary
                  summary={analysisResult.dataQuality.summary}
                  sheetCount={analysisResult.ltmcPayload.sheets.length}
                />

                {fileData && (
                  <DataPreview
                    headers={fileData.headers}
                    rows={fileData.sampleRows}
                    totalRows={fileData.rowCount}
                    mappedHeaders={mappedHeaders}
                    unmappedHeaders={unmappedHeaders}
                  />
                )}

                {analysisResult.target === 'unknown' && (
                  <Card className="p-6 border-warning/50 bg-warning/5">
                    <p className="text-sm text-warning">
                      Le moteur n’a pas reconnu l’objet SAP. Vérifiez les en-têtes ou préparez une configuration personnalisée.
                    </p>
                  </Card>
                )}

                {analysisResult.target !== 'unknown' && fileData && columnMapperData && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ColumnMapper
                      headers={fileData.headers}
                      required={columnMapperData.required}
                      optional={columnMapperData.optional}
                      missing={columnMapperData.missing}
                      onMappingChange={handleMappingChange}
                    />

                    <ValidationPanel
                      issues={analysisResult.dataQuality.issues}
                      summary={analysisResult.dataQuality.summary}
                    />
                  </div>
                )}

                <OutputGenerator
                  sheets={analysisResult.ltmcPayload.sheets}
                  target={analysisResult.target}
                />
              </div>
            )}
          </div>

          <RecentImports entries={history} onReload={handleReloadHistoryEntry} />
        </div>
      </main>
    </div>
  );
};

export default Index;
