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
import {
    CommentWithAuthor,
    Item,
    Meeting,
    MeetingStats,
    Office,
    RawCommentWithAuthor,
    RawUser,
    User
} from '../../../models';
import { MeetingService } from '../../../services/meeting.service';

import { schemeCategory10 } from 'd3-scale';
import { Comment } from '../../../models/comment';
let x: User | RawUser | CommentWithAuthor | RawCommentWithAuthor;

@Component({
  selector: 'civ-meeting-stats-view',
    changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meeting-stats.component.html',
  styleUrls: ['./meeting-stats.component.scss']
})
export class MeetingStatsComponent implements OnChanges {


  @Input() meeting: Meeting;

  _districts: Office[];
  _districtMap: {[id:string]: Office};

  @Input() set districts(val: Office[]){
      if (!!val){
          this._districts = val;
          this._districtMap = val.reduce((result, next) => ({...result, [next.id]: next}), {});
      }
  }

  get districts() { return this._districts};

  @Input() stats: MeetingStats;

    /*  we run changes in activeDistrict through an output/input cycle so that we can use CDS.OnPush  */
    @Input() activeDistrict: { id: string | null, name: string } = {id: null, name: 'All Districts'};
    @Output() activeDistrictChanged = new EventEmitter;

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
      return this._items.length * (20 + 5);
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

  }


  topCon(item: Item) {
      let src = this.activeDistrict.id == null ?
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

      let totalSrc = this.activeDistrict.id == null ? this.stats.total : this.stats.total.byDistrict[this.activeDistrict.id];

    let numItems = this.meeting.agendaIds.length;

      let participationByDistrict = this.activeDistrict.id == null ? this.districts.map(district => ({
      name: district.name,
      value: this.stats.total.byDistrict[district.id].participants
      })) : null;

      let totParticipants = totalSrc.participants;
      let totComments = totalSrc.comments;

      let totVotes = totalSrc.votes;

      let activityByItem = this.items.map(item => {
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
          let src = this.activeDistrict.id == null ?
              this.stats.byItem[ item.id ].topComments :
              this.stats.byItem[ item.id ].topComments.byDistrict[ this.activeDistrict.id ];

          return {
              ...result,
              [item.id]: { pro: src.pro, con: src.con }
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
