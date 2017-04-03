import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {SocialAuthProvider} from '../../services/auth.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {UserAddress} from '../../models/user';

@Component({
  selector: 'civ-sign-in-view',
  templateUrl: './signin-view.component.html',
  styleUrls: [ './signin-view.component.scss' ]
})
export class SignInViewComponent implements OnChanges {

  @Output() startSocial: EventEmitter<SocialAuthProvider> = new EventEmitter();
  @Output() completeSocial: EventEmitter<UserAddress> = new EventEmitter();
  @Output() emailSignup: EventEmitter<{ firstName: string, lastName: string, email: string, address: UserAddress }> = new EventEmitter();

  @Input() firstName: string;
  @Input() lastName: string;
  @Input() email: string;


  signupForm = new FormGroup({
    firstName: new FormControl('', [ Validators.required ]),
    lastName: new FormControl('', [ Validators.required ]),
    line1: new FormControl('', [ Validators.required ]),
    line2: new FormControl(''),
    city: new FormControl('', [ Validators.required ]),
    zip: new FormControl('', [ Validators.required ]),
    email: new FormControl('', [ Validators.required, Validators.pattern(EMAIL_REGEX) ]),
  });

  addressTooltip = 'Civinomics sends your comments and votes to your elected representatives. We need your legal name and your address to find your representatives and prove to them that you\'re a voter. ';

  socialConnected: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes[ 'firstName' ]) {
      console.log('gotem changes');
      console.log(changes);
      this.signupForm.controls[ 'firstName' ].setValue(this.firstName);
    }

    if (changes[ 'lastName' ]) {
      this.signupForm.controls[ 'lastName' ].setValue(this.lastName);
    }

    if (changes[ 'email' ]) {
      this.socialConnected = true;
      this.signupForm.controls[ 'email' ].setValue(this.email);
      this.signupForm.controls[ 'email' ].disable();
    }

  }

  getNameAndEmailValues(): { firstName: string, lastName: string, email: string } {
    return {
      firstName: this.signupForm.controls[ 'firstName' ].value,
      lastName: this.signupForm.controls[ 'lastName' ].value,
      email: this.signupForm.controls[ 'email' ].value
    }
  }

  getAddressValues(): UserAddress {
    return {
      line1: this.signupForm.controls[ 'line1' ].value,
      line2: this.signupForm.controls[ 'line2' ].value,
      city: this.signupForm.controls[ 'city' ].value,
      zip: this.signupForm.controls[ 'zip' ].value,
    }
  }

  submit() {
    if (this.socialConnected) {
      this.completeSocial.emit(this.getAddressValues())
    } else {
      this.emailSignup.emit({ ...this.getNameAndEmailValues(), address: this.getAddressValues() });
    }
  }


}

export const EMAIL_REGEX = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
