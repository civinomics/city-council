import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppRootComponent } from './core/app-root/app-root.page';
import { AppRoutingModule } from './routing';
import { StoreModule } from '@ngrx/store';
import { rootReducer } from './state';
import 'hammerjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularFireModule } from 'angularfire2';
import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireAuthModule } from 'angularfire2/auth';
import { environment } from '../environments/environment';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';
import { AuthService } from './user/auth.service';
import { MeetingService } from './meeting/meeting.service';
import { GroupService } from './group/group.service';
import { ItemService } from './item/item.service';
import { VoteService } from './vote/vote.service';
import { CommentService } from './comment/comment.service';
import { SharedModule } from './shared/shared.module';
import { MeetingModule } from './meeting/meeting.module';
import { GroupModule } from './group/group.module';
import { ItemModule } from './item/item.module';
import { CommentModule } from './comment/comment.module';
import { UserServicesModule } from './user/user.services.module';
import { UserComponentsModule } from './user/user.components.module';
import { VoteModule } from './vote/vote.module';
import { CorpModule } from './corp/corp.module';
import { BrowseContainerComponent } from './core/browse/browse-container.component';
import { AppFocusService } from './core/focus.service';
import { FollowService } from './shared/services/follow.service';

@NgModule({

  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    ReactiveFormsModule,
    HttpModule,

    AppRoutingModule,

    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireAuthModule,

    StoreModule.provideStore(rootReducer),
    StoreDevtoolsModule.instrumentOnlyWithExtension(),


    BrowserAnimationsModule,
    SharedModule,

    MeetingModule,
    GroupModule,
    ItemModule,
    CommentModule,
    UserServicesModule,
    UserComponentsModule,
    VoteModule,
    CorpModule,
    EffectsModule,
    EffectsModule.run(AuthService),
    EffectsModule.run(MeetingService),
    EffectsModule.run(GroupService),
    EffectsModule.run(ItemService),
    EffectsModule.run(VoteService),
    EffectsModule.run(CommentService)

  ],

  declarations: [
    BrowseContainerComponent, AppRootComponent
  ],

  providers: [
    AppFocusService,
    FollowService
  ],

  bootstrap: [ AppRootComponent ],
})
export class CivBrowserModule {

  constructor() {

  }
}
