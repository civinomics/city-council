import { Component, Input } from '@angular/core';
import { scaleLinear, ScaleLinear } from 'd3-scale';

export interface Datatype {
  itemNumber: number, text: string, pro: number, con: number
}


@Component({
  selector: 'item-bars',
  styleUrls: [ './item-bars.component.scss' ],
  template: `
    <div *ngFor="let item of items" class="item">
      <div class="bar" [style.width.%]="scale(item.pro + item.con)">
        <div class="text">{{item.itemNumber}}: {{item.text}}</div>
      </div>
    </div>
  `
})
export class ItemBarsComponent {

  @Input() data: Datatype[];

  scale: ScaleLinear<number, number> = scaleLinear().range([ 0, 100 ]);

  constructor() {

  }

  ngOnInit() {
    let sorted = this.data.sort((x, y) => ((x.pro + x.con) - (y.pro + y.con)));
    this.scale.domain([
      (sorted[ 0 ].pro + sorted[ 0 ].con),
      (sorted[ sorted.length - 1 ].pro + sorted[ sorted.length - 1 ].con)
    ]);
  }

  get items() {
    return this.data.map(entry => ({
      ...entry,
      text: entry.text.length < 50 ? entry.text : entry.text.substring(0, 50).concat('...')
    })).sort((x, y) => (y.pro + y.con) - (x.pro + x.con));
  }

  width(item: any) {
  }

}
