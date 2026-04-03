export interface Space {
  id: string;
  name: string;
  modelId: string | null;
  type: string;
  capacity: number | null;
  building: string;
  floor: number | null;
  campus: string;
  description: string | null;
  isActive: boolean;
}
