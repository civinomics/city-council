import { Component, OnInit } from '@angular/core';
import { GroupService } from '../../group/group.service';
import { Observable } from 'rxjs/Observable';
import { Group } from '../../group/group.model';
import { Router } from '@angular/router';

@Component({
  selector: 'civ-app-admin-page',
  template: `
    <civ-app-admin-view [groups]="groups$ | async" (edit)="editGroup($event)"></civ-app-admin-view>
  `,
  styles: []
})
export class GroupsEditPageComponent implements OnInit {
  groups$: Observable<Group[]>;

  constructor(private groupSvc: GroupService, private router: Router) {
    this.groupSvc.loadAllGroups();
    this.groups$ = this.groupSvc.getAllGroups();
  }

  ngOnInit() {
  }

  editGroup(id: string) {
    this.router.navigate([ '/group', id, 'admin' ]);
  }
}
