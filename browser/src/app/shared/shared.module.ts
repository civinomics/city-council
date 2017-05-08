import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MdAutocompleteModule,
  MdButtonModule,
  MdCheckboxModule,
  MdDialogModule,
  MdIconModule,
  MdInputModule,
  MdMenuModule,
  MdProgressSpinnerModule,
  MdSelectModule,
  MdTabsModule,
  MdToolbarModule,
  MdTooltipModule
} from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MomentModule } from 'angular2-moment';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxErrorsModule } from '@ultimate/ngxerrors';
import { LimitPipe } from './pipes/limit.pipe';

const VIEW_PROVIDERS = [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MdSelectModule,
    MdButtonModule,
    MdIconModule,
    MdToolbarModule,
    MdAutocompleteModule,
    MdCheckboxModule,
    MdInputModule,
    MdTooltipModule,
    MdMenuModule,
    MdDialogModule,
    MdTabsModule,
  MdProgressSpinnerModule,
    FlexLayoutModule,
    MomentModule,
    NgxChartsModule,
    InfiniteScrollModule,
    NgxErrorsModule
];

@NgModule({
    declarations: [ LimitPipe ],
    imports: VIEW_PROVIDERS,
    exports: [ ...VIEW_PROVIDERS, LimitPipe ],
})
export class SharedModule {
}
