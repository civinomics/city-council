import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SocialAuthProvider } from '../auth.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { EmailSignupData, UserAddress } from '../user.model';
import { AuthError } from '../auth.reducer';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'civ-sign-in-view',
  templateUrl: './signin-view.component.html',
  styleUrls: ['./signin-view.component.scss'],
  animations: [
    trigger('slide', [
      transition('* => void', animate('100ms ease-in', style({transform: `translateX(150%)`}))),
      transition('void => *', [
        style({transform: `translateX(-150%)`}),
        animate('150ms 125ms ease-in', style({transform:'translateX(0)'}))
      ])

    ])
  ]
})
export class SignInViewComponent implements OnChanges {

  @Input() firstName: string;
  @Input() lastName: string;
  @Input() email: string;
  @Input() error: AuthError|null;
  @Input() mode: 'sign-up'|'log-in' = 'sign-up';
  @Output() setMode = new EventEmitter<'log-in'|'sign-up'>();

  @Output() startSocial: EventEmitter<SocialAuthProvider> = new EventEmitter();
  @Output() completeSocial: EventEmitter<UserAddress> = new EventEmitter();
  @Output() emailSignup: EventEmitter<EmailSignupData> = new EventEmitter();
  @Output() emailLogin: EventEmitter<{email: string, password: string}> = new EventEmitter();


  states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
    'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR',
    'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

  signupForm = new FormGroup({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl('', [Validators.required]),
    line1: new FormControl('', [Validators.required]),
    line2: new FormControl(''),
    city: new FormControl('', [Validators.required]),
    state: new FormControl('', [Validators.required]),
    zip: new FormControl('', [Validators.required, Validators.pattern(ZIP_REGEX)]),
    email: new FormControl('', [Validators.required, Validators.pattern(EMAIL_REGEX)]),
    password: new FormControl('', [Validators.required]),
    confirmAddress: new FormControl(false, [Validators.requiredTrue]),
    checkTos: new FormControl(false, [Validators.requiredTrue])
  });

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.pattern(EMAIL_REGEX)]),
    password: new FormControl('', [Validators.required]),
  });

  addressTooltip = 'Civinomics sends your comments and votes to your elected representatives. We need your legal name and your address to find your representatives and prove to them that you\'re a voter. ';

  socialConnected: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    //firstName, lastName and email changes can only be triggered when a user has initialized a social signin

    if (changes['email'] && !changes['email'].firstChange) {
      this.socialConnected = true;
      this.signupForm.controls['email'].setValue(this.email);
      this.signupForm.controls['email'].disable();
      this.signupForm.controls['password'].disable();

      if (this.mode == 'log-in'){
        //this can only happen when a user has attempted to log-in via social but doesn't have an existent account,
        // switch them to signup to get the remaining info
        this.mode = 'sign-up';
      }
    }

    if (changes['firstName'] && !changes['firstName'].firstChange) {
      this.signupForm.controls['firstName'].setValue(this.firstName);
    }

    if (changes['lastName'] && !changes['lastName'].firstChange) {
      this.signupForm.controls['lastName'].setValue(this.lastName);
    }


    if (changes['error'] && !!changes['error'].currentValue){
      console.log('ERROR!');
      console.log(this.error);
      debugger;
    }
  }

  get emailError(): string|null {
    if (!!this.error){
      if (this.error.name == 'email-in-use/invalid-pw'){
        return `An account has already been created for this email address, but the password you provided is incorrect.`
      } else {
        console.error(this.error);
      }
    }
    return null;
  }

  get passwordError(): string|null {
    if (!!this.error) {
      if (this.error.code == 'auth/wrong-password'){
        return `This password does not match our records.`
      }
    }
    return null;
  }

  getNameAndEmailValues(): { firstName: string, lastName: string, email: string } {
    return {
      firstName: this.signupForm.controls['firstName'].value,
      lastName: this.signupForm.controls['lastName'].value,
      email: this.signupForm.controls['email'].value
    }
  }

  getAddressValues(): UserAddress {
    return {
      line1: this.signupForm.controls['line1'].value,
      line2: this.signupForm.controls['line2'].value,
      city: this.signupForm.controls['city'].value,
      state: this.signupForm.controls['state'].value,
      zip: this.signupForm.controls['zip'].value,
    }
  }

  submitLogin(): void {
    let email = this.loginForm.controls['email'].value,
      password = this.loginForm.controls['password'].value;

    this.emailLogin.emit({email, password});

  };

  submitSignup() {
    if (this.socialConnected) {
      this.completeSocial.emit(this.getAddressValues())
    } else {
      this.emailSignup.emit({
        ...this.getNameAndEmailValues(),
        address: this.getAddressValues(),
          password: this.signupForm.controls[ 'password' ].value,
          superuser: false
      });
    }
  }


}

export const EMAIL_REGEX = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
export const ZIP_REGEX = /\d{5}/;
