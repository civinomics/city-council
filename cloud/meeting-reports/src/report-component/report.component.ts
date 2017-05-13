import { Component, Inject } from '@angular/core';
import { ALL_COMMENTS, ALL_DISTRICTS, CommentDict, FOR_DISTRICT, REPORT_DATA } from '../tokens';
import {
  Comment,
  Group,
  Meeting,
  MeetingReportAdt,
  MeetingStats,
  Office,
  parseGroup,
  parseMeeting,
  RawEntity,
  Vote,
  User
} from '@civ/city-council';
import * as fromPie from '../participation-pie/participation-pie.component';
import * as fromBar from '../item-bars/item-bars.component';
import * as fromTable from '../item-table/district-input-table.component';
let _dontRemoveImports: RawEntity | User | Comment | Vote;
export const PAGE_HEIGHT = 772;
export const PAGE_WIDTH = 590;

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

  pieData: fromPie.Datatype[];
  itemBarData: fromBar.Datatype[];

  squares: { key: string, value: number }[];

  constructor(@Inject(REPORT_DATA) private reportData: MeetingReportAdt, @Inject(FOR_DISTRICT) private forDistrict: string) {
    this.stats = reportData.stats;
    this.group = parseGroup(reportData.group);
    this.meeting = parseMeeting(reportData.meeting);
    console.log(JSON.stringify(this.group.districts));



    this.districts = this.group.districts.reduce((result, next) =>
        ({...result, [next.id]: next}),
      {});

    this.pieData = this.group.districts.map(district =>({
      name: district.name,
      value: this.stats.total.byDistrict[district.id].participants
    })).concat([
      {
        name: 'NO DISTRICT',
        value: this.stats.total.byDistrict["NO_DISTRICT"].participants
      }
    ]);


    this.itemBarData = Object.keys(this.stats.byItem).map(id => {
      let entry = this.stats.byItem[ id ];


      return {
        text: entry.text,
        itemNumber: entry.itemNumber,
        pro: entry.total.votes.yes + entry.total.comments.pro,
        con: entry.total.votes.no + entry.total.comments.con
      }
    });

    let totalSrc = this.forDistrict == ALL_DISTRICTS ? this.stats.total : this.stats.total.byDistrict[ this.forDistrict ];

    this.squares = [
      { key: 'Items', value: Object.keys(this.stats.byItem).length },
      { key: 'Comments', value: totalSrc.comments },
      { key: 'Votes', value: totalSrc.votes },
      { key: 'Participants', value: totalSrc.participants },

    ]

  }


  tableData(itemId: string): fromTable.Datatype[] {
    let entry = this.stats.byItem[ itemId ];

    return this.group.districts.map(district => ({
      district: district.name,
      votes: entry.byDistrict[ district.id ].votes,
      comments: entry.byDistrict[ district.id ].comments
    })).concat([
      {
        district: "NO_DISTRICT",
        votes: entry.byDistrict["NO_DISTRICT"].votes,
        comments: entry.byDistrict["NO_DISTRICT"].comments
      }
    ])
  }

  userDistrict(user: User) {
    if (!!user.districts[ 'id_acc' ]) {
      return user.districts[ 'id_acc' ].name
    }
    return 'no district';
  }

  get itemsWithActivity() {
    return Object.keys(this.stats.byItem).sort((x, y) => this.stats.byItem[ x ].itemNumber - this.stats.byItem[ y ].itemNumber)
      .map(id => ({ ...this.stats.byItem[ id ], id }))
      .filter(item => item.total.votes.yes + item.total.votes.no + item.total.comments.pro + item.total.comments.con > 0);
  }

  get itemsWithoutActivity() {
    return Object.keys(this.stats.byItem).sort((x, y) => this.stats.byItem[ x ].itemNumber - this.stats.byItem[ y ].itemNumber)
      .map(id => ({ ...this.stats.byItem[ id ], id }))
      .filter(item => item.total.votes.yes + item.total.votes.no + item.total.comments.pro + item.total.comments.con == 0)
      .sort((x, y) => x.itemNumber - y.itemNumber)
  }

  get forDistrictText() {
    return this.forDistrict == ALL_DISTRICTS ? '' : `${this.forDistrict.toUpperCase()}`;
  }


}

const sortComments = (comments: Comment[]) => comments.sort((x, y) => (y.voteStats.up - y.voteStats.down) - (x.voteStats.up - x.voteStats.down));
