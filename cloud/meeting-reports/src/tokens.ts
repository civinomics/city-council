import { InjectionToken } from '@angular/core';
import { Comment, MeetingReportAdt } from '@civ/city-council';

export const ALL_DISTRICTS = 'ALL_DISTRICTS';

export const REPORT_DATA = new InjectionToken<MeetingReportAdt>('REPORT_DATA');
export const ALL_COMMENTS = new InjectionToken<{ [id: string]: Comment[] }>('REPORT_DATA');

export const FOR_DISTRICT = new InjectionToken<string>('FOR_DISTRICT');

export type CommentDict = { [id: string]: Comment[] };
