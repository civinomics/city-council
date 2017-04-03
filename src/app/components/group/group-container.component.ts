import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {AppState} from '../../reducers/index';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {Meeting} from '../../models/meeting';
import {animate, style, transition, trigger} from '@angular/animations';
import {Group} from '../../models/group';

@Component({
  selector: 'civ-group',
  template: `
    <civ-group-view [group]="group$ | async"
                    [meetings]="meetings$ | async"
                    (showMeeting)="showMeeting($event)"></civ-group-view>
  `,
  styles: [],
  host: { '[@host]': '' },
  animations: [
    trigger('host', [
      transition('void => *', [
        style({ transform: 'translateX(100%)' }),
        animate('250ms 100ms ease-in', style({ transform: 'translateX(0)' }))
      ])/*,
       transition('* => void', [
       animate('250ms 100ms ease-in', style({transform:'translateX(-100%)'}))
       ])*/
    ])
  ]
})
export class GroupContainerComponent implements OnInit {
  group$: Observable<Group>;
  meetings$: Observable<Meeting[]>;

  constructor(private store: Store<AppState>, private router: Router, private route: ActivatedRoute) {
    this.group$ = this.store.select(getF);
    this.meetings$ = this.group$
      .filter(it => !!it)
      .map(place => place.groups.reduce((result, group) => [ ...result, ...group.meetings ], []));

  }

  ngOnInit() {
  }

  showMeeting(id: string) {
    this.router.navigate([ 'meeting', id ], { relativeTo: this.route });
  }

}
