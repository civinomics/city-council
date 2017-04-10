import {Component, OnInit} from '@angular/core';
import {AuthService, SocialAuthProvider} from '../../services/auth.service';
import {BehaviorSubject, Subject} from 'rxjs';
import {EmailSignupData, UserAddress} from '../../models/user';
import {Router} from '@angular/router';

@Component({
  selector: 'civ-sign-in',
  template: `
    <civ-sign-in-view (startSocial)="initSocialSignin($event)"
                      (completeSocial)="completeSocial($event)"
                      (emailSignup)="emailSignup($event)"
                      [firstName]="(values$ | async).firstName"
                      [lastName]="(values$ | async).lastName"
                      [email]="(values$ | async).email"></civ-sign-in-view>
  `,
  styles: []
})
export class SignInContainerComponent implements OnInit {

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
    this.authSvc.emailSignin(data).subscribe(user => {
      this.router.navigate(['group', 'id_acc'])
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
