import { Component, Input, OnInit } from '@angular/core';
import { Office } from '../../models/office';

@Component({
    selector: 'civ-district-input-table',
    templateUrl: './district-input-table.component.html',
    styleUrls: ['./district-input-table.component.scss']
})
export class DistrictInputTableComponent implements OnInit {

    @Input() data: { district: Office, votes: { yes: number, no: number }, comments: { pro: number, con: number } }[];

    constructor() {
    }

    ngOnInit() {
    }

}
