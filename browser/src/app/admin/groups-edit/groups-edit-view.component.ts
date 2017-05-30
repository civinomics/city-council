import { Component, Input, OnInit } from '@angular/core';
import { Group } from '../../group/group.model';

@Component({
  selector: 'civ-app-admin-view',
  templateUrl: './groups-edit-view.component.html',
  styleUrls: [ './groups-edit-view.component.scss' ]
})
export class GroupsEditViewComponent implements OnInit {

  @Input() groups: Group[];

  constructor() { }

  ngOnInit() {

  }

}
