import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Meeting, MeetingStats } from '../meeting.model';

import { Item } from '../../models/item';
import { Group } from '../../group/group';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'civ-meeting-agenda-view',
  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './meeting-agenda.component.html',
  styleUrls: ['./meeting-agenda.component.scss']
})
export class MeetingAgendaViewComponent implements OnInit {

  @Input() meeting: Meeting;
  @Input() group: Group;
  @Input() items: Item[];

  //note: this is an observable because we don't want to get it unless we have to (i.e. the stats tab is accessed)
  @Input() stats: Observable<MeetingStats>;

  @Output() showItem = new EventEmitter();

  agendaSortOptions = [ 'Item Number', 'Most Active' ];


  sortBy = this.agendaSortOptions[ 0 ];

  constructor() { }

  ngOnInit() {

  }

  totalVotes(item: Item) {
    return item.activity.votes.yes + item.activity.votes.no;
  }

  totalComments(item: Item) {
    return item.activity.comments.pro + item.activity.comments.con + item.activity.comments.neutral;
  }

  get agendaItems() {
    return !this.items ? [] : this.items
      .sort((x, y) => x.onAgendas[this.meeting.id].itemNumber - y.onAgendas[this.meeting.id].itemNumber);
  }
}
