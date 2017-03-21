import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { MaterialModule } from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';

import { AppContainerComponent } from './containers/app/app-container.component';
import { AppRoutingModule } from './routing';
import { StoreModule } from '@ngrx/store';
import { rootReducer } from './reducers/index';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { PlaceContainerComponent } from './containers/place-container/place-container.component';
import { BrowseContainerComponent } from './containers/browse-container/browse-container.component';
import { ViewComponentsModule } from './components/components.module';
import { MeetingContainerComponent } from './containers/meeting-container/meeting-container.component';

import 'hammerjs';

@NgModule({

  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,

    MaterialModule,
    FlexLayoutModule,

    AppRoutingModule,
    StoreModule.provideStore(rootReducer),
    StoreDevtoolsModule.instrumentOnlyWithExtension(),

    ViewComponentsModule,



  ],
  declarations: [
    AppContainerComponent,
    PlaceContainerComponent,
    BrowseContainerComponent,
    MeetingContainerComponent,
  ],
  providers: [],
  bootstrap: [ AppContainerComponent ]
})
export class AppModule {


}
