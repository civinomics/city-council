import {Entity, RawEntity} from './index';

export interface Office extends Entity {
  name: string;
  incumbentId: string;
}

export type RawOffice = RawEntity & {
  name: string;
  incumbent: string;
}

export function parseOffice(data: RawOffice): Office {
  console.log(data);
  return {
    name: data.name,
    id: data.$key,
    owner: data.owner,
    editors: data.editors,
    incumbentId: data.incumbent
  }
}
