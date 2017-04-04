import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {values} from 'lodash';
import {ActivatedRoute, Router} from '@angular/router';
import {Meeting} from '../../models/meeting';
import {animate, style, transition, trigger} from '@angular/animations';
import {Group} from '../../models/group';
import {GroupService} from '../../services/group.service';
import {MeetingService} from '../../services/meeting.service';

@Component({
  selector: 'civ-group',
  template: `
    <civ-group-view [group]="group$ | async"
                    [meetings]="meetings$ | async"
                    (showMeeting)="showMeeting($event)"

    ></civ-group-view>
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

  constructor(private groupSvc: GroupService, private meetingSvc: MeetingService, private router: Router, private route: ActivatedRoute) {
    this.group$ = this.route.params.map(params => params['groupId']).flatMap(it => this.groupSvc.get(it));

    const mtgIds = this.group$.map(it => it.meetingIds).distinctUntilChanged((x, y) => x.length == y.length);

    const mtg$: Observable<{ [id: string]: Observable<Meeting> }> = mtgIds.map(ids => {
      return ids.reduce((result, id) => ({...result, [id]: this.meetingSvc.get(id)}), {});
    });

    this.meetings$ = mtg$.flatMap(dict => Observable.merge(...values(dict)).scan((result: Meeting[], mtg: Meeting) => {
      let ids = result.map(it => it.id);

      return ids.indexOf(mtg.id) < 0 ? [...result, mtg] : result;
    }, [])).startWith([]).distinctUntilChanged((x: Meeting[], y: Meeting[]) => x.length == y.length);


    this.meetings$.subscribe(it => {
      console.log(it)
    });



  }

  ngOnInit() {
  }

  showMeeting(id: string) {
    this.router.navigate(['meeting', id], {relativeTo: this.route});
  }

}
