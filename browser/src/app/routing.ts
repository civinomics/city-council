import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowseContainerComponent } from './core/browse/browse-container.component';
import { TermsComponent } from './corp/terms/terms.component';
import { CareersComponent } from './corp/careers/careers.component';
import { AboutComponent } from './corp/about/about.component';
import { SplashComponent } from './corp/splash/splash.component';
import { ItemPageComponent } from './item/item.page';
import { SignInContainerComponent } from './user/sign-in/signin.page';
import { MeetingModule } from './meeting/meeting.module';
import { GroupModule } from './group/group.module';
import { GroupPage } from './group/group.page';
import { MeetingPage } from './meeting/meeting.page';
import { IsSuperuserGuard } from './admin/is-superuser.guard';
import { AppAdminPageComponent } from './admin/app-admin-page.component';
import { GroupEditPageComponent } from './group/group-edit/group-edit-page.component';

//these need to be named and exported for the AoT compiler
export function getMeetingModule() { return MeetingModule }
export function getGroupModule() { return GroupModule }

export const APP_ROUTES: Routes = [
  {
    path: 'sign-up',
    component: SignInContainerComponent
  },
  {
    path: 'log-in',
    component: SignInContainerComponent
  },
  {
    path: 'create-group',
    component: GroupEditPageComponent
  },
  {
    path: 'app-admin',
    component: AppAdminPageComponent,
    loadChildren: './admin/admin.module#AdminModule',
    canActivate: [ IsSuperuserGuard ]
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

