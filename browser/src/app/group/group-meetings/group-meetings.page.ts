import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Meeting } from '../../meeting/meeting.model';
import { GroupService } from '../group.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../user/auth.service';
import { Group } from '../group.model';

@Component({
    selector: 'civ-group-meetings-page',
    template: `
      <civ-group-meetings-view *ngIf="meetings$ | async as meetings; else loading"
                               [meetings]="meetings"
                               (showMeeting)="showMeeting($event)"
                               [isAdmin]="isAdmin | async">
        </civ-group-meetings-view>
      <ng-template #loading>
        <civ-loading class="loading"></civ-loading>
      </ng-template>
    `,
  styleUrls: [ '../../shared/pages.scss' ]
})
export class GroupMeetingsPage implements OnInit {
    meetings$: Observable<Meeting[]>;
    isAdmin: Observable<boolean>;
    group$: Observable<Group>;


    constructor(private groupSvc: GroupService, private router: Router, private route: ActivatedRoute, private authSvc: AuthService) {
      this.meetings$ = this.groupSvc.getMeetingsOfSelectedGroup()
        .filter(it => !!it)
        .map(arr => arr.filter(it => !!it));

        this.group$ = this.groupSvc.getSelectedGroup().filter(it => !!it);

      this.isAdmin = this.authSvc.sessionUser$.withLatestFrom(this.group$, (user, group) => !!user && ((user.superuser || group.owner == user.id)));

    }

    ngOnInit() {
    }


  showMeeting(id: string) {
        this.router.navigate([ 'meeting', id ], { relativeTo: this.route });
    }
}
