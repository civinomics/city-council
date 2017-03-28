import { NgModule } from '@angular/core';
import {
  NavigationCancel,
  NavigationError,
  Router,
  RouterModule,
  RouterStateSnapshot,
  Routes,
  RoutesRecognized
} from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs/observable/of';
import { BrowseContainerComponent } from './containers/browse-container/browse-container.component';
import { MeetingContainerComponent } from './containers/meeting-container/meeting-container.component';
import { PlaceContainerComponent } from './containers/place-container/place-container.component';
import { AppState } from './reducers/index';
import { TermsComponent } from './components/terms/terms.component';
import { CareersComponent } from './components/careers/careers.component';
import { AboutComponent } from './components/about/about.component';
import { SplashComponent } from './containers/splash/splash.component';
import { ItemContainerComponent } from './containers/item-container/item-container.component';
import { SignInContainerComponent } from './containers/signin-container/signin-container.component';


export const APP_ROUTES: Routes = [
  {
    path: 'sign-in',
    component: SignInContainerComponent
  },

  {
    path: 'place',
    component: BrowseContainerComponent,
    children: [
      {
        path: ':placeId/meeting/:meetingId/item/:itemId',
        component: ItemContainerComponent
      },
      {
        path: ':placeId/meeting/:meetingId',
        component: MeetingContainerComponent
      },
      {
        path: ':placeId',
        component: PlaceContainerComponent
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
  private routerState: RouterStateSnapshot = null;
  private storeState: any;
  private lastRoutesRecognized: RoutesRecognized;

  constructor(private store: Store<AppState>, private router: Router) {
    this.setUpBeforePreactivationHook();
    this.setUpStoreStateListener();
    this.setUpStateRollbackEvents();
  }

  private setUpBeforePreactivationHook(): void {
    (<any>this.router).hooks.beforePreactivation = (routerState: RouterStateSnapshot) => {
      this.routerState = routerState;

      const payload = { routerState, event: this.lastRoutesRecognized };
      this.store.dispatch({ type: ROUTER_NAVIGATION, payload });

      return of(true);
    };
  }

  private setUpStoreStateListener(): void {
    this.store.subscribe(s => {
      this.storeState = s;
    });
  }

  private setUpStateRollbackEvents(): void {
    this.router.events.subscribe(e => {
      if (e instanceof RoutesRecognized) {
        this.lastRoutesRecognized = e;
      } else if (e instanceof NavigationCancel) {
        this.dispatchRouterCancel(e);
      } else if (e instanceof NavigationError) {
        this.dispatchRouterError(e);
      }
    });
  }

  private dispatchRouterCancel(event: NavigationCancel): void {
    const payload = { routerState: this.routerState, storeState: this.storeState, event };
    this.store.dispatch({ type: ROUTER_CANCEL, payload });
  }

  private dispatchRouterError(event: NavigationError): void {
    const payload = { routerState: this.routerState, storeState: this.storeState, event };
    this.store.dispatch({ type: ROUTER_ERROR, payload });
  }
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
