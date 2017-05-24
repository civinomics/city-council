import { Component, OnInit } from '@angular/core';
import { GroupService } from 'app/group/group.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Group } from '../../group.model';
import { MeetingService } from '../../../meeting/meeting.service';
import { MeetingCreateAdt } from '../../../meeting/meeting.model';

@Component({
  selector: 'civ-create-meeting-page',
  template: `
    <civ-create-meeting-view *ngIf="group$ | async as group"
                             [group]="group"
                             (submit)="submit($event)"></civ-create-meeting-view>
  `,
  styles: []
})
export class CreateMeetingPageComponent implements OnInit {

  group$: Observable<Group>;


  constructor(private groupSvc: GroupService, private meetingSvc: MeetingService, private router: Router, private route: ActivatedRoute) {

    this.group$ = this.groupSvc.getSelectedGroup().filter(it => !!it);

  }

  ngOnInit() {
  }

  submit(data: MeetingCreateAdt) {
    this.meetingSvc.createMeeting(data).then(result => {
      if (result) {
        console.info(`successfully created meeting - redirecting to admin page`);
        this.router.navigate([ '../' ], { relativeTo: this.route });
      }
    }).catch(err => {
      console.error(err);
    })
  }

}
