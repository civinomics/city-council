import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AgendaItem } from '../../models/item';
import { Store } from '@ngrx/store';
import { AppState, getFocusedItem } from '../../reducers/index';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'civ-item-container',
  template: `
    <civ-item-view [item]="item$ | async"></civ-item-view>
  `,
  styles: []
})
export class ItemContainerComponent implements OnInit {
  item$: Observable<AgendaItem>;

  constructor(private store: Store<AppState>, private router: Router, private route: ActivatedRoute) {
    this.item$ = this.store.select(getFocusedItem).filter(it => !!it);

  }


  ngOnInit() {
  }


}
