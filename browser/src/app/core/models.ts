export interface Entity {
  id: string;
  owner: string;
  editors?: string[];
}

export interface RawEntity {
    id?: string,
    $key?: string;
  owner: string;
  editors?: string[];
}

export const parseEntity = (it: any) => {
  if (!(it.$key || it.id)) {
        throw new Error(`cannot parse entity without ID: ${JSON.stringify(it)}`);
    }
  return {
    id: it.$key || it.id,
    owner: it.owner,
    editors: it.editors || [it.owner]
  }
};


export * from '../comment/comment.model';
export * from '../group/group.model';
export * from '../item/item.model';
export * from '../meeting/meeting.model';
export * from '../group/office.model';
export * from '../user/user.model';
export * from '../vote/vote.model';
