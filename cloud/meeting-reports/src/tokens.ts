import {InjectionToken} from '@angular/core';
import {MeetingStatsAdt} from '@civ/city-council/dist/app/models';

export const MEETING_STATS = new InjectionToken<MeetingStatsAdt>('MEETING_STATS');
