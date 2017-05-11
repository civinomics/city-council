import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { AuthService } from '../user/auth.service';
import { AngularFireDatabase } from 'angularfire2';
import { Observable } from 'rxjs';
import { Comment, parseComment } from './comment.model';
import { parseUser, SessionUser, User } from '../user/user.model';
import { Actions, Effect, toPayload } from '@ngrx/effects';
import { AppState, getCommentsForSelectedItem, getSessionUser, getUserCommentForSelectedItem } from '../state';
import { SELECT_ITEM } from '../core/focus.reducer';
import { Store } from '@ngrx/store';
import { CommentsLoadedAction } from './comment.reducer';
import { parseVote } from '../vote/vote.model';
import { VoteService } from '../vote/vote.service';

@Injectable()
export class CommentService {
  @Effect()
  loadSessionUserCommentForSelectedItemEffect =
    this.store.select(getSessionUser)
      .withLatestFrom(this.actions.ofType(SELECT_ITEM)
        .map(toPayload)
        .filter(it => !!it)
      )
      .filter(([ user, itemId ]) => !!user && !!user.comments[ itemId ])
      .flatMap(([ user, itemId ]) =>
        this.loadSingleComment(itemId, user.comments[ itemId ]).map(comment =>
          new CommentsLoadedAction([ comment ], itemId)
        )
      );


  @Effect()
  loadCommentsForSelectedItemEffect = this.actions.ofType(SELECT_ITEM)
    .map(toPayload)
    .filter(it => !!it)
    .flatMap(id => this.loadCommentsForItem(id).map(comments => new CommentsLoadedAction(comments, id)));


  constructor(private authService: AuthService, private db: AngularFireDatabase, private store: Store<AppState>, private actions: Actions, private voteSvc: VoteService) {
  }

  public getCommentsForSelectedItem() {
    return this.store.select(getCommentsForSelectedItem).map(dict => Object.keys(dict).map(id => dict[ id ]));
  }

  public getUserCommentForSelectedItem() {
    return this.store.select(getUserCommentForSelectedItem);
  }


  public postComment(itemId: string, text: string, role: string) {
    console.log(`CommentService.postComment(${itemId}, ${text}, ${role})`);
    this.authService.sessionUser$.take(1).subscribe(user => {
      //if user tries to comment without being authenticated, show auth modal, call self in callback
      if (!user) {
        console.debug('no user signed in - opening modal');
        this.authService.requestAuthModal('We need you to sign in before voting.', (result) => {
          setTimeout(() => {
            if (!!result) {
              console.debug(`modal callback - result ${result} : casting again`);
              this.postComment(itemId, text, role);
            }
          }, 500);
        });
        return;
      } else if (user.isVerified == false) {
        this.authService.showVerificationRequiredModal();
        return;
      }

      console.log('user is verified - continuing');


      this.getUserCommentFor(itemId).take(1).subscribe(extantComment => {
        if (extantComment == null) {
          this.createNewComment(itemId, text, role, user);
        } else {
          console.debug('extant comment exists - editing');
          this.editComment(itemId, extantComment, { role, text });
        }


      });


    });

  }

  private createNewComment(itemId: string, text: string, role: string, user: SessionUser) {

    let postData = {
      text,
      role,
      posted: moment().toISOString(),
      userDistrict: user.districts[ 'id_acc' ] || null,
      owner: user.id
    };

    this.db.list(`/comment/${itemId}`).push(postData).then(res => {
      let commentId = res.key;
      console.debug(`successfully posted new comment to ${itemId} with id ${commentId}`);

      this.db.object(`/user_private/${user.id}/comments`).update({ [itemId]: commentId }).then(() => {
        console.debug(`successfully created user_private/comments/${itemId}/${commentId}`);
      })

    })
  }

  private editComment(itemId: string, extant: Comment, updated: { text?: string, role?: string }) {
    let put = { text: updated.text || extant.text, role: updated.role || extant.role };

    this.db.object(`/comment/${itemId}/${extant.id}`).update(put)
      .then(() => {
        console.debug(`successfully edited ${extant.id}`)
      })
      .catch((err) => {
        console.debug(`error editing ${extant.id}`);
        console.debug(err)
      })
  }

  private getAuthor(id: string): Observable<User> {
    return this.db.object(`/user/${id}`).take(1).map(it => parseUser(it));
  }

  private getVoteCounts(id: string): Observable<{ up: number, down: number }> {
    return this.db.list(`/vote/${id}`)
      .map(votes => votes.map(vote => parseVote(vote)))
      .map(votes => ({
        up: votes.filter(it => it.value == 1).length,
        down: votes.filter(it => it.value == -1).length
      })).startWith({ up: 0, down: 0 })
  }

  private getUserVoteFor(commentId: string) {
    return this.voteSvc.getSessionUserVoteFor(commentId).startWith(null);
  }

  private loadCommentsForItem(itemId: string): Observable<Comment[]> {
    let processed = 0;
    return this.db.list(`/comment/${itemId}`)
      .take(1)
      .map(arr => arr.map(comment => parseComment(comment)))
      .do(arr => console.log(`comments: ${arr.length}`))
      .flatMap(comments =>

        Observable.combineLatest(...comments.map(comment =>
          Observable.combineLatest(
            //      this.getUserVoteFor(comment.id),
            this.getVoteCounts(comment.id),
            this.getAuthor(comment.owner).take(1),
            (votes, author) => {
              console.log('loaded comment ' + comment.id);
              console.log(`processed: ${++processed}`);
            return {
              ...comment,
              author,
              votes
            }
          })
        ))
      );


  }

  private loadSingleComment(itemId: string, commentId: string): Observable<Comment> {
    return this.db.object(`/comment/${itemId}/${commentId}`).map(it => parseComment(it));
  }

  public getUserCommentFor(itemId: string): Observable<Comment | null> {
    console.log(`getting user vote for ${itemId}`);
    let userCommentId: Observable<string | null> = this.authService.sessionUserId$.flatMap(userId =>
      !userId ? Observable.of(null) : this.db.object(`/user_private/${userId}/comments/${itemId}`).map(it =>
        !it ? null : it.$value)
    );

    return userCommentId
      .flatMap(it => it == null ? Observable.of(null) : this.db.object(`/comment/${itemId}/${it}`).map(it => parseComment(it)));

  }


}
