import { Component, Input, OnInit } from '@angular/core';

export type Datatype = {
  district: string,
  votes: { yes: number, no: number },
  comments: { pro: number, con: number }
};

@Component({
  selector: 'civ-district-input-table',
  templateUrl: './district-input-table.component.html',
  styleUrls: [ './district-input-table.component.scss' ]
})
export class DistrictInputTableComponent implements OnInit {

  @Input() data: Datatype[];

  constructor() {
  }

  ngOnInit() {
  }

}
