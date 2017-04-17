import { Action } from '@ngrx/store';
import { FirebaseAuthState } from 'angularfire2';
import { SessionUser } from './user.model';

export type AuthError = {
  code: string;
  message: string;
  name: string;
}

export interface State {
  authenticated: boolean;
  error?: AuthError;
  id?: string;
  data?: SessionUser
}

export const AUTH_STATE_CHANGED = '[Auth] authStateChanged';
export const SESSION_USER_LOADED = '[Auth] sessionUserLoaded';

export const AUTH_ERRORED = '[Auth] authErrored';

export class AuthStateChangedAction implements Action {
  type = AUTH_STATE_CHANGED;

  constructor(public readonly payload: FirebaseAuthState) {}
}

export class SessionUserLoadedAction implements Action {
  type = SESSION_USER_LOADED;

  constructor(public readonly payload: SessionUser) {}
}


export class AuthErroredAction implements Action {
  type = AUTH_ERRORED;

  constructor(public readonly payload: AuthError) {}
}


const initialState = {
  authenticated: false
};

export function reducer(state: State = initialState, action: Action): State {
  switch (action.type) {
    case AUTH_STATE_CHANGED:
      let auth: FirebaseAuthState = (action as AuthStateChangedAction).payload;
      if (auth == null) {
        return {
          authenticated: false
        }
      } else {
        return {

          authenticated: true,
          id: auth.uid
        }
      }

    case SESSION_USER_LOADED:
      return {
        ...state,
        data: (action as SessionUserLoadedAction).payload
      };

    default:
      return state;
  }
}

