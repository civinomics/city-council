import {GroupViewComponent} from './group/group-view.component';
import {ItemViewComponent} from './item/item-view.component';
import {AboutComponent} from './corp/about/about.component';
import {CareersComponent} from './corp/careers/careers.component';
import {TermsComponent} from './corp/terms/terms.component';
import {SignInViewComponent} from './sign-in/signin-view.component';
import {BrowseContainerComponent} from './browse/browse-container.component';
import {ItemContainerComponent} from './item/item-container.component';
import {MeetingContainerComponent} from './meeting/meeting-container.component';
import {GroupContainerComponent} from './group/group-container.component';
import {SignInContainerComponent} from './sign-in/signin-container.component';
import {SplashComponent} from './splash/splash.component';
import {AppContainerComponent} from './app/app-container.component';
import {AuthWidgetComponent} from './auth/auth-widget/auth-widget.component';
import {CommentComponent} from './comment/comment.component';
import {VerifyModalComponent} from './auth/verify-modal/verify-modal.component';
import {AuthModalComponent} from './auth/auth-modal/auth-modal.component';
import {MeetingAdminComponent} from './meeting/meeting-admin/meeting-admin.component';
import {MeetingStatsComponent} from './meeting/meeting-stats/meeting-stats.component';
import {MeetingAgendaContainerComponent} from './meeting/meeting-agenda/meeting-agenda-container.component';
import {MeetingAgendaViewComponent} from './meeting/meeting-agenda/meeting-agenda.component';
import {MeetingStatsContainerComponent} from './meeting/meeting-stats/meeting-stats-container.component';
import {
  MdAutocompleteModule,
  MdButtonModule,
  MdCheckboxModule,
  MdDialogModule,
  MdIconModule,
  MdInputModule,
  MdMenuModule,
  MdSelectModule,
  MdTabsModule,
  MdToolbarModule,
  MdTooltipModule
} from '@angular/material';
import {FlexLayoutModule} from '@angular/flex-layout';
import {MomentModule} from 'angular2-moment';
import {NgxChartsModule} from '@swimlane/ngx-charts';

export const VIEW_COMPONENTS = [
  GroupViewComponent, ItemViewComponent, AboutComponent, CareersComponent, TermsComponent,
  SignInViewComponent, AuthWidgetComponent, CommentComponent, VerifyModalComponent, AuthModalComponent,
  MeetingAdminComponent, MeetingStatsComponent, MeetingAgendaViewComponent
];

export const CONTAINER_COMPONENTS = [
  AppContainerComponent, BrowseContainerComponent, ItemContainerComponent, MeetingContainerComponent, GroupContainerComponent, SignInContainerComponent, SplashComponent,
  MeetingAgendaContainerComponent, MeetingStatsContainerComponent
];

export const VIEW_PROVIDERS = [
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

  FlexLayoutModule,
  MomentModule,
  NgxChartsModule
];


export {GroupViewComponent} from './group/group-view.component';
export {ItemViewComponent} from './item/item-view.component';
export {AboutComponent} from './corp/about/about.component';
export {CareersComponent} from './corp/careers/careers.component';
export {TermsComponent} from './corp/terms/terms.component';
export {SignInViewComponent} from './sign-in/signin-view.component';
export {BrowseContainerComponent} from './browse/browse-container.component';
export {ItemContainerComponent} from './item/item-container.component';
export {MeetingContainerComponent} from './meeting/meeting-container.component';
export {GroupContainerComponent} from './group/group-container.component';
export {SignInContainerComponent} from './sign-in/signin-container.component';
export {SplashComponent} from './splash/splash.component';
export {AppContainerComponent} from './app/app-container.component';
export {AuthWidgetComponent} from './auth/auth-widget/auth-widget.component';
export {CommentComponent} from './comment/comment.component';
export {VerifyModalComponent} from './auth/verify-modal/verify-modal.component';
export {AuthModalComponent} from './auth/auth-modal/auth-modal.component';
export {MeetingAdminComponent} from './meeting/meeting-admin/meeting-admin.component';
export {MeetingStatsComponent} from './meeting/meeting-stats/meeting-stats.component';
export {MeetingAgendaContainerComponent} from './meeting/meeting-agenda/meeting-agenda-container.component';
export {MeetingAgendaViewComponent} from './meeting/meeting-agenda/meeting-agenda.component';
export {MeetingStatsContainerComponent} from './meeting/meeting-stats/meeting-stats-container.component';
