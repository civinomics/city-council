import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppContainerComponent } from './components/app/app-container.component';
import { AppRoutingModule } from './routing';
import { StoreModule } from '@ngrx/store';
import { rootReducer } from './reducers/index';
import { CONTAINER_COMPONENTS, VIEW_COMPONENTS } from './components/index';

import 'hammerjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularFireModule } from 'angularfire2';
import { environment } from '../environments/environment';
import { APP_PROVIDERS } from './services/index';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';
import { AuthService } from './services/auth.service';
import { AuthModalComponent } from './components/auth/auth-modal/auth-modal.component';
import { VerifyModalComponent } from './components/auth/verify-modal/verify-modal.component';
import { MeetingService } from './meeting/meeting.service';
import { GroupService } from './group/group.service';
import { ItemService } from './item/item.service';
import { VoteService } from './services/vote.service';
import { CommentService } from './comment/comment.service';
import { SharedModule } from './shared/shared.module';
import { MeetingModule } from './meeting/meeting.module';
import { GroupModule } from './group/group.module';
import { ItemModule } from './item/item.module';
import { CommentModule } from './comment/comment.module';

@NgModule({

  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    ReactiveFormsModule,
    HttpModule,

    AppRoutingModule,

    BrowserAnimationsModule,
    SharedModule,

    MeetingModule,
    GroupModule,
    ItemModule,
    CommentModule,

    AngularFireModule.initializeApp(environment.firebase),
    StoreModule.provideStore(rootReducer),
    StoreDevtoolsModule.instrumentOnlyWithExtension(),

    EffectsModule,

    EffectsModule.run(AuthService),
    EffectsModule.run(MeetingService),
    EffectsModule.run(GroupService),
    EffectsModule.run(ItemService),
    EffectsModule.run(VoteService),
    EffectsModule.run(CommentService)

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
