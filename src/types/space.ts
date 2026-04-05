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
}

export const SPACE_TYPE_LABELS: Record<string, string> = {
  classroom: 'Sala de Aula',
  study_room: 'Sala de Estudo',
  meeting_room: 'Sala de Reunião',
  hall: 'Auditório',
};
