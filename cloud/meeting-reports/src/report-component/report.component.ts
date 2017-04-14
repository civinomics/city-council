import {Component, Inject} from '@angular/core';
import {REPORT_DATA} from '../tokens';
import {Group, Meeting, MeetingReportAdt, MeetingStats, Office, parseGroup, parseMeeting} from '@civ/city-council';

@Component({
  selector: 'civ-report-root',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class MeetingReportComponent {
  stats: MeetingStats;
  group: Group;
  meeting: Meeting;
  districts: { [id: string]: Office };

  pieData: any;

  constructor(@Inject(REPORT_DATA) reportData: MeetingReportAdt) {
    this.stats = reportData.stats;
    this.group = parseGroup(reportData.group as any);
    this.meeting = parseMeeting(reportData.meeting as any);

    this.districts = this.group.districts.reduce((result, next) =>
        ({...result, [next.id]: next}),
      {});


    this.pieData = Object.keys(this.districts).map(id => ({
      name: this.districts[id].name,
      value: this.stats.total.byDistrict[id].participants
    }));

  }


}
