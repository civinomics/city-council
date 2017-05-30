import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { SocialAuthProvider } from '../auth.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { EmailSignupData, UserAddress } from '../user.model';
import { MapsAPILoader } from '@agm/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MdInputDirective } from '@angular/material';
import { EMAIL_REGEX, ZIP_REGEX } from '../../shared/constants';

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
export class SignInViewComponent implements OnChanges, AfterViewInit {

  @Input() firstName: string;
  @Input() lastName: string;
  @Input() email: string;
  @Input() error: any;
  @Input() mode: 'sign-up'|'log-in' = 'sign-up';
  @Input() message: string | null;

  @Output() setMode = new EventEmitter<'log-in'|'sign-up'>();

  @Output() startSocial: EventEmitter<SocialAuthProvider> = new EventEmitter();
  @Output() completeSocial: EventEmitter<UserAddress> = new EventEmitter();
  @Output() emailSignup: EventEmitter<EmailSignupData> = new EventEmitter();
  @Output() emailLogin: EventEmitter<{email: string, password: string}> = new EventEmitter();

  @ViewChild('addressInput') rawAddressInput: ElementRef;
  @ViewChild('addressInput', {read: MdInputDirective}) addressInput: MdInputDirective;


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

  address: UserAddress;

  addressTooltip = 'Civinomics sends your comments and votes to your elected representatives. We need your legal name and your address to find your representatives and prove to them that you\'re a voter. ';

  socialConnected: boolean = false;

  constructor(private mapsAPILoader: MapsAPILoader,  private zone: NgZone){}

  ngAfterViewInit(): void {
    this.initAddressAutocomplete();
  }

  private updateAddress(place: any){
    this.address = parseAddress(place.address_components);

    this.signupForm.controls['line1'].setValue(this.address.line1);
    this.signupForm.controls['city'].setValue(this.address.city);
    this.signupForm.controls['state'].setValue(this.address.state);
    this.signupForm.controls['zip'].setValue(this.address.zip);

    this.rawAddressInput.nativeElement.value = '';

  }


  ngOnChanges(changes: SimpleChanges): void {
    //firstName, lastName and email changes can only be triggered when a user has initialized a social signin

    if (changes[ 'mode' ] && this.mode == 'sign-up') {
      setTimeout(() => { // give the template time to update
        this.initAddressAutocomplete();
      }, 750);
    }

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


  private initAddressAutocomplete() {
    if (!!this.addressInput) {
      this.mapsAPILoader.load().then(() => {
        let autocomplete = new google.maps.places.Autocomplete(this.rawAddressInput.nativeElement, {
          types: [ 'address' ]
        });

        autocomplete.addListener('place_changed', () => {
          let place = autocomplete.getPlace();
          if (!!place) {
            this.zone.run(() => {
              this.updateAddress(place);
            })

          }
        });

      })
    }

  }



}


export type AddressComponentType = 'street_number'|'route'|'neighborhood'|'sublocality_level_1'|'sublocality'|'administrative_area_level_2'|''


export type AddressComponent = {
  long_name: string,
  short_name: string,
  types: string[]
}

const CITY_TYPES = ['locality','sublocality_level_1', 'sublocality'];

function parseAddress(cmps: AddressComponent[]): UserAddress{
  let streetNum, streetName, city, state, zip;

  let streetNumCmps = cmps.filter(cmp => cmp.types.indexOf('street_number') >= 0);
  if (streetNumCmps.length > 1){
    throw new Error(`Expected exactly one component of type street_number, got: ${JSON.stringify(streetNumCmps)}`)
  } else if (streetNumCmps.length == 0){
    throw new Error(`Expected exactly one component of type street_number, got none`);
  }

  streetNum = streetNumCmps[0].long_name;

  let streetNameCmps = cmps.filter(cmp => cmp.types.indexOf('route') >= 0);
  if (streetNameCmps.length > 1){
    throw new Error(`Expected exactly one component of type route, got: ${JSON.stringify(streetNameCmps)}`)
  } else if (streetNameCmps.length == 0){
    throw new Error(`Expected exactly one component of type route, got none`);
  }

  streetName = streetNameCmps[0].long_name;

  let cityCmps = cmps.filter(cmp => CITY_TYPES.filter(type => cmp.types.indexOf(type) >= 0).length > 0);

  if (cityCmps.length == 0){
    throw new Error(`Expected exactly one component of type cir, got none`);
  }

  city = cityCmps[0].long_name;

  let stateCmps = cmps.filter(cmp => cmp.types.indexOf('administrative_area_level_1') >= 0);
  if (stateCmps.length > 1){
    throw new Error(`Expected exactly one component of type administrative_area_level_1, got: ${JSON.stringify(stateCmps)}`)
  } else if (stateCmps.length == 0){
    throw new Error(`Expected exactly one component of type administrative_area_level_1, got none`);
  }
  state = stateCmps[0].short_name;

  let zipCmps = cmps.filter(cmp => cmp.types.indexOf('postal_code') >= 0);
  if (zipCmps.length > 1){
    throw new Error(`Expected exactly one component of type postal_code, got: ${JSON.stringify(zipCmps)}`)
  } else if (zipCmps.length == 0){
    throw new Error(`Expected exactly one component of type postal_code, got none`);
  }

  zip = zipCmps[0].long_name;


  return {
    line1: `${streetNum} ${streetName}`,
    city, state, zip
  }

}
