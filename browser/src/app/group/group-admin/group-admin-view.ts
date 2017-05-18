import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Group } from '../group.model';
import { Meeting } from '../../meeting/meeting.model';
import * as moment from 'moment';
import Moment = moment.Moment;

@Component({
  selector: 'civ-group-admin-view',
  templateUrl: './group-admin-view.html',
  styleUrls: [ './group-admin-view.scss' ]
})
export class GroupAdminViewComponent implements OnInit {

  @Input() group: Group;
  @Input() meetings: Meeting[];

  @Output() gotoMeeting: EventEmitter<string> = new EventEmitter();

  private now = moment();

  constructor() {

  }

  ngOnInit() {
  }

  isAfterNow(x: Moment) {
    return x.isAfter(this.now);
  }

}
