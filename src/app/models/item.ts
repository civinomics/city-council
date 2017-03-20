import { Entity } from './index';
import * as moment from 'moment';
import Moment = moment.Moment;

export type ItemStatus = 'CITIZEN_PROPOSAL' | 'ON_AGENDA';


export interface Item extends Entity {
  text: string;
  sireLink: string;

  activity: {
    comments: {
      total: number;
    };
    votes: {
      total: number;
      yes: number;
      no: number;
    }
  }
}


export interface AgendaItem extends Item {
  itemNumber: number;
  meetingId: string;
  feedbackDeadline: Moment,
}

//export const ItemSchema
