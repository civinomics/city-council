import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Item } from './item.model';
import { Store } from '@ngrx/store';
import { AppState } from '../reducers/index';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService } from './item.service';
import { VoteService } from '../services/vote.service';
import { Vote } from '../models/vote';
import { Comment } from '../models/comment';

import { CommentService } from '../services/comment.service';
import { AppFocusService } from '../services/app-focus.service';

@Component({
  selector: 'civ-item-container',
  template: `
    <civ-item-view [item]="item$ | async" [userVote]="userVote$ | async" [userComment]="userComment$ | async"
                   [votes]="votes$ | async"
                   [activeMeeting]="activeMeeting$ | async"
                   (vote)="castVote($event)" (comment)="postComment($event)"></civ-item-view>
  `,
  styles: []
})
export class ItemPageComponent implements OnInit {
  item$: Observable<Item>;
  userVote$: Observable<Vote | null>;
  userComment$: Observable<Comment | null>;

  votes$: Observable<Vote[]>;
  comments$: Observable<Comment[]>;

  activeMeeting$: Observable<string>;

  constructor(private store: Store<AppState>,
              private router: Router,
              private route: ActivatedRoute,
              private itemSvc: ItemService,
              private voteSvc: VoteService, private commentSvc: CommentService, private focusSvc: AppFocusService) {

  }


  ngOnInit() {
    const itemId = this.route.params.map(params => params['itemId']);

    this.route.params.subscribe(params => {
      this.focusSvc.selectItem(params['itemId']);
      this.focusSvc.selectGroup(params['groupId']);
      this.focusSvc.selectMeeting(params['meetingId']);

    });


    this.item$ = this.itemSvc.getSelectedItem().share();
    this.userVote$ = this.voteSvc.getUserVoteForSelectedItem();

    this.votes$ = this.item$.take(1)//get the initial page rendered before loading votes
      .flatMapTo(this.voteSvc.getVotesForSelectedItem());

    this.userComment$ = this.commentSvc.getUserCommentForSelectedItem();

    this.comments$ = this.item$.take(1).flatMapTo(this.commentSvc.getCommentsForSelectedItem());



    this.activeMeeting$ = this.route.params.map(params => params['meetingId']);
  }

  castVote(it: { itemId: string, value: 1 | -1 }) {
    console.log('casting');
    this.voteSvc.castVote(it.itemId, it.value);
  }

  postComment(it: { itemId: string, text: string, role: string }) {
    this.commentSvc.postComment(it.itemId, it.text, it.role);
  }


}
