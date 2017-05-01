import { Injectable } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2';
import { Observable } from 'rxjs/Rx';
import { AuthService } from '../../user/auth.service';
import { Observer } from 'rxjs/Observer';

@Injectable()
export class FollowService {

  constructor(private db: AngularFireDatabase, private authSvc: AuthService) { }

  getFollowCount(type: 'meeting' | 'group', id: string): Observable<number> {
    return this.db.object(`/following/${type}/${id}`)
      .map(it => {
        if (!it.$exists()) {
          return 0;
        } else {
          return Object.keys(it)
            .filter(id => it[ id ] == true).length;
        }
      });
  }

  follow(type: 'meeting' | 'group', id: string): Observable<any> {
    return this.authSvc.sessionUserId$.take(1).flatMap(userId => {
      if (!userId) {
        return Observable.of({ success: false, message: 'auth-required' });
      }
      return this.doAddRemove(type, id, userId, true);
    });

  }

  unfollow(type: 'meeting' | 'group', id: string): Observable<any> {
    return this.authSvc.sessionUserId$.take(1).flatMap(userId => {
      if (!userId) {
        return Observable.of({ success: false, message: 'auth-required' });
      }
      return this.doAddRemove(type, id, userId, false);
    });

  }

  isFollowing(type: 'meeting' | 'group', id: string): Observable<boolean> {
    return this.authSvc.sessionUserId$.flatMap(userId => {

      if (!userId) {
        return Observable.of(false);
      }
      return this.db.object(`/following/${type}/${id}/${userId}`).map(it => {
        console.log(it);
        return it.$exists() && it.$value === true;
      });
    });
  }

  private doAddRemove(type: 'meeting' | 'group', id: string, userId: string, value: boolean): Observable<any> {
    return Observable.create((observer: Observer<any>) => {
      this.db.object(`/following/${type}/${id}`).update({ [userId]: value }).then(res => {
        observer.next({ success: true });
        observer.complete();
      }).catch(err => {
        observer.next({ success: false, message: err.message });
        observer.complete();
      })
    })
  }


}
