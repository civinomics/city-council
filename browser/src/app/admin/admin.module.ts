import { NgModule } from '@angular/core';
import { GroupsEditPageComponent } from './groups-edit/groups-edit-page.component';
import { IsSuperuserGuard } from './is-superuser.guard';
import { SharedModule } from '../shared/shared.module';
import { GroupSetupViewComponent } from './group-setup/group-setup-view.component';
import { GroupSetupPageComponent } from './group-setup/group-setup-page.component';
import { GroupsEditViewComponent } from './groups-edit/groups-edit-view.component';
import { AppAdminPageComponent } from './app-admin-page.component';
import { RouterModule } from '@angular/router';
import { GroupModule } from '../group/group.module';

export const ADMIN_ROUTES = [
  {
    path: 'setup-group',
    component: GroupSetupPageComponent
  },
  {
    path: 'groups',
    component: GroupsEditPageComponent
  },
  {
    path: '',
    redirectTo: 'groups',
    pathMatch: 'full'
  }
];


@NgModule({
  imports: [
    SharedModule,
    GroupModule,
    RouterModule.forChild(ADMIN_ROUTES)
  ],
  providers: [ IsSuperuserGuard ],
  declarations: [ GroupsEditViewComponent, GroupsEditPageComponent, GroupSetupViewComponent, GroupSetupPageComponent, AppAdminPageComponent ],
})
export class AdminModule {}
