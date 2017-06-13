import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Meeting } from './meeting.model';
import { MeetingService } from './meeting.service';
import { ItemService } from '../item/item.service';
import { AppFocusService } from '../core/focus.service';
import { GroupService } from '../group/group.service';
import { AuthService } from '../user/auth.service';
import { FollowService } from '../shared/services/follow.service';
import { Title } from '@angular/platform-browser';

@Component({
    selector: 'civ-meeting-container',
    template: `
      <div fxLayout="column" fxLayoutAlign="start center" fxLayoutGap="15px" *ngIf="meeting$ | async as meeting">
        <h2 class="focus-title title meeting-title">{{meeting.title}}<br><br>
          {{meeting.startTime | amDateFormat: 'M/DD/YY'}}
        </h2>
        <!--
        <div class="follow-row"
             fxLayout="row"
             fxLayoutAlign="start center"
             fxLayout.xs="column"
             fxLayoutGap="20px"
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
        </div> -->
      </div>

      <div class="content-wrapper">
        <nav md-tab-nav-bar>
          <a md-tab-link
             [routerLink]="baseUrl | async"
             [routerLinkActiveOptions]="{exact: true}"
             routerLinkActive #rlaHome="routerLinkActive"
             [active]="rlaHome.isActive"
          >AGENDA</a>
          <a md-tab-link
             routerLink="stats"
             routerLinkActive #rlaStats="routerLinkActive"
             [routerLinkActiveOptions]="{exact: true}"
             [active]="rlaStats.isActive"
          >STATS</a>
          <a md-tab-link
             *ngIf="isAdmin$ | async"
             routerLink="admin"
             [routerLinkActiveOptions]="{exact: true}"
             routerLinkActive #rlaAdmin="routerLinkActive"
             [active]="rlaAdmin.isActive"
          >ADMIN</a>
        </nav>
        <router-outlet></router-outlet>
      </div>
      <ng-template #loading>
        <civ-loading class="loading"></civ-loading>
      </ng-template>

    `,
  styles: [ `
    :host { display: block }

    .loading { position: absolute; top: 112px; left: 0; right: 0; bottom: 0 }
  ` ],
    styleUrls: [ './../shared/pages.scss' ],
  /* host: { '[@host]': '' },
    animations: [
        trigger('host', [
            transition('void => *', [
                style({ opacity: 0 }),
   animate('200ms 200ms ease-in', style({ opacity: 1 }))
   ]),
             transition('* => void', [
   animate('200ms ease-in', style({transform:'translateX(-100%)'}))
   ])
        ])
   ]*/
})
export class MeetingPage implements OnInit {

    meeting$: Observable<Meeting>;

    baseUrl: Observable<string[]>;

  isAdmin$: Observable<boolean>;

  numFollows$: Observable<number>;
  isFollowing$: Observable<boolean>;

    constructor(private meetingSvc: MeetingService,
                private groupSvc: GroupService,
                private itemSvc: ItemService,
                private router: Router,
                private route: ActivatedRoute,
                private focusSvc: AppFocusService,
                private authSvc: AuthService,
                private followSvc: FollowService,
                private title: Title) {
        const id$ = this.route.params.map(params => params[ 'meetingId' ]).distinctUntilChanged();

        this.baseUrl = this.route.params.take(1).map(params =>
            [ '/group', params[ 'groupId' ], 'meeting', params[ 'meetingId' ] ]
        );

      this.meeting$ = this.meetingSvc.getSelectedMeeting().filter(it => !!it);

      this.meeting$
        .filter(it => !!it)
        .take(1).subscribe(meeting => this.title.setTitle(meeting.title));


      this.isAdmin$ = Observable.combineLatest(this.authSvc.sessionUser$, this.meeting$,
        (user, meeting) => !!user && (user.superuser || meeting.owner == user.id));


      Observable.forkJoin(this.meeting$.take(1), this.isAdmin$.take(1)).subscribe(([ meeting, isAdmin ]) => {
        if (isAdmin && !meeting.published) {
          this.router.navigate([ 'admin' ], { relativeTo: this.route });
        }
      });

      this.numFollows$ = id$.flatMap(id => this.followSvc.getFollowCount('meeting', id));

      this.isFollowing$ = id$.flatMap(id => this.followSvc.isFollowing('meeting', id));


    }


  addFollow() {
    this.meeting$.take(1).subscribe(mtg => {
      this.followSvc.follow('meeting', mtg.id).subscribe(result => {
        console.log('follow result"');
        console.log(result);
      })
    })
  }

  unfollow() {
    this.meeting$.take(1).subscribe(mtg => {
      this.followSvc.unfollow('meeting', mtg.id).subscribe(result => {
        console.log('unfollow result"');
        console.log(result);
      })
    })
  }

    showItem(id: string) {
        this.router.navigate([ 'item', id ], { relativeTo: this.route });
    }

    ngOnInit() {
    }

}
