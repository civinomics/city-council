import { Component, OnInit } from '@angular/core';
import { GroupService } from '../../group/group.service';
import { Observable } from 'rxjs/Observable';
import { Group } from '../../group/group.model';

@Component({
  selector: 'civ-app-admin-page',
  template: `
    <civ-app-admin-view [groups]="groups$ | async"></civ-app-admin-view>
  `,
  styles: []
})
export class GroupsEditPageComponent implements OnInit {
  groups$: Observable<Group[]>;

  constructor(private groupSvc: GroupService) {
    this.groupSvc.loadAllGroups();
    this.groups$ = this.groupSvc.getAllGroups();
  }

  ngOnInit() {
  }

}
