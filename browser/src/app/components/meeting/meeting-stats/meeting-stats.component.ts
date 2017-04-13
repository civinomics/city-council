import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Meeting, MeetingStatsAdt} from '../../../models/meeting';
import {MeetingService} from '../../../services/meeting.service';
import {Office} from '../../../models/office';
import {Item} from '../../../models/item';

import {schemeCategory10} from 'd3-scale';

@Component({
  selector: 'civ-meeting-stats-view',
  templateUrl: './meeting-stats.component.html',
  styleUrls: ['./meeting-stats.component.scss']
})
export class MeetingStatsComponent implements OnChanges {


  @Input() meeting: Meeting;

  @Input() districts: Office[];

  @Input() stats: MeetingStatsAdt;

  itemMap: { [id: string]: Item };

  @Input() set items(items: Item[]) {
    if (!!items) {
      this.itemMap = items.reduce((result, next) => ({...result, [next.id]: next}), {});
    }
  }

  data: {
    numItems: number;
    totComments: number;
    totVotes: number;
    totParticipants: number;
    participationByDistrict: { name: string, value: number }[]
    activityByItem: { name: string, series: { name: string, value: number }[] }[]
  };

  labelFunction = (name: string) => {
    return name.split(' ')[1];
  };

  pieColorScheme = {
    domain: schemeCategory10
  };

  barColors = [
    {
      name: 'pro',
      value: '#43A047'
    },
    {
      name: 'con',
      value: '#F44336'
    }
  ];

  get activityByItemHeight() {
    return (this.data.activityByItem.length) * (20 + 5);
  }

  constructor(private meetingSvc: MeetingService) {
  }

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!!this.stats && !!this.itemMap) {
      this.updateData();
    }
  }


  updateData() {
    let numItems = this.meeting.agendaIds.length;
    let participationByDistrict = this.districts.map(district => ({
      name: district.name,
      value: this.stats.total.byDistrict[district.id].participants
    }));

    let totParticipants = this.stats.total.participants;
    let totComments = this.stats.total.comments;
    let totVotes = this.stats.total.votes;

    let activityByItem = Object.keys(this.itemMap)
      .sort((x, y) => {
        return this.itemMap[y].onAgendas[this.meeting.id].itemNumber - this.itemMap[x].onAgendas[this.meeting.id].itemNumber;
      }).map(itemId => {
        let item = this.itemMap[itemId];
        let itemStats = this.stats.byItem[itemId];
        return {
          name: `${item.onAgendas[this.meeting.id].itemNumber}. ${item.text}`,
          series: [
            {
              name: 'pro',
              value: itemStats.total.votes.yes + itemStats.total.comments.pro
            },
            {
              name: 'con',
              value: itemStats.total.votes.no + itemStats.total.comments.con
            },
          ]
        }
      });

    this.data = {
      numItems,
      totComments,
      totVotes,
      totParticipants,
      participationByDistrict,
      activityByItem
    }
  }


}
