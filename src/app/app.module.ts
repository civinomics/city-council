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

@NgModule({

  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,

    BrowserAnimationsModule,

    AppRoutingModule,
    StoreModule.provideStore(rootReducer),
    //  StoreDevtoolsModule.instrumentOnlyWithExtension(),

    ViewComponentsModule,



  ],
  declarations: [
    AppContainerComponent,
    PlaceContainerComponent,
    BrowseContainerComponent,
    MeetingContainerComponent,
    SplashComponent,
    ItemContainerComponent
  ],
  providers: [],
  bootstrap: [ AppContainerComponent ]
})
export class AppModule {


}
