import { Entity } from './index';
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
  line2: string;
  city: string;
  zip: number;
}

export interface SessionUser extends User {
  email: string;
  address: UserAddress;
  votes: { [id: string]: number }

}


export const UserSchemaDefinition = {};
