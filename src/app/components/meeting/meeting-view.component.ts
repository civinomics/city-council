import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Meeting} from '../../models/meeting';

import {Item} from '../../models/item';

@Component({
  selector: 'civ-meeting-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meeting-view.component.html',
  styleUrls: [ './meeting-view.component.scss' ]
})
export class MeetingViewComponent implements OnInit {

  @Input() meeting: Meeting;
  @Input() items: Item[];
  @Output() showItem = new EventEmitter();

  agendaSortOptions = [ 'Item Number', 'Most Active' ];

  sortBy = this.agendaSortOptions[ 0 ];

  constructor() { }

  ngOnInit() {
  }

  get agendaItems() {
    return !this.items ? [] : this.items
      .sort((x, y) => (x as Item).agendaNumber - (y as Item).agendaNumber);
  }
}
