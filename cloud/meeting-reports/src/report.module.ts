import {NgModule} from '@angular/core';
import {ServerModule} from '@angular/platform-server';
import {MeetingReportComponent} from './report-component/report.component';
import {BrowserModule} from '@angular/platform-browser';
import {ParticipationPieComponent} from './participation-pie/participation-pie.component';

@NgModule({
  imports: [
    ServerModule,
    BrowserModule.withServerTransition({appId: 'report'})


  ],
  declarations: [
    MeetingReportComponent,
    ParticipationPieComponent
  ],
  bootstrap: [
    MeetingReportComponent
  ]
})
export class MeetingReportModule {
}
