import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { Group } from './group.model';
import { GroupService } from './group.service';
import { MeetingService } from '../meeting/meeting.service';
import { AppFocusService } from '../core/focus.service';
import { AuthService } from '../user/auth.service';

@Component({
  selector: 'civ-group',
  template: `
      <div fxLayout="row" fxLayoutAlign="space-around stretch">
          <div fxLayout="row" fxLayoutAlign="start stretch" fxLayoutGap="10px">
              <img class="flag" [src]="(group$ | async)?.icon" class.xs="mini">
              <div fxLayout="column" fxLayoutAlign="space-around center" fxLayoutGap="5px">
                  <div class="place-title">{{(group$ | async)?.name}}</div>
                  <div class="follow-row"
                       fxLayout="row"
                       fxLayoutAlign="space-around center"
                       fxLayout.xs="column"
                       fxLayoutGap="40px"
                       fxLayoutGap.xs="10px">
                      <div class="num-followers"><strong>332</strong> followers</div>
                      <button md-raised-button color="accent" class="follow-button">follow</button>
                  </div>
              </div>
          </div>
      </div>

      <div class="content-wrapper">
          <nav md-tab-nav-bar>
              <a md-tab-link
                 [routerLink]="baseUrl | async"
                 [routerLinkActiveOptions]="{exact: true}"
                 routerLinkActive #rlaMeetings="routerLinkActive"
                 [active]="rlaMeetings.isActive"
              >AGENDA</a>
              <a md-tab-link
                 routerLink="feed"
                 routerLinkActive #rlaFeed="routerLinkActive"
                 [routerLinkActiveOptions]="{exact: true}"
                 [active]="rlaFeed.isActive"
              >FEED</a>

              <a md-tab-link
                 *ngIf="isAdmin | async"
                 routerLink="admin"
                 [routerLinkActiveOptions]="{exact: true}"
                 routerLinkActive #rlaAdmin="routerLinkActive"
                 [active]="rlaAdmin.isActive"
              >ADMIN</a>
          </nav>
          <router-outlet></router-outlet>
      </div>


  `,
  styleUrls: [ './group.page.scss' ],
  host: {'[@host]': ''},
  animations: [
    trigger('host', [
      transition('void => *', [
        style({transform: 'translateX(100%)'}),
        animate('250ms 100ms ease-in', style({transform: 'translateX(0)'}))
      ])/*,
       transition('* => void', [
       animate('250ms 100ms ease-in', style({transform:'translateX(-100%)'}))
       ])*/
    ])
  ]
})
export class GroupPage implements OnInit {
  group$: Observable<Group>;
  isAdmin: Observable<boolean>;

  baseUrl: Observable<string[]>;

  constructor(private groupSvc: GroupService, private meetingSvc: MeetingService, private router: Router, private route: ActivatedRoute, private focusSvc: AppFocusService, private authSvc: AuthService) {


    this.baseUrl = this.route.params.take(1).map(params =>
        [ '/group', params[ 'groupId' ] ]
    );


    const groupId$ = this.route.params.map(params => params['groupId']);


    groupId$.subscribe(id => this.focusSvc.selectGroup(id));


    this.group$ = this.groupSvc.getSelectedGroup().filter(it => !!it);


    this.isAdmin = this.authSvc.sessionUser$.withLatestFrom(this.group$, (user, group) => !!user && user.superuser || group.owner == user.id);


  }

  ngOnInit() {
  }


}
