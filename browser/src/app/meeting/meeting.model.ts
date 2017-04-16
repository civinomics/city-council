import { Entity, EntityField, parseEntity, RawEntity } from '../models/entity';
import * as moment from 'moment';
import { keys } from 'lodash';
import { ItemStatsAdt } from '../item/item.model';
import { Group, RawGroup } from '../group/group.model';
import { CommentWithAuthor, RawCommentWithAuthor } from '../models/comment';
import Moment = moment.Moment;

export type MeetingStatus = 'open' | 'closed' | 'draft'

export type MeetingField = 'title' | 'startTime' | 'endTime' | 'feedbackDeadline' | 'status' | 'agendaIds'

export interface Meeting extends Entity {
  title: string;
  startTime: Moment;
  endTime: Moment;
  feedbackDeadline: Moment;
  status: MeetingStatus;
  published: boolean;
  agendaIds: string[];
  groupId: string;
}


export type RawMeeting = RawEntity & {
    [P in EntityField | 'title' | 'groupId' | 'published']: Meeting[P];
  } & {
  [P in 'startTime' | 'endTime' | 'feedbackDeadline']: string;
  } & {
  agenda: string[];
  published: boolean;
}


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

  return {
    ...parseEntity(data),
    id: data.$key || data.id,
    title: data.title,
    groupId: data.groupId,
    published: data.published,
    status: data.published == false ? 'draft' : moment(data.feedbackDeadline).isAfter(moment()) ? 'open' : 'closed',
    startTime: moment(data.startTime),
    endTime: moment(data.endTime),
    feedbackDeadline: moment(data.feedbackDeadline),
    agendaIds: keys(data.agenda)
  }
};

export const meetingsEqual: (x: Meeting, y: Meeting) => boolean = (x, y) => {
  if (x.id != y.id || x.title != y.title || x.status != y.status) {
    return false;
  }
  if (x.agendaIds.join('_') != y.agendaIds.join('_')) {
    return false;
  }
  return true;
};

export const mergeMeetings: (prev: Meeting, next: Meeting) => Meeting = (prev, next) => {
  return {
    ...prev, ...next
  }
};
