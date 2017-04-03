import {Component, OnInit} from '@angular/core';
import {AuthService, SocialAuthProvider} from '../../services/auth.service';
import {BehaviorSubject, Subject} from 'rxjs';
import {UserAddress} from '../../models/user';
import {Router} from '@angular/router';

@Component({
  selector: 'civ-sign-in',
  template: `
    <civ-sign-in-view (startSocial)="initSocialSignin($event)"
                      (completeSocial)="completeSocial($event)"
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

  constructor(private userSvc: AuthService, private router: Router) {

  }

  ngOnInit() {
  }

  completeSocial(data: UserAddress) {
    this.userSvc.completeSocialSignin(data).subscribe(user => {
      this.router.navigate([ 'place', 'id-austin' ])
    })
  }

  initSocialSignin(provider: SocialAuthProvider) {
    this.userSvc.socialSignIn(provider).subscribe(auth => {
      console.info('Social signin result:');
      console.info(auth);
      if (!!auth && !!auth.auth) {
        let firstName, lastName, email;
        if (!auth.auth.displayName) {
          console.error(`Account initiated but we didn't get a name`);
          firstName = lastName = ''
        } else {
          firstName = auth.auth.displayName.split(' ')[ 0 ];
          lastName = auth.auth.displayName.split(' ')[ 1 ];
        }

        email = auth.auth.email;

        this._socialAccountInitiated = true;

        this.values$.next({ firstName, lastName, email });

      }
    })
  }

}
