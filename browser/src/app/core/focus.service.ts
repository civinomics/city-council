import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '../state';
import { Observable } from 'rxjs';
import * as focus from './focus.reducer';
import { NavigationEnd, Router } from '@angular/router';

const groupRE = /group\/([^\/]+)/;
const meetingRE = /meeting\/([^\/]+)/;
const itemRE = /item\/([^\/]+)/;

@Injectable()
export class AppFocusService {

  public readonly focus$: Observable<focus.State>;

  constructor(private store: Store<AppState>, private router: Router) {
    this.focus$ = this.store.select('focus');

    const url$ = this.router.events
      .filter(it => it instanceof NavigationEnd)
      .map(it => (it as NavigationEnd).url)
      .distinctUntilChanged();

    const activeGroup$ =
      url$.map(url => {
        let it = groupRE.exec(url);
        console.log(it);
        if (!it || !it[ 1 ]) {
          return undefined;
        }
        return it[ 1 ];
      });

    const activeMeeting$ =
      url$.map(url => {
        let it = meetingRE.exec(url);
        if (!it || !it[ 1 ]) {
          return undefined;
        }
        return it[ 1 ];
      });

    const activeItem$ = url$.map(url => {
      let it = itemRE.exec(url);
      if (!it || !it[ 1 ]) {
        return undefined;
      }
      return it[ 1 ];
    });

    activeGroup$
      .distinctUntilChanged()
      .subscribe(id => this.store.dispatch({ type: focus.SELECT_GROUP, payload: id }));

    activeMeeting$
      .distinctUntilChanged()
      .subscribe(id => this.store.dispatch({ type: focus.SELECT_MEETING, payload: id }));

    activeItem$
      .distinctUntilChanged()
      .subscribe(id => this.store.dispatch({ type: focus.SELECT_ITEM, payload: id }))


  }



}
