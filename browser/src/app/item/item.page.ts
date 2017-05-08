import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Item } from './item.model';
import { Store } from '@ngrx/store';
import { AppState } from '../state';
import { ActivatedRoute, Router } from '@angular/router';
import { ItemService } from './item.service';
import { VoteService } from '../vote/vote.service';
import { Vote } from '../vote/vote.model';
import { Comment } from '../comment/comment.model';

import { CommentService } from '../comment/comment.service';
import { AppFocusService } from '../core/focus.service';
import { FollowService } from '../shared/services/follow.service';

@Component({
  selector: 'civ-item-container',
  template: `
    <civ-item-view [item]="item$ | async"
                   [userVote]="userVote$ | async"
                   [userComment]="userComment$ | async"
                   [votes]="votes$ | async"
                   [activeMeeting]="activeMeeting$ | async"
                   [numFollows]="numFollows$ | async"
                   [isFollowing]="isFollowing$ | async"
                   (follow)="doFollow($event)"
                   (vote)="castVote($event)" (comment)="postComment($event)" (back)="backToAgenda()"></civ-item-view>
  `,
  /*  host: { '[@host]': '' },
   animations: [
   trigger('host', [
   transition('void => *', [
   style({ opacity: 0, transform: 'translateX(100%)' }),
   animate('200ms 200ms ease-in', style({ opacity: 1,  transform: 'translateX(0)'  }))
   ]),
   transition('* => void', [
   animate('200ms ease-in', style({transform:'translateX(100%)', opacity: 0}))
   ])
   ])
   ],*/
  styleUrls: [ './../shared/pages.scss' ],
})
export class ItemPageComponent implements OnInit {
  item$: Observable<Item>;
  userVote$: Observable<Vote | null>;
  userComment$: Observable<Comment | null>;

  votes$: Observable<Vote[]>;
  comments$: Observable<Comment[]>;

  activeMeeting$: Observable<string>;


  numFollows$: Observable<number>;
  isFollowing$: Observable<boolean>;

  constructor(private store: Store<AppState>,
              private router: Router,
              private route: ActivatedRoute,
              private itemSvc: ItemService,
              private voteSvc: VoteService,
              private commentSvc: CommentService,
              private focusSvc: AppFocusService,
              private followSvc: FollowService) {

    const itemId$ = this.route.params.map(params => params[ 'itemId' ]);

    this.route.params.subscribe(params => {
      this.focusSvc.selectItem(params['itemId']);
      this.focusSvc.selectGroup(params['groupId']);
      this.focusSvc.selectMeeting(params['meetingId']);

    });


    this.item$ = this.itemSvc.getSelectedItem();
    this.userVote$ = this.voteSvc.getUserVoteForSelectedItem();

    this.votes$ = this.item$.take(1)//get the initial page rendered before loading votes
      .flatMapTo(this.voteSvc.getVotesForSelectedItem());

    this.userComment$ = this.commentSvc.getUserCommentForSelectedItem();

    this.comments$ = this.item$.take(1).flatMapTo(this.commentSvc.getCommentsForSelectedItem());



    this.activeMeeting$ = this.route.params.map(params => params['meetingId']);

    this.numFollows$ = itemId$.flatMap(id => this.followSvc.getFollowCount('item', id));

    this.isFollowing$ = itemId$.flatMap(id => this.followSvc.isFollowing('item', id));

  }


  ngOnInit() {

  }

  castVote(it: { itemId: string, value: 1 | -1 }) {
    console.log('casting');
    this.voteSvc.castVote(it.itemId, it.value);
  }

  postComment(it: { itemId: string, text: string, role: string }) {
    this.commentSvc.postComment(it.itemId, it.text, it.role);
  }

  backToAgenda() {
    this.router.navigate([ '../../' ], { relativeTo: this.route })
  }

  doFollow(add: boolean) {
    if (add) {
      this.addFollow()
    } else {
      this.unfollow();
    }
  }

  addFollow() {
    this.item$.take(1).subscribe(item => {
      this.followSvc.follow('item', item.id).subscribe(result => {
        console.log('follow result"');
        console.log(result);
      })
    })
  }

  unfollow() {
    this.item$.take(1).subscribe(item => {
      this.followSvc.unfollow('item', item.id).subscribe(result => {
        console.log('unfollow result"');
        console.log(result);
      })
    })
  }

}
