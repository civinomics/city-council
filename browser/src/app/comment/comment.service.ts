import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { AuthService } from '../user/auth.service';
import { AngularFireDatabase } from 'angularfire2';
import { Observable } from 'rxjs';
import { Comment, parseComment } from './comment.model';
import { SessionUser } from '../user/user.model';
import { Actions, Effect, toPayload } from '@ngrx/effects';
import { AppState, getCommentsForSelectedItem, getSessionUser, getUserCommentForSelectedItem } from '../state';
import { SELECT_ITEM } from '../core/focus.reducer';
import { Store } from '@ngrx/store';
import { CommentsLoadedAction } from './comment.reducer';

@Injectable()
export class CommentService {
  @Effect()
  loadSessionUserCommentForSelectedItemEffect =
    this.store.select(getSessionUser)
      .withLatestFrom(this.actions.ofType(SELECT_ITEM)
        .map(toPayload)
        .filter(it => !!it)
      )
      .filter(([user, itemId]) => !!user && !!user.comments[itemId])
      .flatMap(([user, itemId]) =>
        this.loadSingleComment(itemId, user.comments[itemId]).map(comment =>
          new CommentsLoadedAction([comment], itemId)
        )
      );


  @Effect()
  loadCommentsForSelectedItemEffect = this.actions.ofType(SELECT_ITEM)
    .map(toPayload)
    .filter(it => !!it)
    .flatMap(id => this.loadCommentsForItem(id).take(1).map(votes => new CommentsLoadedAction(votes, id)));


  constructor(private authService: AuthService, private db: AngularFireDatabase, private store: Store<AppState>, private actions: Actions) {

  }

  public getCommentsForSelectedItem() {
    return this.store.select(getCommentsForSelectedItem);
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
          this.editComment(itemId, extantComment, {role, text});
        }


      });


    });

  }

  private createNewComment(itemId: string, text: string, role: string, user: SessionUser) {

    let postData = {
      text,
      role,
      posted: moment().toISOString(),
      userDistrict: user.districts['id_acc'] || null,
      owner: user.id
    };

    this.db.list(`/comment/${itemId}`).push(postData).then(res => {
      let commentId = res.key;
      console.debug(`successfully posted new comment to ${itemId} with id ${commentId}`);

      this.db.object(`/user_private/${user.id}/comments`).update({[itemId]: commentId}).then(() => {
        console.debug(`successfully created user_private/comments/${itemId}/${commentId}`);
      })

    })
  }

  private editComment(itemId: string, extant: Comment, updated: { text?: string, role?: string }) {
    let put = {text: updated.text || extant.text, role: updated.role || extant.role};

    this.db.object(`/comment/${itemId}/${extant.id}`).update(put)
      .then(() => {
        console.debug(`successfully edited ${extant.id}`)
      })
      .catch((err) => {
        console.debug(`error editing ${extant.id}`);
        console.debug(err)
      })
  }

  private loadCommentsForItem(itemId: string): Observable<Comment[]> {
    return this.db.list(`/comment/${itemId}`)/*
     .flatMap(comments => {

     })*/
      .map(arr => arr.map(comment => parseComment(comment)));


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
