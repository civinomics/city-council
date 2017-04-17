import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowseContainerComponent } from './components/browse/browse-container.component';
import { TermsComponent } from './components/corp/terms/terms.component';
import { CareersComponent } from './components/corp/careers/careers.component';
import { AboutComponent } from './components/corp/about/about.component';
import { SplashComponent } from './components/splash/splash.component';
import { ItemPageComponent } from './item/item.page';
import { SignInContainerComponent } from './user/sign-in/signin.page';
import { MeetingModule } from './meeting/meeting.module';
import { GroupModule } from './group/group.module';
import { GroupPage } from './group/group.page';
import { MeetingPage } from './meeting/meeting.page';

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
        path: ':groupId/meeting/:meetingId',
        component: MeetingPage,
        loadChildren: './meeting/meeting.module#MeetingModule'
      },
      {
        path: ':groupId',
        component: GroupPage,
        loadChildren: './group/group.module#GroupModule'
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

