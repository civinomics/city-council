import { Component, OnInit } from '@angular/core';


@Component({
  selector: 'civ-app-admin-page',
  template: `
    <div class="heading">Civinomics Administration</div>

    <nav md-tab-nav-bar>
      <a md-tab-link
         routerLink="groups"
         [routerLinkActiveOptions]="{exact: true}"
         routerLinkActive #rlaGroups="routerLinkActive"
         [active]="rlaGroups.isActive"
      >EDIT GROUPS</a>
      <a md-tab-link
         routerLink="setup-group"
         routerLinkActive #rlaSetup="routerLinkActive"
         [routerLinkActiveOptions]="{exact: true}"
         [active]="rlaSetup.isActive"
      >SETUP NEW GROUP</a>
    </nav>
    <div class="stage">
      <router-outlet></router-outlet>
    </div>

  `,
  styleUrls: [ `./app-admin-page.component.scss` ]
})
export class AppAdminPageComponent implements OnInit {

  constructor() { }

  ngOnInit() {

  }

}
