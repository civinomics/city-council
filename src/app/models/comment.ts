import * as moment from 'moment';
import {Entity, parseEntity, RawEntity} from './index';
import {User} from './user';
import Moment = moment.Moment;
export type CommentRole = 'pro' | 'con' | 'neutral';

export interface Comment extends Entity {
  text: string;
  role: CommentRole;
  posted: Moment;
  userDistrict: string | null,

  //

}

export type RawComment = RawEntity & {
  [P in 'text' | 'role' | 'userDistrict']: Comment[P]
  } & {
  posted: string
}

export type CommentWithAuthor = Comment & {
  author: User
}

export type NewCommentData = {
  text: string,
  role: string;
}

export const parseComment: (data: RawComment) => Comment = (data) => {
  return {
    ...parseEntity(data),
    text: data.text,
    role: data.role,
    posted: moment(data.posted),
    userDistrict: data.userDistrict
  }
};

export function commentsEqual(x: Comment, y: Comment): boolean {
  if (x.id != y.id || x.text != y.text || x.role != y.role || x.userDistrict != y.userDistrict) {
    return false;
  }
  return true;
}

export function mergeComments(prev: Comment, next: Comment): Comment {
  return {...prev, ...next};
}
