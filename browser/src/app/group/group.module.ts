import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { RouterModule } from '@angular/router';
import { GroupPage } from './group.page';
import { GroupMeetingsPage } from './group-meetings/group-meetings.page';
import { GroupMeetingsView } from './group-meetings/group-meetings.view';
import { GroupService } from './group.service';

export const GROUP_ROUTES = [
    {
        path: '',
        component: GroupPage,
        children: [
            {
                path: '',
                pathMatch: 'full',
                component: GroupMeetingsPage
            }
        ]
    }
];

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild(GROUP_ROUTES)
    ],
    declarations: [
        GroupPage,
        GroupMeetingsPage,
        GroupMeetingsView
    ],
    providers: [
        GroupService
    ]
})
export class GroupModule {
}
