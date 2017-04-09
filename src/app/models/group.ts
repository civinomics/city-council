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

export function groupsEqual(x: Group, y: Group): boolean {
  if (x.id != y.id || x.icon != y.icon) {
    return false;
  }
  if (x.meetingIds.join('_') != y.meetingIds.join('_')) {
    return false;
  }
  if (x.districts.map(it => it.id).join('_') != y.districts.map(it => it.id).join('_')) {
    return false;
  }
  return true;
}

export function mergeGroups(prev: Group, next: Group) {
  return {...prev, ...next};
}

