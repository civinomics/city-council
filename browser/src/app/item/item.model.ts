import { Entity, RawEntity } from '../core/models';
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

  let onAgendas = Object.keys(it.onAgendas || {}).reduce((result, id) => ({
    ...result,
    [id]: {
      ...it.onAgendas[ id ],
      feedbackDeadline: moment(it.onAgendas[ id ].feedbackDeadline)
    }
  }), {});

  return {
    ...it,
    id: it.$key || it.id,
    feedbackDeadline: moment(it.feedbackDeadline),
    onAgendas,
    activity: it.activity
  }
};

const equalityChecks = [
  (x: Item, y: Item) => x.id == y.id,
  (x: Item, y: Item) => x.text == y.text,
  (x: Item, y: Item) => {
    let xAgendas = Object.keys(x.onAgendas), yAgendas = Object.keys(y.onAgendas);
    if (xAgendas.join('_') != yAgendas.join('_')){
      return false;
    }
    for (let i = 0; i < xAgendas.length; i++){
      if (x.onAgendas[xAgendas[i]].closedSession != y.onAgendas[xAgendas[i]].closedSession){
        return false;
      }
      if (!x.onAgendas[xAgendas[i]].feedbackDeadline.isSame(y.onAgendas[xAgendas[i]].feedbackDeadline)){
        return false;
      }
    };
    return true;
  },
  (x: Item, y: Item) => {
    if (!(x.activity || y.activity)){
      return true; //if neither have it, consider equal
    } if (!(x.activity && y.activity)){
      return false; //if one has it but the other doesn't, consider unequal
    } else {
      //if both have it
      if (
        x.activity.comments.pro != y.activity.comments.pro ||
        x.activity.comments.con != y.activity.comments.con ||
        x.activity.comments.neutral != y.activity.comments.neutral ||
        x.activity.votes.yes != y.activity.votes.yes ||
        x.activity.votes.no != y.activity.votes.no
      ) {
        return false;
      }
      return true;
    }
  },

  (x: Item, y: Item) => x.sireLink == y.sireLink
];

export const itemsEqual: (x: Item, y: Item) => boolean = (x, y) => {
  for (let i = 0; i < equalityChecks.length; i++) {
    if (equalityChecks[ i ](x, y) == false) {
      return false;
    }
  }
  return true;
};

export function mergeItems(prev: Item, next: Item): Item {
  return {...prev, ...next};
}
