import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowseContainerComponent } from './components/browse/browse-container.component';
import { TermsComponent } from './components/corp/terms/terms.component';
import { CareersComponent } from './components/corp/careers/careers.component';
import { AboutComponent } from './components/corp/about/about.component';
import { SplashComponent } from './components/splash/splash.component';
import { ItemPageComponent } from './item/item.page';
import { SignInContainerComponent } from './components/sign-in/signin-container.component';
import { MeetingModule } from './meeting/meeting.module';
import { GroupModule } from './group/group.module';

//these need to be named and exported for the AoT compiler
export function getMeetingModule() { return MeetingModule }
export function getGroupModule() { return GroupModule }

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
        component: ItemPageComponent
      },
      {
        path: ':groupId/meeting',
        loadChildren: getMeetingModule
      },
      {
        path: ':groupId',
        loadChildren: getGroupModule
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

