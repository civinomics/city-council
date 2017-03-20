import { Entity } from './index';
import * as moment from 'moment';
import Moment = moment.Moment;

export interface User extends Entity {
  name: string;
  icon: string;
  joined: Moment;
  lastOn: Moment;

  //map of group IDs to the ID of the district they're a constituent of
  districts: { [id: string]: string }
}

export interface SessionUser extends User {
  email: string;
  address: {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: number;
  }

  votes: { [id: string]: number }

}


export const UserSchemaDefinition = {};
