import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'civ-splash',
  templateUrl: './splash.component.html',
  styleUrls: [ './splash.component.scss' ]
})
export class SplashComponent implements OnInit {
  cities = [{
    id: 'id_acc',
    name: 'Austin',
    longName: 'City of Austin',
    icon: 'https://cmgstatesmanaustin.files.wordpress.com/2015/08/city-of-austin-flag.png',
    owner: 'id-doug',
  }];

  constructor() { }

  ngOnInit() {
  }

}
