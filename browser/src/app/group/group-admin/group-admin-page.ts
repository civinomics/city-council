import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Meeting } from '../../meeting/meeting.model';
import { Group, GroupEditInput } from '../group.model';
import { GroupService } from '../group.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../user/user.model';

@Component({
  selector: 'civ-group-admin',
  template: `
    <div *ngIf="group$ | async as group; else loading">
      <civ-group-admin-view *ngIf="meetings$ | async as meetings; else loading"
                            [group]="group"
                            [meetings]="meetings"
                            (gotoMeeting)="showMeetingAdmin($event)"
                            (newMeeting)="showNewMeeting()"
                            (save)="saveChanges($event)"
      >
      </civ-group-admin-view>

      <civ-group-edit-view [extantGroup]="group"
                           (save)="saveChanges($event)"
                           [savePending]="savePending"
                           [isSuperuser]="false">

      </civ-group-edit-view>

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
  reps$: Observable<{ [id: string]: User }>;

  savePending: boolean = false;
  saveError: string | null = null;

  constructor(private groupSvc: GroupService, private router: Router, private route: ActivatedRoute) {
    this.meetings$ = this.groupSvc.getMeetingsOfSelectedGroup()
      .filter(it => !!it)
      .map(arr => arr.filter(it => !!it));

    this.group$ = this.groupSvc.getActiveGroup().filter(it => !!it);
  }

  ngOnInit() {
  }

  showMeetingAdmin(meetingId: string) {
    this.router.navigate([ 'meeting', meetingId, 'admin' ], { relativeTo: this.route.parent.parent });
  }

  showNewMeeting() {
    this.router.navigate([ 'new-meeting' ], { relativeTo: this.route });
  }


  saveChanges(input: GroupEditInput) {
    this.savePending = true;
    this.groupSvc.saveChanges(input).then(() => {
      this.savePending = false;
      this.saveError = null;
    }).catch(err => {
      this.savePending = false;
      this.saveError = err.message;
    })
  }

}
