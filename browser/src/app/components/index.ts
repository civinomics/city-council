import { GroupViewComponent } from './group/group-view.component';
import { ItemViewComponent } from './item/item-view.component';
import { AboutComponent } from './corp/about/about.component';
import { CareersComponent } from './corp/careers/careers.component';
import { TermsComponent } from './corp/terms/terms.component';
import { SignInViewComponent } from './sign-in/signin-view.component';
import { BrowseContainerComponent } from './browse/browse-container.component';
import { ItemContainerComponent } from './item/item-container.component';
import { MeetingPage } from '../meeting/meeting.page';
import { GroupPage } from '../group/group.page';
import { SignInContainerComponent } from './sign-in/signin-container.component';
import { SplashComponent } from './splash/splash.component';
import { AppContainerComponent } from './app/app-container.component';
import { AuthWidgetComponent } from './auth/auth-widget/auth-widget.component';
import { CommentComponent } from '../shared/comment/comment.component';
import { VerifyModalComponent } from './auth/verify-modal/verify-modal.component';
import { AuthModalComponent } from './auth/auth-modal/auth-modal.component';

export const VIEW_COMPONENTS = [
  ItemViewComponent, AboutComponent, CareersComponent, TermsComponent,
  SignInViewComponent, AuthWidgetComponent, VerifyModalComponent, AuthModalComponent
];

export const CONTAINER_COMPONENTS = [
  AppContainerComponent, BrowseContainerComponent, ItemContainerComponent, SignInContainerComponent, SplashComponent
];

export const VIEW_PROVIDERS = [

];


export {ItemViewComponent} from './item/item-view.component';
export {AboutComponent} from './corp/about/about.component';
export {CareersComponent} from './corp/careers/careers.component';
export {TermsComponent} from './corp/terms/terms.component';
export {SignInViewComponent} from './sign-in/signin-view.component';
export {BrowseContainerComponent} from './browse/browse-container.component';
export {ItemContainerComponent} from './item/item-container.component';
export { MeetingPage } from '../meeting/meeting.page';
export { GroupPage } from '../group/group.page';
export {SignInContainerComponent} from './sign-in/signin-container.component';
export {SplashComponent} from './splash/splash.component';
export {AppContainerComponent} from './app/app-container.component';
export {AuthWidgetComponent} from './auth/auth-widget/auth-widget.component';
export { CommentComponent } from '../shared/comment/comment.component';
export {VerifyModalComponent} from './auth/verify-modal/verify-modal.component';
export {AuthModalComponent} from './auth/auth-modal/auth-modal.component';
