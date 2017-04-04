import {Component, OnInit} from '@angular/core';
import {animate, style, transition, trigger} from '@angular/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {Meeting} from '../../models/meeting';
import {Item} from '../../models/item';
import {MeetingService} from '../../services/meeting.service';
import {ItemService} from '../../services/item.service';

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

  meeting$: Observable<Meeting>;
  items$: Observable<Item[]>;


  constructor(private meetingSvc: MeetingService, private itemSvc: ItemService, private router: Router, private route: ActivatedRoute) {
    const id$ = this.route.params.map(params => params['meetingId']).distinctUntilChanged();

    this.meeting$ = id$
      .flatMap(it => this.meetingSvc.get(it));

    /* const agendaIds = this.meeting$
     .map(mtg => mtg.agendaIds)
     .distinctUntilChanged((x, y) => x.length == y.length);

     this.items$ = agendaIds
     .take(1)
     .flatMap(ids => Observable.forkJoin(...ids.map(id => this.itemSvc.get(id, true).take(1))));
     */

    this.items$ = id$.flatMap(id => this.meetingSvc.getMeetingAgenda(id).take(1));

    this.items$.subscribe(it => console.log(it));

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
