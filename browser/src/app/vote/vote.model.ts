import * as moment from 'moment';
import { Entity, parseEntity, RawEntity } from '../core/models';
import Moment = moment.Moment;
import { User } from '../user/user.model';

export interface Vote extends Entity {
  value: number;
  posted: Moment;
  userDistrict: null | {id: string, name: string};
}


export type DenormalizedVote = Vote & {
  author: User
}

export type RawVote = RawEntity & {[P in 'value' | 'userDistrict']: Vote[P]} & { posted: string };



export function parseVote(data: RawVote): Vote {

  return {
    ...parseEntity(data),
    value: data.value,
    posted: moment(data.posted),
    userDistrict: data.userDistrict || null
  }
}

export function votesEqual(x: Vote, y: Vote) {
  return (x.id == y.id && x.value == y.value && x.userDistrict == y.userDistrict);
}

export function mergeVotes(prev: Vote, next: Vote): Vote {
  return {...prev, ...next}
}
