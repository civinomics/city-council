import { Component, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Meeting } from '../../models/meeting';
import { MeetingService } from '../../services/meeting.service';
import { ItemService } from '../../services/item.service';
import { AppFocusService } from '../../services/app-focus.service';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'civ-meeting-container',
    template: `
        <div class="meeting-title">{{(meeting$ | async)?.title}}:
            {{(meeting$ | async)?.startTime | amDateFormat: 'M/DD/YY'}}
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
    styleUrls: [ './meeting-container.component.scss' ],
    host: { '[@host]': '' },
    animations: [
        trigger('host', [
            transition('void => *', [
                style({ opacity: 0 }),
                animate('250ms 100ms ease-in', style({ opacity: 1 }))
            ])/*,
             transition('* => void', [
             animate('250ms 100ms ease-in', style({transform:'translateX(-100%)'}))
             ])*/
        ])
    ]
})
export class MeetingContainerComponent implements OnInit {

    meeting$: Observable<Meeting>;

    baseUrl: Observable<string[]>;

    isAdmin: Observable<boolean>;

    constructor(private meetingSvc: MeetingService,
                private groupSvc: GroupService,
                private itemSvc: ItemService,
                private router: Router,
                private route: ActivatedRoute,
                private focusSvc: AppFocusService,
                private authSvc: AuthService) {
        const id$ = this.route.params.map(params => params[ 'meetingId' ]).distinctUntilChanged();

        this.route.params.subscribe(params => {
            this.focusSvc.selectItem(params[ 'itemId' ]);
            this.focusSvc.selectGroup(params[ 'groupId' ]);
            this.focusSvc.selectMeeting(params[ 'meetingId' ]);
        });

        this.baseUrl = this.route.params.take(1).map(params =>
            [ '/group', params[ 'groupId' ], 'meeting', params[ 'meetingId' ] ]
        );

        this.meeting$ = this.meetingSvc.getSelectedMeeting().filter(it => !!it);

        this.isAdmin = this.authSvc.sessionUser$.withLatestFrom(this.meeting$, (user, meeting) => user.superuser||meeting.owner == user.id);



    }

    showItem(id: string) {
        this.router.navigate([ 'item', id ], { relativeTo: this.route });
    }

    ngOnInit() {
    }

}
