export interface EquipmentReport {
  id: string;
  equipmentId: string;
  reportedBy: string;
  description: string;
  severity: 'minor' | 'major' | 'blocking';
  status: 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  dismissedReason?: string | null;
  createdAt: string;
  reporter?: { id: string; name: string; role: string };
  acknowledger?: { id: string; name: string; role: string } | null;
  equipment?: {
    id: string;
    name: string;
    assetId: string | null;
    space?: {
      id: string;
      name: string;
      number: string;
      block?: string;
      modelId?: string | null;
      campus?: string;
      department?: { id: string; name: string };
    };
  };
}

export const SEVERITY_LABELS: Record<EquipmentReport['severity'], string> = {
  minor: 'Leve · estética ou opcional',
  major: 'Importante · prejudica a aula',
  blocking: 'Crítico · sala inutilizável',
};

export const REPORT_STATUS_LABELS: Record<EquipmentReport['status'], string> = {
  pending: 'Pendente',
  acknowledged: 'Em análise',
  resolved: 'Resolvido',
  dismissed: 'Descartado',
};
