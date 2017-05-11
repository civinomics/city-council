import * as moment from 'moment';
import { Entity, parseEntity, RawEntity } from '../core/models';
import { parseUser, RawUser, User } from '../user/user.model';
import { Vote } from '../vote/vote.model';
import Moment = moment.Moment;
export type CommentRole = 'pro' | 'con' | 'neutral';

export interface Comment extends Entity {
    text: string;
    role: CommentRole;
    posted: Moment;
    userDistrict: null | {id: string, name: string}

    votes?: { up?: number, down?: number },
    replies?: string[];
  author?: User,
  sessionUserVote?: Vote | null;
    //

}

export type RawComment = RawEntity & {
    [P in 'text' | 'role' | 'userDistrict']: Comment[P]
    } &
    {
        votes?: { up?: number, down?: number },
        replies?: string[]
    } &
    {
        author?: RawUser|User,
        posted: string
    }

export type CommentWithAuthor = Comment & {
    author: User
}

export type RawCommentWithAuthor = RawComment & {
    author: RawUser
}

export type NewCommentData = {
    text: string,
    role: string;
}

export const parseComment: (data: Comment | any) => Comment = (data) => {
  let votes = data.votes || { up: 0, down: 0 };
    return {
        ...parseEntity(data),
        text: data.text,
        role: data.role,
        posted: moment(data.posted),
        userDistrict: data.userDistrict || null,
      sessionUserVote: data.sessionUserVote || null,
      votes,
        replies: data.replies,
        author: !!data.author ? parseUser(data.author) : null
    }
};

export function commentsEqual(x: Comment, y: Comment): boolean {
    if (x.id != y.id || x.text != y.text || x.role != y.role || x.userDistrict != y.userDistrict) {
        return false;
    }

  if (x.sessionUserVote != y.sessionUserVote) {
    return false;
  }

  if (!(!x.votes && !y.votes)) { //if at least one has votes
    if (!(!!x.votes && !!y.votes)) { //if they don't both have votes, they're unequal
      return false;
    }
    if (x.votes.up != y.votes.up || x.votes.down != y.votes.down) {
      return false;
    }
  }

  return true;
}

export function mergeComments(prev: Comment, next: Comment): Comment {
  console.log('merging: ');
  console.log(prev);
  console.log(next);
    return {...prev, ...next};
}
