import { Component, OnInit } from '@angular/core';
import { AUSTIN_DATA } from '../../models/fixtures';

@Component({
  selector: 'civ-splash',
  templateUrl: './splash.component.html',
  styleUrls: [ './splash.component.scss' ]
})
export class SplashComponent implements OnInit {
  cities = [ AUSTIN_DATA ];

  constructor() { }

  ngOnInit() {
  }

}
