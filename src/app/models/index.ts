export interface Entity {
  id: string;
  owner: string;
  editors?: string[];
}

export type EntityField = 'id' | 'owner' | 'editors';


export interface RawEntity {
  $key: string;
  owner: string;
  editors?: string[];
}

export const parseEntity = (it: RawEntity) => {
  return {
    id: it.$key,
    owner: it.owner,
    editors: it.editors || [it.owner]
  }
};
