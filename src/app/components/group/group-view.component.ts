import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import * as moment from 'moment';
import {DenormalizedMeeting} from '../../models/meeting';
import {Group} from '../../models/group';
import Moment = moment.Moment;

@Component({
  selector: 'civ-group-view',
  templateUrl: './group-view.component.html',
  styleUrls: ['./group-view.component.scss']
})
export class GroupViewComponent implements OnInit {
  @Input() group: Group;
  @Input() meetings: DenormalizedMeeting[];
  @Output() showMeeting = new EventEmitter();

  private readonly now: Moment;

  constructor() {
    this.now = moment();
  }

  ngOnInit() {
  }


  get upcomingMeetings() {
    return this.meetings.filter(meeting => meeting.startTime.isAfter(this.now));
  }

  get recentMeetings() {
    return this.meetings.filter(meeting => meeting.startTime.isBefore(this.now));
  }


}
