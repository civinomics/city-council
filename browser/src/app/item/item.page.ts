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
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Title } from '@angular/platform-browser';
import { Representative } from '../group/group.model';
import { GroupService } from '../group/group.service';
import { AuthService } from '../user/auth.service';
import { getById } from '../shared/constants';

export const SHOW_COMMENTS_STEP = 5;

@Component({
  selector: 'civ-item-container',
  template: `
    <civ-item-view *ngIf="item$ | async as item; else loading"
                   [item]="item"
                   [userVote]="userVote$ | async"
                   [userComment]="userComment$ | async"
                   [votes]="votes$ | async"
                   [comments]="comments$ | async"
                   [activeMeeting]="activeMeeting$ | async"
                   [numFollows]="numFollows$ | async"
                   [isFollowing]="isFollowing$ | async"
                   [numCommentsShown]="showComments$ | async"
                   [activeGroup]="groupId$ | async"
                   [userRep]="userRep$ | async"
                   (showComments)="showMoreComments($event)"
                   (follow)="doFollow($event)"
                   (vote)="castVote($event)"
                   (comment)="postComment($event)"
                   (commentVote)="castVote($event)"
                   (back)="backToAgenda()"

    >

    </civ-item-view>
    <ng-template #loading>
      <civ-loading class="loading"></civ-loading>
    </ng-template>
  `,
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

  groupId$: Observable<string>;

  userRep$: Observable<Representative | null>;

  _showComments$: Subject<number> = new BehaviorSubject(SHOW_COMMENTS_STEP);

  showComments$: Observable<number>;

  constructor(private store: Store<AppState>,
              private router: Router,
              private route: ActivatedRoute,
              private itemSvc: ItemService,
              private voteSvc: VoteService,
              private commentSvc: CommentService,
              private focusSvc: AppFocusService,
              private followSvc: FollowService,
              private groupSvc: GroupService,
              private authSvc: AuthService,
              private title: Title) {

    const itemId$ = this.route.params.map(params => params[ 'itemId' ]);

    this.route.params.subscribe(params => {
      this.focusSvc.selectItem(params[ 'itemId' ]);
      this.focusSvc.selectGroup(params[ 'groupId' ]);
      this.focusSvc.selectMeeting(params[ 'meetingId' ]);

    });


    this.item$ = this.itemSvc.getSelectedItem();

    this.item$
      .filter(it => !!it)
      .take(1).subscribe(item =>
      this.title.setTitle(item.text.length > 20 ? item.text.substring(0, 20).concat('...') : item.text)
    );


    this.userVote$ = this.voteSvc.getUserVoteForSelectedItem();

    this.votes$ = this.item$.take(1)//get the initial page rendered before loading votes
      .flatMapTo(this.voteSvc.getVotesForSelectedItem());

    this.userComment$ = this.commentSvc.getUserCommentForSelectedItem();

    this.comments$ = this.commentSvc.getCommentsForSelectedItem().startWith([]);


    this.showComments$ = this._showComments$
      .withLatestFrom(this.comments$.startWith([]), (max, comments) => {
        return Math.min(max + SHOW_COMMENTS_STEP, comments && comments.length || SHOW_COMMENTS_STEP)
      }).startWith(SHOW_COMMENTS_STEP);

    this.groupId$ = this.focusSvc.focus$.map(it => it.group);

    this.activeMeeting$ = this.route.params.map(params => params[ 'meetingId' ]);

    this.numFollows$ = itemId$.flatMap(id => this.followSvc.getFollowCount('item', id));

    this.isFollowing$ = itemId$.flatMap(id => this.followSvc.isFollowing('item', id));

    this.userRep$ = Observable.combineLatest(
      this.groupSvc.getActiveGroup().filter(it => !!it),
      this.authSvc.sessionUser$.filter(it => !!it),
      (group, user) => {
        if (user.groups && user.groups[ group.id ] && user.groups[ group.id ].district) {
          let district = getById(user.groups[ group.id ].district.id, group.districts);
          return getById(district.representative, group.representatives);
        }
        return null;
      });


  }

  showMoreComments(current) {
    this._showComments$.next(current);
  }


  ngOnInit() {

  }

  castVote(it: { itemId: string, value: 1 | -1, groupId: string }) {
    console.log('casting');
    this.voteSvc.castVote(it.itemId, it.value, it.groupId);
  }


  postComment(it: { itemId: string, text: string, role: string, groupId: string }) {
    this.commentSvc.postComment(it.itemId, it.text, it.role, it.groupId);
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
