import { Entity, parseEntity } from '../core/models';
import * as moment from 'moment';
import Moment = moment.Moment;

export interface User extends Entity {
  firstName: string;
  lastName: string;
  icon: string;
  joined: Moment;
  lastOn: Moment;

  //map of group IDs to the ID of the district they're a constituent of
  districts: { [id: string]: { id: string, name: string } }
}

export type UserAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface SessionUser extends User {
  email: string;
  address: UserAddress;
  votes: { [id: string]: string }
  comments: { [id: string]: string }
  following: string[];
  superuser: boolean;
  isVerified: boolean;
}


export type EmailSignupData = {
  [P in 'firstName' | 'lastName' | 'address' | 'email' | 'superuser']: SessionUser[P]
  } & {
  password: string;
}

export function parseUser(data: Partial<User> | any): User {
  return {
    ...parseEntity(data),
    firstName: data.firstName,
    lastName: data.lastName,
    joined: moment(data.joined),
    lastOn: moment(data.lastOn),
    icon: data.icon,
    districts: data.districts || {},

  }
}

export const parseSessionUser: (data: Partial<SessionUser> | any) => SessionUser = (data) => {

  return {
    ...parseUser(data),
    email: data.email,
    address: data.address,
    superuser: data.superuser || false,
    isVerified: data.isVerified,
    following: data.following,
    votes: data.votes || {},
    comments: data.comments || {}
  }
};

export function userDistrict(user: User, groupId: string) {
  if (!user || !user.districts[ groupId ]) {
    return null;
  }

  return user.districts[ groupId ].id;
}

export function usersEqual(x: User, y: User): boolean {

  return x.id == y.id &&
    x.firstName == y.firstName &&
    x.lastName == y.lastName &&
    x.icon == y.icon &&
    x.joined == y.joined &&
    x.lastOn == y.lastOn

}
