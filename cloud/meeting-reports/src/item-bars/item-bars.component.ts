import { Component, Input } from '@angular/core';
import { scaleLinear, ScaleLinear } from 'd3-scale';

export interface Datatype {
  itemNumber: number, text: string, pro: number, con: number
}


@Component({
  selector: 'civ-item-bars',
  styleUrls: [ './item-bars.component.scss' ],
  template: `
    <div *ngFor="let item of items" class="item" [style.height.px]="BAR_HEIGHT" [style.margin-bottom.px]="BAR_MARGIN">
      <div class="bar pro" [style.width.%]="scale(item.pro)">
      </div>
      <div class="bar con" [style.left.%]="scale(item.pro)" [style.width.%]="scale(item.con)">
      </div>
      <span class="item-no"><small>#</small>{{item.itemNumber}}</span>
    </div>
  `
})
export class ItemBarsComponent {

  items: Datatype[] = [];

  scale: ScaleLinear<number, number> = scaleLinear().range([ 0, 98 ]);

  @Input() set data(data: Datatype[]) {
    if (!!data) {
      this.items = data
        .filter(entry => entry.pro + entry.con > 0)
        .sort((x, y) => ((y.pro + y.con) - (x.pro + x.con)));

      console.log(JSON.stringify(this.items, null, '\t'));

      this.scale.domain([
        (this.items[ this.items.length - 1 ].pro + this.items[ this.items.length - 1 ].con),
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
