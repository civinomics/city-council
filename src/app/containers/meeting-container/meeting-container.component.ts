import { Component, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { Store } from '@ngrx/store';
import { AppState, getFocusedMeeting } from '../../reducers/index';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { DenormalizedMeeting } from '../../models/meeting';
import { AgendaItem } from '../../models/item';

@Component({
  selector: 'civ-meeting-container',
  template: `
    <civ-meeting-view [meeting]="meeting$ | async" [items]="items$ | async" (showItem)="showItem($event)">

    </civ-meeting-view>
  `,
  styles: [ `:host { display: block }` ],
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

  meeting$: Observable<DenormalizedMeeting>;
  items$: Observable<AgendaItem[]>;


  constructor(private store: Store<AppState>, private router: Router, private route: ActivatedRoute) {
    this.meeting$ = this.store.select(getFocusedMeeting).filter(it => !!it);

    this.items$ = this.meeting$
      .filter(it => !!it)
      .map(mtg => mtg.items);

  }

  showItem(id: string) {
    this.router.navigate([ 'item', id ], { relativeTo: this.route });
  }

  ngOnInit() {
  }

}
