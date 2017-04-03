import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {DenormalizedPlace} from '../../models/place';
import {AppState, getFocusedPlace} from '../../reducers/index';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {DenormalizedMeeting} from '../../models/meeting';
import {animate, style, transition, trigger} from '@angular/animations';

@Component({
  selector: 'civ-place-container',
  template: `
    <civ-place-view [place]="place$ | async"
                    [meetings]="meetings$ | async"
                    (showMeeting)="showMeeting($event)"></civ-place-view>
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
export class PlaceContainerComponent implements OnInit {
  place$: Observable<DenormalizedPlace>;
  meetings$: Observable<DenormalizedMeeting[]>;

  constructor(private store: Store<AppState>, private router: Router, private route: ActivatedRoute) {
    this.place$ = this.store.select(getFocusedPlace);
    this.meetings$ = this.place$
      .filter(it => !!it)
      .map(place => place.groups.reduce((result, group) => [ ...result, ...group.meetings ], []));

  }

  ngOnInit() {
  }

  showMeeting(id: string) {
    this.router.navigate([ 'meeting', id ], { relativeTo: this.route });
  }

}
