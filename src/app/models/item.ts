import {Entity, RawEntity} from './index';
import * as moment from 'moment';
import {Vote} from './vote';
import Moment = moment.Moment;

export type ItemStatus = 'CITIZEN_PROPOSAL' | 'ON_AGENDA';

export type ItemActivitySummary = {
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
  agendaNumber: number;
  feedbackDeadline: Moment;
  activity?: ItemActivitySummary;
  voteIds?: string[],
  commentIds?: string[]
}

//export const ItemSchema

export type RawItem = RawEntity & {
  [P in 'text' | 'sireLink' | 'agendaNumber']: Item[P];
  } & {
  activity?: ItemActivitySummary;
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
    agendaNumber: it.agendaNumber,
    activity: it.activity
  }
}

export const itemsEqual: (x: Item, y: Item) => boolean = (x, y) => {
  if (x.id != y.id || x.text != y.text || x.sireLink != y.sireLink || x.agendaNumber != y.agendaNumber) {
    return false;
  }
  if (x.activity != y.activity) {
    return false;
  }
  return true;
};

export function mergeItems(prev: Item, next: Item): Item {
  let voteIds = [...(prev.voteIds || []), ...(next.voteIds || []).filter(id => (prev.voteIds || []).indexOf(id) < 0)];

  return {...prev, ...next, voteIds};
}
