import {Component, Input, OnInit} from '@angular/core';
import {arc, Arc, Pie, pie, PieArcDatum} from 'd3-shape';


export type Datatype = { name: string, value: number };

@Component({
  selector: 'civ-participation-pie',
  template: `
    <svg:svg [attr.height]="height" [attr.width]="width">
      <svg:g [attr.transform]="rootGTransform">
        <svg:g *ngFor="let slice of slices" class="pie-slice">
          <path [attr.d]="slice.path" [attr.fill]="slice.color"></path>
          <svg:text [attr.transform]="slice.label.transform">{{slice.label.text}}</svg:text>
        </svg:g>
      </svg:g>

    </svg:svg>
  `,
  styleUrls: ['./participation-pie.component.scss']
})
export class ParticipationPieComponent implements OnInit {
  @Input() data: Datatype[];

  pieFxn: Pie<this, Datatype> = pie<Datatype>().sort(null).value(it => it.value);

  arcFxn: Arc<this, PieArcDatum<Datatype>>;

  arcs: Array<PieArcDatum<Datatype>>;

  slices: any;

  height = 500;
  width = 800;
  outerRadius: number;
  rootGTransform: string;

  colors = ['#F44336', '#673AB7', '#03A9F4', '#4CAF50', '#FF5722', '#607D8B', '#9C27B0', '#3F51B5', '#009688', '#8BC34A', '#CDDC39', '#795548'];

  constructor() {

  }


  ngOnInit() {
    this.outerRadius = this.height / 2;
    this.arcs = this.pieFxn(this.data);

    this.rootGTransform = `translate(${this.width / 2}, ${this.height / 2})`;

    this.arcFxn = arc<this, PieArcDatum<Datatype>>().context(null).innerRadius(0).outerRadius(this.outerRadius);

    const labelPositions = this.calcLabelPositions(this.arcs);

    this.slices = this.arcs.map(arc => {

      let labelPos = labelPositions[arc.data.name];

      return {
        path: this.arcFxn(arc),
        data: arc.data,
        color: this.colors[arc.index % this.colors.length],
        label: {
          transform: `translate(${labelPos[0]}, ${labelPos[1]})`,
          text: arc.data.name
        }
      }
    });

  }

  calcLabelPositions(slices: PieArcDatum<Datatype>[]) {
    const factor = 1.5;
    const minDistance = 10;

    const labels = slices.map(slice => {

      let pos = this.arcFxn.centroid(slice);
      pos[0] = factor * this.outerRadius * (this.midAngle(slice) < Math.PI ? 1 : -1);

      return {
        name: slice.data.name,
        pos
      }
    });


    for (let i = 0; i < labels.length - 1; i++) {
      const a = labels[i];

      for (let j = i + 1; j < labels.length; j++) {
        const b = labels[j];
        // if they're on the same side
        if (b.pos[0] * a.pos[0] > 0) {
          // if they're overlapping
          const o = minDistance - Math.abs(b.pos[1] - a.pos[1]);
          if (o > 0) {
            // push the second up or down
            b.pos[1] += Math.sign(b.pos[0]) * o;
          }
        }
      }
    }

    return labels.reduce((result, next) => ({...result, [next.name]: next.pos}), {});

  }

  midAngle(slice: PieArcDatum<Datatype>): number {
    return slice.startAngle + (slice.endAngle - slice.startAngle) / 2;
  }

}
