import {Injectable} from '@angular/core';
import * as moment from 'moment';
import {AuthService} from './auth.service';
import {AngularFireDatabase} from 'angularfire2';
import {Observable} from 'rxjs';
import {Comment, parseComment} from '../models/comment';
import {SessionUser} from '../models/user';

@Injectable()
export class CommentService {

  constructor(private authService: AuthService, private db: AngularFireDatabase) {

  }


  public postComment(itemId: string, text: string, role: string) {
    console.log(`CommentService.postComment(${itemId}, ${text}, ${role})`)
    this.authService.sessionUser$.take(1).subscribe(user => {
      //if user tries to comment without being authenticated, show auth modal, call self in callback
      if (!user) {
        console.debug('no user signed in - opening modal');
        this.authService.requestAuthModal('We need you to sign in before voting.', (result) => {
          setTimeout(() => {
            console.debug(`modal callback - result ${result} : casting again`);
            this.postComment(itemId, text, role);
          }, 1000);
        });
        return;
      } else if (user.isVerified == false) {
        //TODO
        //show verification reqd modal
        //  return;
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
