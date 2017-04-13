import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../../services/auth.service';

@Component({
  selector: 'civ-verify-modal',
  template: `
    <div fxLayout="column" fxLayoutGap="20px" fxLayoutAlign="start center">
      <div>Sorry, we need you to verify your email address before you can do that.</div>
      <button md-raised-button color="accent" (click)="resendEmail()" [disabled]="emailResent">Resend Verification
        Email
      </button>
      <div *ngIf="emailResent">Success! A new verification email is in your inbox.</div>
    </div>
  `,
  styles: []
})
export class VerifyModalComponent implements OnInit {

  emailResent: boolean = false;

  constructor(private authSvc: AuthService) {

  }

  ngOnInit() {
  }

  resendEmail() {
    this.authSvc.resendVerificationEmail().subscribe(() => {
      this.emailResent = true;
    });
  }

}
