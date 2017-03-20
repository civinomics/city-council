import { Group } from './group';
import { Entity, EntityField } from './index';

export interface Place extends Entity {
  name: string;
  longName: string;
  icon: string;

  groups: (string | Group)[]
}

export type NormalizedPlace = {
  [P in EntityField | 'name' | 'longName']: Place[P]
  } & {
  groups: string[]
}

export type DenormalizedPlace = {
  [P in EntityField | 'name' | 'longName']: Place[P]
  } & {
  groups: Group[]
}
