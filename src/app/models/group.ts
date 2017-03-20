import { Entity, EntityField } from './index';
import { Meeting } from './meeting';
import { Office } from './office';

export interface Group extends Entity {
  name: string;
  icon: string;

  meetings: (Meeting | string)[]

  districts: (Office | string)[]
}

export type GroupField = EntityField | 'name' | 'icon';

export type NormalizedGroup = {
  [P in EntityField | 'name' | 'icon']: Group[P]
  } & {
  meetings: string[];
  districts: string[];
}

export type DenormalizedGroup = {
  [P in EntityField | 'name' | 'icon']: Group[P]
  } & {
  meetings: Meeting[];
  districts: Office[];
}
