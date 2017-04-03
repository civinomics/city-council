import {Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppState} from '../../reducers/index';

@Component({
  selector: 'civ-root',
  template: `
    <md-toolbar class="main-nav">
      <button md-button routerLink="/"><img src="/assets/img/civ_logo_white.png"></button>
      <div class="filler" fxFlex="1 1 auto"></div>
      <civ-auth-widget></civ-auth-widget>
    </md-toolbar>

    <router-outlet></router-outlet>

  `,
  styleUrls: [ './app-container.component.scss' ]
})
export class AppContainerComponent {

  constructor(private store: Store<AppState>) {


  }


}
