import {NgModule} from '@angular/core';
import {
  NavigationCancel,
  NavigationError,
  RouterModule,
  RouterStateSnapshot,
  Routes,
  RoutesRecognized
} from '@angular/router';
import {BrowseContainerComponent} from './components/browse/browse-container.component';
import {MeetingContainerComponent} from './components/meeting/meeting-container.component';
import {GroupContainerComponent} from './components/group/group-container.component';
import {TermsComponent} from './components/corp/terms/terms.component';
import {CareersComponent} from './components/corp/careers/careers.component';
import {AboutComponent} from './components/corp/about/about.component';
import {SplashComponent} from './components/splash/splash.component';
import {ItemContainerComponent} from './components/item/item-container.component';
import {SignInContainerComponent} from './components/sign-in/signin-container.component';


export const APP_ROUTES: Routes = [
  {
    path: 'sign-in',
    component: SignInContainerComponent
  },

  {
    path: 'group',
    component: BrowseContainerComponent,
    children: [
      {
        path: ':groupId/meeting/:meetingId/item/:itemId',
        component: ItemContainerComponent
      },
      {
        path: ':groupId/meeting/:meetingId',
        component: MeetingContainerComponent
      },
      {
        path: ':groupId',
        component: GroupContainerComponent
      }
    ]
  },
  {
    path: '',
    component: SplashComponent
  },
  {
    path: 'about',
    component: AboutComponent
  },
  {
    path: 'careers',
    component: CareersComponent
  },
  {
    path: 'terms',
    component: TermsComponent
  }
];


@NgModule({
  imports: [
    RouterModule.forRoot(APP_ROUTES)
  ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {

}

/** https://github.com/vsavkin/router-store/blob/master/src/index.ts */

/**
 * An action dispatched when the router navigates.
 */
export const ROUTER_NAVIGATION = 'ROUTER_NAVIGATION';

/**
 * Payload of ROUTER_NAVIGATION.
 */
export type RouterNavigationPayload = {
  routerState: RouterStateSnapshot,
  event: RoutesRecognized
}

/**
 * An action dispatched when the router cancels navigation.
 */
export const ROUTER_CANCEL = 'ROUTER_CANCEL';

/**
 * Payload of ROUTER_CANCEL.
 */
export type RouterCancelPayload<T> = {
  routerState: RouterStateSnapshot,
  storeState: T,
  event: NavigationCancel
};

/**
 * An action dispatched when the router errors.
 */
export const ROUTER_ERROR = 'ROUTE_ERROR';

/**
 * Payload of ROUTER_ERROR.
 */
export type RouterErrorPayload<T> = {
  routerState: RouterStateSnapshot,
  storeState: T,
  event: NavigationError
};

/**
 * Connects RouterModule with StoreModule.
 *
 * During the navigation, before any guards or resolvers run, the router will dispatch
 * a ROUTER_NAVIGATION action, which has the following signature:
 *
 * ```
 * export type RouterNavigationPayload = {
 *   routerState: RouterStateSnapshot,
 *   event: RoutesRecognized
 * }
 * ```
 *
 * Either a rootReducer or an effect can be invoked in response to this action.
 * If the invoked rootReducer throws, the navigation will be canceled.
 *
 * If navigation gets canceled because of a guard, a ROUTER_CANCEL action will be
 * dispatched. If navigation results in an error, a ROUTER_ERROR action will be dispatched.
 *
 * Both ROUTER_CANCEL and ROUTER_ERROR contain the store state before the navigation
 * which can be used to restore the consistency of the store.
 *
 * Usage:
 *
 * ```typescript
 * @NgModule({
 *   declarations: [AppCmp, SimpleCmp],
 *   imports: [
 *     BrowserModule,
 *     StoreModule.provideStore(mapOfReducerse),
 *     RouterModule.forRoot([
 *       { path: '', component: SimpleCmp },
 *       { path: 'next', component: SimpleCmp }
 *     ]),
 *     StoreRouterConnectingModule
 *   ],
 *   bootstrap: [AppCmp]
 * })
 * export class AppModule {
 * }
 * ```
 */
