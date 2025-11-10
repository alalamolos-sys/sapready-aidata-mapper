import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Users, Building2, CreditCard } from 'lucide-react';

interface ObjectDetectorProps {
  detectedObject: string | null;
  detectionReason: string | null;
}

const objectIcons: Record<string, any> = {
  gl_accounts: FileText,
  opening_balances: DollarSign,
  ytd_movements: DollarSign,
  suppliers: Users,
  customers: Users,
  bank_details: CreditCard
};

const objectLabels: Record<string, string> = {
  gl_accounts: 'G/L Accounts',
  opening_balances: 'Opening Balances',
  ytd_movements: 'YTD Movements',
  suppliers: 'Fournisseurs',
  customers: 'Clients',
  bank_details: 'Données Bancaires'
};

const objectColors: Record<string, string> = {
  gl_accounts: 'bg-primary/10 text-primary',
  opening_balances: 'bg-success/10 text-success',
  ytd_movements: 'bg-success/10 text-success',
  suppliers: 'bg-accent/10 text-accent',
  customers: 'bg-accent/10 text-accent',
  bank_details: 'bg-warning/10 text-warning'
};

export const ObjectDetector = ({ detectedObject, detectionReason }: ObjectDetectorProps) => {
  if (!detectedObject) return null;

  const Icon = objectIcons[detectedObject];
  const label = objectLabels[detectedObject];
  const colorClass = objectColors[detectedObject];

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Objet détecté</h3>
            <Badge variant="secondary">{label}</Badge>
          </div>
          {detectionReason && (
            <p className="text-sm text-muted-foreground">
              {detectionReason}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
