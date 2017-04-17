import { Entity, RawEntity } from '../core/models';
import { Office, RawOffice } from './office.model';

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

export function parseGroup(data: RawGroup | Group | any): Group {
  return {
    id: data.$key || data.id,
    owner: data.owner,
    editors: data.editors || [data.owner],
    name: data.name,
    icon: data.icon,
    meetingIds: data.meetings,
    districts: Object.keys(data.districts).map(id => ({...data.districts[id], id}))
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

