import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MaterialModule, MdIconRegistry} from "@angular/material";
import {FlexLayoutModule} from "@angular/flex-layout";

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    FlexLayoutModule
  ],
  exports: [CommonModule, MaterialModule, FlexLayoutModule]
})
export class SharedModule {

  constructor(iconRegistry: MdIconRegistry) {
    iconRegistry.registerFontClassAlias('fontawesome', 'fa');
  }


}
