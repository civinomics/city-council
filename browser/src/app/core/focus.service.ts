import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../state';
import { Observable } from 'rxjs';
import * as focus from './focus.reducer';

@Injectable()
export class AppFocusService {

  public readonly focus$: Observable<focus.State>;

  constructor(private store: Store<AppState>) {
    this.focus$ = this.store.select('focus');
  }


  public selectItem(itemId: string) {
    this.store.dispatch({type: focus.SELECT_ITEM, payload: itemId});
  }


  public selectMeeting(meetingId: string) {
    this.store.dispatch({type: focus.SELECT_MEETING, payload: meetingId});
  }


  public selectGroup(groupId: string) {
    this.store.dispatch({type: focus.SELECT_GROUP, payload: groupId});
  }


}
