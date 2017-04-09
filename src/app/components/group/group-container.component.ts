import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {Meeting} from '../../models/meeting';
import {animate, style, transition, trigger} from '@angular/animations';
import {Group} from '../../models/group';
import {GroupService} from '../../services/group.service';
import {MeetingService} from '../../services/meeting.service';
import {AppFocusService} from '../../services/app-focus.service';

@Component({
  selector: 'civ-group',
  template: `
    <router-outlet>
      <civ-group-view [group]="group$ | async"
                      [meetings]="meetings$ | async"
                      (showMeeting)="showMeeting($event)"

      ></civ-group-view>
    </router-outlet>
  `,
  styles: [],
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
export class GroupContainerComponent implements OnInit {
  group$: Observable<Group>;
  meetings$: Observable<Meeting[]> = Observable.of([]);

  constructor(private groupSvc: GroupService, private meetingSvc: MeetingService, private router: Router, private route: ActivatedRoute, private focusSvc: AppFocusService) {

    const groupId$ = this.route.params.map(params => params['groupId']);

    groupId$.subscribe(id => this.focusSvc.selectGroup(id));


    this.group$ = this.groupSvc.getSelectedGroup().filter(it => !!it);

    this.meetings$ = this.groupSvc.getMeetingsOfSelectedGroup().map(arr => arr.filter(it => !!it));


  }

  ngOnInit() {
  }

  showMeeting(id: string) {
    this.router.navigate(['meeting', id], {relativeTo: this.route});
  }

}
