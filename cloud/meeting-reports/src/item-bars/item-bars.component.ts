import { Component, Input } from '@angular/core';
import { scaleLinear, ScaleLinear } from 'd3-scale';

export interface Datatype {
  itemNumber: number, text: string, pro: number, con: number
}


@Component({
  selector: 'civ-item-bars',
  styleUrls: [ './item-bars.component.scss' ],
  template: `
    <div *ngFor="let item of items" class="item" [style.margin-bottom.px]="BAR_MARGIN">
      <div class="bar pro" [style.width.%]="scale(item.pro)">
      </div>
      <div class="bar con" [style.left.%]="scale(item.pro)" [style.width.%]="scale(item.con)">
      </div>
      <span class="item-no"><small>#</small>{{item.itemNumber}}</span>
      <span class="label pro" [style.left.%]="scale(item.pro) / 2" *ngIf="scale(item.pro) > 7">{{item.pro}}</span>
      <span class="label con" [style.left.%]="scale(item.pro) + (scale(item.con) / 2)">{{item.con}}</span>

    </div>
  `
})
export class ItemBarsComponent {

  items: Datatype[] = [];
  w
  scale: ScaleLinear<number, number> = scaleLinear().range([ 2, 98 ]);

  @Input() set data(data: Datatype[]) {
    if (!!data) {
      this.items = data
        .filter(entry => entry.pro + entry.con > 0)
        .sort((x, y) => ((y.pro + y.con) - (x.pro + x.con)));


      this.scale.domain([
        0,
        (this.items[ 0 ].pro + this.items[ 0 ].con)
      ]);


    }

  }

  private readonly BAR_HEIGHT = 15;
  private readonly BAR_MARGIN = 8;



  constructor() {

  }

  ngOnInit() {

  }

}
