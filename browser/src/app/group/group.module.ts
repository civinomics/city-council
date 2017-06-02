import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { RouterModule } from '@angular/router';
import { GroupPage } from './group.page';
import { GroupMeetingsPage } from './group-meetings/group-meetings.page';
import { GroupMeetingsView } from './group-meetings/group-meetings.view';
import { GroupService } from './group.service';
import { CommentModule } from '../comment/comment.module';
import { GroupAdminViewComponent } from './group-admin/group-admin-view';
import { GroupAdminPageComponent } from './group-admin/group-admin-page';
import { CreateMeetingPageComponent } from './group-admin/create-meeting/create-meeting-page.component';
import { CreateMeetingViewComponent } from './group-admin/create-meeting/create-meeting-view.component';
import { CreateItemComponent } from './group-admin/create-meeting/create-item.component';
import { DistrictEditComponent } from './group-admin/district-edit/district-edit.component';
import { GroupEditPageComponent } from './group-edit/group-edit-page.component';
import { GroupEditViewComponent } from './group-edit/group-edit-view.component';

export const GROUP_ROUTES = [

  {
    path: 'admin',
    children: [
      {
        path: 'new-meeting',
        component: CreateMeetingPageComponent
      },
      {
        path: '',
        pathMatch: 'full',
        component: GroupAdminPageComponent
      },
    ]
  },
  {
    path: '',
    pathMatch: 'full',
    component: GroupMeetingsPage
  }

];

@NgModule({
    imports: [
        RouterModule.forChild(GROUP_ROUTES),
        SharedModule,
        CommentModule
    ],
    declarations: [
        GroupPage,
        GroupMeetingsPage,
      GroupMeetingsView,
      GroupAdminViewComponent,
      GroupAdminPageComponent,
      GroupEditPageComponent,
      GroupEditViewComponent,
      CreateMeetingViewComponent,
      CreateMeetingPageComponent,
      CreateItemComponent,
      DistrictEditComponent
    ],
    providers: [
        GroupService
    ],

  exports: [
    GroupEditViewComponent
  ]
})
export class GroupModule {
}
