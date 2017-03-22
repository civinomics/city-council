import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppContainerComponent } from './containers/app/app-container.component';
import { AppRoutingModule } from './routing';
import { StoreModule } from '@ngrx/store';
import { rootReducer } from './reducers/index';
import { PlaceContainerComponent } from './containers/place-container/place-container.component';
import { BrowseContainerComponent } from './containers/browse-container/browse-container.component';
import { ViewComponentsModule } from './components/components.module';
import { MeetingContainerComponent } from './containers/meeting-container/meeting-container.component';

import 'hammerjs';
import { SplashComponent } from './containers/splash/splash.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ItemContainerComponent } from './containers/item-container/item-container.component';
import { AngularFireModule } from 'angularfire2';
import { environment } from '../environments/environment';
import { SignInContainerComponent } from './containers/signin-container/signin-container.component';
import { APP_PROVIDERS } from './services/index';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';
import { UserService } from './services/user.service';
import { AuthWidgetComponent } from './containers/app/auth-widget/auth-widget.component';

@NgModule({

  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,

    BrowserAnimationsModule,

    AppRoutingModule,

    AngularFireModule.initializeApp(environment.firebase),
    StoreModule.provideStore(rootReducer),
    StoreDevtoolsModule.instrumentOnlyWithExtension(),

    EffectsModule,

    EffectsModule.run(UserService),

    ViewComponentsModule,



  ],
  declarations: [
    AppContainerComponent,
    PlaceContainerComponent,
    BrowseContainerComponent,
    MeetingContainerComponent,
    SplashComponent,
    ItemContainerComponent,
    SignInContainerComponent,
    AuthWidgetComponent
  ],
  providers: [ ...APP_PROVIDERS ],
  bootstrap: [ AppContainerComponent ]
})
export class AppModule {


}
