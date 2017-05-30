import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MdAutocompleteModule,
  MdButtonModule,
  MdCheckboxModule,
  MdDatepickerModule,
  MdDialogModule,
  MdIconModule,
  MdInputModule,
  MdMenuModule,
  MdNativeDateModule,
  MdProgressSpinnerModule,
  MdSelectModule,
  MdSlideToggleModule,
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
import { LoadingComponent } from './components/loading/loading.component';
import { AutosizeDirective } from './directives/autosize.directive';

const VIEW_PROVIDERS = [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MdSelectModule,
    MdButtonModule,
  MdDatepickerModule,
  MdNativeDateModule,
    MdIconModule,
    MdToolbarModule,
    MdAutocompleteModule,
    MdCheckboxModule,
    MdInputModule,
    MdTooltipModule,
    MdMenuModule,
    MdDialogModule,
  MdSlideToggleModule,
    MdTabsModule,
  MdProgressSpinnerModule,
    FlexLayoutModule,
    MomentModule,
    NgxChartsModule,
    InfiniteScrollModule,
    NgxErrorsModule
];

@NgModule({
  declarations: [ LimitPipe, LoadingComponent, AutosizeDirective ],
    imports: VIEW_PROVIDERS,
  exports: [ ...VIEW_PROVIDERS, LimitPipe, LoadingComponent, AutosizeDirective ],
})
export class SharedModule {
}
