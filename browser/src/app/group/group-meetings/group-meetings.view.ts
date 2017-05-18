import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Meeting } from '../../meeting/meeting.model';
import * as moment from 'moment';
import Moment = moment.Moment;

@Component({
    selector: 'civ-group-meetings-view',
    templateUrl: './group-meetings.view.html',
    styleUrls: [ './group-meetings.view.scss' ]
})
export class GroupMeetingsView implements OnInit {

    @Input() meetings: Meeting[];
    @Input() isAdmin: boolean;
    @Output() showMeeting = new EventEmitter();

    private readonly now: Moment;

    constructor() { }

    ngOnInit() {
    }


    get upcomingMeetings() {
      return this.meetings
        .filter(meeting => meeting.published && meeting.startTime.isAfter(this.now))
        .sort((x, y) => y.startTime.isBefore(x.startTime) ? -1 : x.startTime.isBefore(y.startTime) ? 1 : 0);
    }

    get recentMeetings() {
      return this
        .meetings
        .filter(meeting => meeting.published && meeting.startTime.isBefore(this.now))
        .sort((x, y) => y.startTime.isBefore(x.startTime) ? -1 : x.startTime.isBefore(y.startTime) ? 1 : 0);
    }

    get draftMeetings() {
      return this.meetings.filter(meeting => !meeting.published)
        .sort((x, y) => y.startTime.isBefore(x.startTime) ? -1 : x.startTime.isBefore(y.startTime) ? 1 : 0);
    }

  status(meeting: Meeting) {
    if (!meeting.published) {
      return 'draft';
    }
    if (meeting.feedbackDeadline.isAfter(this.now)) {
      return 'open'
    }
    return 'closed';
  }

}
