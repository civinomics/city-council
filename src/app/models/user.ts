import {Entity, RawEntity} from './index';
import * as moment from 'moment';
import Moment = moment.Moment;

export interface User extends Entity {
  firstName: string;
  lastName: string;
  icon: string;
  joined: Moment;
  lastOn: Moment;

  //map of group IDs to the ID of the district they're a constituent of
  districts: { [id: string]: string }
}

export type UserAddress = {
  line1: string;
  line2?: string;
  city: string;
  zip: string;
}

export interface SessionUser extends User {
  email: string;
  address: UserAddress;
  votes: { [id: string]: string }
  comments: { [id: string]: string }
  following: string[];
}

export type RawUser = RawEntity & {
  [P in 'firstName' | 'lastName' | 'icon' | 'districts']: User[P]
  } & {
  [P in 'joined' | 'lastOn']: string
  }

export type RawSessionUser = {
  [P in keyof RawUser]: RawUser[P]
  } & {
  [P in keyof SessionUser]: SessionUser[P]
  }

export const parseSessionUser: (data: RawSessionUser) => SessionUser = (data) => {
  return {
    ...data,
    id: data.$key,
    joined: moment(data.joined),
    lastOn: moment(data.lastOn)
  }
};
