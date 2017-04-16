import { Component } from '@angular/core';
import { MeetingService } from '../../../services/meeting.service';
import { GroupService } from '../../../services/group.service';
import { Observable } from 'rxjs/Observable';
import { Meeting } from '../../../models/meeting';
import { Item } from '../../../models/item';
import { ItemService } from '../../../services/item.service';

@Component({
    selector: 'civ-meeting-admin',
    template: `
        <civ-meeting-admin-view [meeting]="meeting$ | async" [items]="items$ | async"
                                (setFeedbackStatus)="setFeedbackStatus($event)"
                                (setPublished)="setPublished($event)"
        ></civ-meeting-admin-view>
    `,
    styles: []
})
export class MeetingAdminPageComponent {

    meeting$: Observable<Meeting>;
    items$: Observable<Item[]>;

    constructor(private meetingSvc: MeetingService, private groupSvc: GroupService, private itemSvc: ItemService) {
        this.meeting$ = meetingSvc.getSelectedMeeting();
        this.items$ = this.meetingSvc.getAgendaItemsOfSelectedMeeting().map(arr => arr.filter(it => !!it));

    }

    setFeedbackStatus(it: { meetingId: string, itemId: string, value: boolean }) {
        this.itemSvc.updateFeedbackStatus(it.itemId, it.meetingId, it.value);
    }

    setPublished(it: { meetingId: string, value: boolean }) {
        this.meetingSvc.setPublished(it.meetingId, it.value);
    }

}
