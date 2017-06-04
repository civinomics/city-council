import { validate } from 'email-validator';
import { FormControl } from '@angular/forms';

export const EMAIL_REGEX = /^[\w\d_.-~+^$%&*()]+@[\w\d_.-~+^$%&*()]+?\.[\w\d_.-~+^$%&*()]+$/;
export const ZIP_REGEX = /\d{5}/;

export function ValidEmailAddress(control: FormControl) {
  if (!control.value || !validate(control.value)) {
    return {
      invalidEmail: true
    }
  }
  return null;
}
