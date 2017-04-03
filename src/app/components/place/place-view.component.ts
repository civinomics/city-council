import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import * as moment from 'moment';
import {Place} from '../../models/place';
import {DenormalizedMeeting} from '../../models/meeting';
import Moment = moment.Moment;

@Component({
  selector: 'civ-place-view',
  templateUrl: './place-view.component.html',
  styleUrls: [ './place-view.component.scss' ]
})
export class PlaceViewComponent implements OnInit {
  @Input() place: Place;
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
