import {AfterViewInit, Component, OnInit, ViewChild} from "@angular/core";
import {MdInputDirective} from "@angular/material";
import {TEST_DATA} from "../test-data";

@Component({
  selector: 'civ-splash',
  templateUrl: './splash.component.html',
  styleUrls: [ './splash.component.scss' ]
})
export class SplashComponent implements OnInit, AfterViewInit {


  cities: any[] = TEST_DATA.cities;

  @ViewChild('findCity', { read: MdInputDirective }) private findCityInput: MdInputDirective;

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.findCityInput.focus();
  }

}
