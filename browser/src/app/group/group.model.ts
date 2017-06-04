import { Entity, parseEntity } from '../core/models';
import { parseUser, User, usersEqual } from '../user/user.model';

export interface District {
  id: string;
  name: string;
  representative: string;
}

export interface Representative extends User {
  title: string;
  district?: string;
  email?: string;
}

export interface Group extends Entity {
  name: string;
  icon: string;
  meetings: string[];
  representatives: Representative[];
  districts?: District[]
}

export type RepresentativeCreateInput = {
  id: string; //it'll be temporary, just used to pair with district
  firstName: string;
  lastName: string;
  icon: string;
  email: string;
  title: string;
}

export type GroupCreateInput = {
  name: string;
  icon: string;
  districts?: { name: string, representative: string }[];
  representatives: RepresentativeCreateInput[]
  adminId: string;
}

export function parseDistrict(data: Partial<District> | any) {
  let id = data.id || data.$key;
  if (!id) {
    throw new Error(`District missing id: ${JSON.stringify(data)}`);
  }
  return {
    id,
    name: data.name,
    representative: data.representative
  }
}

export function parseRepresentative(data: Partial<Representative> | any): Representative {
  return {
    ...parseUser(data),
    title: data.title,
    district: data.district
  }
}

export function parseGroup(data: Partial<Group> | any): Group {

  let meetings = !data.meetings ? [] : Array.isArray(data.meetings) ? data.meetings : Object.keys(data.meetings);
  let representatives = !data.representatives ? [] :
    Array.isArray(data.representatives) ? data.representatives.map(rep => parseRepresentative(rep)) :
      Object.keys(data.representatives)
        .map(id => ({ ...data.representatives[ id ], id }))
        .map(rep => parseRepresentative(rep));

  let districts = !data.districts ? [] :
    Array.isArray(data.districts) ? data.districts.map(district => parseDistrict(district)) :
      Object.keys(data.districts)
        .map(id => ({ ...data.districts[ id ], id }))
        .map(district => parseDistrict(district));

  return {
    ...parseEntity(data),
    name: data.name,
    icon: data.icon,
    meetings,
    representatives,
    districts
  };


}

export function districtsEqual(x: District, y: District): boolean {
  return x.id == y.id && x.name == y.name && x.representative == y.representative
}

export function representativesEqual(x: Representative, y: Representative): boolean {
  return usersEqual(x, y) && x.district == y.district && x.title == y.title;
}


export function groupsEqual(x: Group, y: Group): boolean {
  if (x.id != y.id || x.icon != y.icon) {
    return false;
  }
  if (x.meetings.join('_') != y.meetings.join('_')) {
    return false;
  }

  let xDistricts = x.districts.sort((x, y) => x.id.localeCompare(y.id));
  let yDistricts = x.districts.sort((x, y) => x.id.localeCompare(y.id));

  if (xDistricts.length != yDistricts.length) {
    return false;
  }

  for (let i = 0; i < xDistricts.length; i++) {
    if (!districtsEqual(xDistricts[ i ], yDistricts[ i ])) {
      return false;
    }
  }

  let xReps = x.representatives.sort((x, y) => x.id.localeCompare(y.id));
  let yReps = x.representatives.sort((x, y) => x.id.localeCompare(y.id));

  if (xReps.length != yReps.length) {
    return false;
  }

  for (let i = 0; i < xReps.length; i++) {
    if (!representativesEqual(xReps[ i ], yReps[ i ])) {
      return false;
    }
  }

  return true;
}

export function mergeGroups(prev: Group, next: Group) {
  return {...prev, ...next};
}

