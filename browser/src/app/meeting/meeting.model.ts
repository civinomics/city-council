import { Entity, parseEntity, RawEntity } from '../core/models';
import * as moment from 'moment';
import { keys } from 'lodash';
import { ItemStatsAdt } from '../item/item.model';
import { Group, RawGroup } from '../group/group.model';
import { CommentWithAuthor, RawCommentWithAuthor } from '../comment/comment.model';
import Moment = moment.Moment;

export type MeetingStatus = 'open' | 'closed' | 'draft'

export type MeetingField = 'title' | 'startTime' | 'endTime' | 'feedbackDeadline' | 'status' | 'agenda'

export interface Meeting extends Entity {
  title: string;
  startTime: Moment;
  endTime: Moment;
  feedbackDeadline: Moment;
  published: boolean;
  agenda: string[];
  groupId: string;
}

export type PartialMeeting = {[P in keyof Meeting]?: Meeting[P]};


export type RawMeeting = RawEntity & {
    [P in 'title' | 'groupId' | 'published']: Meeting[P];
  } & {
  [P in 'startTime' | 'endTime' | 'feedbackDeadline']: string;
  } & {
  agenda: {[id:string]: true} | string[];
}

export const MeetingFields = [ 'title', 'startTime', 'endTime', 'feedbackDeadline', 'published', 'agenda', 'groupId' ];


export type MeetingStats = {
  priors: { date: string, value: number }[];

  total: {
    votes: number;
    comments: number;
    participants: number;
    byDistrict: {
      [id: string]: {
        votes: number;
        comments: number;
        participants: number;
      }
    };
  };

  byItem: {
    [itemId: string]: {
      total: ItemStatsAdt;
      byDistrict: { [districtId: string]: ItemStatsAdt }
      topComments: {
        pro: CommentWithAuthor | RawCommentWithAuthor;
        con: CommentWithAuthor | RawCommentWithAuthor;
        byDistrict: { [districtId: string]: { pro: CommentWithAuthor | RawCommentWithAuthor | null, con: CommentWithAuthor | RawCommentWithAuthor | null } }
      }
    }
  }
}

export type MeetingReportAdt = {
  meeting: Meeting | RawMeeting,
  group: Group | RawGroup,
  stats: MeetingStats
}

export const parseMeeting: (data: RawMeeting | Meeting | any) => Meeting = (data: RawMeeting) => {


  let agenda: string[] = data.agenda instanceof Array ? data.agenda : Object.keys(data.agenda);

  return {
    ...parseEntity(data),
    id: data.$key || data.id,
    title: data.title,
    groupId: data.groupId,
    published: data.published,
    startTime: moment(data.startTime),
    endTime: moment(data.endTime),
    feedbackDeadline: moment(data.feedbackDeadline),
    agenda
  }
};

const equalityChecks = [
  (x: Meeting, y: Meeting) => x.id == y.id,
  (x: Meeting, y: Meeting) => x.title == y.title,
  (x: Meeting, y: Meeting) => x.feedbackDeadline.isSame(y.feedbackDeadline),
  (x: Meeting, y: Meeting) => x.startTime.isSame(y.startTime),
  (x: Meeting, y: Meeting) => x.endTime.isSame(y.endTime),
  (x: Meeting, y: Meeting) => x.published == y.published,
  (x: Meeting, y: Meeting) => x.agenda.join('_') != y.agenda.join('_')
];

export const meetingsEqual: (x: Meeting, y: Meeting) => boolean = (x, y) => {

  for (let i = 0, check = equalityChecks[i]; i < equalityChecks.length; i++){
    if (!check(x, y)){
      return false;
    }
  }
  return true;
};

export const mergeMeetings: (prev: Meeting, next: Meeting) => Meeting = (prev, next) => {
  return {
    ...prev, ...next
  }
};
