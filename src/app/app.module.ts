import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';

import {AppContainerComponent} from './components/app/app-container.component';
import {AppRoutingModule} from './routing';
import {StoreModule} from '@ngrx/store';
import {rootReducer} from './reducers/index';
import {CONTAINER_COMPONENTS, VIEW_COMPONENTS, VIEW_PROVIDERS} from './components/index';

import 'hammerjs';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AngularFireModule} from 'angularfire2';
import {environment} from '../environments/environment';
import {APP_PROVIDERS} from './services/index';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {EffectsModule} from '@ngrx/effects';
import {AuthService} from './services/auth.service';
import {AuthModalComponent} from './components/auth/auth-modal/auth-modal.component';
import {VerifyModalComponent} from './components/auth/verify-modal/verify-modal.component';

@NgModule({

  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,

    AppRoutingModule,

    BrowserAnimationsModule,
    VIEW_PROVIDERS,

    AngularFireModule.initializeApp(environment.firebase),
    StoreModule.provideStore(rootReducer),
    StoreDevtoolsModule.instrumentOnlyWithExtension(),

    EffectsModule,

    EffectsModule.run(AuthService),


  ],
  declarations: [
    ...CONTAINER_COMPONENTS, ...VIEW_COMPONENTS
  ],
  providers: [ ...APP_PROVIDERS ],
  entryComponents: [AuthModalComponent, VerifyModalComponent],
  bootstrap: [AppContainerComponent],
})
export class AppModule {

  constructor() {

  }
}
