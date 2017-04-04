import * as moment from 'moment';
import {Entity, EntityField} from './index';
import Moment = moment.Moment;

export interface Vote extends Entity {
  value: 1 | -1;
  posted: Moment;
  userDistrict: string | null,
}

export type RawVote = {[P in EntityField | 'value' | 'userDistrict']: Vote[P]} & { posted: string };

export function parseVote(data: RawVote): Vote {
  return {
    ...data,
    posted: moment(data.posted)
  }
}
