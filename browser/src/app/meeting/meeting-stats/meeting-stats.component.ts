import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { Item, Meeting, MeetingStats, Office, User } from '../../core/models';
import { MeetingService } from '../meeting.service';

import { schemeCategory10 } from 'd3-scale';
import { Comment } from '../../comment/comment.model';
import { hasActivity } from './activity.pipe';
import { userDistrict } from '../../user/user.model';
import { Group } from '../../group/group.model';

let _dontRemoveImport: User;

const NO_DISTRICT = 'NO_DISTRICT';

@Component({
  selector: 'civ-meeting-stats-view',
    changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meeting-stats.component.html',
  styleUrls: ['./meeting-stats.component.scss']
})
export class MeetingStatsComponent implements OnChanges {


  @Input() meeting: Meeting;
  @Input() group: Group;

  @Input() stats: MeetingStats;


  /*  we run changes in activeDistrict through an output/input cycle so that we can use CDS.OnPush  */
  @Input() activeDistrict: { id: string | null, name: string } = { id: null, name: 'All Districts' };
  @Output() activeDistrictChanged = new EventEmitter;

  _districts: Office[];
  _districtMap: {[id:string]: Office};
  _isSingleDistrict: boolean;
  @Input() set districts(val: Office[]){
      if (!!val){
          this._districts = val;
          this._districtMap = val.reduce((result, next) => ({...result, [next.id]: next}), {});

        this._isSingleDistrict = val.length == 0;
      }

  }
  get districts() { return this._districts};


  itemMap: { [id: string]: Item };
  private _items: Item[];
  @Input() set items(items: Item[]) {
    if (!!items) {
      this.itemMap = items.reduce((result, next) => ({...result, [next.id]: next}), {});
      this._items = items.sort((x, y) => this.itemNumber(x) - this.itemNumber(y));
    }
  }
  get items() {return this._items;}


  @Input() reportRequestResult: 'pending' | undefined | { success: boolean, url: string, fromCache: boolean, error?: string };
  @Output() requestReport: EventEmitter<{ meetingId: string, forDistrict?: string }> = new EventEmitter();

  getReport() {
    let obj: any = { meetingId: this.meeting.id };
    if (this.activeDistrict.id !== null) {
      obj.forDistrict = this.activeDistrict.id;
    }

    this.requestReport.emit(obj);
  }





  data: {
    numItems: number;
    totComments: number;
    totVotes: number;
    totParticipants: number;
    participationByDistrict: { name: string, value: number }[]
      activityByItem: { name: string, series: { name: string, value: number }[] }[],
      topComments: { [id: string]: { pro: Comment, con: Comment } }
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

    districtSortOptions: { id: string, name: string }[] = [{name: 'All Districts', id: null}];


    setActiveDistrict(it: string | null) {
        console.log(it);
        this.activeDistrictChanged.emit(it);
  }

    get showingSingleDistrict() {
        return this.activeDistrict.id != null;
    }

  numItemsShown = 5;

  scrolled(x) {
    this.numItemsShown = Math.min(this.numItemsShown + 5, this.items.length)
  }


  get activityByItemHeight() {
    return this.data.activityByItem.length * (20 + 5) + 25;
  }

    constructor(private meetingSvc: MeetingService, private cdr: ChangeDetectorRef) {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
      if ((changes['stats'] || changes['items'] || changes['activeDistrict']) && (!!this.stats && !!this.itemMap)) {
      this.updateData();
          this.cdr.detectChanges();

    }

      if (changes['districts'] && !!this.districts) {

          this.districtSortOptions = [{
              id: null,
              name: 'All Districts'
          }, ...this.districts];

      }


  }


  itemVotes(item: Item) {
      let src = this.activeDistrict.id == null ?
        this.stats.byItem[item.id].total.votes :
        this.stats.byItem[item.id].byDistrict[this.activeDistrict.id].votes;

    return src.yes + src.no;
  }

  itemComments(item: Item) {
      let src = this.activeDistrict.id == null ?
        this.stats.byItem[item.id].total.comments :
        this.stats.byItem[item.id].byDistrict[this.activeDistrict.id].comments;

    return src.pro + src.con + src.neutral;
  }

  topPro(item: Item) {
    let src = this.activeDistrict.id == null ?
      this.stats.byItem[item.id].comments :
      this.stats.byItem[item.id].comments.filter(it => userDistrict(it.author, this.meeting.groupId) == this.activeDistrict.id);

    const cons = src.filter(it => it.role == 'pro');
    return sortByNetVotes(cons)[cons.length - 1];
  }


  topCon(item: Item) {
      let src = this.activeDistrict.id == null ?
        this.stats.byItem[item.id].comments :
        this.stats.byItem[item.id].comments.filter(it => userDistrict(it.author, this.meeting.groupId) == this.activeDistrict.id);

    const cons = src.filter(it => it.role == 'con');
    return sortByNetVotes(cons)[cons.length - 1];
  }

  districtTableData(item: Item) {
    return (this._isSingleDistrict ? [ { name: 'In-District', id: 'ANY' }, {
      name: 'Out-Of-District',
      id: 'NONE'
    } ] : this.districts).map(district => ({
      district,
      votes: this.stats.byItem[item.id].byDistrict[district.id].votes,
      comments: this.stats.byItem[item.id].byDistrict[district.id].comments
    })).concat(this._isSingleDistrict ? [] : [ {
      district: {
        name: NO_DISTRICT
      } as any,
      votes: this.stats.byItem[ item.id ].byDistrict[ NO_DISTRICT ].votes,
      comments: this.stats.byItem[ item.id ].byDistrict[ NO_DISTRICT ].comments
    } ])
  }


  itemNumber(item: Item) {
    return item.onAgendas[this.meeting.id].itemNumber;
  }


  private updateData() {

      let totalSrc = this.activeDistrict.id == null ? this.stats.total : this.stats.total.byDistrict[ this.activeDistrict.id ];

    const districts = this._isSingleDistrict ? [ { name: 'In-District', id: 'ANY' }, {
      name: 'Out-Of-District',
      id: 'NONE'
    } ] : this.districts;

    let participationByDistrict = this.activeDistrict.id == null ? districts.map(district => ({
      name: district.name,
      value: this.stats.total.byDistrict[district.id].participants
    })).concat(this._isSingleDistrict ? [] : [ {
        name: NO_DISTRICT,
        value: this.stats.total.byDistrict[ NO_DISTRICT ].participants
      } ]) : null;

    let numItems = this.meeting.agenda.length;
    let totParticipants = totalSrc.participants;
      let totComments = totalSrc.comments;

      let totVotes = totalSrc.votes;

    let activityByItem = this.items
      .filter(item => hasActivity(this.stats.byItem[ item.id ].total))
      .map(item => {
          let src = this.activeDistrict.id == null ? this.stats.byItem[item.id].total :
              this.stats.byItem[item.id].byDistrict[this.activeDistrict.id];

        return {
            name: `${item.onAgendas[this.meeting.id].itemNumber}. ${item.text}`,
            series: [
                {
                    name: 'pro',
                    value: src.votes.yes + src.comments.pro,
                },
                {
                    name: 'con',
                    value: src.votes.no + src.comments.con,
                }
            ]
        }
      });

      let topComments = this.items.reduce((result, item) => {
          return {
              ...result,
              [item.id]: { pro: this.topPro(item), con: this.topCon(item) }
          }
      }, {});

    this.data = {
      numItems,
      totComments,
      totVotes,
      totParticipants,
      participationByDistrict,
        activityByItem,
        topComments
    }
  }


}

const sortByNetVotes = (arr: Comment[]) => arr.sort(((x, y) => (x.voteStats.up - x.voteStats.down) - (y.voteStats.up - y.voteStats.down)));
