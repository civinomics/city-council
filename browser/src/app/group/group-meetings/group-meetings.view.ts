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
        return this.meetings.filter(meeting => meeting.published && meeting.startTime.isAfter(this.now));
    }

    get recentMeetings() {
        return this.meetings.filter(meeting => meeting.published && meeting.startTime.isBefore(this.now));
    }

    get draftMeetings() {
        return this.meetings.filter(meeting => !meeting.published);
    }


}
