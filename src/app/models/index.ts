export interface Entity {
  id: string;
  owner: string;
  editors?: string[];
}

export type EntityField = 'id' | 'owner' | 'editors';
