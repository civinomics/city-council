import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Meeting } from '../../meeting/meeting.model';
import { Group } from '../group.model';
import { GroupService } from '../group.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'civ-group-admin',
  template: `
    <div *ngIf="group$ | async as group; else loading">
      <civ-group-admin-view *ngIf="meetings$ | async as meetings; else loading"
                            [group]="group"
                            [meetings]="meetings"
                            (gotoMeeting)="showMeetingAdmin($event)"
      >
      </civ-group-admin-view>

    </div>
    <ng-template #loading>
      <civ-loading class="loading"></civ-loading>
    </ng-template>
  `,
  styles: []
})
export class GroupAdminPageComponent implements OnInit {

  meetings$: Observable<Meeting[]>;
  group$: Observable<Group>;


  constructor(private groupSvc: GroupService, private router: Router, private route: ActivatedRoute) {
    this.meetings$ = this.groupSvc.getMeetingsOfSelectedGroup()
      .filter(it => !!it)
      .map(arr => arr.filter(it => !!it));

    this.group$ = this.groupSvc.getSelectedGroup().filter(it => !!it);

  }

  ngOnInit() {
  }

  showMeetingAdmin(meetingId: string) {
    this.router.navigate([ '../', 'meeting', meetingId, 'admin' ], { relativeTo: this.route });
  }

}
