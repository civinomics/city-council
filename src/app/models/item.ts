import {Entity, RawEntity} from './index';
import * as moment from 'moment';
import {Vote} from './vote';
import Moment = moment.Moment;

export type ItemStatus = 'CITIZEN_PROPOSAL' | 'ON_AGENDA';

export type ItemActivityAdt = {
  comments: {
    total: number;
  };
  votes: {
    total: number;
    yes: number;
    no: number;
  }
}
export interface Item extends Entity {
  text: string;
  sireLink: string;
  activity?: ItemActivityAdt;
  agendaNumber: number;
  feedbackDeadline: Moment;
}

//export const ItemSchema

export type RawItem = RawEntity & {
  [P in 'text' | 'sireLink' | 'agendaNumber']: Item[P];
  } & {
  activity?: ItemActivityAdt;
} & {
  [P in 'posted' | 'feedbackDeadline']: string
  } & {
  //TODO delete after schema update 3/30/17
  itemNumber: number
}

export type ItemWithComments = Item & {
  comments: Comment[]
}

export type ItemWithVotes = Item & {
  votes: Vote[]
}


export const parseItem: (it: RawItem | any) => Item = (it) => {
  return {
    ...it,
    id: it.$key || it.id,
    posted: moment(it.posted),
    feedbackDeadline: moment(it.feedbackDeadline),
    agendaNumber: it.itemNumber,
    activity: it.activity
  }
}

export const itemsEqual: (x: Item, y: Item) => boolean = (x, y) => {
  //TODO
  return x.id == y.id;

};
