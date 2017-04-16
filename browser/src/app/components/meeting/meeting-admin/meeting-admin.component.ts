import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Meeting } from '../../../models/meeting';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AgendaInfo, Item } from '../../../models/item';

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

    agenda: (Item & { agendaInfo: AgendaInfo })[];


    date: string;


    basicForm: FormGroup = new FormGroup({
        date: new FormControl('', [ Validators.required ]),
        name: new FormControl('', [ Validators.required ]),
        deadlineDate: new FormControl('', [ Validators.required ]),
        deadlineTime: new FormControl('', [ Validators.required ])

    });


    constructor() { }

    ngOnInit() {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes[ 'meeting' ]&& !!changes[ 'meeting' ].currentValue) {
            this.basicForm.controls[ 'date' ].setValue(this.meeting.startTime.format('YYYY-MM-DD').toString());
            this.basicForm.controls[ 'name' ].setValue(this.meeting.title);
            this.basicForm.controls[ 'deadlineDate' ].setValue(this.meeting.feedbackDeadline.format('YYYY-MM-DD').toString());
            this.basicForm.controls[ 'deadlineTime' ].setValue(this.meeting.feedbackDeadline.format('hh:mm').toString());
        }

        if ((changes[ 'items' ]||changes[ 'meeting' ])&& !!this.items&& !!this.meeting) {
            this.agenda = this.parseItems(this.items);
        }

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

}
