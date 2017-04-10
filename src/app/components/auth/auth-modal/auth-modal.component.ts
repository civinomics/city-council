import {Component, OnInit} from '@angular/core';
import {AuthService, SocialAuthProvider} from '../../../services/auth.service';
import {Router} from '@angular/router';
import {MdDialogRef} from '@angular/material';
import {EmailSignupData, UserAddress} from '../../../models/user';
import {BehaviorSubject, Subject} from 'rxjs';

@Component({
  selector: 'civ-auth-modal',
  template: `
    <civ-sign-in-view (startSocial)="initSocialSignin($event)"
                      (completeSocial)="completeSocial($event)"
                      (emailSignup)="emailSignup($event)"
                      [firstName]="(values$ | async).firstName"
                      [lastName]="(values$ | async).lastName"
                      [email]="(values$ | async).email"></civ-sign-in-view>`,
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent implements OnInit {
  private _socialAccountInitiated: boolean = false;

  values$: Subject<{ firstName: string, lastName: string, email: string }> = new BehaviorSubject({
    firstName: '',
    lastName: '',
    email: ''
  });


  constructor(private authSvc: AuthService, private router: Router, private dialogRef: MdDialogRef<AuthModalComponent>) {

  }

  ngOnInit() {
  }

  emailSignup(data: EmailSignupData) {
    this.authSvc.emailSignin(data).subscribe(user => {
      this.dialogRef.close('signed-up');
    })
  }

  completeSocial(data: UserAddress) {
    this.authSvc.completeSocialSignin(data).subscribe(user => {
      this.dialogRef.close('signed-up');
    })
  }

  initSocialSignin(provider: SocialAuthProvider) {
    this.authSvc.socialSignIn(provider).subscribe(result => {
      console.info('Social signin result:');
      console.info(result);

      if (result.success == true) {
        if (result.extantAccount) {
          this.dialogRef.close(result);
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
