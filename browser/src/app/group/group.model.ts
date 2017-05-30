import { keys } from 'lodash';
import { Entity, RawEntity } from '../core/models';
import { Office, OfficeCreateInput, RawOffice } from './office.model';

export interface Group extends Entity {
  name: string;
  icon: string;
  meetingIds: string[];
  districts: Office[]
}

export type RawGroup = RawEntity & {
  [P in 'name' | 'icon']: Group[P]
  } & {
  meetings: {[key:string]:true}
  districts: RawOffice[]
}

export type GroupCreateInput = {
  name: string;
  icon: string;
  shapefilePath?: string;
  districts: OfficeCreateInput[];
  adminId: string;
}

export function parseGroup(data: RawGroup | Group | any): Group {

  let districts;
  if (Array.isArray(data.districts)) {
    districts = data.districts;
  } else {
    districts = Object.keys(data.districts).map(id => ({ ...data.districts[ id ], id }));
  }

  return {
    id: data.$key || data.id,
    owner: data.owner,
    editors: data.editors || [data.owner],
    name: data.name,
    icon: data.icon,
    meetingIds: keys(data.meetings),
    districts
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

