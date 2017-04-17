export interface Entity {
  id: string;
  owner: string;
  editors?: string[];
}

export type EntityField = 'id' | 'owner' | 'editors';

export const EntityFields = [ 'id', 'owner', 'editors' ];

export interface RawEntity {
    id?: string,
    $key?: string;
  owner: string;
  editors?: string[];
}
export const parseEntity = (it: RawEntity | any) => {
    if (!it.$key && !it.id) {
        throw new Error(`cannot parse entity without ID: ${JSON.stringify(it)}`);
    }
  return {
      id: it.$key || it.id,
    owner: it.owner,
    editors: it.editors || [it.owner]
  }
};
