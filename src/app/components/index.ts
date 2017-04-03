import {PlaceViewComponent} from './place/place-view.component';
import {MeetingViewComponent} from './meeting/meeting-view.component';
import {ItemViewComponent} from './item/item-view.component';
import {AboutComponent} from './corp/about/about.component';
import {CareersComponent} from './corp/careers/careers.component';
import {TermsComponent} from './corp/terms/terms.component';
import {SignInViewComponent} from './sign-in/signin-view.component';
import {BrowseContainerComponent} from './browse/browse-container.component';
import {ItemContainerComponent} from './item/item-container.component';
import {MeetingContainerComponent} from './meeting/meeting-container.component';
import {PlaceContainerComponent} from './place/place-container.component';
import {SignInContainerComponent} from './sign-in/signin-container.component';
import {SplashComponent} from './splash/splash.component';
import {AppContainerComponent} from './app/app-container.component';
import {AuthWidgetComponent} from './app/auth-widget/auth-widget.component';

export const VIEW_COMPONENTS = [
  PlaceViewComponent, MeetingViewComponent, ItemViewComponent, AboutComponent, CareersComponent, TermsComponent, SignInViewComponent, AuthWidgetComponent
];

export const CONTAINER_COMPONENTS = [
  AppContainerComponent, BrowseContainerComponent, ItemContainerComponent, MeetingContainerComponent, PlaceContainerComponent, SignInContainerComponent, SplashComponent
];

