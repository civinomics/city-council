import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Meeting } from '../../meeting/meeting.model';
import { GroupService } from '../group.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'civ-group-meetings-page',
    template: `
        <civ-group-meetings-view [meetings]="meetings$ | async" (showMeeting)="showMeeting($event)">

        </civ-group-meetings-view>
    `,
    styles: []
})
export class GroupMeetingsPage implements OnInit {
    meetings$: Observable<Meeting[]>;

    constructor(private groupSvc: GroupService, private router: Router, private route: ActivatedRoute) {
        this.meetings$ = this.groupSvc.getMeetingsOfSelectedGroup().map(arr => arr.filter(it => !!it));


    }

    ngOnInit() {
    }


    showMeeting(id: string) {
        this.router.navigate([ 'meeting', id ], { relativeTo: this.route });
    }
}
