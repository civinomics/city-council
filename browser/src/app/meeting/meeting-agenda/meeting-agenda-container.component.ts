import { Component, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Meeting, MeetingStats } from '../meeting.model';
import { Item } from '../../item/item.model';
import { MeetingService } from '../meeting.service';
import { ItemService } from '../../item/item.service';
import { AppFocusService } from '../../core/focus.service';
import { Group } from '../../group/group.model';
import { GroupService } from '../../group/group.service';

@Component({
  selector: 'civ-meeting-agenda',
  template: `
    <civ-meeting-agenda-view *ngIf="!!(meeting$ | async) && !!(items$ | async) && !!(group$ | async); else loading"
                             [meeting]="meeting$ | async"
                             [items]="items$ | async"
                             [group]="group$ | async"
                             [stats]="stats$"
                             (showItem)="showItem($event)">
    </civ-meeting-agenda-view>
    <ng-template #loading>
      <civ-loading class="loading"></civ-loading>
    </ng-template>
  `,
  styleUrls: [ '../../shared/pages.scss' ],
  host: {'[@host]': ''},
  animations: [
    trigger('host', [
      transition('void => *', [
        style({opacity: 0}),
        animate('250ms 100ms ease-in', style({opacity: 1}))
      ])/*,
       transition('* => void', [
       animate('250ms 100ms ease-in', style({transform:'translateX(-100%)'}))
       ])*/
    ])
  ]
})
export class MeetingAgendaContainerComponent implements OnInit {

  group$: Observable<Group>;
  meeting$: Observable<Meeting>;
  items$: Observable<Item[]>;
  stats$: Observable<MeetingStats>;

  constructor(private meetingSvc: MeetingService, private groupSvc: GroupService, private itemSvc: ItemService, private router: Router, private route: ActivatedRoute, private focusSvc: AppFocusService) {
    const id$ = this.route.params.map(params => params['meetingId']).distinctUntilChanged();

    this.route.params.subscribe(params => {
      this.focusSvc.selectItem(params['itemId']);
      this.focusSvc.selectGroup(params['groupId']);
      this.focusSvc.selectMeeting(params['meetingId']);
    });


    this.group$ = this.groupSvc.getSelectedGroup();
    this.meeting$ = this.meetingSvc.getSelectedMeeting().filter(it => !!it);

    this.items$ = this.meetingSvc.getAgendaItemsOfSelectedMeeting().map(arr => arr.filter(it => !!it));

    this.stats$ = id$.flatMap(id => this.meetingSvc.getMeetingStats(id));
    /*
     this.items$ = this.meeting$
     .filter(it => !!it)
     .map(mtg => mtg.items);*/

  }

  showItem(id: string) {
    this.router.navigate(['item', id], {relativeTo: this.route});
  }

  ngOnInit() {
  }

}
