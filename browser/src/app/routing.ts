import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {BrowseContainerComponent} from './components/browse/browse-container.component';
import {MeetingContainerComponent} from './components/meeting/meeting-container.component';
import {GroupContainerComponent} from './components/group/group-container.component';
import {TermsComponent} from './components/corp/terms/terms.component';
import {CareersComponent} from './components/corp/careers/careers.component';
import {AboutComponent} from './components/corp/about/about.component';
import {SplashComponent} from './components/splash/splash.component';
import {ItemContainerComponent} from './components/item/item-container.component';
import {SignInContainerComponent} from './components/sign-in/signin-container.component';
import {MeetingAgendaContainerComponent} from './components/meeting/meeting-agenda/meeting-agenda-container.component';
import {MeetingStatsContainerComponent} from './components/meeting/meeting-stats/meeting-stats-container.component';


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
        component: MeetingContainerComponent,
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: MeetingAgendaContainerComponent
          },
          {
            path: 'stats',
            component: MeetingStatsContainerComponent
          }
        ]
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

