import {Component, OnInit} from '@angular/core';
import {animate, style, transition, trigger} from '@angular/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {Meeting} from '../../models/meeting';
import {MeetingService} from '../../services/meeting.service';
import {ItemService} from '../../services/item.service';
import {AppFocusService} from '../../services/app-focus.service';
import {GroupService} from '../../services/group.service';

@Component({
  selector: 'civ-meeting-container',
  template: `
    <div class="meeting-title">{{(meeting$ | async)?.title}}: {{(meeting$ | async)?.startTime | amDateFormat: 'M/DD/YY'}}</div>

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
           [active]="rlaStats.isActive"
        >STATS</a>
      </nav>
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrls: ['./meeting-container.component.scss'],
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

  constructor(private meetingSvc: MeetingService, private groupSvc: GroupService, private itemSvc: ItemService, private router: Router, private route: ActivatedRoute, private focusSvc: AppFocusService) {
    const id$ = this.route.params.map(params => params['meetingId']).distinctUntilChanged();

    this.route.params.subscribe(params => {
      this.focusSvc.selectItem(params['itemId']);
      this.focusSvc.selectGroup(params['groupId']);
      this.focusSvc.selectMeeting(params['meetingId']);
    });

    this.baseUrl = this.route.params.take(1).map(params =>
      ['/group', params['groupId'], 'meeting', params['meetingId']]
    );


    this.meeting$ = this.meetingSvc.getSelectedMeeting().filter(it => !!it).share();

    /*
    this.items$ = this.meeting$
      .filter(it => !!it)
     .map(mtg => mtg.items);*/

  }

  showItem(id: string) {
    this.router.navigate([ 'item', id ], { relativeTo: this.route });
  }

  ngOnInit() {
  }

}
