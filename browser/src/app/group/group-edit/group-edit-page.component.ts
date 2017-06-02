import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { User } from '../../user/user.model';
import { AuthService } from '../../user/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../group/group.service';
import { GroupCreateInput } from '../../group/group.model';

@Component({
  selector: 'civ-group-edit-page',
  template: `
    <civ-group-edit-view [adminSearchResult]="adminSearchResult$ | async"
                         (adminEmailChanged)="adminEmailQuery$.next($event)"
                         (submit)="submit($event)"
                         [error]="error"
    ></civ-group-edit-view>
  `,
  styles: []
})
export class GroupEditPageComponent implements OnInit {

  adminEmailQuery$: Subject<string> = new BehaviorSubject('');
  adminSearchResult$: Observable<User | null>;

  error: string = '';

  constructor(private authSvc: AuthService, private router: Router, private route: ActivatedRoute, private groupSvc: GroupService) {
    this.adminSearchResult$ = this.authSvc.getUserByEmail(
      this.adminEmailQuery$.skip(1).debounceTime(500)
    );

  }

  ngOnInit() {

  }

  submit(input: GroupCreateInput) {
    this.groupSvc.createGroup(input).then(groupId => {
      this.router.navigate([ 'group', groupId, 'admin' ]);
    }).catch(err => {
      this.error = err;
    })
  }

}
