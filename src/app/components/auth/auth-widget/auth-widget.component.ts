import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../../services/auth.service';
import {Router} from '@angular/router';
import {Observable} from 'rxjs';
import {Store} from '@ngrx/store';
import {AppState, getSessionUser} from '../../../reducers/index';
import {SessionUser} from '../../../models/user';

@Component({
  selector: 'civ-auth-widget',
  templateUrl: './auth-widget.component.html',
  styleUrls: [ './auth-widget.component.scss' ]
})
export class AuthWidgetComponent implements OnInit {

  authUser$: Observable<SessionUser | null>;

  constructor(private userSvc: AuthService, private router: Router, private store: Store<AppState>) {

    this.authUser$ = store.select(getSessionUser);

  }

  logout() {
    this.userSvc.logout();
  }

  ngOnInit() {
  }

}
