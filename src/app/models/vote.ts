import * as moment from 'moment';
import {Entity, parseEntity, RawEntity} from './index';
import Moment = moment.Moment;

export interface Vote extends Entity {
  value: 1 | -1;
  posted: Moment;
  userDistrict: string | null,
}

export type RawVote = RawEntity & {[P in 'value' | 'userDistrict']: Vote[P]} & { posted: string };

export function parseVote(data: RawVote): Vote {
  console.log(data);
  return {
    ...parseEntity(data),
    value: data.value,
    posted: moment(data.posted),
    userDistrict: data.userDistrict || null
  }
}
