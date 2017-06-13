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
  selector: 'civ-group-setup-page',
  template: `
    <civ-group-edit-view [adminSearchResult]="adminSearchResult$ | async"
                         [savePending]="savePending"
                         (adminEmailChanged)="adminEmailQuery$.next($event)"
                         (create)="submit($event)"
                         [isSuperuser]="true"
                         [error]="error"
    ></civ-group-edit-view>
  `,
  styles: []
})
export class GroupSetupPageComponent implements OnInit {

  adminEmailQuery$: Subject<string> = new BehaviorSubject('');
  adminSearchResult$: Observable<User | null>;

  error: string = '';
  savePending: boolean = false;


  constructor(private authSvc: AuthService, private router: Router, private route: ActivatedRoute, private groupSvc: GroupService) {
    this.adminSearchResult$ = this.authSvc.getUserByEmail(
      this.adminEmailQuery$.skip(1).debounceTime(500)
    );

  }

  ngOnInit() {

  }

  submit(input: GroupCreateInput) {
    this.savePending = true;
    this.groupSvc.createGroup(input).subscribe(result => {
      this.savePending = false;
      console.log(`RESULT`);
      console.log(result);
      if (result.success == true) {
        console.info('created successfully - navigating to admin pg');
        this.router.navigate([ 'group', result.groupId, 'admin' ]);
      } else {
        this.error = result.error;
      }
    }, err => {
      this.error = err;
    })
  }

}
