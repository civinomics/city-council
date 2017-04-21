import { Component, OnInit } from '@angular/core';
import { AuthService, SocialAuthProvider } from '../auth.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { EmailSignupData, UserAddress } from '../user.model';
import { Router } from '@angular/router';
import { AuthError } from '../auth.reducer';

@Component({
  selector: 'civ-sign-in',
  template: `
    <civ-sign-in-view (startSocial)="initSocialSignin($event)"
                      (completeSocial)="completeSocial($event)"
                      (emailSignup)="emailSignup($event)"
                      [error]="error$ | async"
                      [firstName]="(values$ | async).firstName"
                      [lastName]="(values$ | async).lastName"
                      [email]="(values$ | async).email"></civ-sign-in-view>
  `,
  styles: []
})
export class SignInContainerComponent implements OnInit {
  error$: Subject<AuthError|null> = new BehaviorSubject(null);
  values$: Subject<{ firstName: string, lastName: string, email: string }> = new BehaviorSubject({
    firstName: '',
    lastName: '',
    email: ''
  });

  private _socialAccountInitiated: boolean = false;

  constructor(private authSvc: AuthService, private router: Router) {

  }

  ngOnInit() {
  }

  emailSignup(data: EmailSignupData) {
    this.authSvc.emailSignup(data).subscribe(result => {
      console.log(result);
      if (result.success == true){
        this.router.navigate(['group', 'id_acc'])
      } else {
        this.error$.next(result.error)
      }
    })
  }

  completeSocial(data: UserAddress) {
    this.authSvc.completeSocialSignin(data).subscribe(user => {
      this.router.navigate(['group', 'id_acc'])
    })
  }

  initSocialSignin(provider: SocialAuthProvider) {
    this.authSvc.socialSignIn(provider).subscribe(result => {
      console.info('Social signin result:');
      console.info(result);

      if (result.success == true) {
        if (result.extantAccount) {
          this.router.navigate(['group', 'id_acc'])
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

}
