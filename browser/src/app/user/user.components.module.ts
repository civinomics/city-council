import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { SignInContainerComponent } from './sign-in/signin.page';
import { SignInViewComponent } from './sign-in/signin-view.component';
import { AuthWidgetComponent } from './auth-widget/auth-widget.component';
import { VerifyModalComponent } from './verify-modal/verify-modal.component';
import { AuthModalComponent } from './auth-modal/auth-modal.component';
import { RouterModule } from '@angular/router';
import { AgmCoreModule } from '@agm/core';
import { environment } from '../../environments/environment';

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild([{path:'sign-in', component: SignInContainerComponent}]),


      AgmCoreModule.forRoot({
        apiKey: environment.google.apiKey,
        libraries: ['places']
      })
    ],
    providers: [],
    declarations: [
        SignInContainerComponent, SignInViewComponent, AuthWidgetComponent, VerifyModalComponent, AuthModalComponent
    ],
    exports: [
        AuthWidgetComponent, VerifyModalComponent
    ],
    entryComponents: [ AuthModalComponent, VerifyModalComponent ]
})
export class UserComponentsModule {

}
