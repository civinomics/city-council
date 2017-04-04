import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {Item} from '../../models/item';
import {Store} from '@ngrx/store';
import {AppState} from '../../reducers/index';
import {ActivatedRoute, Router} from '@angular/router';
import {ItemService} from '../../services/item.service';

@Component({
  selector: 'civ-item-container',
  template: `
    <civ-item-view [item]="item$ | async"></civ-item-view>
  `,
  styles: []
})
export class ItemContainerComponent implements OnInit {
  item$: Observable<Item>;

  constructor(private store: Store<AppState>, private router: Router, private route: ActivatedRoute, private itemSvc: ItemService) {

  }


  ngOnInit() {
    this.item$ = this.route.params.map(params => params['itemId']).flatMap(it => this.itemSvc.get(it));

  }


}
