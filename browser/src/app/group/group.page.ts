import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { Group } from './group.model';
import { GroupService } from './group.service';
import { MeetingService } from '../meeting/meeting.service';
import { AppFocusService } from '../core/focus.service';
import { AuthService } from '../user/auth.service';
import { FollowService } from '../shared/services/follow.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'civ-group',
  template: `
    <div fxLayout="row" fxLayoutAlign="space-around stretch" *ngIf="group$ | async as group">
          <div fxLayout="row" fxLayoutAlign="start stretch" fxLayoutGap="10px">
            <img class="flag" [src]="group.icon">
              <div fxLayout="column" fxLayoutAlign="space-around center" fxLayoutGap="5px">
                <div class="place-title">{{group.name}}</div>
                  <div class="follow-row"
                       fxLayout="row"
                       fxLayoutAlign="space-around center"
                       fxLayout.xs="column"
                       fxLayoutGap="40px"
                       fxLayoutGap.xs="10px">
                    <div class="num-followers" *ngIf="numFollows$ | async as numFollows"><strong>{{numFollows}}</strong>
                      follower{{numFollows == 1 ? '' : 's'}}
                    </div>
                    <button md-raised-button
                            color="accent"
                            class="follow-button"
                            (click)="addFollow()"
                            *ngIf="(isFollowing$ | async) === false">FOLLOW
                    </button>
                    <button md-raised-button
                            color="primary"
                            class="follow-button"
                            (click)="unfollow()"
                            *ngIf="isFollowing$ | async">UNFOLLOW
                    </button>
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
              >MEETINGS</a>
              <a md-tab-link
                 routerLink="feed"
                 routerLinkActive #rlaFeed="routerLinkActive"
                 [routerLinkActiveOptions]="{exact: true}"
                 [active]="rlaFeed.isActive"
              >FEED</a>

              <a md-tab-link
                 *ngIf="isAdmin | async"
                 class="admin-tab"
                 routerLink="admin"
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
  numFollows$: Observable<number>;
  isFollowing$: Observable<boolean>;
  baseUrl: Observable<string[]>;

  constructor(private groupSvc: GroupService,
              private followSvc: FollowService,
              private meetingSvc: MeetingService,
              private router: Router,
              private route: ActivatedRoute,
              private focusSvc: AppFocusService,
              private authSvc: AuthService,
              private title: Title) {


    this.baseUrl = this.route.params.take(1).map(params =>
        [ '/group', params[ 'groupId' ] ]
    );




    const groupId$ = this.route.params.map(params => params['groupId']);

    groupId$.subscribe(id => this.focusSvc.selectGroup(id));

    this.group$ = this.groupSvc.getSelectedGroup().filter(it => !!it);

    this.group$
      .filter(it => !!it)
      .take(1).subscribe(group => this.title.setTitle(group.name));


    this.isAdmin = Observable.combineLatest(this.authSvc.sessionUser$, this.group$,
      (user, group) => !!user && (user.superuser || group.owner == user.id));


    this.numFollows$ = groupId$.flatMap(id => this.followSvc.getFollowCount('group', id));

    this.isFollowing$ = groupId$.flatMap(id => this.followSvc.isFollowing('group', id));


  }

  ngOnInit() {
  }

  addFollow() {
    this.group$.take(1).subscribe(group => {
      this.followSvc.follow('group', group.id).subscribe(result => {
        console.log('follow result"');
        console.log(result);
      })
    })
  }

  unfollow() {
    this.group$.take(1).subscribe(group => {
      this.followSvc.unfollow('group', group.id).subscribe(result => {
        console.log('unfollow result"');
        console.log(result);
      })
    })
  }

}
