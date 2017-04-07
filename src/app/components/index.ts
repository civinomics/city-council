import {GroupViewComponent} from './group/group-view.component';
import {MeetingViewComponent} from './meeting/meeting-view.component';
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

export const VIEW_COMPONENTS = [
  GroupViewComponent, MeetingViewComponent, ItemViewComponent, AboutComponent, CareersComponent, TermsComponent, SignInViewComponent, AuthWidgetComponent, CommentComponent, VerifyModalComponent, AuthModalComponent
];

export const CONTAINER_COMPONENTS = [
  AppContainerComponent, BrowseContainerComponent, ItemContainerComponent, MeetingContainerComponent, GroupContainerComponent, SignInContainerComponent, SplashComponent
];

