import { Group } from '../group/group.model';
import { Entity, EntityField } from './entity';

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
