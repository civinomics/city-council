import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import * as moment from 'moment';
import { Meeting, PartialMeeting } from '../meeting.model';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AgendaInfo, Item } from '../../item/item.model';

@Component({
    selector: 'civ-meeting-admin-view',
    templateUrl: './meeting-admin.component.html',
    styleUrls: [ './meeting-admin.component.scss' ]
})
export class MeetingAdminComponent implements OnInit, OnChanges {


    @Input() meeting: Meeting;

    @Input() items: Item[];

    @Output() setFeedbackStatus = new EventEmitter<{ itemId: string, meetingId: string, value: boolean }>();

    @Output() setPublished = new EventEmitter<{ meetingId: string, value: boolean }>();

  @Output() updateInfo = new EventEmitter<{ meetingId: string, updates: PartialMeeting }>();
  @Output() gotoItem = new EventEmitter<string>();

    agenda: (Item & { agendaInfo: AgendaInfo })[];


    date: string;

  initialVals: any = {};

    basicForm: FormGroup = new FormGroup({
        date: new FormControl('', [ Validators.required ]),
        name: new FormControl('', [ Validators.required ]),
        deadlineDate: new FormControl('', [ Validators.required ]),
        deadlineTime: new FormControl('', [ Validators.required ])

    });


    constructor() { }

    ngOnInit() {
    }

    get status(){
      if (!this.meeting){
        return ''
      }
      return this.meeting.feedbackDeadline.isBefore(moment()) ? 'closed' : 'open';
    }



    ngOnChanges(changes: SimpleChanges): void {
        if (changes[ 'meeting' ]&& !!changes[ 'meeting' ].currentValue) {
            this.basicForm.controls[ 'date' ].setValue(this.meeting.startTime.format('YYYY-MM-DD').toString());
            this.basicForm.controls[ 'name' ].setValue(this.meeting.title);
            this.basicForm.controls[ 'deadlineDate' ].setValue(this.meeting.feedbackDeadline.format('YYYY-MM-DD').toString());
            this.basicForm.controls[ 'deadlineTime' ].setValue(this.meeting.feedbackDeadline.format('hh:mm').toString());

          this.initialVals = {
            date: this.meeting.startTime.format('YYYY-MM-DD').toString(),
            name: this.meeting.title,
            deadlineDate: this.meeting.feedbackDeadline.format('YYYY-MM-DD').toString(),
            deadlineTime: this.meeting.feedbackDeadline.format('hh:mm').toString()
          }

        }

        if ((changes[ 'items' ]||changes[ 'meeting' ])&& !!this.items&& !!this.meeting) {
            this.agenda = this.parseItems(this.items);
        }

    }

  changes(): { date?: string, name?: string, deadlineDate?: string, deadlineTime?: string } | null {
    let ret: { date?: string, name?: string, deadlineDate?: string, deadlineTime?: string } = {};

    if (this.basicForm.controls[ 'date' ].value !== this.initialVals.date) {
      ret.date = this.basicForm.controls[ 'date' ].value
    }
    if (this.basicForm.controls[ 'name' ].value !== this.initialVals.name) {
      ret.name = this.basicForm.controls[ 'name' ].value;
    }

    if (this.basicForm.controls[ 'deadlineDate' ].value !== this.initialVals.deadlineDate) {
      ret.deadlineDate = this.basicForm.controls[ 'deadlineDate' ].value;
    }


    if (this.basicForm.controls[ 'deadlineTime' ].value !== this.initialVals.deadlineTime) {
      ret.deadlineTime = this.basicForm.controls[ 'deadlineTime' ].value;
    }

    if (Object.keys(ret).length == 0) {
      return null;
    }

    return ret;
  }

  saveChanges() {
    let changes = this.changes();

    let push: PartialMeeting = {};

    if (changes.deadlineDate || changes.deadlineTime) {
      push.feedbackDeadline = moment(`${this.basicForm.controls[ 'deadlineDate' ].value}T${this.basicForm.controls[ 'deadlineTime' ].value}Z`);
    }
    if (changes.name) {
      push.title = changes.name;
    }
    if (changes.date) {
      push.startTime = moment(changes.date);
    }
    console.log(`emitting`); console.log(push);
    this.updateInfo.emit({ meetingId: this.meeting.id, updates: push });
  }

    private parseItems(items: Item[]) {
        return items.map(it => ({
            ...it,
            agendaInfo: it.onAgendas[ this.meeting.id ]
        })).sort((x, y) => x.agendaInfo.itemNumber - y.agendaInfo.itemNumber);
    }

    toggleFeedbackStatus(item: Item) {
        this.setFeedbackStatus.emit({
            itemId: item.id,
            meetingId: this.meeting.id,
            value: !item.onAgendas[ this.meeting.id ].closedSession
        })
    }

    togglePublished() {
        this.setPublished.emit({ meetingId: this.meeting.id, value: !this.meeting.published });
    }

    itemEquality(index, item: Item){
      return item.id;
    }

}
