import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { MaterialModule, MdIconRegistry } from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';

import { AppContainerComponent } from './containers/app/app-container.component';
import { AppRoutingModule } from './routing.module';

@NgModule({
  declarations: [
    AppContainerComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,

    MaterialModule,
    FlexLayoutModule,

    AppRoutingModule


  ],
  providers: [],
  bootstrap: [ AppContainerComponent ]
})
export class AppModule {

  constructor(iconRegistry: MdIconRegistry) {
    iconRegistry.registerFontClassAlias('fontawesome', 'fa');
  }

}
