import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SocialAuthProvider } from '../../services/auth.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { EmailSignupData, UserAddress } from '../../models/user';

@Component({
  selector: 'civ-sign-in-view',
  templateUrl: './signin-view.component.html',
  styleUrls: ['./signin-view.component.scss']
})
export class SignInViewComponent implements OnChanges {

  @Output() startSocial: EventEmitter<SocialAuthProvider> = new EventEmitter();
  @Output() completeSocial: EventEmitter<UserAddress> = new EventEmitter();
  @Output() emailSignup: EventEmitter<EmailSignupData> = new EventEmitter();

  @Input() firstName: string;
  @Input() lastName: string;
  @Input() email: string;

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
    zip: new FormControl('', [Validators.required, Validators.minLength(5), Validators.maxLength(5)]),
    email: new FormControl('', [Validators.required, Validators.pattern(EMAIL_REGEX)]),
    password: new FormControl('', [])
  });

  addressTooltip = 'Civinomics sends your comments and votes to your elected representatives. We need your legal name and your address to find your representatives and prove to them that you\'re a voter. ';

  socialConnected: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['firstName'] && !changes['firstName'].firstChange) {
      console.log('gotem changes');
      console.log(changes);
      this.signupForm.controls['firstName'].setValue(this.firstName);
    }

    if (changes['lastName'] && !changes['lastName'].firstChange) {
      this.signupForm.controls['lastName'].setValue(this.lastName);
    }

    if (changes['email'] && !changes['email'].firstChange) {
      this.socialConnected = true;
      this.signupForm.controls['email'].setValue(this.email);
      this.signupForm.controls['email'].disable();
      this.signupForm.controls['password'].disable();
    }

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

  submit() {
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
