import { Component } from '@angular/core';

@Component({
  selector: 'civ-root',
  template: `
    <md-toolbar class="main-nav">
      <button md-button routerLink="/"><img src="/assets/img/civ_logo_white.png"></button>
      <div class="filler" fxFlex="1 1 auto"></div>
      <button md-button>LOGIN | SIGNUP</button>

    </md-toolbar>

    <router-outlet></router-outlet>

  `,
  styleUrls: [ './app-container.component.scss' ]
})
export class AppContainerComponent {


}
