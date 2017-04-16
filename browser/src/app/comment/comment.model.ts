import * as moment from 'moment';
import { Entity, parseEntity, RawEntity } from '../models/entity';
import { parseUser, RawUser, User } from '../models/user';
import Moment = moment.Moment;
export type CommentRole = 'pro' | 'con' | 'neutral';

export interface Comment extends Entity {
    text: string;
    role: CommentRole;
    posted: Moment;
    userDistrict: null | {id: string, name: string}

    votes?: { up?: number, down?: number },
    replies?: string[];
    author?: User
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

export const parseComment: (data: RawComment|Comment|RawCommentWithAuthor|CommentWithAuthor) => Comment = (data) => {
    return {
        ...parseEntity(data),
        text: data.text,
        role: data.role,
        posted: moment(data.posted),
        userDistrict: data.userDistrict || null,
        votes: data.votes,
        replies: data.replies,
        author: !!data.author ? parseUser(data.author) : null
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
