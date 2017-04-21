import { Component, OnInit } from '@angular/core';
import { AuthService, SocialAuthProvider } from '../auth.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { EmailSignupData, UserAddress } from '../user.model';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthError } from '../auth.reducer';

@Component({
  selector: 'civ-sign-in',
  template: `
    <civ-sign-in-view [error]="error$ | async"
                      [mode]="mode$ | async"
                      [firstName]="(values$ | async).firstName"
                      [lastName]="(values$ | async).lastName"
                      [email]="(values$ | async).email"
                      (startSocial)="initSocialSignin($event)"
                      (completeSocial)="completeSocial($event)"
                      (emailSignup)="emailSignup($event)"
                      (emailLogin)="emailLogin($event)"
                      (setMode)="setMode($event)"
    ></civ-sign-in-view>
  `,
  styles: []
})
export class SignInContainerComponent implements OnInit {
  error$: Subject<AuthError|null> = new BehaviorSubject(null);
  mode$: Subject<'log-in'|'sign-up'>;
  values$: Subject<{ firstName: string, lastName: string, email: string }> = new BehaviorSubject({
    firstName: '',
    lastName: '',
    email: ''
  });

  private _socialAccountInitiated: boolean = false;

  constructor(private authSvc: AuthService, private router: Router, private route: ActivatedRoute) {
    let initialMode = this.route.snapshot.url.map(segment => segment.toString()).indexOf('sign-in') >= 0 ? 'sign-up' : 'log-in';
    this.mode$ = new BehaviorSubject(initialMode);
  }

  ngOnInit() {
  }

  emailLogin(data: {email: string, password:string}){
    this.authSvc.emailLogin(data.email, data.password).take(1).subscribe(result => {
      if (result.success == true){
        this.onSuccess('logged-in');
      } else {
        this.error$.next(result.error)
      }
    })
  }

  emailSignup(data: EmailSignupData) {
    this.authSvc.emailSignup(data).take(1).subscribe(result => {
      console.log(result);
      if (result.success == true){
        //will be the former when user submits signup form with correct pw to extant account
        this.onSuccess(result.extantAccount ? 'logged-in' : 'signed-up');
      } else {
        this.error$.next(result.error)
      }
    })
  }

  completeSocial(data: UserAddress) {
    this.authSvc.completeSocialSignin(data).subscribe(user => {
      this.onSuccess('signed-up');
    })
  }

  initSocialSignin(provider: SocialAuthProvider) {
    this.authSvc.socialSignIn(provider).subscribe(result => {
      console.info('Social signin result:');
      console.info(result);

      if (result.success == true) {
        if (result.extantAccount) {
          this.onSuccess('logged-in');
        } else {
          let authInfo = result.resultantState.auth;
          let firstName, lastName, email;
          if (!authInfo.displayName) {
            console.error(`Account initiated but we didn't get a name`);
            firstName = lastName = ''
          } else {
            firstName = authInfo.displayName.split(' ')[0];
            lastName = authInfo.displayName.split(' ')[1];
          }

          email = authInfo.email;

          this._socialAccountInitiated = true;

          this.values$.next({firstName, lastName, email});
        }
      }

    })
  }

  setMode(val: 'sign-up'|'log-in'){
    this.mode$.next(val);
  }

  onSuccess(result: 'signed-up'|'logged-in'): void {
    this.router.navigate(['group', 'id_acc']);
  }

}
