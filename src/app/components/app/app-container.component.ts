import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {MdDialog} from '@angular/material';
import {AuthModalComponent} from '../auth/auth-modal/auth-modal.component';
import {VerifyModalComponent} from '../auth/verify-modal/verify-modal.component';

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
export class AppContainerComponent implements OnInit {

  constructor(private authService: AuthService, private dialog: MdDialog) {


  }

  ngOnInit(): void {
    this.authService.displayAuthModal$.subscribe(req => {
      let dialog = this.dialog.open(AuthModalComponent);
      dialog.afterClosed().subscribe(result => {
        if (!!req.callback) {
          req.callback(result);
        }
      })
    });

    this.authService.displayVerificationRequired$.subscribe(() => {
      this.dialog.open(VerifyModalComponent);
    })

  }




}
