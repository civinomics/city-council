import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState, getFocusedItem, getFocusedMeeting, getFocusedPlace } from '../../reducers';
import { Observable } from 'rxjs';
import { DenormalizedPlace } from '../../models/place';
import { DenormalizedMeeting } from '../../models/meeting';
import { AgendaItem } from '../../models/item';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'civ-browse-container',
  templateUrl: './browse-container.component.html',
  styleUrls: [ './browse-container.component.scss' ],
  animations: [
    trigger('travBar', [
      state('hidden', style({ height: 0 })),
      state('shown', style({ height: '*' })),
      transition('hidden => shown', animate('150ms ease-in')),
      transition('shown => hidden', animate('150ms 350ms ease-in'))

    ]),
    trigger('travEl', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition('void => *', animate('150ms 200ms ease-in')),
      transition('* => void', animate('150ms 100ms ease-in'))


    ])
  ]
})
export class BrowseContainerComponent implements OnInit {

  focusedPlace$: Observable<DenormalizedPlace | null>;
  focusedMeeting$: Observable<DenormalizedMeeting | null>;
  focusedItem$: Observable<AgendaItem | null>;

  showTravBar: Observable<boolean>;

  constructor(private store: Store<AppState>) {
    this.focusedPlace$ = store.select(getFocusedPlace);
    this.focusedMeeting$ = store.select(getFocusedMeeting);
    this.focusedItem$ = store.select(getFocusedItem);

    this.showTravBar = this.focusedMeeting$.map(it => !!it);
  }

  ngOnInit() {
  }

}
