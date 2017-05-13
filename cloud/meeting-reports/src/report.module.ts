import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { MeetingReportComponent } from './report-component/report.component';
import { BrowserModule } from '@angular/platform-browser';
import { ParticipationPieComponent } from './participation-pie/participation-pie.component';
import { ItemBarsComponent } from './item-bars/item-bars.component';
import { DistrictInputTableComponent } from './item-table/district-input-table.component';
import { MomentModule } from 'angular2-moment';
import { NetVotesPipe } from './report-component/net-votes.pipe';
@NgModule({
  imports: [
    ServerModule,
    BrowserModule.withServerTransition({ appId: 'report' }),
    MomentModule
  ],
  declarations: [
    MeetingReportComponent,
    ParticipationPieComponent,
    ItemBarsComponent,
    NetVotesPipe,
    DistrictInputTableComponent
  ],
  bootstrap: [
    MeetingReportComponent
  ]
})
export class MeetingReportModule {
}
