import {Entity, EntityField, parseEntity, RawEntity} from './index';
import * as moment from 'moment';
import {keys} from 'lodash';
import Moment = moment.Moment;

export type MeetingStatus = 'open' | 'closed' | 'draft'

export type MeetingField = 'title' | 'startTime' | 'endTime' | 'feedbackDeadline' | 'status' | 'agendaIds'

export interface Meeting extends Entity {
  title: string;
  startTime: Moment;
  endTime: Moment;
  feedbackDeadline: Moment;
  status: MeetingStatus;

  agendaIds: string[]
}


export type RawMeeting = RawEntity & {
  [P in EntityField | 'title' | 'status']: Meeting[P];
  } & {
  [P in 'startTime' | 'endTime' | 'feedbackDeadline']: string;
  } & {
  agenda: string[]
}

export const parseMeeting: (data: RawMeeting) => Meeting = (data: RawMeeting) => {

  return {
    ...parseEntity(data),
    id: data.$key,
    title: data.title,
    status: moment(data.feedbackDeadline).isAfter(moment()) ? 'open' : 'closed',
    startTime: moment(data.startTime),
    endTime: moment(data.endTime),
    feedbackDeadline: moment(data.feedbackDeadline),
    agendaIds: keys(data.agenda)
  }
};

export const meetingsEqual: (x: Meeting, y: Meeting) => boolean = (x, y) => {
  //TODO
  return x.id == y.id
};
