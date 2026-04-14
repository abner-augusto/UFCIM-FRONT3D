export interface Equipment {
  id: string;
  spaceId: string;
  assetId: string | null;
  name: string;
  type: string;
  status: 'working' | 'broken' | 'under_repair' | 'replacement_scheduled';
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export const EQUIPMENT_STATUS_LABELS: Record<Equipment['status'], string> = {
  working: 'Funcionando',
  broken: 'Com defeito',
  under_repair: 'Em manutenção',
  replacement_scheduled: 'Substituição agendada',
};

export interface Space {
  id: string;
  name: string;
  number: string;
  modelId: string | null;
  type: string;
  block: string;
  campus: string;
  department: string;
  capacity: number | null;
  furniture: string | null;
  lighting: string | null;
  hvac: string | null;
  multimedia: string | null;
  closedFrom: string | null;
  closedTo: string | null;
  description: string | null;
  isActive: boolean;
  equipment?: Equipment[];
}

export const SPACE_TYPE_LABELS: Record<string, string> = {
  classroom: 'Sala de Aula',
  study_room: 'Sala de Estudo',
  meeting_room: 'Sala de Reunião',
  hall: 'Auditório',
};
