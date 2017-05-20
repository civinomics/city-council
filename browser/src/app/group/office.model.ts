import { Entity, RawEntity } from '../core/models';

export interface Office extends Entity {
  name: string;
  representative: string;
}

export type RawOffice = RawEntity & {
  name: string;
  representative: string;
}

export function parseOffice(data: RawOffice): Office {
  console.log(data);
  return {
    name: data.name,
    id: data.$key,
    owner: data.owner,
    editors: data.editors,
    representative: data.representative
  }
}
