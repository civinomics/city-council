import { Component, OnInit } from '@angular/core';
import { GroupService } from 'app/group/group.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Group } from '../../group.model';

@Component({
  selector: 'civ-create-meeting-page',
  template: `
    <civ-create-meeting-view *ngIf="group$ | async as group" [group]="group"></civ-create-meeting-view>
  `,
  styles: []
})
export class CreateMeetingPageComponent implements OnInit {

  group$: Observable<Group>;


  constructor(private groupSvc: GroupService, private router: Router, private route: ActivatedRoute) {

    this.group$ = this.groupSvc.getSelectedGroup().filter(it => !!it);

  }

  ngOnInit() {
  }

}
