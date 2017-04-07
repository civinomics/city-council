import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {Item} from '../../models/item';
import {Store} from '@ngrx/store';
import {AppState} from '../../reducers/index';
import {ActivatedRoute, Router} from '@angular/router';
import {ItemService} from '../../services/item.service';
import {VoteService} from '../../services/vote.service';
import {Vote} from '../../models/vote';
import {Comment} from '../../models/comment';

import {CommentService} from '../../services/comment.service';

@Component({
  selector: 'civ-item-container',
  template: `
    <civ-item-view [item]="item$ | async" [userVote]="userVote$ | async" [userComment]="userComment$ | async"
                   (vote)="castVote($event)" (comment)="postComment($event)"></civ-item-view>
  `,
  styles: []
})
export class ItemContainerComponent implements OnInit {
  item$: Observable<Item>;
  userVote$: Observable<Vote | null>;
  userComment$: Observable<Comment | null>;

  constructor(private store: Store<AppState>,
              private router: Router,
              private route: ActivatedRoute,
              private itemSvc: ItemService,
              private voteSvc: VoteService, private commentSvc: CommentService) {

  }


  ngOnInit() {
    const itemId = this.route.params.map(params => params['itemId']);
    this.item$ = itemId.flatMap(it => this.itemSvc.get(it));
    this.userVote$ = itemId.flatMap(itemId => this.voteSvc.getUserVoteFor(itemId));
    this.userComment$ = itemId.flatMap(itemId => this.commentSvc.getUserCommentFor(itemId));
  }

  castVote(it: { itemId: string, value: 1 | -1 }) {
    console.log('casting');
    this.voteSvc.castVote(it.itemId, it.value);
  }

  postComment(it: { itemId: string, text: string, role: string }) {
    this.commentSvc.postComment(it.itemId, it.text, it.role);
  }


}
