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

@NgModule({

  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    ReactiveFormsModule,
    HttpModule,

    AppRoutingModule,


    AngularFireModule.initializeApp(environment.firebase),
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
  bootstrap: [AppContainerComponent],
})
export class AppModule {

  constructor() {

  }
}
