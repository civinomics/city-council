import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Meeting} from '../../models/meeting';

import {AgendaItem} from '../../models/item';

@Component({
  selector: 'civ-meeting-view',
  templateUrl: './meeting-view.component.html',
  styleUrls: [ './meeting-view.component.scss' ]
})
export class MeetingViewComponent implements OnInit {

  @Input() meeting: Meeting;
  @Input() items: AgendaItem[];
  @Output() showItem = new EventEmitter();

  agendaSortOptions = [ 'Item Number', 'Most Active' ];

  sortBy = this.agendaSortOptions[ 0 ];

  constructor() { }

  ngOnInit() {
  }

  get agendaItems() {
    return this.items
      .sort((x, y) => (x as AgendaItem).itemNumber - (y as AgendaItem).itemNumber);
  }
}
