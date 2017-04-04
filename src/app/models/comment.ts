import * as moment from 'moment';
import {Entity, RawEntity} from './index';
import {User} from './user';
import Moment = moment.Moment;
export type CommentRole = 'pro' | 'con' | 'neutral';

export interface Comment extends Entity {
  text: string;
  role: CommentRole;
  posted: Moment;

  userDistrict: string | null,

}

export type RawComment = RawEntity & {
  [P in 'text' | 'role' | 'userDistrict']: Comment[P]
  } & {
  posted: string
}

export type CommentWithAuthor = Comment & {
  author: User
}
