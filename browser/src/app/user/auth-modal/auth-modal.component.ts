import { Component, Inject, Optional } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MD_DIALOG_DATA, MdDialogRef } from '@angular/material';
import { AuthService } from '../auth.service';
import { SignInContainerComponent } from '../sign-in/signin.page';

@Component({
  selector: 'civ-auth-modal',
  template: `
    <md-dialog-content >
      <civ-sign-in-view [error]="error$ | async"
                        [mode]="mode$ | async"
                        [firstName]="(values$ | async).firstName"
                        [lastName]="(values$ | async).lastName"
                        [email]="(values$ | async).email"
                        [message]="message"
                        (startSocial)="initSocialSignin($event)"
                        (completeSocial)="completeSocial($event)"
                        (emailSignup)="emailSignup($event)"
                        (emailLogin)="emailLogin($event)"
                        (setMode)="setMode($event)"
      ></civ-sign-in-view>
    </md-dialog-content>`,
  styles: [`
    :host {display: block; overflow-y: hidden; max-height: 90vh}
  `]
})
export class AuthModalComponent extends SignInContainerComponent {

  message: string | null;

  constructor(authSvc: AuthService,
              router: Router,
              route: ActivatedRoute,
              private dialogRef: MdDialogRef<AuthModalComponent>,
              @Inject(MD_DIALOG_DATA) @Optional() private data: any) {
    super(authSvc, router, route);
    this.message = data && data.message || null;
  }


  onSuccess(result): void {
    this.dialogRef.close(result);
  }
}
