import { Injectable } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2/database';
import { AngularFireAuth } from 'angularfire2/auth';
import { BehaviorSubject, Observable, Observer, Subject } from 'rxjs';
import { EmailSignupData, parseSessionUser, parseUser, SessionUser, User, UserAddress } from './user.model';
import { FirebaseError } from 'firebase/app';
import * as firebase from 'firebase';
import {
  AUTH_STATE_CHANGED,
  AuthStateChangedAction,
  SESSION_USER_LOADED,
  SessionUserLoadedAction
} from './auth.reducer';
import { Store } from '@ngrx/store';
import { AppState, getSessionUser, getSessionUserId } from '../state';
import { Actions, Effect, toPayload } from '@ngrx/effects';
import AuthProvider = firebase.auth.AuthProvider;

const DEFAULT_ICON = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/User_font_awesome.svg/500px-User_font_awesome.svg.png';

export type SocialAuthProvider = 'facebook' | 'twitter' | 'google';

export type AuthModalRequestOutcome = 'logged-in' | 'signed-up' | 'none';
export type AuthModalRequest = { message?: string, callback?: (outcome: AuthResult) => any }
export type AuthResult =
  { success: true, extantAccount: boolean, resultantState: any }
  | { success: false, error: FirebaseError, resultantState: any };

@Injectable()
export class AuthService {

  @Effect()
  loadSessionUserDataEffect: Observable<SessionUserLoadedAction> = this.actions.ofType(AUTH_STATE_CHANGED)
    .map(toPayload)
    .filter(state => !!state && !!state.uid)
    .map(state => state.uid)
    .flatMap(id => Observable.timer(500).take(1).mapTo(id))
    .flatMap(id =>
      Observable.combineLatest(this.db.object(`/user/${id}`), this.db.object(`/user_private/${id}`))
      //make sure we end the subscription when the user logs out to avoid 401
        .takeUntil(this.actions.ofType(AUTH_STATE_CHANGED)
          .map(toPayload)
          .filter(it => !it || !it.uid)
        )
        .map(([ publicData, privateData ]) => parseSessionUser({
          ...publicData, ...privateData,
          $key: publicData.$key
        }))
    ).map(user => new SessionUserLoadedAction(user));

  private backendState$: Observable<firebase.User> = this.authBackend.authState;


  public readonly sessionUser$: Observable<SessionUser | null> = this.store.select(getSessionUser);
  public readonly sessionUserId$: Observable<string | null> = this.store.select(getSessionUserId);

  @Effect({ dispatch: false })
  syncVerifiedValuesEffect =
    Observable.combineLatest(this.backendState$, this.sessionUser$)
      .filter(([ authState, userData ]) => !!authState && !!userData)
      .do(([ authState, userData ]) => {
        if (authState.emailVerified && !userData.isVerified) {
          console.log(`User ${authState.uid} has verified their email, updating record accordingly`);
          this.db.object(`/user_private/${authState.uid}`).update({ isVerified: true }).then(res => {
            console.info(`successfully updated isVerified for user ${authState.uid}`);
          });
        }
      });



  private authModalReq$: Subject<AuthModalRequest> = new BehaviorSubject(null);
  private verificationRequiredReq$: Subject<any> = new BehaviorSubject(null);

  public readonly displayAuthModal$ = this.authModalReq$.skip(1).share();
  public readonly displayVerificationRequired$ = this.verificationRequiredReq$.skip(1).share();

  private socialSigninRequest$: Subject<AuthProvider> = new BehaviorSubject(null);
  private emailSigninRequest$: Subject<{ email: string, password: string }> = new BehaviorSubject(null);
  private logoutRequest$: Subject<any> = new BehaviorSubject(null);


  constructor(private authBackend: AngularFireAuth,
              private db: AngularFireDatabase,
              private store: Store<AppState>,
              private actions: Actions) {
    const SOCIAL_SIGNIN = 'SOCIAL_SIGNIN';
    const EMAIL_SIGNIN = 'EMAIL_SIGNIN';
    const SIGN_OUT = 'SIGN_OUT';

    const authRequests$ = Observable.merge(
      this.socialSigninRequest$.skip(1).map(provider => ({ type: SOCIAL_SIGNIN, provider })),
      this.emailSigninRequest$.skip(1).map(creds => ({
        type: EMAIL_SIGNIN,
        email: creds.email,
        password: creds.password
      })),
      this.logoutRequest$.skip(1).map(() => ({ type: SIGN_OUT }))
    );


    this.backendState$
      .distinctUntilChanged()
      .subscribe(state => {
        console.log(state);
        this.store.dispatch(new AuthStateChangedAction(state));
      });


  }

  public requestAuthModal(message?: string, callback?: (outcome: AuthResult) => any) {
    this.authModalReq$.next({ message, callback });
  }

  public logout() {
    this.authBackend.auth.signOut();
  }

  public emailLogin(email: string, password: string): Observable<AuthResult> {
    return Observable.create((observer: Observer<AuthResult>) => {
      this.authBackend.auth.signInWithEmailAndPassword(email, password)
        .then((state: firebase.User) => {
          observer.next({
            success: true,
            extantAccount: true,
            resultantState: state
          });
          observer.complete();
        })
        .catch((error: FirebaseError) => {
          observer.next({
            success: false,
            error,
            resultantState: null
          });
          observer.complete();
        })
    });
  }

  public getUserByEmail(email$: Observable<string>): Observable<User | null> {
    return this.db.list(`/user_private`, {
      query: {
        orderByChild: 'email',
        equalTo: email$
      }
    }).map(matches => matches.length > 0 ? matches[ 0 ].$key : null)
      .flatMap(id => id == null ? Observable.of(null) :
        this.db.object(`/user/${id}`).map(it => parseUser(it)))
  };

  public emailSignup(data: EmailSignupData): Observable<AuthResult> {
    return Observable.create((observer: Observer<AuthResult>) => {

      this.authBackend.auth.createUserWithEmailAndPassword(data.email, data.password)
        .then((state: firebase.User) => {
          let id = state.uid;
          console.info(`created ${id}`);
          //can't push undefined values
          let addr: UserAddress = {
            line1: data.address.line1,
            city: data.address.city,
            state: data.address.state,
            zip: data.address.zip
          };

          if (!!data.address.line2) {
            addr.line2 = data.address.line2;
          }

          this.db.object(`/user/${id}`).update({
            firstName: data.firstName,
            lastName: data.lastName,
            icon: DEFAULT_ICON
          }).then(() => {
            this.db.object(`/user_private/${id}`).update({
              email: data.email,
              address: addr,
              isVerified: false,
            }).then(res => {
              console.info(`successfully created user_private/${id}`);

              observer.next({
                success: true,
                extantAccount: false,
                resultantState: state
              });
              observer.complete();

            }).catch((error: FirebaseError) => {
              console.info(`error creating user_private/${id}`);
              console.info(error);
              observer.next({
                success: false,
                error,
                resultantState: state
              });
              observer.complete();
            });
          }).catch((error: FirebaseError) => {
            console.info(`error creating user/${id}`);
            console.info(error);
            observer.next({
              success: false,
              error,
              resultantState: state
            });
            observer.complete();
          });

          state.sendEmailVerification().then((res) => {
            console.debug(`sent email`);
            console.debug(res);
          })

        }).catch((err: FirebaseError) => {
        console.error(`error creating user: ${err.message}`);
        if (err.code == 'auth/email-already-in-use') {
          //if an extant user submits the signup form instead of login
          console.info(`email already in use - attempting to sign in to extant account with given creds`);
          this.emailLogin(data.email, data.password).take(1).subscribe(result => {
            if (result.success){
              observer.next({
                success: true,
                extantAccount: true,
                resultantState: result.resultantState
              });
            } else {
              observer.next({
                success: false,
                error: {
                  ...err,
                  name: 'email-in-use/invalid-pw',
                  message: 'This email address is already in use, but the password you submitted is incorrect.'
                },
                resultantState: null
              });
            }
            observer.complete();

          }, err => {
            observer.error(err);
          })
        }
      });


    });

  }

  public socialSignIn(provider: SocialAuthProvider): Observable<AuthResult> {
    return this.doSocialLogin(provider);
  }

  public completeSocialSignin(data: UserAddress): Observable<SessionUser> {
    this.sessionUserId$.take(1).subscribe(id => {
      if (!id) {
        throw `Attempted to complete social signin while no sessionUserId exists`;
      }

      this.db.object(`/user_private/${id}`).update({ address: data }).then(res => {
        console.debug(`successfully updated user_private/${id}`);
      });
    });

    return this.actions.ofType(SESSION_USER_LOADED)
      .take(1)
      .map(toPayload);

  }

  public showVerificationRequiredModal() {
    this.verificationRequiredReq$.next();
  }

  public resendVerificationEmail(): Observable<'success'> {
    return Observable.create((observer: Observer<'success'>) => {
      this.backendState$.take(1).subscribe(state => {
        if (!state) {
          throw new Error(`Cannot resend activation email with no signed-in user`)
        }
        state.sendEmailVerification().then(() => {
          observer.next('success');
          observer.complete()
        }).catch(err => {
          observer.error(err);
        })
      })
    }).take(1);
  }


  private doSocialLogin(provider: SocialAuthProvider): Observable<AuthResult> {
    return Observable.create((observer: Observer<AuthResult>) => {

      this.authBackend.auth.signInWithPopup(provider == 'facebook' ? new firebase.auth.FacebookAuthProvider() : new firebase.auth.GoogleAuthProvider()).then((resultantState: firebase.User) => {
        setTimeout(() => {
          this.db.object(`/user_private/${resultantState.uid}/address`).take(1).subscribe(val => {
            if (val.$exists()) {
              console.log(`val exists`);
              console.log(val);
              observer.next({ success: true, extantAccount: true, resultantState });
            } else {
              console.log(`val NOT exists`);
              console.log(val);
              observer.next({ success: true, extantAccount: false, resultantState });
            }
            observer.complete();
          })
        }, 250);
      }).catch((error: FirebaseError) => {
        observer.next({ success: false, error, resultantState: null });
        observer.complete();
      });

    });
  }


  private loadSessionUser() {


  }


}

