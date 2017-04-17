import { NgModule } from '@angular/core';
import { MeetingAgendaContainerComponent } from './meeting-agenda/meeting-agenda-container.component';
import { MeetingAdminPage } from './meeting-admin/meeting-admin.page';
import { MeetingAdminComponent } from './meeting-admin/meeting-admin.component';
import { MeetingAgendaViewComponent } from './meeting-agenda/meeting-agenda.component';
import { DistrictInputTableComponent } from './district-input-table/district-input-table.component';
import { SharedModule } from '../shared/shared.module';
import { MeetingPage } from './meeting.page';
import { RouterModule } from '@angular/router';
import { MeetingService } from './meeting.service';
import { MeetingStatsContainerComponent } from './meeting-stats/meeting-stats-container.component';
import { MeetingStatsComponent } from './meeting-stats/meeting-stats.component';
import { CommentModule } from '../comment/comment.module';

export const MEETING_ROUTES = [
    {
        path: '',
        pathMatch: 'full',
        component: MeetingAgendaContainerComponent
    },
    {
        path: 'stats',
        component: MeetingStatsContainerComponent
    },
    {
        path: 'admin',
        component: MeetingAdminPage
    }
];

@NgModule({
    imports: [
        RouterModule.forChild(MEETING_ROUTES),
        SharedModule,
        CommentModule
    ],
    declarations: [
        MeetingAgendaContainerComponent,
        MeetingStatsContainerComponent,
        MeetingAdminPage,
        MeetingAdminComponent,
        MeetingStatsComponent,
        MeetingAgendaViewComponent,
        DistrictInputTableComponent,
        MeetingPage
    ],
    providers: [
        MeetingService
    ]
})
export class MeetingModule {
}
