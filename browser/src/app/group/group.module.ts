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

export const GROUP_ROUTES = [
  {
    path: 'admin',
    component: GroupAdminPageComponent
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
      GroupAdminPageComponent
    ],
    providers: [
        GroupService
    ]
})
export class GroupModule {
}
