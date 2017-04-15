import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Meeting, MeetingStats} from '../../../models/meeting';
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

  @Input() stats: MeetingStats;

  itemMap: { [id: string]: Item };

  private _items: Item[];

  @Input() set items(items: Item[]) {
    if (!!items) {
      this.itemMap = items.reduce((result, next) => ({...result, [next.id]: next}), {});
      this._items = items.sort((x, y) => this.itemNumber(x) - this.itemNumber(y));
    }
  }

  get items() {
    return this._items;
  }

  data: {
    numItems: number;
    totComments: number;
    totVotes: number;
    totParticipants: number;
    participationByDistrict: { name: string, value: number }[]
    activityByItem: { name: string, series: { name: string, value: number }[] }[]
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

  activeDistrict = null;

  setActiveDistrict(it: Office | null) {
    this.activeDistrict = it;
  }


  numItemsShown = 5;

  scrolled(x) {
    this.numItemsShown = Math.min(this.numItemsShown + 5, this.items.length)
  }


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


  itemVotes(item: Item) {
    let src = this.activeDistrict == null ?
        this.stats.byItem[item.id].total.votes :
        this.stats.byItem[item.id].byDistrict[this.activeDistrict.id].votes;

    return src.yes + src.no;
  }

  itemComments(item: Item) {
    let src = this.activeDistrict == null ?
        this.stats.byItem[item.id].total.comments :
        this.stats.byItem[item.id].byDistrict[this.activeDistrict.id].comments;

    return src.pro + src.con + src.neutral;
  }

  topPro(item: Item) {

    let src = this.activeDistrict == null ?
        this.stats.byItem[item.id].topComments :
        this.stats.byItem[item.id].topComments.byDistrict[this.activeDistrict.id];

    return src.pro;

  }


  topCon(item: Item) {
    let src = this.activeDistrict == null ?
        this.stats.byItem[item.id].topComments :
        this.stats.byItem[item.id].topComments.byDistrict[this.activeDistrict.id];

    return src.con;
  }

  districtTableData(item: Item) {
    return this.districts.map(district => ({
      district,
      votes: this.stats.byItem[item.id].byDistrict[district.id].votes,
      comments: this.stats.byItem[item.id].byDistrict[district.id].comments
    }))
  }


  itemNumber(item: Item) {
    return item.onAgendas[this.meeting.id].itemNumber;
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
