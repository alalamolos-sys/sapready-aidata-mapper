import { FileText, DollarSign, Users, Building2, CreditCard, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Target } from '@/lib/sapreadyCore';

export type KnownTarget = Exclude<Target, 'unknown'>;

interface ObjectMeta {
  label: string;
  colorClass: string;
  icon: LucideIcon;
}

const DEFAULT_META: ObjectMeta = {
  label: 'Objet non reconnu',
  colorClass: 'bg-muted text-muted-foreground',
  icon: HelpCircle,
};

export const OBJECT_METADATA: Record<KnownTarget, ObjectMeta> = {
  gl_accounts: {
    label: 'G/L Accounts',
    colorClass: 'bg-primary/10 text-primary',
    icon: FileText,
  },
  opening_balances: {
    label: 'Opening Balances',
    colorClass: 'bg-success/10 text-success',
    icon: DollarSign,
  },
  ytd_movements: {
    label: 'YTD Movements',
    colorClass: 'bg-success/10 text-success',
    icon: DollarSign,
  },
  suppliers: {
    label: 'Fournisseurs',
    colorClass: 'bg-accent/10 text-accent',
    icon: Users,
  },
  customers: {
    label: 'Clients',
    colorClass: 'bg-accent/10 text-accent',
    icon: Building2,
  },
  bank_details: {
    label: 'Données Bancaires',
    colorClass: 'bg-warning/10 text-warning',
    icon: CreditCard,
  },
};

export function getObjectMetadata(target: Target): ObjectMeta {
  if (target === 'unknown') {
    return DEFAULT_META;
  }
  return OBJECT_METADATA[target] ?? DEFAULT_META;
}

export function getObjectLabel(target: Target): string {
  return getObjectMetadata(target).label;
}
