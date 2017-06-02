import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Group } from '../../group/group.model';

@Component({
  selector: 'civ-app-admin-view',
  templateUrl: './groups-edit-view.component.html',
  styleUrls: [ './groups-edit-view.component.scss' ]
})
export class GroupsEditViewComponent implements OnInit {

  @Input() groups: Group[];
  @Output() edit: EventEmitter<string> = new EventEmitter();

  constructor() { }

  ngOnInit() {

  }

}
