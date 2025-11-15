import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Target } from '@/lib/sapreadyCore';
import { getObjectMetadata, getObjectLabel } from './objectMetadata';

interface ObjectDetectorProps {
  detectedObject: Target | null;
  detectionReason?: string | null;
}

export const ObjectDetector = ({ detectedObject, detectionReason }: ObjectDetectorProps) => {
  if (!detectedObject) return null;

  const meta = getObjectMetadata(detectedObject);
  const label = getObjectLabel(detectedObject);
  const Icon = meta.icon;

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${meta.colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Objet détecté</h3>
            <Badge variant="secondary">{label}</Badge>
          </div>
          {detectionReason ? (
            <p className="text-sm text-muted-foreground">{detectionReason}</p>
          ) : (
            detectedObject === 'unknown' && (
              <p className="text-sm text-muted-foreground">
                L’algorithme n’a pas pu identifier l’objet SAP. Vérifiez les en-têtes ou sélectionnez un fichier différent.
              </p>
            )
          )}
        </div>
      </div>
    </Card>
  );
};
