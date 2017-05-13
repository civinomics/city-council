import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { MeetingService } from '../meeting.service';
import { Group } from '../../group/group.model';
import { Item } from '../../item/item.model';
import { Meeting, MeetingStats } from '../meeting.model';
import { GroupService } from '../../group/group.service';


@Component({
  selector: 'civ-meeting-stats',
  template: `
    <civ-meeting-stats-view *ngIf="!!(stats$ | async) && (!!items$ | async); else loading"
                            [stats]="stats$ | async" [meeting]="meeting$ | async"
                            [districts]="(group$ | async)?.districts" [items]="items$ | async"
                            [activeDistrict]="activeDistrict$ | async"
                            (activeDistrictChanged)="setActiveDistrict($event)"
                            [reportRequestResult]="reportRequestResult"
                            (requestReport)="getReport($event)">

    </civ-meeting-stats-view>

    <ng-template #loading>
      <civ-loading class="loading"></civ-loading>
    </ng-template>

  `,
  styles: [ `
    :host { display: block }

    .loading { position: absolute; top: 112px; left: 0; right: 0; bottom: 0 }
  ` ]
})
export class MeetingStatsContainerComponent implements OnInit {
  group$: Observable<Group>;
  meeting$: Observable<Meeting>;
  stats$: Observable<MeetingStats>;
  items$: Observable<Item[]>;
  activeDistrict$: Subject<{ id: string, name: string }> = new BehaviorSubject({ id: null, name: 'All Districts' });

  reportRequestResult: 'pending' | { success: boolean, url: string, fromCache: boolean, error?: string } | undefined;

  constructor(private meetingSvc: MeetingService, private groupSvc: GroupService) {

    this.group$ = this.groupSvc.getSelectedGroup();
    this.meeting$ = Observable.timer(30000).flatMapTo(this.meetingSvc.getSelectedMeeting().filter(it => !!it));
    this.stats$ = this.meeting$.take(1).map(it => it.id).flatMap(id => this.meetingSvc.getMeetingStats(id));

    this.items$ = this.meetingSvc.getAgendaItemsOfSelectedMeeting().map(arr => arr.filter(it => !!it));

  }

  getReport(it: { meetingId: string, forDistrict?: string }) {
    this.reportRequestResult = 'pending';
    this.meetingSvc.getPDFReport(it.meetingId, it.forDistrict).take(1).subscribe(response => {
      this.reportRequestResult = response;
    })
  }

  ngOnInit() {

  }

  setActiveDistrict(it: { id: string, name: string }) {
    this.reportRequestResult = undefined;
    this.activeDistrict$.next(it);
  }

}
