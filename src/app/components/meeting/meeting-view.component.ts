import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Meeting} from '../../models/meeting';

import {Item} from '../../models/item';
import {Group} from '../../models/group';

@Component({
  selector: 'civ-meeting-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meeting-view.component.html',
  styleUrls: [ './meeting-view.component.scss' ]
})
export class MeetingViewComponent implements OnInit {

  @Input() meeting: Meeting;
  @Input() group: Group;
  @Input() items: Item[];
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
