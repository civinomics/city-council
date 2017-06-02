import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../user/auth.service';
import { MdDialog } from '@angular/material';
import { AuthModalComponent } from '../../user/auth-modal/auth-modal.component';
import { VerifyModalComponent } from '../../user/verify-modal/verify-modal.component';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'civ-root',
  template: `
    <md-toolbar class="main-nav">
      <button md-button routerLink="/"><img src="/assets/img/civ_logo_white.png"></button>
      <div class="filler" fxFlex="1 1 auto"></div>
      <civ-auth-widget></civ-auth-widget>
      <button md-icon-button *ngIf="isSuperuser$ | async" routerLink="/app-admin/groups">
        <md-icon>settings</md-icon>
      </button>
    </md-toolbar>

    <div class="stage">
      <router-outlet></router-outlet>
    </div>

  `,
  styleUrls: [ './app-root.page.scss' ]
})
export class AppRootComponent implements OnInit {
  isSuperuser$: Observable<boolean>;

  constructor(private authService: AuthService, private dialog: MdDialog, private authSvc: AuthService) {

    this.isSuperuser$ = this.authSvc.sessionUser$.map(it => !!it && it.superuser == true);

  }

  ngOnInit(): void {
    this.authService.displayAuthModal$.subscribe(req => {
      let dialog = this.dialog.open(AuthModalComponent, {
        height: '90vh',
        data: {
          message: req.message
        }
      });
      dialog.afterClosed().subscribe(result => {
        console.log('dialog closed');
        console.log(result);
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
