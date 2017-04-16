import { Entity, RawEntity } from '../models/entity';
import * as moment from 'moment';
import { Vote } from '../models/vote';
import { Comment } from '../models/comment';
import Moment = moment.Moment;

export type ItemStatus = 'CITIZEN_PROPOSAL' | 'ON_AGENDA';

export type ItemOutcome = {
  result: string,
  votes: {
    yes: number,
    no: number
  }
}

export type AgendaInfo = {
  groupId: string;
  meetingId: string;
  itemNumber: number;
  closedSession: boolean;
  outcome?: ItemOutcome
}

export type ItemStatsAdt = {
  comments: {
    pro: number;
    con: number;
    neutral: number;
  };
  votes: {
    yes: number;
    no: number;
  }
}
export interface Item extends Entity {
  text: string;
  sireLink: string;
  feedbackDeadline: Moment;
  activity?: ItemStatsAdt;
  onAgendas: {
    [id: string]: AgendaInfo;
  }
}

//export const ItemSchema

export type RawItem = RawEntity & {
  [P in 'text' | 'sireLink' | 'onAgendas']: Item[P];
  } & {
  activity?: ItemStatsAdt;
} & {
  [P in 'posted' | 'feedbackDeadline']: string
  } & {
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
    feedbackDeadline: moment(it.feedbackDeadline),
    onAgendas: it.onAgendas,
    activity: it.activity
  }
}

export const itemsEqual: (x: Item, y: Item) => boolean = (x, y) => {
  if (x.id != y.id || x.text != y.text || x.sireLink != y.sireLink) {
    return false;
  }
  if (x.activity != y.activity) {
    return false;
  }
  return true;
};

export function mergeItems(prev: Item, next: Item): Item {
  return {...prev, ...next};
}
