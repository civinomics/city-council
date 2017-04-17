import { Entity, RawEntity } from '../models/entity';
import * as moment from 'moment';
import { Vote } from '../vote/vote.model';
import { Comment } from '../comment/comment.model';
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
  feedbackDeadline: Moment;
  closedSession: boolean;
  outcome?: ItemOutcome
}

export type RawAgendaInfo = {
    [P in 'groupId' | 'meetingId' | 'itemNumber' | 'closedSession']: AgendaInfo[P]
    } & {
  feedbackDeadline: string
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

export type RawItem = RawEntity & {
    [P in 'text' | 'sireLink']: Item[P];
  } & {
  activity?: ItemStatsAdt;
} & {
  posted: string;
  onAgendas: {
    [id: string]: RawAgendaInfo;
  }
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
