import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {Item} from '../../models/item';
import {Store} from '@ngrx/store';
import {AppState} from '../../reducers/index';
import {ActivatedRoute, Router} from '@angular/router';
import {ItemService} from '../../services/item.service';
import {VoteService} from '../../services/vote.service';
import {Vote} from '../../models/vote';

@Component({
  selector: 'civ-item-container',
  template: `
    <civ-item-view [item]="item$ | async" [userVote]="userVote$ | async" (vote)="castVote($event)"></civ-item-view>
  `,
  styles: []
})
export class ItemContainerComponent implements OnInit {
  item$: Observable<Item>;
  userVote$: Observable<Vote | null>;

  constructor(private store: Store<AppState>, private router: Router, private route: ActivatedRoute, private itemSvc: ItemService, private voteSvc: VoteService) {

  }


  ngOnInit() {
    const itemId = this.route.params.map(params => params['itemId']);
    this.item$ = itemId.flatMap(it => this.itemSvc.get(it));
    this.userVote$ = itemId.flatMap(itemId => this.voteSvc.getUserVoteFor(itemId));
  }

  castVote(it: { itemId: string, value: 1 | -1 }) {
    console.log('casting');
    this.voteSvc.castVote(it.itemId, it.value);
  }

}
