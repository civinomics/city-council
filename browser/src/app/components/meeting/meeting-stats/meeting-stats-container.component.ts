import {Component, OnInit} from '@angular/core';
import {MeetingService} from '../../../services/meeting.service';
import {Observable} from 'rxjs/Observable';
import {Group} from '../../../models/group';
import {Item} from '../../../models/item';
import {Meeting, MeetingStats} from '../../../models/meeting';
import {GroupService} from '../../../services/group.service';
import {Subject} from 'rxjs/Subject';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

@Component({
  selector: 'civ-meeting-stats',
  template: `
    <civ-meeting-stats-view [stats]="stats$ | async" [meeting]="meeting$ | async"
                            [districts]="(group$ | async)?.districts" [items]="items$ | async"
                            [activeDistrict]="activeDistrict$ | async"
                            (activeDistrictChanged)="activeDistrict$.next($event)"
                            *ngIf="!!(items$ | async) && !!(stats$ | async)"
    >

    </civ-meeting-stats-view>
  `,
  styles: []
})
export class MeetingStatsContainerComponent implements OnInit {
  group$: Observable<Group>;
  meeting$: Observable<Meeting>;
  stats$: Observable<MeetingStats>;
  items$: Observable<Item[]>;

    activeDistrict$: Subject<{ id: string, name: string }> = new BehaviorSubject({id: null, name: 'All Districts'});

  constructor(private meetingSvc: MeetingService, private groupSvc: GroupService) {

    this.group$ = this.groupSvc.getSelectedGroup();
    this.meeting$ = this.meetingSvc.getSelectedMeeting().filter(it => !!it);
    this.stats$ = this.meeting$.take(1).map(it => it.id).flatMap(id => this.meetingSvc.getMeetingStats(id));

    this.items$ = this.meetingSvc.getAgendaItemsOfSelectedMeeting().map(arr => arr.filter(it => !!it));

  }

  ngOnInit() {

  }

}
