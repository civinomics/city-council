import {Entity, parseEntity, RawEntity} from './index';
import {Office, parseOffice, RawOffice} from './office';

export interface Group extends Entity {
  name: string;
  icon: string;
  meetingIds: string[];
  districts: Office[]
}

export type RawGroup = RawEntity & {
  [P in 'name' | 'icon']: Group[P]
  } & {
  meetings: string[],
  districts: RawOffice[]
}

export function parseGroup(data: RawGroup): Group {
  return {
    ...parseEntity(data),
    name: data.name,
    icon: data.icon,
    meetingIds: data.meetings,
    districts: data.districts.map(it => parseOffice(it))
  }
}
