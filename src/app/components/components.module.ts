import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule, MdIconRegistry } from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MomentModule } from 'angular2-moment';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { PlaceLoadedAction } from '../reducers/data';
import { AUSTIN_DATA } from '../models/fixtures';
import { AppState } from '../reducers/index';
import { Place } from '../models/place';
import { PlaceViewComponent } from './place-view/place-view.component';
import { MeetingViewComponent } from './meeting-view/meeting-view.component';
import { FormsModule } from '@angular/forms';
import { ItemViewComponent } from './item-view/item-view.component';
import { AboutComponent } from './about/about.component';
import { CareersComponent } from './careers/careers.component';

export const VIEW_COMPONENTS = [
  PlaceViewComponent, MeetingViewComponent, ItemViewComponent
];


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    FlexLayoutModule,
    MomentModule
  ],
  declarations: [ ...VIEW_COMPONENTS, AboutComponent, CareersComponent ],

  exports: [
    ...VIEW_COMPONENTS, MaterialModule, FlexLayoutModule, MomentModule
  ]
})
export class ViewComponentsModule {

  constructor(iconRegistry: MdIconRegistry, private store: Store<AppState>, private router: Router) {
    iconRegistry.registerFontClassAlias('fontawesome', 'fa');
    this.store.dispatch(new PlaceLoadedAction(AUSTIN_DATA as Place));
  }
}
