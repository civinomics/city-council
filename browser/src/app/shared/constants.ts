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

export function getById<T extends { id: string }>(id: string, arr: T[], throwOnError: boolean = true): T {
  let matches = arr.filter(it => it.id == id);
  if (matches.length !== 1) {
    const message = `Expected to find exactly one element with id ${id} but found ${matches.length} in ${JSON.stringify(arr)}`;
    if (throwOnError) {
      throw new Error(message);
    } else {
      console.warn(message);
      return undefined;
    }
  }
  return matches[ 0 ];
}
